// The release performance gate: the HTTP servers (GeaStack raw node:http and
// Hono against Node, Rust and C++) and the nine @geastack/parallel workloads
// (against Rust + Rayon and a C++ thread pool), measured on this machine and
// compared with the baseline recorded for it.
//
//   node node/release-gate/perf-gate.mjs            # measure and compare
//   node node/release-gate/perf-gate.mjs --write    # take this machine's baseline
//   options: --only http|parallel  --runs N  --fix-loopback
//
// A baseline is several complete runs. Each metric keeps their median and their
// spread, and its noise margin is the larger of a floor and a multiple of that
// spread: the gate learns how noisy each number is on this machine instead of
// trusting one tolerance for 1.7 ms nqueens and 300k rps alike.
//
// A check fails on any of:
// - a GeaStack metric worse than its baseline beyond its margin, in two runs in
//   a row (one bad run is re-measured; a regression is what reproduces);
// - a control (Node, Rust, C++) outside its margin: the machine is not in the
//   state the baseline was taken in, so nothing it measured can be trusted;
// - a published claim that no longer holds within noise (GeaStack's raw server
//   faster than hyper, axum and Drogon; Hono on GeaStack faster than on Node;
//   no parallel workload slower than Rayon; the 20-thread geometric means
//   faster than Rayon and the C++ pool);
// - a different machine, toolchain or setting than the baseline's.
//
// A metric better than its baseline beyond its margin passes, and is reported
// so the baseline can be re-taken.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NODE_DIR = path.resolve(HERE, '..');
const OUT = path.join(NODE_DIR, 'dist/release-gate');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);

const option = (name, fallback) => {
  const at = argv.indexOf(name);

  return at < 0 ? fallback : argv[at + 1];
};

const write = flag('--write');
const suites = option('--only', 'http,parallel').split(',');
const runs = Number(option('--runs', write ? '3' : '1'));

const settings = {
  http: {
    servers: [
      'gea-raw',
      'hono-gea',
      'node-raw',
      'hono-node',
      'rust-hyper',
      'rust-axum',
      'cpp-epoll',
      'cpp-drogon',
    ],
    workers: [1, 4],
    rounds: 3,
    duration: '4s',
    loadThreads: 4,
    connections: 64,
  },
  parallel: {
    samples: 5,
    threads: '1,all',
    // Workloads the published report (results/parallel-parity-2026-10-10.md)
    // shows behind Rayon at 20 threads: spectral-norm at 1.08x. They are not
    // claimed, and still fail the gate if they regress against the baseline.
    behindRayon: ['spectral-norm'],
  },
  // The compilers the published numbers were built with: clang 18 for the
  // HTTP servers (bench/README), clang 22 for the parallel report. A different
  // clang moves every native row at once, so it is part of the settings.
  cxx: { http: 'clang++-18', parallel: 'clang++-22' },
  noise: { floor: 0.04, spreadMultiplier: 1.5 },
};

const gatedHttp = new Set(['gea-raw', 'hono-gea']);

const fail = (message) => {
  console.error(`perf-gate: ${message}`);
  process.exit(1);
};

const capture = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });

  return result.status === 0 ? result.stdout.trim() : null;
};

const exec = (label, command, args, options = {}) => {
  console.log(`perf-gate: ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: NODE_DIR, ...options });
  if (result.status !== 0) fail(`${label} failed (exit ${result.status ?? result.signal})`);
};

// ---------------------------------------------------------------- machine

if (process.platform !== 'linux' || process.arch !== 'x64')
  fail(`needs Linux on x86-64, not ${process.platform}/${process.arch}`);

for (const tool of [
  'wrk',
  'taskset',
  'cargo',
  settings.cxx.http,
  settings.cxx.parallel,
  'python3',
  'ip',
])
  if (!capture('sh', ['-c', `command -v ${tool}`])) fail(`${tool} is not on PATH`);

// WSL2's mirrored networking routes 127.0.0.1 through the Windows host, and
// every fast server then shares one ~150k rps ceiling (bench/http-matrix.py
// refuses to measure it too). The rules return on every WSL restart.
const loopbackRoute = () => capture('ip', ['route', 'get', '127.0.0.1']) ?? '';

if (suites.includes('http') && !loopbackRoute().includes(' dev lo ')) {
  if (!flag('--fix-loopback'))
    fail(
      `127.0.0.1 does not route over lo (${loopbackRoute().split('\n')[0]}).\n` +
        'Pass --fix-loopback to delete the WSL table 127/128 rules (needs passwordless sudo), or run:\n' +
        '  for p in tcp udp; do sudo ip rule del ipproto $p lookup 127; sudo ip rule del ipproto $p lookup 128; done',
    );
  for (const protocol of ['tcp', 'udp'])
    for (const table of ['127', '128'])
      spawnSync('sudo', ['-n', 'ip', 'rule', 'del', 'ipproto', protocol, 'lookup', table]);
  if (!loopbackRoute().includes(' dev lo ')) fail('127.0.0.1 still does not route over lo');
}

// Without idle=poll every vCPU halts between requests and the hypervisor's
// wakeup latency (~100 us a hop under WSL2) caps a single worker at ~45k rps
// for every fast server, against the published 154k-202k: the ordering of the
// servers then says nothing about them.
if (
  suites.includes('http') &&
  !fs.readFileSync('/proc/cmdline', 'utf8').split(/\s+/).includes('idle=poll')
)
  fail(
    'the kernel command line has no idle=poll. Under WSL2 add `kernelCommandLine=idle=poll` to the ' +
      '[wsl2] section of %USERPROFILE%\\.wslconfig and run `wsl --shutdown`.',
  );

// Two disjoint sets of whole physical cores: four for the server, four for wrk.
const topology = capture('lscpu', ['-p=CPU,CORE'])
  .split('\n')
  .filter((line) => !line.startsWith('#'))
  .map((line) => line.split(',').map(Number));

const physical = [...new Set(topology.map(([, core]) => core))].sort((a, b) => a - b);
if (physical.length < 8) fail(`needs 8 physical cores, found ${physical.length}`);

const cpusOf = (cores) =>
  topology
    .filter(([, core]) => cores.includes(core))
    .map(([cpu]) => cpu)
    .join(',');

const serverCpus = cpusOf(physical.slice(0, 4));
const loadCpus = cpusOf(physical.slice(4, 8));

const versionOf = (packageName) => {
  const manifest = path.join(NODE_DIR, '..', 'node_modules', packageName, 'package.json');

  return fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')).version : null;
};

const fingerprint = {
  cpu: /Model name:\s*(.+)/.exec(capture('lscpu', []) ?? '')?.[1].trim(),
  logicalCpus: os.availableParallelism(),
  kernel: os.release(),
  kernelCommandLine: fs.readFileSync('/proc/cmdline', 'utf8').trim(),
  clangHttp: capture(settings.cxx.http, ['--version'])?.split('\n')[0],
  clangParallel: capture(settings.cxx.parallel, ['--version'])?.split('\n')[0],
  rustc: capture('rustc', ['--version']),
  node: process.version,
  wrk: capture('sh', ['-c', 'wrk -v 2>&1 | head -1']),
  hono: versionOf('hono'),
  honoNodeServer: versionOf('@hono/node-server'),
  serverCpus,
  loadCpus,
};

if (suites.includes('http') && (!fingerprint.hono || !fingerprint.honoNodeServer))
  fail('hono and @hono/node-server must be installed in benchmarks/node_modules (npm ci)');

const machineKey = `${fingerprint.cpu}-${fingerprint.logicalCpus}t`
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const baselineFile = path.join(HERE, 'baselines', `${machineKey}.json`);

// A busy machine measures the other work, not this one. Busy is judged by the
// tasks runnable right now (/proc/loadavg's fourth field), not the 1-minute
// average, which still carries the previous suite's own load for minutes after
// it ends. Two runnable tasks are this process and the reader.
const runnable = () => Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[3].split('/')[0]);

const waitForIdle = () => {
  for (let waited = 0; ; waited += 3) {
    const samples = Array.from({ length: 6 }, () => {
      spawnSync('sleep', ['0.5']);

      return runnable();
    });

    const busy = Math.min(...samples);
    if (busy <= 2) return;
    if (waited >= 300) fail(`the machine is busy: ${busy} runnable tasks after waiting 5 minutes`);
    if (waited % 30 === 0) console.log(`perf-gate: waiting for an idle machine (${busy} runnable)`);
  }
};

// ---------------------------------------------------------------- measuring

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const geomean = (values) =>
  Math.exp(values.reduce((sum, v) => sum + Math.log(v), 0) / values.length);

fs.mkdirSync(OUT, { recursive: true });

const build = () => {
  if (suites.includes('http'))
    exec('building the HTTP servers', 'bash', ['bench/build-http.sh', '--no-scriptc'], {
      env: { ...process.env, CXX: settings.cxx.http },
    });
};

let parallelEmitted = false;

/** One complete run: every metric, keyed `<suite>/<what>`. */
const measure = (index) => {
  const metrics = {};

  if (suites.includes('http')) {
    waitForIdle();
    const output = path.join(OUT, `http-${index}.json`);
    const http = settings.http;
    exec(`HTTP run ${index}`, 'python3', [
      'bench/http-matrix.py',
      '--output',
      output,
      '--servers',
      ...http.servers,
      '--workers',
      ...http.workers.map(String),
      '--rounds',
      String(http.rounds),
      '--duration',
      http.duration,
      '--server-cpus',
      serverCpus,
      '--load-cpus',
      loadCpus,
      '--load-threads',
      String(http.loadThreads),
      '--connections',
      String(http.connections),
    ]);
    const result = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (result.complete !== true || result.error)
      fail(`HTTP run ${index} is incomplete: ${result.error}`);
    const groups = new Map();

    for (const sample of result.samples) {
      const key = `http/${sample.server}/w${sample.workers}${sample.path}`;
      groups.set(key, [...(groups.get(key) ?? []), sample.rps]);
    }

    for (const [key, values] of groups) {
      const server = key.split('/')[1];

      metrics[key] = {
        value: median(values),
        better: 'higher',
        unit: 'rps',
        role: gatedHttp.has(server) ? 'gated' : 'control',
      };
    }
  }

  if (suites.includes('parallel')) {
    waitForIdle();
    const output = path.join(OUT, `parallel-${index}.json`);
    exec(
      `parallel run ${index}`,
      'node',
      [
        'parallel/bench.mjs',
        '--no-scriptc',
        '--samples',
        String(settings.parallel.samples),
        '--threads',
        settings.parallel.threads,
        '--output',
        output,
        ...(parallelEmitted ? ['--run-only'] : []),
      ],
      { env: { ...process.env, CXX: settings.cxx.parallel } },
    );
    parallelEmitted = true;
    const result = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (result.complete !== true || result.failures?.length)
      fail(`parallel run ${index} failed: ${(result.failures ?? ['incomplete']).join('; ')}`);

    for (const row of result.rows) {
      for (const [runtime, cell] of Object.entries(row.runtimes)) {
        if (cell.sharedWith) continue;

        metrics[`parallel/${row.fixture}:${row.variant}/${runtime}`] = {
          value: cell.bestMs,
          better: 'lower',
          unit: 'ms',
          role: runtime.startsWith('gea@') ? 'gated' : 'control',
        };
      }
    }
  }

  return metrics;
};

// ---------------------------------------------------------------- judging

/** How far `value` is from `reference`, signed so that positive is worse. */
const worseBy = (metric, value, reference) =>
  metric.better === 'higher' ? (reference - value) / reference : (value - reference) / reference;

const claims = (metrics, marginOf) => {
  const results = [];
  const value = (key) => metrics[key]?.value;

  const faster = (name, gea, other) => {
    if (value(gea) === undefined || value(other) === undefined) return;
    const deficit = worseBy(metrics[gea], value(gea), value(other));
    results.push({ name, deficit, margin: marginOf(gea), pass: deficit <= marginOf(gea) });
  };

  if (suites.includes('http')) {
    for (const workers of settings.http.workers) {
      for (const route of ['/', '/json']) {
        const gea = `http/gea-raw/w${workers}${route}`;
        for (const other of ['rust-hyper', 'rust-axum', 'cpp-drogon'])
          faster(
            `gea-raw faster than ${other}, ${workers} worker(s) ${route}`,
            gea,
            `http/${other}/w${workers}${route}`,
          );
        faster(
          `Hono: GeaStack faster than Node, ${workers} worker(s) ${route}`,
          `http/hono-gea/w${workers}${route}`,
          `http/hono-node/w${workers}${route}`,
        );
      }
    }
  }

  if (suites.includes('parallel')) {
    const all = os.availableParallelism();

    const parity = Object.keys(metrics)
      .filter((key) => key.startsWith('parallel/') && key.endsWith(`:parity/gea@${all}`))
      .map((key) => key.slice('parallel/'.length).split(':')[0]);

    for (const fixture of parity.filter((f) => !settings.parallel.behindRayon.includes(f)))
      faster(
        `${fixture} at ${all} threads: GeaStack not slower than Rayon`,
        `parallel/${fixture}:parity/gea@${all}`,
        `parallel/${fixture}:parity/rust@${all}`,
      );

    for (const other of ['rust', 'cpp']) {
      const ours = parity.map((f) => value(`parallel/${f}:parity/gea@${all}`));
      const theirs = parity.map((f) => value(`parallel/${f}:parity/${other}@${all}`));
      if (ours.includes(undefined) || theirs.includes(undefined) || !parity.length) continue;
      const deficit = geomean(ours) / geomean(theirs) - 1;
      // The geometric mean averages away most per-workload noise: the floor.
      const margin = settings.noise.floor;

      results.push({
        name: `geometric mean at ${all} threads faster than ${other === 'rust' ? 'Rayon' : 'the C++ pool'}`,
        deficit,
        margin,
        pass: deficit <= margin,
      });
    }
  }

  return results;
};

const percent = (x) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;

const printClaims = (results) => {
  for (const claim of results)
    console.log(
      `${claim.pass ? 'ok  ' : 'FAIL'} claim: ${claim.name} (${claim.deficit <= 0 ? 'ahead by' : 'behind by'} ${percent(Math.abs(claim.deficit))}, margin ${percent(claim.margin)})`,
    );
};

// ---------------------------------------------------------------- main

build();

if (write) {
  const samples = Array.from({ length: runs }, (_, i) => measure(i + 1));
  const keys = Object.keys(samples[0]);
  const metrics = {};

  for (const key of keys) {
    const values = samples.map((run) => run[key]?.value);
    if (values.includes(undefined)) fail(`${key} is missing from a run`);
    const middle = median(values);
    const spread = (Math.max(...values) - Math.min(...values)) / middle;

    metrics[key] = {
      ...samples[0][key],
      value: middle,
      runs: values,
      spread,
      margin: Math.max(settings.noise.floor, settings.noise.spreadMultiplier * spread),
    };
  }

  const results = claims(metrics, (key) => metrics[key].margin);
  fs.mkdirSync(path.dirname(baselineFile), { recursive: true });
  fs.writeFileSync(
    baselineFile,
    JSON.stringify(
      { utc: new Date().toISOString(), fingerprint, settings, suites, runs, metrics },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `perf-gate: wrote ${path.relative(process.cwd(), baselineFile)} (${keys.length} metrics)`,
  );

  for (const [key, metric] of Object.entries(metrics))
    console.log(
      `${key.padEnd(48)} ${metric.value.toFixed(metric.unit === 'ms' ? 2 : 0).padStart(10)} ${metric.unit}  spread ${percent(metric.spread)}  margin ${percent(metric.margin)}`,
    );

  printClaims(results);
  if (results.some((claim) => !claim.pass))
    fail('a published claim does not hold on this baseline');
  process.exit(0);
}

if (!fs.existsSync(baselineFile))
  fail(`no baseline for this machine (${machineKey}); take one with --write on an idle machine`);
const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

const differences = [
  ...Object.keys(fingerprint)
    .filter((key) => baseline.fingerprint[key] !== fingerprint[key])
    .map(
      (key) =>
        `${key}: baseline ${JSON.stringify(baseline.fingerprint[key])}, now ${JSON.stringify(fingerprint[key])}`,
    ),
  ...(JSON.stringify(baseline.settings) !== JSON.stringify(settings)
    ? ['the gate settings changed']
    : []),
  ...suites
    .filter((suite) => !baseline.suites.includes(suite))
    .map((suite) => `the baseline has no ${suite} suite`),
];

if (differences.length)
  fail(
    `this machine is not the one the baseline was taken on:\n  ${differences.join('\n  ')}\n` +
      'Re-take the baseline with --write once the change is intended.',
  );

const marginOf = (key) => baseline.metrics[key]?.margin ?? settings.noise.floor;

const judge = (metrics) => {
  const verdicts = [];

  for (const [key, reference] of Object.entries(baseline.metrics)) {
    if (!suites.includes(key.split('/')[0])) continue;
    const metric = metrics[key];

    if (!metric) {
      verdicts.push({ key, reference, state: 'missing' });
      continue;
    }

    const delta = worseBy(reference, metric.value, reference.value);
    const state = delta > reference.margin ? 'worse' : delta < -reference.margin ? 'better' : 'ok';
    verdicts.push({ key, reference, value: metric.value, delta, state });
  }

  return verdicts;
};

const first = measure(1);
let verdicts = judge(first);
let measured = first;
const regressed = (list) => list.filter((v) => v.state === 'worse' || v.state === 'missing');

if (regressed(verdicts).length) {
  console.log(
    `perf-gate: ${regressed(verdicts).length} metric(s) outside their margin; measuring again to confirm`,
  );
  const second = measure(2);
  const confirm = judge(second);
  const persistent = new Set(regressed(confirm).map((v) => v.key));
  // A metric fails only when both runs put it outside its margin; the report
  // shows the second run, the one that confirmed it.
  verdicts = verdicts.map((v) =>
    persistent.has(v.key)
      ? confirm.find((c) => c.key === v.key)
      : v.state === 'worse'
        ? { ...v, state: 'ok', recovered: true }
        : v,
  );
  measured = Object.fromEntries(
    Object.keys(first).map((key) => [key, persistent.has(key) ? second[key] : first[key]]),
  );
}

for (const v of verdicts) {
  const shown =
    v.state === 'missing'
      ? 'missing'
      : `${v.value.toFixed(v.reference.unit === 'ms' ? 2 : 0)} ${v.reference.unit} vs ${v.reference.value.toFixed(v.reference.unit === 'ms' ? 2 : 0)} (${percent(-v.delta)}, margin ${percent(v.reference.margin)})`;

  const tag = { ok: 'ok  ', better: 'BETTER', worse: 'WORSE', missing: 'MISSING' }[v.state];
  console.log(
    `${tag.padEnd(7)} ${v.reference.role === 'gated' ? 'gea    ' : 'control'} ${v.key.padEnd(48)} ${shown}${v.recovered ? ' (recovered on re-run)' : ''}`,
  );
}

const results = claims(measured, marginOf);
printClaims(results);

const gatedFailures = verdicts.filter((v) => v.reference.role === 'gated' && regressed([v]).length);

const controlFailures = verdicts.filter(
  (v) => v.reference.role === 'control' && regressed([v]).length,
);

const claimFailures = results.filter((claim) => !claim.pass);
const improved = verdicts.filter((v) => v.state === 'better');

if (improved.length)
  console.log(
    `perf-gate: ${improved.length} metric(s) improved beyond their margin; re-take the baseline with --write`,
  );

if (controlFailures.length)
  console.error(
    `perf-gate: ${controlFailures.length} control metric(s) moved outside their margin -- the machine is not in the state the baseline was taken in (load, frequency, kernel), so this run proves nothing either way`,
  );

if (gatedFailures.length || controlFailures.length || claimFailures.length)
  fail(
    `${gatedFailures.length} GeaStack regression(s), ${controlFailures.length} control drift(s), ${claimFailures.length} failed claim(s)`,
  );

console.log(`perf-gate: ${verdicts.length} metrics and ${results.length} claims within noise`);
