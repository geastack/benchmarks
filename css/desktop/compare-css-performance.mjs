#!/usr/bin/env node
// Compare immutable Git inputs through Clang VFS without changing the checkout.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { featureProfiles } from '../shared/feature-profiles.mjs';
import { buildComponents } from '../shared/build-components.mjs';
import { parseLog } from '../shared/results.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..', 'core');
const buildDirectory = path.join(root, 'packages/core/test/.build');
const mainSource = path.join(directory, 'test_css_performance_main.cpp');
const shared = path.resolve(directory, '../shared');

const fixtureFiles = [
  mainSource,
  ...readdirSync(shared, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(shared, path.join(entry.parentPath || entry.path, entry.name)))
    .sort()
    .map((name) => path.join(shared, name)),
];

const catalog = JSON.parse(readFileSync(path.join(shared, 'catalog.json')));
const names = catalog.cases.map((item) => item.name);
let generatedSources = [];

const hash = (value) => createHash('sha256').update(value).digest('hex');

const fixtureHashes = () =>
  Object.fromEntries(
    fixtureFiles.map((file) => [
      path.relative(path.dirname(directory), file),
      hash(readFileSync(file)),
    ]),
  );

const git = (...args) =>
  execFileSync('git', ['-C', root, ...args], { maxBuffer: 256 * 1024 * 1024 });

const resolve = (ref) => git('rev-parse', '--verify', `${ref}^{commit}`).toString().trim();

function revisionInputs(revision) {
  const entries = git('ls-tree', '-rz', revision, 'packages')
    .toString()
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const tab = record.indexOf('\t');
      const [mode, kind, oid] = record.slice(0, tab).split(' ');
      const name = record.slice(tab + 1);
      if (kind !== 'blob' || mode === '120000')
        throw new Error(`package symlinks/submodules need explicit VFS support: ${name}`);

      return { name, oid };
    });

  const blob = (oid) => path.join(buildDirectory, `css-perf-blob-${oid}`);

  const missing = [...new Set(entries.map((entry) => entry.oid))]
    .filter((oid) => !existsSync(blob(oid)))
    .sort();

  if (missing.length) {
    const batch = execFileSync('git', ['-C', root, 'cat-file', '--batch'], {
      input: missing.join('\n') + '\n',
      maxBuffer: 256 * 1024 * 1024,
    });

    let offset = 0;

    for (const expected of missing) {
      const end = batch.indexOf(10, offset);
      const [oid, kind, sizeText] = batch.subarray(offset, end).toString().split(' ');
      const size = Number(sizeText);
      if (
        end < 0 ||
        oid !== expected ||
        kind !== 'blob' ||
        !Number.isSafeInteger(size) ||
        size < 0 ||
        end + 1 + size >= batch.length
      )
        throw new Error('unexpected git cat-file response');
      offset = end + 1;
      writeFileSync(blob(oid), batch.subarray(offset, offset + size));
      offset += size + 1;
    }
  }

  const overlay = path.join(buildDirectory, `css-perf-${revision}.json`);
  writeFileSync(
    overlay,
    JSON.stringify({
      version: 0,
      'use-external-names': false,
      roots: entries.map(({ name, oid }) => ({
        type: 'file',
        name: path.join(root, name),
        'external-contents': blob(oid),
      })),
    }),
  );

  return overlay;
}

function sources(revision) {
  const harness = git('show', `${revision}:packages/core/test/native-test-common.sh`).toString();
  const block = harness.split('GEA_NATIVE_SRCS=(')[1]?.split('\n  )')[0];
  if (!block) throw new Error('could not read native harness source list');

  const prefixes = {
    $engine_root: 'packages/engine',
    $elements_root: 'packages/elements',
    $host_root: 'packages/host',
    $ROOT: '',
  };

  const result = [];

  for (const [, name] of block.matchAll(/"([^"\n]+\.(?:cpp|c))"/g)) {
    const prefix = Object.keys(prefixes).find((prefix) => name.startsWith(prefix + '/'));
    if (!prefix) throw new Error(`unrecognized harness source: ${name}`);
    const relative = (prefixes[prefix] + name.slice(prefix.length)).replace(/^\//, '');
    if (relative !== 'packages/host/host/image.cpp') result.push(path.join(root, relative));
  }

  if (!result.length) throw new Error('empty native harness source list');

  return [
    ...result,
    ...[
      'packages/core/test/native_host_backends.cpp',
      'packages/core/test/native_test_host.cpp',
      'packages/core/test/native_camera_bridge.cpp',
      'packages/engine/vendor/AnimatedGIF/AnimatedGIF.c',
    ].map((name) => path.join(root, name)),
    ...generatedSources,
    mainSource,
  ];
}

function command(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const output = [];
    child.stdout.on('data', (chunk) => output.push(chunk));
    child.stderr.on('data', (chunk) => output.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      const text = Buffer.concat(output).toString();
      if (code === 0) resolve(text);
      else reject(new Error(`${program} failed (${code}):\n${text}`));
    });
  });
}

async function build(revision, jobs, instrumented, extraDefines = []) {
  const overlay = revisionInputs(revision);

  const cxx = process.env.CXX || 'clang++',
    cc = process.env.CC || 'clang';

  const version = execFileSync(cxx, ['--version']).toString().split('\n')[0];

  const includes = [
    'packages/core',
    'packages/core/include',
    'packages/core/test',
    'packages/host',
    'packages/host/include',
    'packages/engine',
    'packages/engine/ui',
    'packages/elements',
    'packages/elements/ui',
    'packages/engine/vendor/AnimatedGIF',
    'packages/engine/vendor/stb',
  ];

  const flags = [
    ...extraDefines.map((define) => '-D' + define),
    '-I',
    buildDirectory,
    '-O2',
    '-DNDEBUG',
    '-ffunction-sections',
    '-fdata-sections',
    '-DGEA_EMBEDDED_HAS_GENERATED_FONTS=1',
    '-DGEA_EMBEDDED_PIXEL_PANEL_ENDIAN=1',
    `-DGEA_EMBEDDED_PERF=${Number(instrumented)}`,
    '-ivfsoverlay',
    overlay,
    ...includes.flatMap((name) => ['-I', path.join(root, name)]),
  ];

  const fingerprint = hash(
    Buffer.concat([
      Buffer.from(JSON.stringify({ revision, version, cc, cxx, flags })),
      ...fixtureFiles.map((file) => readFileSync(file)),
      ...generatedSources.map((file) => readFileSync(file)),
      readFileSync(path.join(buildDirectory, 'gea_runtime.h')),
    ]),
  ).slice(0, 20);

  const binary = path.join(buildDirectory, `css-perf-${fingerprint}`);

  if (existsSync(binary)) {
    console.log(`Reusing build ${revision.slice(0, 12)}`);

    return { binary, version };
  }

  const sourceList = sources(revision);

  const objects = sourceList.map((_, i) =>
    path.join(buildDirectory, `css-perf-${fingerprint}-${i}.o`),
  );

  console.log(
    `Building ${revision.slice(0, 12)}: ${sourceList.length} units, -O2, ${jobs} compiler jobs, perf=${Number(instrumented)}`,
  );

  let next = 0,
    done = 0,
    failure;

  async function worker() {
    while (!failure && next < sourceList.length) {
      const i = next++,
        source = sourceList[i],
        object = objects[i];

      try {
        if (!existsSync(object)) {
          const c = source.endsWith('.c');
          const pending = object.replace(/\.o$/, '.pending.o');
          await command(c ? cc : cxx, [
            ...flags,
            ...(c
              ? ['-DGEA_EMBEDDED_GIF_C_API']
              : [
                  '-std=c++20',
                  '-Wno-deprecated-this-capture',
                  '-Wno-deprecated',
                  '-Wno-unused-value',
                  '-Wno-return-type',
                  '-Wno-parentheses-equality',
                ]),
            '-c',
            source,
            '-o',
            pending,
          ]);
          renameSync(pending, object);
        }

        if (++done % 10 === 0)
          console.log(`  ${revision.slice(0, 12)}: ${done}/${sourceList.length}`);
      } catch (error) {
        failure ??= error;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(jobs, sourceList.length) }, worker));
  if (failure) throw failure;
  const pending = binary + '.pending';
  await command(cxx, [
    ...objects,
    process.platform === 'darwin' ? '-Wl,-dead_strip' : '-Wl,--gc-sections',
    '-o',
    pending,
  ]);
  renameSync(pending, binary);

  return { binary, version };
}

async function run(binary, samples, minimal = false) {
  const expectedNames = catalog.cases
    .filter((item) => !minimal || item.profiles?.includes('box'))
    .map((item) => item.name);

  const output = await command(binary, [String(samples)]);

  const raw = parseLog(output, {
    cases: catalog.cases.filter((item) => expectedNames.includes(item.name)),
    samples,
  });

  const rows = raw.map((row) => ({
    ...row,
    // The desktop harness does not sample free internal RAM or PSRAM.
    internal_min_bytes: null,
    psram_min_bytes: null,
    scenario: row.name,
    rows: catalog.cases.find((item) => item.name === row.name).count,
    median_us: row.work_p50_us,
    p95_us: row.work_p95_us,
  }));

  if (
    rows.length !== expectedNames.length ||
    rows.some((row, i) => row.scenario !== expectedNames[i] || row.samples !== samples)
  )
    throw new Error(`missing or unexpected benchmark cases:\n${output}`);

  return rows;
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const spread = (rows) => {
  const values = rows.map((row) => row.median_us);

  return (Math.max(...values) / Math.min(...values) - 1) * 100;
};

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      rounds: { type: 'string', default: '7' },
      samples: { type: 'string', default: '240' },
      jobs: { type: 'string', default: '2' },
      instrumented: { type: 'boolean', default: false },
      'max-regression': { type: 'string' },
      minimal: { type: 'boolean', default: false },
      help: { type: 'boolean' },
    },
  });

  if (values.help) {
    console.log(
      'Usage: node compare-css-performance.mjs BASE_REF CANDIDATE_REF [--rounds 7] [--samples 240] [--jobs 2] [--instrumented] [--minimal] [--max-regression PERCENT]',
    );

    return;
  }

  const rounds = Number(values.rounds),
    samples = Number(values.samples),
    jobs = Number(values.jobs);

  const threshold =
    values['max-regression'] === undefined ? undefined : Number(values['max-regression']);

  if (
    positionals.length !== 2 ||
    !Number.isInteger(rounds) ||
    rounds < 3 ||
    !Number.isInteger(samples) ||
    samples < 32 ||
    !Number.isInteger(jobs) ||
    jobs < 1 ||
    (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0))
  )
    throw new Error(
      'Provide two refs, at least 3 rounds, 32 samples and 1 compiler job; regression threshold must be nonnegative.',
    );
  mkdirSync(buildDirectory, { recursive: true });
  const [base, candidate] = positionals.map(resolve);
  generatedSources = buildComponents(buildDirectory, values.minimal);

  const profile = values.minimal
    ? (await featureProfiles()).profiles.find((profile) => profile.name === 'box')
    : undefined;

  const activeNames = values.minimal
    ? catalog.cases.filter((item) => item.profiles?.includes('box')).map((item) => item.name)
    : names;

  const baseline = await build(base, jobs, values.instrumented, profile?.defines);
  const alternative = await build(candidate, jobs, values.instrumented, profile?.defines);
  const results = { base: [], candidate: [] };

  for (let round = 0; round < rounds; round++) {
    for (const label of round % 2 ? ['candidate', 'base'] : ['base', 'candidate']) {
      console.log(`Round ${round + 1}/${rounds}: ${label}`);
      results[label].push(
        await run(label === 'base' ? baseline.binary : alternative.binary, samples, values.minimal),
      );
    }
  }

  const report = {
    base,
    candidate,
    compiler: baseline.version,
    feature_profile: profile || null,
    fixture_hashes: fixtureHashes(),
    width: 410,
    height: 502,
    warmup: 60,
    clock_step_ms: 16,
    machine: `${os.platform()} ${os.release()} ${os.arch()}`,
    flags: '-O2 -DNDEBUG',
    instrumented: values.instrumented,
    rounds,
    samples,
    cases: [],
    raw_runs: results,
  };

  const counters = [
    'layout_calls',
    'full_records',
    'recorded_commands',
    'scroll_fast',
    'flush_pixels',
  ];

  let failed = false;
  console.log(
    '\nscenario / rows                 base us     new us     change   spread(base/new)   output',
  );

  for (let i = 0; i < activeNames.length; i++) {
    const a = results.base.map((rows) => rows[i]),
      b = results.candidate.map((rows) => rows[i]);

    const medA = median(a.map((row) => row.median_us)),
      medB = median(b.map((row) => row.median_us));

    const delta = (medB / medA - 1) * 100;

    const equal =
      new Set([...a, ...b].map((row) => JSON.stringify([row.pixel_hash, row.geometry_hash])))
        .size === 1;

    const counterValues = (rows) =>
      Object.fromEntries(
        counters.map((name) => [
          name,
          [...new Set(rows.map((row) => row[name]))].sort((a, b) => a - b),
        ]),
      );

    const row = {
      scenario: activeNames[i],
      rows: a[0].rows,
      base_median_us: medA,
      candidate_median_us: medB,
      change_percent: delta,
      output_equal: equal,
      base_spread_percent: spread(a),
      candidate_spread_percent: spread(b),
      base_p95_us: median(a.map((row) => row.p95_us)),
      candidate_p95_us: median(b.map((row) => row.p95_us)),
      base_counters: counterValues(a),
      candidate_counters: counterValues(b),
      base_node_bytes: a[0].node_bytes,
      candidate_node_bytes: b[0].node_bytes,
    };

    report.cases.push(row);
    console.log(
      `${`${row.scenario}/${row.rows}`.padEnd(30)} ${medA.toFixed(2).padStart(9)} ${medB.toFixed(2).padStart(9)} ${(delta >= 0 ? '+' : '') + delta.toFixed(1)}%   ${spread(a).toFixed(1)}/${spread(b).toFixed(1)}%    ${equal ? 'same' : 'DIFF'}`,
    );

    if (values.instrumented) {
      const changed = counters.filter(
        (name) =>
          JSON.stringify(row.base_counters[name]) !== JSON.stringify(row.candidate_counters[name]),
      );

      if (changed.length)
        console.log(
          '  ' +
            changed
              .map(
                (name) =>
                  `${name}: ${JSON.stringify(row.base_counters[name])} -> ${JSON.stringify(row.candidate_counters[name])}`,
              )
              .join('; '),
        );
    }

    if (threshold !== undefined && (!equal || delta > threshold)) failed = true;
  }

  const destination = path.join(
    buildDirectory,
    values.minimal
      ? 'css-performance-minimal.json'
      : values.instrumented
        ? 'css-performance-instrumented.json'
        : 'css-performance.json',
  );

  writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log(
    `\nReport: ${destination}\nDesktop native CPU/raster timings, not device FPS; DIFF cases require correctness review and are not like-for-like comparisons.`,
  );
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
