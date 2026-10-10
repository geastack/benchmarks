import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function parallelSourcePaths(parallelRoot) {
  if (!path.isAbsolute(parallelRoot))
    throw new Error('The parallel source root must be canonical and absolute');

  return {
    '@geastack/parallel': [path.join(parallelRoot, 'src/index.ts')],
    '@geastack/parallel/native': [path.join(parallelRoot, 'native/index.d.ts')],
  };
}

export function nodeParallelLibrarySource(source, nativeEntry) {
  const imports = [...source.matchAll(/\bfrom\s*(['"])@geastack\/parallel\/native\1/g)];
  if (imports.length !== 1)
    throw new Error('The parallel library must name its one actual native entry');

  return source.replace(imports[0][0], `from ${JSON.stringify(pathToFileURL(nativeEntry).href)}`);
}

export function verificationOracleAvailable(cell, counts) {
  return (
    cell?.state === 'ok' &&
    Array.isArray(cell.runs) &&
    cell.runs.length === counts.length &&
    cell.runs.every(
      (run, index) =>
        run.iterations === counts[index] &&
        run.status === 0 &&
        typeof run.output === 'string' &&
        run.output.length > 0,
    )
  );
}

export function nativeBuildJobs(environment = process.env) {
  const jobs = Number(environment.CARGO_BUILD_JOBS ?? '2');

  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 2)
    throw new Error('CARGO_BUILD_JOBS must be 1 or 2 to respect the native test budget');

  return jobs;
}

export function nativeRustFlags(environment = process.env) {
  return environment.RUSTFLAGS ?? '-C target-cpu=native';
}

export function verificationCounts(fixture) {
  // Include nonzero queen solutions; a zero-dimensional spectral norm has no
  // mathematical result, so exercise its smallest defined matrices instead.
  if (fixture === 'nqueens') return [2, 4, 5];
  if (fixture === 'spectral-norm') return [1, 2, 4];

  return [0, 1, 2];
}

export function verifyWorkload(command, prefix, counts, environment = {}) {
  const env = { ...process.env, ...environment, GEA_BENCH_VERIFY_ONLY: '1' };
  delete env.GEATSC_BENCH_TIMING;

  const runs = counts.map((iterations) => {
    const result = spawnSync(command, [...prefix, String(iterations)], {
      encoding: 'utf8',
      env,
      timeout: 300000,
      maxBuffer: 1024 * 1024,
    });

    return {
      iterations,
      status: result.status,
      output: result.stdout?.trim() ?? '',
      ...(result.signal ? { signal: result.signal } : {}),
      ...(result.error ? { error: result.error.message } : {}),
      ...(result.status !== 0 ? { stderr: result.stderr } : {}),
    };
  });

  return {
    state: runs.every((run) => run.status === 0) ? 'ok' : 'run-failed',
    env: environment,
    runs,
  };
}
