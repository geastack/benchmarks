// Differential output and workload-scaling checks for an existing Linux run.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { rowKey } from '../bench/validate-results.mjs';

const baselinePath = path.resolve(process.argv[2]);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const work = path.dirname(baselinePath);
const output = path.resolve(process.argv[3] ?? path.join(work, 'verification.json'));
const runtimes = ['node', 'cpp', 'gea', 'scriptc'];

const scalingFixtures = new Set([
  'array_read',
  'array_write',
  'closure',
  'json_parse_nested',
  'matrix_multiply',
  'matrix_multiply_nested',
  'math_intensive',
  'string_concat',
]);

const result = { baseline: path.basename(baselinePath), outputChecks: [], scaling: [] };

// A runtime an idiomatic row shares with parity ran the parity build.
const stemOf = (row, runtime) =>
  path.join(
    work,
    !row.variant || row.variant === 'parity' || row.runtimes?.[runtime]?.sharedWith
      ? 'compute-' + row.fx
      : `compute-${row.variant}-${row.fx}`,
  );

function run(row, runtime, iterations) {
  const stem = stemOf(row, runtime);
  const command = runtime === 'node' ? process.execPath : stem + '-' + runtime;
  const args = runtime === 'node' ? [stem + '-node.mjs', String(iterations)] : [String(iterations)];
  const start = performance.now();

  const processResult = spawnSync(
    'timeout',
    ['--kill-after=5s', '30s', 'taskset', '-c', '0', command, ...args],
    {
      encoding: 'utf8',
      env: { ...process.env, GEATSC_BENCH_TIMING: '1' },
      timeout: 35000,
      maxBuffer: 1024 * 1024,
    },
  );

  const stdout = processResult.stdout ?? '';
  const timing = /^__bench_ms__\s+([\d.eE+-]+)$/m.exec(stdout);

  return {
    status: processResult.status,
    innerMs: timing ? Number(timing[1]) : null,
    wallMs: performance.now() - start,
    output: stdout
      .split('\n')
      .filter((line) => !line.startsWith('__bench_'))
      .join('\n')
      .trim(),
    error: processResult.error?.message,
    stderr: processResult.status ? processResult.stderr : undefined,
  };
}

function save() {
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}

for (const row of baseline.rows) {
  // The full-size sieve already times out; its zero-iteration path can still be checked.
  const counts = row.fx === 'prime_sieve' ? [0] : row.iters <= 2 ? [0, 1, 2] : [0, 1, 17, 257];

  for (const iterations of counts) {
    const checks = Object.fromEntries(
      runtimes.map((runtime) => [runtime, run(row, runtime, iterations)]),
    );

    const oracle = checks.node;

    const match = Object.values(checks).every(
      (check) =>
        check.status === 0 &&
        Number.isFinite(check.innerMs) &&
        check.innerMs >= 0 &&
        check.wallMs >= check.innerMs &&
        check.output === oracle.output,
    );

    result.outputChecks.push({ fixture: rowKey(row), iterations, match, runtimes: checks });
    save();
  }

  console.log(rowKey(row) + ': output checks complete');

  if (!scalingFixtures.has(row.fx)) continue;

  const countsToScale =
    row.iters === 1 ? [1, 2] : [Math.floor(row.iters / 2), row.iters, row.iters * 2];

  for (const iterations of countsToScale) {
    const checks = Object.fromEntries(
      runtimes.map((runtime) => [
        runtime,
        Array.from({ length: 3 }, () => run(row, runtime, iterations)),
      ]),
    );

    const oracle = checks.node[0].output;

    const match = Object.values(checks).every((runs) =>
      runs.every((check) => check.status === 0 && check.output === oracle),
    );

    result.scaling.push({ fixture: rowKey(row), iterations, match, runtimes: checks });
    save();
  }
}

result.complete = true;
result.ok =
  result.outputChecks.every((check) => check.match) && result.scaling.every((check) => check.match);
save();
console.log(
  JSON.stringify({
    ok: result.ok,
    checks: result.outputChecks.length,
    scaling: result.scaling.length,
  }),
);
process.exitCode = result.ok ? 0 : 1;
