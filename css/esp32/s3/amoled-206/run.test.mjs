import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertProvenance, names, parseLog } from './run.mjs';
import { catalog, parseResultLine, fault } from '../../../shared/results.mjs';

function validLog() {
  const rows = names.map((name) => ({
    name,
    ok: true,
    samples: 240,
    warmup: 60,
    work_p50_us: 1000,
    work_p95_us: 1500,
    work_p99_us: 1800,
    work_max_us: 2000,
    cadence_p50_us: 16667,
    cadence_p95_us: 17000,
    fps: 59.9,
    internal_min_bytes: 100000,
    psram_min_bytes: 1000000,
    checks: Object.fromEntries(
      catalog.cases.find((item) => item.name === name).checks.map((check) => [check, true]),
    ),
    observations: { scroll_min: 0, scroll_max: 200 },
    over_16ms: 0,
    node_bytes: 664,
    geometry_hash: '123',
    scroll_min: 0,
    scroll_max: 200,
  }));

  return (
    rows.map((row) => 'CSS_BENCH RESULT ' + JSON.stringify(row)).join('\n') +
    `\nCSS_BENCH DONE cases=${names.length} ok=true\n`
  );
}

test('requires complete, fault-free results with valid distributions', () => {
  assert.equal(parseLog(validLog()).length, names.length);
  assert.throws(
    () => parseLog(validLog().replace(`CSS_BENCH DONE cases=${names.length} ok=true`, '')),
    /completion/,
  );
  assert.throws(() => parseLog('Guru Meditation Error\n' + validLog()), /fault/);
  assert.throws(() => parseLog(validLog() + 'abort() was called at PC 0x1'), /fault/);
  assert.throws(() => parseLog(validLog().replace('"ok":true', '"ok":false')), /Failed/);
  assert.throws(
    () => parseLog(validLog().replace('"work_p95_us":1500', '"work_p95_us":900')),
    /percentiles/,
  );
});

test('rejects invalid cadence, budget, geometry and fixture checks', () => {
  assert.throws(
    () => parseLog(validLog().replace('"cadence_p95_us":17000', '"cadence_p95_us":1000')),
    /cadence/,
  );
  assert.throws(() => parseLog(validLog().replace('"over_16ms":0', '"over_16ms":241')), /budget/);
  assert.throws(
    () =>
      parseLog(
        validLog().replace('"geometry_hash":"123"', '"geometry_hash":"18446744073709551616"'),
      ),
    /geometry/,
  );
  assert.throws(
    () => parseLog(validLog().replaceAll('"scroll moved":true', '"scroll moved":false')),
    /fixture checks/,
  );
});

test('saved images cannot be relabeled after fixture or compiler helper changes', () => {
  const inputs = {
    compilerDistHash: 'all-compiler-modules',
    sourceHashes: { 'suite.cpp': 'fixture' },
    imageSha256: 'image',
  };

  assert.doesNotThrow(() => assertProvenance(inputs, inputs));
  assert.throws(() => assertProvenance(inputs, { ...inputs, imageSha256: 'other-image' }), /image/);
  assert.throws(
    () => assertProvenance(inputs, { ...inputs, sourceHashes: { 'suite.cpp': 'edited' } }),
    /Fixture/,
  );
  assert.throws(
    () => assertProvenance(inputs, { ...inputs, compilerDistHash: 'edited-helper' }),
    /Compiler/,
  );
  assert.throws(
    () => assertProvenance({ ...inputs, compilerDistHash: undefined }, inputs),
    /provenance/,
  );
});

test('rejects duplicate cases and missing momentum after release', () => {
  assert.throws(
    () => parseLog(validLog().replace('"flex-layout-16"', '"flex-layout-96"')),
    /duplicate/,
  );
  assert.throws(
    () =>
      parseLog(
        validLog().replaceAll(
          '"momentum continued after release":true',
          '"momentum continued after release":false',
        ),
      ),
    /fixture checks/,
  );
});

test('validation accepts new fixture contracts without runner changes', () => {
  const fixture = { name: 'new-fixture', checks: ['new condition'] };
  const row = parseLog(validLog())[0];

  const log =
    'CSS_BENCH RESULT ' +
    JSON.stringify({ ...row, name: fixture.name, checks: { 'new condition': true } }) +
    '\nCSS_BENCH DONE cases=1 ok=true';

  assert.equal(parseLog(log, { cases: [fixture] }).length, 1);
  assert.throws(
    () =>
      parseLog(log.replace('"new condition":true', '"new condition":false'), { cases: [fixture] }),
    /fixture checks/,
  );
});

test('live capture decodes prefixed result lines and recognizes device faults', () => {
  assert.deepEqual(parseResultLine('I (123) CSS_BENCH RESULT {"name":"example","ok":true}'), {
    name: 'example',
    ok: true,
  });
  assert.equal(parseResultLine('ordinary log line'), null);
  assert.equal(fault.test('Guru Meditation Error'), true);
  assert.equal(fault.test('CSS_BENCH DONE cases=19 ok=false'), true);
});
