// Existing 27-fixture suite, registry GeaStack vs scriptc vs Node vs native C++.
// Generated artifacts use the project's existing ignored build output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(process.env.BENCH_PACKAGE_ROOT ?? path.join(HERE, '../..'));

const require = createRequire(path.join(packageRoot, 'package.json'));
const compilerRoot = path.dirname(require.resolve('@geastack/compiler/package.json'));
const compilerRequire = createRequire(path.join(compilerRoot, 'package.json'));
const ts = compilerRequire('typescript');
const { compile } = await import(path.join(compilerRoot, 'dist/compiler.js'));
const { noPluginCapabilities } = await import(path.join(compilerRoot, 'dist/plugins/model.js'));

const arg = (n, d) => {
  const i = process.argv.indexOf(n);

  return i < 0 ? d : process.argv[i + 1];
};

const samples = Number(arg('--samples', '5'));
const only = arg('--only', '').split(',').filter(Boolean);

const fixtures = fs
  .readdirSync(path.join(HERE, 'fixtures'))
  .filter((x) => x.endsWith('.ts'))
  .map((x) => x.slice(0, -3))
  .sort()
  .filter((x) => !only.length || only.includes(x));

const iterations = JSON.parse(fs.readFileSync(path.join(HERE, 'iterations.json')));

const work = path.join(HERE, '../dist');
fs.mkdirSync(work, { recursive: true });

const output = path.resolve(arg('--output', path.join(work, 'compute.json')));

const cxx = process.env.CXX ?? 'clang++';
const flags = ['-std=gnu++20', '-O3', '-march=native', '-DNDEBUG'];
const native = path.join(HERE, 'native-cpp');

const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const result = {
  utc: new Date().toISOString(),
  packages: Object.fromEntries(
    ['@geastack/compiler', '@geastack/node-compat', 'scriptc'].map((n) => [
      n,
      JSON.parse(fs.readFileSync(path.join(packageRoot, 'node_modules', n, 'package.json')))
        .version,
    ]),
  ),
  node: process.version,
  samples,
  iterations,
  cxx: spawnSync(cxx, ['--version'], { encoding: 'utf8' }).stdout,
  flags,
  cpu: '0',
  machine: spawnSync('lscpu', [], { encoding: 'utf8' }).stdout,
  startLoad: fs.readFileSync('/proc/loadavg', 'utf8'),
  compilerSha256: hash(path.join(compilerRoot, 'dist/compiler.js')),
  harnessSha256: hash(fileURLToPath(import.meta.url)),
  rows: [],
};

const save = () => fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');

const command = (exe, args, env = {}) =>
  spawnSync(exe, args, {
    encoding: 'utf8',
    env: { ...process.env, GEATSC_BENCH_TIMING: '1', ...env },
    timeout: 210000,
    maxBuffer: 32 * 1024 * 1024,
  });

const run = (exe, args) => {
  const t = performance.now();

  const r = command('/usr/bin/time', [
    '-v',
    'timeout',
    '--kill-after=5s',
    '180s',
    'taskset',
    '-c',
    '0',
    exe,
    ...args,
  ]);

  const out = r.stdout ?? '';
  const inner = /^__bench_ms__\s+([\d.eE+-]+)/m.exec(out);
  const rss = /Maximum resident set size \(kbytes\):\s*(\d+)/.exec(r.stderr ?? '');

  return {
    status: r.status,
    signal: r.signal,
    error: r.error?.message,
    innerMs: inner ? Number(inner[1]) : null,
    wallMs: performance.now() - t,
    rssBytes: rss ? Number(rss[1]) * 1024 : null,
    output: out
      .split('\n')
      .filter((x) => !x.startsWith('__bench_'))
      .join('\n')
      .trim(),
    stderr: r.status !== 0 ? r.stderr : undefined,
  };
};

const measure = (exe, args, zeroArgs) => {
  const runs = [];

  for (let i = 0; i < samples; i++) {
    const r = run(exe, args);
    runs.push(r);
    if (r.status !== 0 || !Number.isFinite(r.innerMs)) break;
  }

  const good = runs.every((x) => x.status === 0 && Number.isFinite(x.innerMs));
  const startup = [];

  if (good)
    for (let i = 0; i < samples; i++) {
      const t = performance.now();
      const r = command('taskset', ['-c', '0', exe, ...zeroArgs]);
      startup.push({ ms: performance.now() - t, status: r.status });
    }

  return {
    state: good ? 'ok' : 'run-failed',
    runs,
    bestMs: good ? Math.min(...runs.map((x) => x.innerMs)) : null,
    rssBytes: good ? Math.min(...runs.map((x) => x.rssBytes)) : null,
    startup,
    bestStartupMs:
      startup.length && startup.every((x) => x.status === 0)
        ? Math.min(...startup.map((x) => x.ms))
        : null,
    bytes: fs.statSync(exe).size,
    sha256: hash(exe),
  };
};

const build = (exe, args) => {
  const t = performance.now();
  const r = command(exe, args);

  return {
    status: r.status,
    ms: performance.now() - t,
    stdout: r.stdout,
    stderr: r.stderr,
    error: r.error?.message,
  };
};

const simd = path.join(work, 'compute-simdjson.o');

const simdBuild = build(cxx, [
  ...flags,
  '-fno-exceptions',
  '-fno-rtti',
  '-c',
  path.join(native, 'simdjson/simdjson.cpp'),
  '-o',
  simd,
]);

if (simdBuild.status !== 0) throw Error(simdBuild.stderr);

for (const fx of fixtures) {
  const stem = path.join(work, 'compute-' + fx);
  const src = fs.readFileSync(path.join(HERE, 'fixtures', fx + '.ts'), 'utf8');

  const row = {
    fx,
    iters: iterations[fx],
    sourceSha256: hash(path.join(HERE, 'fixtures', fx + '.ts')),
    nativeSourceSha256: hash(path.join(native, 'src', fx + '.cpp')),
    runtimes: {},
  };

  result.rows.push(row);
  save();
  const fixture = stem + '.ts';
  fs.writeFileSync(fixture, src);
  const js = stem + '.mjs';
  fs.writeFileSync(
    js,
    ts.transpileModule(src, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText,
  );
  const runner = stem + '-node.mjs';
  fs.writeFileSync(
    runner,
    `import { main } from './${path.basename(js)}';\nconst n=Number(process.argv[2]??'0');const t=performance.now();const r=main(n);console.log('__bench_ms__ '+(performance.now()-t));console.log(String(r));\n`,
  );
  row.runtimes.node = measure(process.execPath, [runner, String(row.iters)], [runner, '0']);
  const cpp = stem + '-cpp';

  const nb = build(cxx, [
    ...flags,
    '-fno-exceptions',
    '-fno-rtti',
    '-I' + native,
    path.join(native, 'src', fx + '.cpp'),
    simd,
    '-Wl,--gc-sections',
    '-s',
    '-o',
    cpp,
  ]);

  row.runtimes.cpp =
    nb.status === 0
      ? { build: nb, ...measure(cpp, [String(row.iters)], ['0']) }
      : { state: 'build-failed', build: nb };
  const scriptEntry = stem + '-scriptc.ts';
  fs.writeFileSync(
    scriptEntry,
    `import {main} from './${path.basename(fixture, '.ts')}';\nconst n=Number(process.argv[2]??'0');const t=performance.now();const r=main(n);console.log('__bench_ms__ '+(performance.now()-t));console.log(String(r));\n`,
  );
  const sc = stem + '-scriptc';

  const sb = build(path.join(packageRoot, 'node_modules/.bin/scriptc'), [
    'build',
    scriptEntry,
    '-o',
    sc,
    '--strip',
    '--no-keep-llvm',
  ]);

  row.runtimes.scriptc =
    sb.status === 0
      ? { build: sb, ...measure(sc, [String(row.iters)], ['0']) }
      : { state: 'build-failed', build: sb };
  const entry = stem + '-gea.ts';
  fs.writeFileSync(
    entry,
    `import {main} from './${path.basename(fixture, '.ts')}';\ndeclare function __bench_argv_number():number;\ndeclare function __bench_now():number;\ndeclare function __bench_report(ms:number,result:number):void;\nconst n=__bench_argv_number();const t=__bench_now();const r=main(n);__bench_report(__bench_now()-t,r);\n`,
  );
  const project = stem + '-tsconfig.json';
  fs.writeFileSync(
    project,
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
        lib: ['ES2022'],
        types: [],
      },
      files: [entry, fixture],
    }),
  );

  try {
    const hosts = new Map([
      ['__bench_argv_number', 'gea::bench::argvNumber'],
      ['__bench_now', 'gea::bench::now'],
      ['__bench_report', 'gea::bench::report'],
    ]);

    const plugin = {
      name: 'bench',
      instantiate: () => ({
        producers: () => [],
        lower: () => false,
        capabilities: {
          ...noPluginCapabilities,
          hostFunctions: hosts,
          hostPreambles: new Map([...hosts.values()].map((n) => [n, ['#include "gea_bench.hpp"']])),
        },
      }),
    };

    const emitted = compile({
      rootFileNames: [entry],
      projectFileName: project,
      plugins: [plugin],
      entrySymbol: '__gea_top_level',
      translationUnits: 'single',
      unitBaseName: 'compute-' + fx + '-unit',
    });

    if (!emitted.units.length) {
      row.runtimes.gea = {
        state: 'no-emit',
        blockers: [
          ...emitted.loweringBlockers,
          ...emitted.abiBlockers,
          ...emitted.emissionRefusals,
        ],
        preflight: emitted.preflight,
      };
    } else {
      const sources = [];

      for (const u of emitted.units) {
        const dest = path.join(work, u.fileName);
        fs.writeFileSync(dest, u.source + '\n');
        if (u.fileName.endsWith('.cpp')) sources.push(dest);
      }

      const gea = stem + '-gea';

      const gb = build(cxx, [
        ...flags,
        '-I' + path.join(compilerRoot, 'src/targets/cpp/runtime'),
        '-I' + path.join(HERE, 'support'),
        ...sources,
        '-s',
        '-o',
        gea,
      ]);

      row.runtimes.gea =
        gb.status === 0
          ? { build: gb, ...measure(gea, [String(row.iters)], ['0']) }
          : { state: 'build-failed', build: gb };
    }
  } catch (e) {
    row.runtimes.gea = { state: 'compile-failed', error: e.stack ?? String(e) };
  }

  const oracle = row.runtimes.node.runs?.[0]?.output;

  for (const r of Object.values(row.runtimes)) {
    if (r.state === 'ok') r.match = r.runs.every((s) => s.output === oracle);
  }

  console.log(
    fx.padEnd(30) +
      Object.entries(row.runtimes)
        .map(
          ([n, r]) =>
            `${n}=${r.state === 'ok' ? r.bestMs.toFixed(3) + 'ms ' + (r.match ? 'ok' : 'MISMATCH') : r.state}`,
        )
        .join('  '),
  );
  save();
}

result.complete = true;
result.endLoad = fs.readFileSync('/proc/loadavg', 'utf8');
save();
