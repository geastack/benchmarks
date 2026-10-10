import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog, parseLog, validateResults } from './results.mjs';

function verificationRows() {
  return catalog.cases.map((fixture) => ({
    mode: 'verification',
    name: fixture.name,
    ok: true,
    samples: catalog.samples,
    warmup: catalog.warmup,
    node_bytes: 128,
    geometry_hash: '123',
    pixel_hash: '456',
    checks: Object.fromEntries(fixture.checks.map((name) => [name, true])),
    observations: {},
  }));
}

test('untimed CSS verification requires all real catalog checks and output hashes', () => {
  const rows = verificationRows();
  assert.equal(rows.length, 19);

  const log =
    rows.map((row) => 'CSS_BENCH RESULT ' + JSON.stringify(row)).join('\n') +
    `\nCSS_BENCH DONE cases=${rows.length} ok=true\n`;

  assert.deepEqual(parseLog(log, { verification: true }), rows);
});

test('missing, duplicated or failed CSS scenes cannot pass verification', () => {
  assert.throws(
    () => validateResults(verificationRows().slice(1), { verification: true }),
    /Missing/,
  );
  const duplicate = verificationRows();
  duplicate[1] = duplicate[0];
  assert.throws(() => validateResults(duplicate, { verification: true }), /duplicate/);
  const failed = verificationRows();
  failed[0].checks[catalog.cases[0].checks[0]] = false;
  assert.throws(
    () => validateResults(failed, { verification: true }),
    /Failed or missing fixture checks/,
  );
});

test('timed rows and invalid hashes cannot stand in for untimed verification', () => {
  const timed = verificationRows();
  timed[0].work_p50_us = 1;
  assert.throws(() => validateResults(timed, { verification: true }), /Timed output/);
  const invalid = verificationRows();
  invalid[0].pixel_hash = 'NaN';
  assert.throws(() => validateResults(invalid, { verification: true }), /Invalid node\/geometry/);
  assert.throws(() => validateResults(verificationRows()), /Invalid metric/);
});

test('a CSS log requires successful completion after all scenes', () => {
  const log = verificationRows()
    .map((row) => 'CSS_BENCH RESULT ' + JSON.stringify(row))
    .join('\n');

  assert.throws(() => parseLog(log, { verification: true }), /Missing successful suite completion/);
});
