import { readFileSync } from 'node:fs';

export const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url)));

export const names = catalog.cases.map((item) => item.name);

export function validateResults(rows, { cases = catalog.cases, samples = catalog.samples } = {}) {
  if (rows.length !== cases.length || new Set(rows.map((row) => row.name)).size !== cases.length)
    throw new Error('Missing or duplicate benchmark results');

  for (let i = 0; i < cases.length; i++) {
    const row = rows[i],
      fixture = cases[i];

    if (row.name !== fixture.name) throw new Error('Unexpected benchmark case order');
    if (row.ok !== true || row.samples !== samples || row.warmup !== catalog.warmup)
      throw new Error('Failed or unexpected case: ' + row.name);
    for (const key of [
      'work_p50_us',
      'work_p95_us',
      'work_p99_us',
      'work_max_us',
      'cadence_p50_us',
      'cadence_p95_us',
      'fps',
      'internal_min_bytes',
      'psram_min_bytes',
    ])
      if (!Number.isFinite(row[key]) || row[key] <= 0)
        throw new Error('Invalid metric ' + row.name + '.' + key);
    if (!(
      row.work_p50_us <= row.work_p95_us &&
      row.work_p95_us <= row.work_p99_us &&
      row.work_p99_us <= row.work_max_us
    ))
      throw new Error('Invalid percentiles: ' + row.name);
    if (row.cadence_p50_us > row.cadence_p95_us)
      throw new Error('Invalid cadence percentiles: ' + row.name);
    if (!Number.isInteger(row.over_16ms) || row.over_16ms < 0 || row.over_16ms > samples)
      throw new Error('Invalid frame budget count: ' + row.name);
    if (
      !Number.isInteger(row.node_bytes) ||
      row.node_bytes <= 0 ||
      !/^\d+$/.test(row.geometry_hash) ||
      BigInt(row.geometry_hash) > 18446744073709551615n
    )
      throw new Error('Invalid node/geometry metadata: ' + row.name);
    if (
      !row.checks ||
      fixture.checks.some((check) => row.checks[check] !== true) ||
      Object.values(row.checks).some((result) => result !== true)
    )
      throw new Error('Failed or missing fixture checks: ' + row.name);
    if (
      !row.observations ||
      Object.values(row.observations).some((value) => !Number.isFinite(value))
    )
      throw new Error('Invalid fixture observations: ' + row.name);
  }

  return rows;
}

export const fault =
  /Guru Meditation|panic'ed|abort\(\) was called|ESP_ERROR_CHECK failed|Task watchdog got triggered|CORRUPT HEAP|Stack canary|Brownout detector|assert failed|CSS_BENCH ERROR|CSS_BENCH.*ok=false/;

export function parseResultLine(line) {
  const marker = 'CSS_BENCH RESULT ';
  const offset = line.indexOf(marker);

  return offset < 0 ? null : JSON.parse(line.slice(offset + marker.length));
}

export function parseLog(log, options = {}) {
  if (fault.test(log)) throw new Error('Device fault or failed suite; inspect the captured log');

  const rows = log
    .split(/\r?\n/)
    .filter((line) => line.includes('CSS_BENCH RESULT '))
    .map(parseResultLine);

  validateResults(rows, options);
  if (!log.includes(`CSS_BENCH DONE cases=${rows.length} ok=true`))
    throw new Error('Missing successful suite completion');

  return rows;
}
