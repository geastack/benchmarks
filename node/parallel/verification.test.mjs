import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  nativeBuildJobs,
  nativeRustFlags,
  nodeParallelLibrarySource,
  parallelSourcePaths,
  verificationCounts,
  verificationOracleAvailable,
  verifyWorkload,
} from './verification.mjs';

test('the workspace override resolves actual library and native declarations without an installed package', () => {
  const compiler = createRequire(new URL('../../../compiler/package.json', import.meta.url));
  const ts = compiler('typescript');
  const parallel = realpathSync(fileURLToPath(new URL('../../../parallel/', import.meta.url)));
  const entry = fileURLToPath(new URL('../dist/parallel/binary-trees/program.ts', import.meta.url));
  const options = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    paths: parallelSourcePaths(parallel),
  };
  for (const [specifier, expected] of [
    ['@geastack/parallel', 'src/index.ts'],
    ['@geastack/parallel/native', 'native/index.d.ts'],
  ]) {
    const resolved = ts.resolveModuleName(specifier, entry, options, ts.sys).resolvedModule;
    assert.ok(resolved, specifier);
    assert.equal(
      realpathSync(resolved.resolvedFileName),
      realpathSync(path.join(parallel, expected)),
    );
  }
  assert.throws(() => parallelSourcePaths('../parallel'), /canonical and absolute/);
});

test('the Node reference uses the exact workspace native implementation', async () => {
  const compiler = createRequire(new URL('../../../compiler/package.json', import.meta.url));
  const ts = compiler('typescript');
  const parallel = realpathSync(fileURLToPath(new URL('../../../parallel/', import.meta.url)));
  const source = ts.transpileModule(readFileSync(path.join(parallel, 'src/index.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  const redirected = nodeParallelLibrarySource(source, path.join(parallel, 'native/index.js'));
  const library = await import(
    'data:text/javascript;base64,' + Buffer.from(redirected).toString('base64')
  );
  assert.deepEqual(
    library.par([1, 2, 3]).map((value) => value * value),
    [1, 4, 9],
  );
  assert.throws(
    () => nodeParallelLibrarySource('export {};', path.join(parallel, 'native/index.js')),
    /one actual native entry/,
  );
});

test('failed or incomplete Node execution leaves comparison unavailable rather than inventing a mismatch', () => {
  const counts = [0, 1, 2];
  const cell = {
    state: 'ok',
    runs: counts.map((iterations) => ({ iterations, status: 0, output: String(iterations) })),
  };
  assert.equal(verificationOracleAvailable(cell, counts), true);
  assert.equal(verificationOracleAvailable({ ...cell, state: 'run-failed' }, counts), false);
  assert.equal(
    verificationOracleAvailable({ ...cell, runs: cell.runs.slice(0, 2) }, counts),
    false,
  );
  assert.equal(
    verificationOracleAvailable(
      { ...cell, runs: cell.runs.map((run) => ({ ...run, status: 1 })) },
      counts,
    ),
    false,
  );
  assert.equal(
    verificationOracleAvailable(
      { ...cell, runs: cell.runs.map((run) => ({ ...run, output: '' })) },
      counts,
    ),
    false,
  );
});

test('the native runner honors a one-job budget and refuses invalid or oversubscribed configurations', () => {
  assert.equal(nativeBuildJobs({}), 2);
  assert.equal(nativeBuildJobs({ CARGO_BUILD_JOBS: '1' }), 1);
  assert.equal(nativeBuildJobs({ CARGO_BUILD_JOBS: '2' }), 2);

  for (const value of ['', '0', '-1', '3', '1.5', 'all'])
    assert.throws(() => nativeBuildJobs({ CARGO_BUILD_JOBS: value }), /must be 1 or 2/);
});

test('the Rust build retains an explicit CPU target for translated correctness environments', () => {
  assert.equal(nativeRustFlags({}), '-C target-cpu=native');
  assert.equal(nativeRustFlags({ RUSTFLAGS: '-C target-cpu=x86-64' }), '-C target-cpu=x86-64');
  assert.equal(nativeRustFlags({ RUSTFLAGS: '' }), '');
});

test('verification executes each input and retains its distinct output without timings', () => {
  const cell = verifyWorkload(
    process.execPath,
    ['-e', 'console.log(Number(process.argv[1]) ** 2)'],
    [0, 1, 2],
  );

  assert.equal(cell.state, 'ok');
  assert.deepEqual(
    cell.runs.map(({ iterations, status, output }) => ({ iterations, status, output })),
    [
      { iterations: 0, status: 0, output: '0' },
      { iterations: 1, status: 0, output: '1' },
      { iterations: 2, status: 0, output: '4' },
    ],
  );
  assert.equal('bestMs' in cell, false);
  assert.equal(
    cell.runs.some((run) => 'innerMs' in run || 'wallMs' in run),
    false,
  );
});

test('a failed input is a failed verification cell and later inputs remain accounted', () => {
  const cell = verifyWorkload(
    process.execPath,
    ['-e', 'process.exit(Number(process.argv[1]) === 1 ? 7 : 0)'],
    [0, 1, 2],
  );

  assert.equal(cell.state, 'run-failed');
  assert.deepEqual(
    cell.runs.map((run) => run.status),
    [0, 7, 0],
  );
});

test('untimed verification disables inherited timing while retaining thread configuration', () => {
  const cell = verifyWorkload(
    process.execPath,
    [
      '-e',
      'console.log([process.env.GEA_BENCH_VERIFY_ONLY,process.env.GEATSC_BENCH_TIMING,process.env.GEA_PARALLEL_THREADS].join(":"))',
    ],
    [1],
    {
      GEATSC_BENCH_TIMING: '1',
      GEA_PARALLEL_THREADS: '2',
    },
  );

  assert.equal(cell.runs[0].output, '1::2');
});

test('verification sizes include meaningful queen solutions and defined spectral matrices', () => {
  assert.deepEqual(verificationCounts('nqueens'), [2, 4, 5]);
  assert.deepEqual(verificationCounts('spectral-norm'), [1, 2, 4]);
  assert.deepEqual(verificationCounts('sort'), [0, 1, 2]);
});
