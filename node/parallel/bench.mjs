// @geastack/parallel against Rust + Rayon, hand-written C++ threads, Node and
// scriptc. Every workload is one TypeScript program: Node runs it as written
// (sequentially, which is what the library means), scriptc compiles it
// (sequentially, through the library's JavaScript), and GeaStack compiles it to
// a native program whose parallel operations run on every core. The Rust and
// C++ columns are the same algorithm written idiomatically for Rayon and for a
// std::thread pool. Every program prints its answer; each must equal Node's.
//
//   node node/parallel/bench.mjs [--only a,b] [--samples 5] [--threads 1,all]
//                                [--remote dashwin-geastack] [--output file.json]
//
// On Linux it builds and runs everything in place. With --remote it emits the
// GeaStack C++ here (emission is a TypeScript compile, cheap and portable),
// ships the sources and the emitted C++ to `~/geastack` on the remote's WSL
// (`ssh <host> 'wsl -d Ubuntu-24.04 -- bash -s'`), and runs the build and
// measure phase there with `--run-only`.
//
// Resolution: `@geastack/parallel` from this package's node_modules (or
// PARALLEL_ROOT), and the compiler that package resolves (or
// PARALLEL_COMPILER_ROOT). Generated artifacts go to node/dist/parallel, the
// project's existing ignored build output.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(HERE, '../..');
const work = path.join(HERE, '../dist/parallel');

const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);

  return at < 0 ? fallback : process.argv[at + 1];
};

const flag = (name) => process.argv.includes(name);

const samples = Number(arg('--samples', '5'));
const only = arg('--only', '').split(',').filter(Boolean);
const remote = arg('--remote', '');
const runOnly = flag('--run-only');
const output = path.resolve(arg('--output', path.join(work, 'parallel.json')));
const sizes = JSON.parse(fs.readFileSync(path.join(HERE, 'sizes.json'), 'utf8'));

const fixtures = fs
  .readdirSync(path.join(HERE, 'fixtures'))
  .filter((file) => file.endsWith('.ts'))
  .map((file) => file.slice(0, -3))
  .sort()
  .filter((fixture) => !only.length || only.includes(fixture));

const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const spawn = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...options });

// ---------------------------------------------------------------- emission

function resolveRoots() {
  const fromBench = createRequire(path.join(packageRoot, 'package.json'));
  let parallelRoot = process.env.PARALLEL_ROOT;

  if (!parallelRoot) {
    try {
      parallelRoot = path.dirname(fromBench.resolve('@geastack/parallel/package.json'));
    } catch {
      throw new Error(
        '@geastack/parallel is not installed here: `npm install @geastack/parallel`, or set PARALLEL_ROOT',
      );
    }
  }

  parallelRoot = fs.realpathSync(parallelRoot);

  const compilerRoot = fs.realpathSync(
    process.env.PARALLEL_COMPILER_ROOT ??
      path.dirname(
        createRequire(path.join(parallelRoot, 'package.json')).resolve(
          '@geastack/compiler/package.json',
        ),
      ),
  );

  return { parallelRoot, compilerRoot };
}

const benchHosts = new Map([
  ['__bench_argv_number', 'gea::bench::argvNumber'],
  ['__bench_now', 'gea::bench::now'],
  ['__bench_report', 'gea::bench::report'],
]);

async function emit() {
  const { parallelRoot, compilerRoot } = resolveRoots();
  const compilerRequire = createRequire(path.join(compilerRoot, 'package.json'));
  const ts = compilerRequire('typescript');
  const { compile } = await import(pathToFileURL(path.join(compilerRoot, 'dist/compiler.js')));

  const { noPluginCapabilities } = await import(
    pathToFileURL(path.join(compilerRoot, 'dist/plugins/model.js'))
  );

  const parallelPlugin = (
    await import(pathToFileURL(path.join(parallelRoot, 'plugin/index.mjs')))
  ).geatscPlugin();

  const benchPlugin = {
    name: 'bench',
    instantiate: () => ({
      producers: () => [],
      lower: () => false,
      capabilities: {
        ...noPluginCapabilities,
        hostFunctions: benchHosts,
        hostPreambles: new Map(
          [...benchHosts.values()].map((name) => [name, ['#include "gea_bench.hpp"']]),
        ),
      },
    }),
  };

  // The runtime headers travel with the emitted C++, so the build uses the
  // runtime of the compiler that emitted it.
  const runtime = path.join(work, 'runtime');
  fs.rmSync(runtime, { recursive: true, force: true });
  fs.cpSync(path.join(compilerRoot, 'src/targets/cpp/runtime'), runtime, { recursive: true });
  fs.copyFileSync(
    path.join(HERE, '../compute/support/gea_bench.hpp'),
    path.join(runtime, 'gea_bench.hpp'),
  );

  const emitted = {
    compiler: JSON.parse(fs.readFileSync(path.join(compilerRoot, 'package.json'), 'utf8')).version,
    compilerSha256: hash(path.join(compilerRoot, 'dist/compiler.js')),
    parallel: JSON.parse(fs.readFileSync(path.join(parallelRoot, 'package.json'), 'utf8')).version,
    parallelSha256: hash(path.join(parallelRoot, 'dist/index.js')),
    fixtures: {},
  };

  for (const fixture of fixtures) {
    const dir = path.join(work, fixture);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const source = fs.readFileSync(path.join(HERE, 'fixtures', fixture + '.ts'), 'utf8');
    fs.writeFileSync(path.join(dir, 'program.ts'), source);
    // Node: the program as written, transpiled the way any TypeScript build would.
    fs.writeFileSync(
      path.join(dir, 'program.mjs'),
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
      }).outputText,
    );

    const timed = (specifier) =>
      `import { main } from '${specifier}';\n` +
      `const n = Number(process.argv[2] ?? '0');\nconst start = performance.now();\nconst result = main(n);\n` +
      `console.log('__bench_ms__ ' + (performance.now() - start));\nconsole.log(String(result));\n`;

    fs.writeFileSync(path.join(dir, 'node-entry.mjs'), timed('./program.mjs'));

    // scriptc compiles npm package code only through its embedded dynamic
    // engine, which would measure that engine rather than scriptc. So it gets
    // the library as source: src/index.ts with `tasks` as the sequential loop
    // that defines it (native/index.js), the program importing that file.
    const library = fs
      .readFileSync(path.join(parallelRoot, 'src/index.ts'), 'utf8')
      .replace(
        /import \{ tasks \} from '@geastack\/parallel\/native'\n/,
        'function tasks(count: number, body: (index: number) => boolean): void {\n' +
          '  for (let index = 0; index < count; index++) {\n    if (body(index)) return\n  }\n}\n',
      );

    if (!library.startsWith('function tasks'))
      throw new Error('could not inline tasks into the library source');
    fs.writeFileSync(path.join(dir, 'scriptc-parallel.ts'), library);
    fs.writeFileSync(
      path.join(dir, 'scriptc-program.ts'),
      source.replace(/from '@geastack\/parallel';/, "from './scriptc-parallel';"),
    );
    fs.writeFileSync(path.join(dir, 'scriptc-entry.ts'), timed('./scriptc-program'));
    const entry = path.join(dir, 'gea-entry.ts');
    fs.writeFileSync(
      entry,
      `import { main } from './program';\ndeclare function __bench_argv_number(): number;\n` +
        `declare function __bench_now(): number;\ndeclare function __bench_report(ms: number, result: number): void;\n` +
        `const n = __bench_argv_number();\nconst start = __bench_now();\nconst result = main(n);\n__bench_report(__bench_now() - start, result);\n`,
    );
    const project = path.join(dir, 'tsconfig.json');
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
        files: [entry, path.join(dir, 'program.ts')],
      }),
    );
    const started = performance.now();
    let row;

    try {
      const result = compile({
        rootFileNames: [entry],
        projectFileName: project,
        plugins: [benchPlugin, parallelPlugin],
        entrySymbol: '__gea_top_level',
        translationUnits: 'single',
        unitBaseName: fixture.replace(/-/g, '_'),
      });

      if (!result.units.length) {
        row = {
          state: 'no-emit',
          blockers: [...result.loweringBlockers, ...result.abiBlockers, ...result.emissionRefusals],
          refusals: (result.refusals ?? []).map((refusal) => refusal.reason),
          diagnostics: (result.diagnostics?.diagnostics ?? [])
            .filter((d) => d.severity === 'root')
            .map((d) => `${d.location?.file}:${d.location?.line}: ${d.message}`),
        };
      } else {
        const units = [];

        for (const unit of result.units) {
          fs.writeFileSync(path.join(dir, unit.fileName), unit.source + '\n');
          if (unit.fileName.endsWith('.cpp')) units.push(unit.fileName);
        }

        row = { state: 'ok', units };
      }
    } catch (error) {
      row = { state: 'compile-failed', error: error.stack ?? String(error) };
    }

    row.emitMs = performance.now() - started;
    emitted.fixtures[fixture] = row;
    console.log(`emit ${fixture.padEnd(16)} ${row.state} ${row.emitMs.toFixed(0)}ms`);
    if (row.state !== 'ok') console.log(JSON.stringify(row, null, 2).slice(0, 4000));
  }

  fs.writeFileSync(path.join(work, 'emitted.json'), JSON.stringify(emitted, null, 2) + '\n');
}

// ---------------------------------------------------------------- shipping

function ship(host) {
  const geastack = path.resolve(packageRoot, '..');
  const { parallelRoot } = resolveRoots();

  const entries = [
    'benchmarks/node/parallel',
    'benchmarks/node/compute/support/gea_bench.hpp',
    'benchmarks/node/dist/parallel',
  ];

  const tar = spawnSync(
    'tar',
    [
      'czf',
      '-',
      '--no-xattrs',
      '--exclude=target',
      ...entries,
      '-C',
      path.dirname(parallelRoot),
      `${path.basename(parallelRoot)}/package.json`,
      `${path.basename(parallelRoot)}/dist`,
      `${path.basename(parallelRoot)}/native`,
    ],
    { cwd: geastack, maxBuffer: 1 << 30, env: { ...process.env, COPYFILE_DISABLE: '1' } },
  );

  if (tar.status !== 0) throw new Error('tar failed: ' + tar.stderr);

  const unpack = spawnSync(
    'ssh',
    [
      host,
      'wsl -d Ubuntu-24.04 -- bash -c "mkdir -p ~/geastack && cd ~/geastack && tar xzf - 2>/dev/null"',
    ],
    { input: tar.stdout, maxBuffer: 1 << 28 },
  );

  if (unpack.status !== 0) throw new Error('unpack failed: ' + unpack.stderr);
}

// ---------------------------------------------------------------- build + measure

const cxx = process.env.CXX ?? 'clang++';

// -ffp-contract=off: JavaScript rounds after every operation, so a fused
// multiply-add would change the answer. Every C++ column gets it.
const cxxFlags = [
  '-std=gnu++20',
  '-O3',
  '-march=native',
  '-DNDEBUG',
  '-ffp-contract=off',
  '-pthread',
];

const cores = os.availableParallelism();

const threadCounts = arg('--threads', '1,all')
  .split(',')
  .map((t) => (t === 'all' ? cores : Number(t)));

function build(command, args, options = {}) {
  const started = performance.now();
  const result = spawn(command, args, { timeout: 900000, ...options });

  return {
    status: result.status,
    ms: performance.now() - started,
    log: result.status === 0 ? undefined : `${result.stdout}\n${result.stderr}`.slice(-6000),
  };
}

function runOnce(exe, args, env) {
  const result = spawn(
    '/usr/bin/time',
    ['-v', 'timeout', '--kill-after=5s', '300s', exe, ...args],
    {
      env: { ...process.env, ...env },
    },
  );

  const out = result.stdout ?? '';
  const inner = /^__bench_ms__\s+([\d.eE+-]+)/m.exec(out);
  const rss = /Maximum resident set size \(kbytes\):\s*(\d+)/.exec(result.stderr ?? '');

  return {
    status: result.status,
    innerMs: inner ? Number(inner[1]) : null,
    rssBytes: rss ? Number(rss[1]) * 1024 : null,
    output: out
      .split('\n')
      .filter((line) => !line.startsWith('__bench_'))
      .join('\n')
      .trim(),
    stderr: result.status !== 0 ? (result.stderr ?? '').slice(-4000) : undefined,
  };
}

function measure(exe, args, env = {}) {
  const runs = [];

  for (let i = 0; i < samples; i++) {
    const run = runOnce(exe, args, env);
    runs.push(run);
    if (run.status !== 0 || !Number.isFinite(run.innerMs)) break;
  }

  const good = runs.every((run) => run.status === 0 && Number.isFinite(run.innerMs));
  const times = runs.map((run) => run.innerMs).sort((a, b) => a - b);

  return {
    state: good ? 'ok' : 'run-failed',
    env,
    runs,
    bestMs: good ? times[0] : null,
    medianMs: good ? times[Math.floor(times.length / 2)] : null,
    rssBytes: good ? Math.min(...runs.map((run) => run.rssBytes)) : null,
  };
}

function runAll() {
  const emitted = JSON.parse(fs.readFileSync(path.join(work, 'emitted.json'), 'utf8'));
  const runtime = path.join(work, 'runtime');
  const scriptc = path.join(packageRoot, 'node_modules/.bin/scriptc');
  const versionOf = (command, args) => spawn(command, args).stdout?.trim();

  const result = {
    utc: new Date().toISOString(),
    emitted: { ...emitted, fixtures: undefined },
    node: process.version,
    scriptc: fs.existsSync(scriptc)
      ? JSON.parse(
          fs.readFileSync(path.join(packageRoot, 'node_modules/scriptc/package.json'), 'utf8'),
        ).version
      : null,
    cxx: versionOf(cxx, ['--version'])?.split('\n')[0],
    rustc: versionOf('rustc', ['--version']),
    cxxFlags,
    cores,
    threadCounts,
    samples,
    sizes,
    machine: versionOf('lscpu', []),
    startLoad: fs.readFileSync('/proc/loadavg', 'utf8').trim(),
    rows: [],
  };

  const save = () => {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  };

  const rustTarget = path.join(work, 'rust-target');

  const rustBuild = build('cargo', ['build', '--release', '--quiet'], {
    cwd: path.join(HERE, 'native-rust'),
    env: { ...process.env, CARGO_TARGET_DIR: rustTarget, RUSTFLAGS: '-C target-cpu=native' },
  });

  result.rustBuild = rustBuild;
  if (rustBuild.status !== 0) console.log('rust build failed\n' + rustBuild.log);

  for (const fixture of fixtures) {
    const dir = path.join(work, fixture);
    const n = String(sizes[fixture]);
    const row = { fixture, n: sizes[fixture], emit: emitted.fixtures[fixture], runtimes: {} };
    result.rows.push(row);

    const threaded = (name, exe, variable) => {
      for (const threads of threadCounts) {
        row.runtimes[`${name}@${threads}`] = measure(exe, [n], { [variable]: String(threads) });
      }
    };

    row.runtimes.node = measure(process.execPath, [path.join(dir, 'node-entry.mjs'), n]);

    if (fs.existsSync(scriptc)) {
      const exe = path.join(dir, 'scriptc');

      const b = build(scriptc, [
        'build',
        path.join(dir, 'scriptc-entry.ts'),
        '-o',
        exe,
        '--strip',
        '--no-keep-llvm',
      ]);

      row.runtimes.scriptc =
        b.status === 0 ? { build: b, ...measure(exe, [n]) } : { state: 'build-failed', build: b };
    } else {
      row.runtimes.scriptc = { state: 'not-installed' };
    }

    if (row.emit?.state === 'ok') {
      const exe = path.join(dir, 'gea');

      const b = build(cxx, [
        ...cxxFlags,
        '-DGEA_RUNTIME_PARALLEL=1',
        '-I' + runtime,
        ...row.emit.units.map((unit) => path.join(dir, unit)),
        '-s',
        '-o',
        exe,
      ]);

      row.geaBuild = b;
      if (b.status === 0) threaded('gea', exe, 'GEA_PARALLEL_THREADS');
      else row.runtimes.gea = { state: 'build-failed', build: b };
    } else {
      row.runtimes.gea = { state: row.emit?.state ?? 'not-emitted' };
    }

    if (rustBuild.status === 0)
      threaded('rust', path.join(rustTarget, 'release', fixture), 'RAYON_NUM_THREADS');

    const cppExe = path.join(dir, 'cpp');

    const cppBuild = build(cxx, [
      ...cxxFlags,
      '-I' + path.join(HERE, 'native-cpp'),
      path.join(HERE, 'native-cpp', fixture + '.cpp'),
      '-s',
      '-o',
      cppExe,
    ]);

    if (cppBuild.status === 0) threaded('cpp', cppExe, 'PAR_THREADS');
    else row.runtimes.cpp = { state: 'build-failed', build: cppBuild };

    const oracle = row.runtimes.node.runs?.[0]?.output;

    for (const runtimeRow of Object.values(row.runtimes)) {
      if (runtimeRow.state === 'ok')
        runtimeRow.match = runtimeRow.runs.every((run) => run.output === oracle);
    }

    console.log(
      fixture.padEnd(16) +
        Object.entries(row.runtimes)
          .map(
            ([name, r]) =>
              `${name}=${r.state === 'ok' ? r.bestMs.toFixed(1) + 'ms' + (r.match ? '' : ' MISMATCH') : r.state}`,
          )
          .join('  '),
    );
    save();
  }

  result.complete = true;
  result.endLoad = fs.readFileSync('/proc/loadavg', 'utf8').trim();
  save();
}

// ---------------------------------------------------------------- main

if (remote) {
  await emit();
  ship(remote);
  // Everything but where to run and where to write, which are this side's.
  const local = new Set(['--remote', '--output']);

  const passthrough = process.argv
    .slice(2)
    .filter((a, i, all) => !local.has(a) && !local.has(all[i - 1]));

  const script = [
    'set -e',
    'source ~/.nvm/nvm.sh >/dev/null 2>&1 || true',
    'export PATH="$HOME/.cargo/bin:$PATH"',
    'cd ~/geastack/benchmarks',
    'mkdir -p node_modules/@geastack && ln -sfn ../../../parallel node_modules/@geastack/parallel',
    `node node/parallel/bench.mjs --run-only ${passthrough.join(' ')}`,
    'cat node/dist/parallel/parallel.json',
  ].join('\n');

  const ran = spawnSync('ssh', [remote, 'wsl -d Ubuntu-24.04 -- bash -s'], {
    input: script,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const json = ran.stdout.indexOf('\n{\n');
  process.stdout.write(json < 0 ? ran.stdout : ran.stdout.slice(0, json + 1));

  if (json >= 0) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, ran.stdout.slice(json + 1));
    console.log('wrote ' + output);
  }

  process.exit(ran.status ?? 1);
} else if (flag('--emit-only')) {
  await emit();
} else if (runOnly) {
  runAll();
} else {
  await emit();
  runAll();
}
