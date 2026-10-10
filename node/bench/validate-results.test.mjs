import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { benchmarkFailures, verificationFailures } from './validate-results.mjs';
import { benchmarkCompilerInputs } from './compiler-input.mjs';
import { assertCompilerInputs } from '../../../node-compat/scripts/compiler-input.mjs';

const cell = () => ({ state: 'ok', match: true, bestMs: 2, runs: [{ status: 0, innerMs: 2 }] });

const result = () => ({
  complete: true,
  samples: 1,
  rows: [{ fx: 'work', runtimes: { gea: cell(), node: cell() } }],
});

test('successful output equality needs every requested fixture, runtime and sample', () => {
  assert.deepEqual(benchmarkFailures(result(), ['work'], ['gea', 'node']), []);

  for (const state of ['build-failed', 'no-emit', 'run-failed', 'not-installed']) {
    const data = result();
    data.rows[0].runtimes.gea.state = state;
    assert.match(benchmarkFailures(data, ['work'], ['gea'])[0], new RegExp(state));
  }

  const mismatch = result();
  mismatch.rows[0].runtimes.gea.match = false;
  assert.match(benchmarkFailures(mismatch, ['work'], ['gea'])[0], /differs/);
  assert.match(benchmarkFailures(result(), ['missing'], ['gea'])[0], /one result row/);
  assert.match(benchmarkFailures(result(), ['work'], ['cpp'])[0], /missing/);
});

test('timeouts, malformed samples and interrupted runs fail despite an ok label', () => {
  const timeout = result();
  timeout.rows[0].runtimes.gea.runs[0].status = 124;
  assert.match(benchmarkFailures(timeout, ['work'], ['gea'])[0], /samples/);
  const partial = result();
  partial.samples = 2;
  assert.match(benchmarkFailures(partial, ['work'], ['gea'])[0], /samples/);
  const incomplete = result();
  incomplete.complete = false;
  assert.match(benchmarkFailures(incomplete, ['work'], ['gea'])[0], /incomplete/);
  const startup = result();
  startup.rows[0].runtimes.gea.startup = [{ status: 124, ms: 1 }];
  assert.match(benchmarkFailures(startup, ['work'], ['gea'])[0], /startup samples/);
});

test('untimed verification compares every workload count to its actual Node output', () => {
  const data = {
    mode: 'verification',
    complete: true,
    counts: [0, 1, 2],
    rows: [
      {
        fx: 'work',
        runtimes: Object.fromEntries(
          ['node', 'gea'].map((name) => [
            name,
            {
              state: 'ok',
              match: true,
              runs: [0, 1, 2].map((iterations) => ({
                iterations,
                status: 0,
                output: String(iterations * 7),
              })),
            },
          ]),
        ),
      },
    ],
  };

  assert.deepEqual(benchmarkFailures(data, ['work'], ['node', 'gea']), []);
  const mismatch = structuredClone(data);
  mismatch.rows[0].runtimes.gea.runs[1].output = '0';
  assert.match(verificationFailures(mismatch, ['work'], ['gea'])[0], /differs from Node/);
  const failed = structuredClone(data);
  failed.rows[0].runtimes.gea.runs[0].status = 124;
  assert.match(verificationFailures(failed, ['work'], ['gea'])[0], /failed verification/);
  const omitted = structuredClone(data);
  omitted.rows[0].runtimes.gea.runs.pop();
  assert.match(verificationFailures(omitted, ['work'], ['gea'])[0], /incomplete/);
  const wrongCount = structuredClone(data);
  wrongCount.rows[0].runtimes.gea.runs[2].iterations = 1;
  assert.match(verificationFailures(wrongCount, ['work'], ['gea'])[0], /incomplete/);
  const empty = structuredClone(data);
  empty.counts = [];
  assert.match(verificationFailures(empty, ['work'], ['gea'])[0], /workload counts/);
});

test('compiler selection names the shared build and authenticates all JavaScript and runtime inputs', () => {
  const inputs = benchmarkCompilerInputs({});
  assert.match(inputs.compilerRoot, /[/\\]compiler$/);
  assert.match(inputs.compilerDistHash, /^[a-f0-9]{64}$/);
  assert.match(inputs.runtimeHash, /^[a-f0-9]{64}$/);
  assertCompilerInputs(inputs);
  assert.throws(() => assertCompilerInputs({ ...inputs, runtimeHash: 'changed' }), /changed/);
  assert.throws(
    () =>
      benchmarkCompilerInputs({
        GEA_COMPILER_DIR: new URL(
          '../../../benchmarks/node_modules/@geastack/compiler/',
          import.meta.url,
        ).pathname,
      }),
    /private or registry/,
  );
});

test('compute reports use recorded machine, samples and compiler provenance', () => {
  const data = {
    utc: '2026-10-07T12:00:00.000Z',
    complete: true,
    samples: 3,
    packages: {
      '@geastack/compiler': 'current',
      '@geastack/node-compat': 'target',
      scriptc: 'script',
    },
    node: 'v24',
    cpu: '2',
    machine: 'Model name: Recorded CPU\n',
    cxx: 'Recorded Clang\n',
    flags: ['-O3'],
    compilerInputs: {
      compilerRoot: '/canonical/compiler',
      compilerDistHash: 'js-digest',
      runtimeHash: 'header-digest',
    },
    rows: [],
  };

  const rendered = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../compute/render-npm.mjs', import.meta.url)), '/dev/stdin'],
    { input: JSON.stringify(data), encoding: 'utf8' },
  );

  assert.equal(rendered.status, 0, rendered.stderr);
  assert.match(rendered.stdout, /2026-10-07/);
  assert.match(rendered.stdout, /Recorded CPU/);
  assert.match(rendered.stdout, /fastest of 3/);
  assert.match(rendered.stdout, /logical CPU 2/);
  assert.match(rendered.stdout, /js-digest/);
  assert.match(rendered.stdout, /header-digest/);
  assert.doesNotMatch(rendered.stdout, /Xeon|2026-10-05|No compiler source changes|NaN/);
});
