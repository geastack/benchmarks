// Existing 27-fixture suite, registry GeaStack vs scriptc vs Node vs native C++.
// Generated artifacts use the project's existing ignored build output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import crypto from 'node:crypto';
import { benchmarkCompilerInputs, assertCompilerInputs } from '../bench/compiler-input.mjs';
import { benchmarkFailures, rowKey, variants } from '../bench/validate-results.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(process.env.BENCH_PACKAGE_ROOT ?? path.join(HERE, '../..'));

const compilerInput = benchmarkCompilerInputs();
const compilerRoot = compilerInput.compilerRoot;
const compilerRequire = createRequire(path.join(compilerRoot, 'package.json'));
const ts = compilerRequire('typescript');
const { compile } = await import(path.join(compilerRoot, 'dist/compiler.js'));
const { noPluginCapabilities } = await import(path.join(compilerRoot, 'dist/plugins/model.js'));

const arg = (n, d) => {
  const i = process.argv.indexOf(n);

  return i < 0 ? d : process.argv[i + 1];
};

const verifyOnly = process.argv.includes('--verify-only');
const counts = [0, 1, 2];
const samples = Number(arg('--samples', '5'));
const only = arg('--only', '').split(',').filter(Boolean);

const fixtures = fs
  .readdirSync(path.join(HERE, 'fixtures'))
  .filter((x) => x.endsWith('.ts'))
  .map((x) => x.slice(0, -3))
  .sort()
  .filter((x) => !only.length || only.includes(x));

const iterations = JSON.parse(fs.readFileSync(path.join(HERE, 'iterations.json')));

// Every fixture has a parity variant: fixtures/<fx>.ts and native-cpp/src/<fx>.cpp,
// the same task done the same way. A fixture whose idiomatic implementations
// differ also has fixtures/idiomatic/<fx>.ts and/or native-cpp/src/idiomatic/<fx>.cpp;
// a language without its own idiomatic file runs its parity source, and that
// runtime's parity measurement is reused rather than repeated.
const variantFilter = arg('--variant', 'all');

if (variantFilter !== 'all' && !variants.includes(variantFilter))
  throw new Error(`--variant must be all or one of ${variants.join(', ')}`);

const native = path.join(HERE, 'native-cpp');

const sourceOf = (variant, dir, file) => {
  const own = path.join(dir, variant, file);

  return variant !== 'parity' && fs.existsSync(own) ? own : path.join(dir, file);
};

const tsSourceOf = (variant, fx) => sourceOf(variant, path.join(HERE, 'fixtures'), fx + '.ts');
const cppSourceOf = (variant, fx) => sourceOf(variant, path.join(native, 'src'), fx + '.cpp');

const plan = fixtures.flatMap((fx) =>
  variants
    .filter((variant) => variantFilter === 'all' || variantFilter === variant)
    .filter(
      (variant) =>
        variant === 'parity' ||
        tsSourceOf(variant, fx) !== tsSourceOf('parity', fx) ||
        cppSourceOf(variant, fx) !== cppSourceOf('parity', fx),
    )
    .map((variant) => ({ fx, variant })),
);

const work = path.join(HERE, '../dist');
fs.mkdirSync(work, { recursive: true });

const output = path.resolve(
  arg('--output', path.join(work, verifyOnly ? 'compute-verification.json' : 'compute.json')),
);

const cxx = process.env.CXX ?? 'clang++';

// The same flags for the emitted C++ and the hand-written references, and the
// same as the parallel suite's. -ffp-contract=off: JavaScript rounds after
// every operation, so neither column may fuse a multiply-add (geatsc emits one
// operation per statement, which clang's default never fuses; a hand-written
// `c += a * b` it would). -force-ordered-reductions lets clang vectorize a
// floating-point sum while keeping the sequential order and answer.
const flags = [
  '-std=gnu++20',
  '-O3',
  '-march=native',
  '-DNDEBUG',
  '-ffp-contract=off',
  ...(/clang/.test(cxx) ? ['-mllvm', '-force-ordered-reductions=true'] : []),
];

const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const result = {
  mode: verifyOnly ? 'verification' : 'benchmark',
  ...(verifyOnly ? { counts } : {}),
  utc: new Date().toISOString(),
  packages: Object.fromEntries(
    ['@geastack/compiler', '@geastack/node-compat', 'scriptc'].map((n) => [
      n,
      n === '@geastack/compiler'
        ? compilerInput.compilerVersion
        : JSON.parse(fs.readFileSync(path.join(packageRoot, 'node_modules', n, 'package.json')))
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
  compilerInputs: compilerInput,
  harnessSha256: hash(fileURLToPath(import.meta.url)),
  rows: [],
};

const save = () => fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');

const command = (exe, args, env = {}) =>
  spawnSync(exe, args, {
    encoding: 'utf8',
    env: { ...process.env, GEATSC_BENCH_TIMING: verifyOnly ? '0' : '1', ...env },
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
  if (verifyOnly) {
    const runs = counts.map((iterations) => {
      const argumentsForCount = [...args.slice(0, -1), String(iterations)];
      const run = command('timeout', ['--kill-after=5s', '180s', exe, ...argumentsForCount]);

      return {
        iterations,
        status: run.status,
        signal: run.signal,
        error: run.error?.message,
        output: (run.stdout ?? '')
          .split('\n')
          .filter((line) => !line.startsWith('__bench_'))
          .join('\n')
          .trim(),
        ...(run.status !== 0 ? { stderr: run.stderr } : {}),
      };
    });

    return {
      state: runs.every((run) => run.status === 0) ? 'ok' : 'run-failed',
      runs,
      sha256: hash(exe),
    };
  }

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
  const t = verifyOnly ? null : performance.now();
  const r = command(exe, args);

  return {
    status: r.status,
    ...(t === null ? {} : { ms: performance.now() - t }),
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

const nodeRunner = (stem, src) => {
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
    `import { main } from './${path.basename(js)}';\nconst n=Number(process.argv[2]??'0');${verifyOnly ? 'console.log(String(main(n)));' : "const t=performance.now();const r=main(n);console.log('__bench_ms__ '+(performance.now()-t));console.log(String(r));"}\n`,
  );

  return runner;
};

const runCpp = (stem, source, iters) => {
  const cpp = stem + '-cpp';

  const nb = build(cxx, [
    ...flags,
    '-fno-exceptions',
    '-fno-rtti',
    '-I' + native,
    source,
    simd,
    '-Wl,--gc-sections',
    '-s',
    '-o',
    cpp,
  ]);

  return nb.status === 0
    ? { build: nb, ...measure(cpp, [String(iters)], ['0']) }
    : { state: 'build-failed', build: nb };
};

const runScriptc = (stem, iters) => {
  const scriptEntry = stem + '-scriptc.ts';
  fs.writeFileSync(
    scriptEntry,
    `import {main} from './${path.basename(stem)}';\nconst n=Number(process.argv[2]??'0');${verifyOnly ? 'console.log(String(main(n)));' : "const t=performance.now();const r=main(n);console.log('__bench_ms__ '+(performance.now()-t));console.log(String(r));"}\n`,
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

  return sb.status === 0
    ? { build: sb, ...measure(sc, [String(iters)], ['0']) }
    : { state: 'build-failed', build: sb };
};

const runGea = (stem, iters) => {
  const fixture = stem + '.ts';
  const entry = stem + '-gea.ts';
  fs.writeFileSync(
    entry,
    `import {main} from './${path.basename(stem)}';\ndeclare function __bench_argv_number():number;\ndeclare function __bench_now():number;\ndeclare function __bench_report(ms:number,result:number):void;\ndeclare function __bench_result(result:number):void;\nconst n=__bench_argv_number();${verifyOnly ? '__bench_result(main(n));' : 'const t=__bench_now();const r=main(n);__bench_report(__bench_now()-t,r);'}\n`,
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
      ['__bench_result', 'gea::bench::result'],
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
      unitBaseName: path.basename(stem) + '-unit',
    });

    if (!emitted.units.length) {
      return {
        state: 'no-emit',
        blockers: [
          ...emitted.loweringBlockers,
          ...emitted.abiBlockers,
          ...emitted.emissionRefusals,
        ],
        preflight: emitted.preflight,
      };
    }

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

    return gb.status === 0
      ? { build: gb, ...measure(gea, [String(iters)], ['0']) }
      : { state: 'build-failed', build: gb };
  } catch (e) {
    return { state: 'compile-failed', error: e.stack ?? String(e) };
  }
};

// A runtime whose source this variant shares with parity keeps parity's
// measurement: the same binary, measured once.
const shared = (cell) => ({ ...cell, sharedWith: 'parity' });

for (const { fx, variant } of plan) {
  const stem = path.join(work, variant === 'parity' ? 'compute-' + fx : `compute-${variant}-${fx}`);
  const tsSource = tsSourceOf(variant, fx);
  const cppSource = cppSourceOf(variant, fx);

  const parityRow =
    variant === 'parity'
      ? undefined
      : result.rows.find((r) => r.fx === fx && (r.variant ?? 'parity') === 'parity');

  const shareTs = parityRow !== undefined && tsSource === tsSourceOf('parity', fx);
  const shareCpp = parityRow !== undefined && cppSource === cppSourceOf('parity', fx);

  const row = {
    fx,
    variant,
    iters: iterations[fx],
    source: path.relative(HERE, tsSource),
    nativeSource: path.relative(HERE, cppSource),
    sourceSha256: hash(tsSource),
    nativeSourceSha256: hash(cppSource),
    runtimes: {},
  };

  result.rows.push(row);
  save();

  if (shareTs) {
    row.runtimes.node = shared(parityRow.runtimes.node);
  } else {
    const runner = nodeRunner(stem, fs.readFileSync(tsSource, 'utf8'));
    row.runtimes.node = measure(process.execPath, [runner, String(row.iters)], [runner, '0']);
  }

  row.runtimes.cpp = shareCpp ? shared(parityRow.runtimes.cpp) : runCpp(stem, cppSource, row.iters);
  row.runtimes.scriptc = shareTs ? shared(parityRow.runtimes.scriptc) : runScriptc(stem, row.iters);
  row.runtimes.gea = shareTs ? shared(parityRow.runtimes.gea) : runGea(stem, row.iters);

  const oracle = row.runtimes.node.runs;

  for (const r of Object.values(row.runtimes)) {
    if (r.state === 'ok')
      r.match = r.runs.every((s, index) => s.output === oracle?.[verifyOnly ? index : 0]?.output);
  }

  console.log(
    rowKey(row).padEnd(40) +
      Object.entries(row.runtimes)
        .map(
          ([n, r]) =>
            `${n}=${r.state === 'ok' ? (verifyOnly ? '' : r.bestMs.toFixed(3) + 'ms ') + (r.match ? 'ok' : 'MISMATCH') + (r.sharedWith ? ' (parity)' : '') : r.state}`,
        )
        .join('  '),
  );
  save();
}

result.complete = true;
result.endLoad = fs.readFileSync('/proc/loadavg', 'utf8');
result.failures = benchmarkFailures(result, plan.map(rowKey), ['node', 'cpp', 'gea', 'scriptc']);

try {
  assertCompilerInputs(compilerInput);
} catch (error) {
  result.failures.push(String(error));
}

save();

if (result.failures.length) {
  console.error(result.failures.join('\n'));
  process.exitCode = 1;
}
