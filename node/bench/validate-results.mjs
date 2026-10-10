/** The implementation variants a fixture can have. `parity` is every fixture:
 * all languages perform the same task the same way. `idiomatic` exists only
 * where a language's own way differs; its sources live in an `idiomatic/`
 * directory beside the parity ones, and a language without one runs its parity
 * source.
 */
export const variants = ['parity', 'idiomatic'];

/** A result row's identity: the fixture name, prefixed `idiomatic/` for that variant. */
export function rowKey(row) {
  const name = row.fx ?? row.fixture;

  return row.variant && row.variant !== 'parity' ? `${row.variant}/${name}` : name;
}

/** A completed harness is not a successful benchmark when a cell failed or
 * differed from Node. Preserve the raw results before returning this verdict.
 */
export function benchmarkFailures(result, expectedFixtures, expectedRuntimes) {
  if (result.mode === 'verification')
    return verificationFailures(result, expectedFixtures, expectedRuntimes);
  const failures = [];

  if (expectedFixtures.length === 0) failures.push('no benchmark fixtures were selected');
  if (!Number.isInteger(result.samples) || result.samples < 1)
    failures.push('the sample count must be a positive integer');
  if (result.complete !== true) failures.push('the benchmark run is incomplete');

  for (const fixture of expectedFixtures) {
    const rows = result.rows.filter((row) => rowKey(row) === fixture);

    if (rows.length !== 1) {
      failures.push(`${fixture}: expected exactly one result row, got ${rows.length}`);
      continue;
    }

    for (const name of expectedRuntimes) {
      const cell = rows[0].runtimes?.[name];

      if (cell?.state !== 'ok') failures.push(`${fixture}/${name}: ${cell?.state ?? 'missing'}`);
      else if (cell.match !== true) failures.push(`${fixture}/${name}: output differs from Node`);
      else if (
        !Number.isFinite(cell.bestMs) ||
        cell.bestMs < 0 ||
        !Array.isArray(cell.runs) ||
        cell.runs.length !== result.samples ||
        cell.runs.some(
          (run) => run.status !== 0 || !Number.isFinite(run.innerMs) || run.innerMs < 0,
        )
      )
        failures.push(`${fixture}/${name}: invalid or incomplete samples`);
      else if (
        cell.startup !== undefined &&
        (!Array.isArray(cell.startup) ||
          cell.startup.length !== result.samples ||
          cell.startup.some((run) => run.status !== 0 || !Number.isFinite(run.ms) || run.ms < 0))
      )
        failures.push(`${fixture}/${name}: invalid or incomplete startup samples`);
    }
  }

  return failures;
}

/** Differential correctness checks carry actual outputs, never placeholder timing samples. */
export function verificationFailures(result, expectedFixtures, expectedRuntimes) {
  const failures = [];

  if (result.mode !== 'verification') failures.push('not a verification result');
  if (result.complete !== true) failures.push('the verification run is incomplete');
  if (!expectedFixtures.length) failures.push('no verification fixtures were selected');

  for (const fixture of expectedFixtures) {
    const rows = result.rows.filter((row) => rowKey(row) === fixture);

    if (rows.length !== 1) {
      failures.push(`${fixture}: expected exactly one result row, got ${rows.length}`);
      continue;
    }

    const row = rows[0];
    const counts = row.counts ?? result.counts;

    if (
      !Array.isArray(counts) ||
      !counts.length ||
      counts.some((count) => !Number.isSafeInteger(count) || count < 0) ||
      new Set(counts).size !== counts.length
    ) {
      failures.push(`${fixture}: invalid verification workload counts`);
      continue;
    }

    const oracle = row.runtimes?.node?.runs;

    for (const name of expectedRuntimes) {
      const cell = row.runtimes?.[name];

      if (cell?.state !== 'ok') {
        failures.push(`${fixture}/${name}: ${cell?.state ?? 'missing'}`);
        continue;
      }

      if (
        !Array.isArray(cell.runs) ||
        cell.runs.length !== counts.length ||
        cell.runs.some(
          (run, index) =>
            run.iterations !== counts[index] ||
            run.status !== 0 ||
            typeof run.output !== 'string' ||
            run.output.length === 0,
        )
      ) {
        failures.push(`${fixture}/${name}: incomplete or failed verification runs`);
        continue;
      }

      if (
        cell.match !== true ||
        !Array.isArray(oracle) ||
        cell.runs.some((run, index) => run.output !== oracle[index]?.output)
      )
        failures.push(`${fixture}/${name}: output differs from Node`);
    }
  }

  return failures;
}
