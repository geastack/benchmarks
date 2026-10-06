#!/usr/bin/env node
// Renders a `bench.mjs` result file as the markdown report in results/.
//
//   node node/parallel/report.mjs results/parallel-2026-10-06.json > results/parallel-2026-10-06.md
import fs from 'node:fs';

const file = process.argv[2];

if (!file) {
  console.error('usage: report.mjs <result.json>');
  process.exit(2);
}

const result = JSON.parse(fs.readFileSync(file, 'utf8'));
const threads = result.threadCounts;
const all = Math.max(...threads);

const columns = [
  'node',
  'scriptc',
  ...threads.map((t) => `gea@${t}`),
  ...threads.map((t) => `rust@${t}`),
  ...threads.map((t) => `cpp@${t}`),
];

const label = {
  node: 'Node',
  scriptc: 'scriptc',
  ...Object.fromEntries(threads.map((t) => [`gea@${t}`, `GeaStack ×${t}`])),
  ...Object.fromEntries(threads.map((t) => [`rust@${t}`, `Rayon ×${t}`])),
  ...Object.fromEntries(threads.map((t) => [`cpp@${t}`, `C++ ×${t}`])),
};

const best = (row, name) => {
  const r = row.runtimes[name];

  return r?.state === 'ok' && r.match ? r.bestMs : null;
};

const ms = (value) =>
  value === null
    ? '—'
    : value < 10
      ? value.toFixed(2)
      : value < 100
        ? value.toFixed(1)
        : value.toFixed(0);

const ratio = (value) => (value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}×`);

const geomean = (values) => {
  const usable = values.filter((v) => v !== null && Number.isFinite(v) && v > 0);

  return usable.length === 0
    ? null
    : Math.exp(usable.reduce((s, v) => s + Math.log(v), 0) / usable.length);
};

const status = (row, name) => {
  const r = row.runtimes[name];
  if (!r) return 'missing';
  if (r.state !== 'ok') return r.state;

  return r.match ? 'ok' : 'MISMATCH';
};

const lines = [];
const date = result.utc.slice(0, 10);
lines.push(`# @geastack/parallel benchmarks, ${date}`);
lines.push('');
lines.push(
  `Best of ${result.samples} fresh processes per cell, in milliseconds of the timed workload (startup excluded). ` +
    `Every cell's output was checked against Node's; a cell is left blank if it failed or disagreed.`,
);
lines.push('');
lines.push('## Time (ms, lower is better)');
lines.push('');
lines.push(`| workload | n | ${columns.map((c) => label[c]).join(' | ')} |`);
lines.push(`| --- | ---: | ${columns.map(() => '---:').join(' | ')} |`);

for (const row of result.rows) {
  lines.push(`| ${row.fixture} | ${row.n} | ${columns.map((c) => ms(best(row, c))).join(' | ')} |`);
}

lines.push('');

lines.push(`## GeaStack speed at ${all} threads (higher is better)`);
lines.push('');
lines.push(
  `| workload | GeaStack vs Node | GeaStack vs scriptc | GeaStack vs Rayon | GeaStack vs C++ | GeaStack scaling 1→${all} | Rayon scaling | C++ scaling |`,
);
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
const collected = { node: [], scriptc: [], rust: [], cpp: [], gea: [], rayon: [], cppScale: [] };

for (const row of result.rows) {
  const gea = best(row, `gea@${all}`);
  const vs = (other) => (gea === null || other === null ? null : other / gea);

  const scale = (name) => {
    const one = best(row, `${name}@1`);
    const many = best(row, `${name}@${all}`);

    return one === null || many === null ? null : one / many;
  };

  const values = {
    node: vs(best(row, 'node')),
    scriptc: vs(best(row, 'scriptc')),
    rust: vs(best(row, `rust@${all}`)),
    cpp: vs(best(row, `cpp@${all}`)),
    gea: scale('gea'),
    rayon: scale('rust'),
    cppScale: scale('cpp'),
  };

  for (const [key, value] of Object.entries(values)) collected[key].push(value);
  lines.push(
    `| ${row.fixture} | ${ratio(values.node)} | ${ratio(values.scriptc)} | ${ratio(values.rust)} | ${ratio(values.cpp)} | ${ratio(values.gea)} | ${ratio(values.rayon)} | ${ratio(values.cppScale)} |`,
  );
}

lines.push(
  `| **geometric mean** | **${ratio(geomean(collected.node))}** | **${ratio(geomean(collected.scriptc))}** | **${ratio(geomean(collected.rust))}** | **${ratio(geomean(collected.cpp))}** | **${ratio(geomean(collected.gea))}** | **${ratio(geomean(collected.rayon))}** | **${ratio(geomean(collected.cppScale))}** |`,
);
lines.push('');
lines.push(
  'Each "vs" column is the other runtime\'s time divided by GeaStack\'s: 4× means GeaStack finished in a quarter of the time, 0.5× means it took twice as long. Node and scriptc run single-threaded. Scaling is single-thread time divided by all-thread time.',
);
lines.push('');

lines.push('## Peak memory (MiB, max RSS)');
lines.push('');
const memoryColumns = ['node', 'scriptc', `gea@${all}`, `rust@${all}`, `cpp@${all}`];
lines.push(`| workload | ${memoryColumns.map((c) => label[c]).join(' | ')} |`);
lines.push(`| --- | ${memoryColumns.map(() => '---:').join(' | ')} |`);

for (const row of result.rows) {
  const cells = memoryColumns.map((c) => {
    const r = row.runtimes[c];

    return r?.state === 'ok' && r.rssBytes ? (r.rssBytes / 1048576).toFixed(1) : '—';
  });

  lines.push(`| ${row.fixture} | ${cells.join(' | ')} |`);
}

lines.push('');

const problems = [];

for (const row of result.rows) {
  for (const name of Object.keys(row.runtimes)) {
    const s = status(row, name);
    if (s !== 'ok') problems.push(`- ${row.fixture} / ${label[name] ?? name}: ${s}`);
  }
}

lines.push('## Status');
lines.push('');
lines.push(problems.length === 0 ? 'Every cell finished and matched Node.' : problems.join('\n'));
lines.push('');

if (result.notes?.length) {
  lines.push('## Notes');
  lines.push('');
  for (const note of result.notes) lines.push(`- ${note}`);
  lines.push('');
}

lines.push('## Environment');
lines.push('');
const cpu = /Model name:\s*(.+)/.exec(result.machine ?? '')?.[1];
lines.push(`- Machine: ${cpu ?? 'unknown'}, ${result.cores} hardware threads (WSL2, Ubuntu 24.04)`);
lines.push(`- Node ${result.node}; scriptc ${result.scriptc}; ${result.cxx}; ${result.rustc}`);
lines.push(`- GeaStack and C++ flags: \`${result.cxxFlags.join(' ')}\``);
lines.push(
  '- Rust: `opt-level=3`, `lto="fat"`, `codegen-units=1`, `panic="abort"`, `-C target-cpu=native`, rayon 1.10',
);
lines.push(`- Load average at start: ${result.startLoad}; at end: ${result.endLoad ?? 'n/a'}`);
lines.push('');
process.stdout.write(lines.join('\n'));
