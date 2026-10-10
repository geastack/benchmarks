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

const variantOf = (row) => row.variant ?? 'parity';
const parityRows = result.rows.filter((row) => variantOf(row) === 'parity');
const idiomaticRows = result.rows.filter((row) => variantOf(row) === 'idiomatic');
const keyOf = (row) => (variantOf(row) === 'parity' ? row.fixture : `${variantOf(row)}/${row.fixture}`);

// The languages that run their own idiomatic source in a row; the others run
// their parity build, measured once in the parity row.
const ownSources = (row) =>
  [
    ['TypeScript', 'node'],
    ['C++', `cpp@${all}`],
    ['Rust', `rust@${all}`],
  ]
    .filter(([, cell]) => row.runtimes[cell] && !row.runtimes[cell].sharedWith)
    .map(([language]) => language)
    .join(', ');

const lines = [];
const date = result.utc.slice(0, 10);
lines.push(`# @geastack/parallel benchmarks, ${date}`);
lines.push('');
lines.push(
  `Best of ${result.samples} fresh processes per cell, in milliseconds of the timed workload (startup excluded). ` +
    `Every cell's output was checked against Node's; a cell is left blank if it failed or disagreed.`,
);
lines.push('');
lines.push(
  'Two sections. **Complete implementation parity** is every workload, with TypeScript, Rust and C++ doing the same task the same way: the same algorithm, data layout, allocation pattern, work inside the timed region, and result (`fixtures/<name>.ts`, `native-rust/src/bin/<name>.rs`, `native-cpp/<name>.cpp`). **Idiomatic implementation** lists only the workloads whose languages each have their own way (`fixtures/idiomatic/`, `native-rust/src/idiomatic/`, `native-cpp/idiomatic/`); a language without its own idiomatic source runs its parity build, and that cell is the parity measurement.',
);
lines.push('');

function section(rows, idiomatic) {
  lines.push(`### Time (ms, lower is better)`);
  lines.push('');
  lines.push(
    `| workload |${idiomatic ? ' own idiomatic source |' : ''} n | ${columns.map((c) => label[c]).join(' | ')} |`,
  );
  lines.push(`| --- |${idiomatic ? ' --- |' : ''} ---: | ${columns.map(() => '---:').join(' | ')} |`);

  for (const row of rows) {
    lines.push(
      `| ${row.fixture} |${idiomatic ? ` ${ownSources(row)} |` : ''} ${row.n} | ${columns.map((c) => ms(best(row, c))).join(' | ')} |`,
    );
  }

  lines.push('');

  lines.push(`### GeaStack at ${all} threads`);
  lines.push('');
  lines.push(
    `| workload | Gea / Rayon | Gea / C++ | Node / Gea | scriptc / Gea | GeaStack scaling 1→${all} | Rayon scaling | C++ scaling |`,
  );
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  const collected = { rust: [], cpp: [], node: [], scriptc: [], gea: [], rayon: [], cppScale: [] };

  for (const row of rows) {
    const gea = best(row, `gea@${all}`);
    const over = (other) => (gea === null || other === null ? null : gea / other);
    const under = (other) => (gea === null || other === null ? null : other / gea);

    const scale = (name) => {
      const one = best(row, `${name}@1`);
      const many = best(row, `${name}@${all}`);

      return one === null || many === null ? null : one / many;
    };

    const values = {
      rust: over(best(row, `rust@${all}`)),
      cpp: over(best(row, `cpp@${all}`)),
      node: under(best(row, 'node')),
      scriptc: under(best(row, 'scriptc')),
      gea: scale('gea'),
      rayon: scale('rust'),
      cppScale: scale('cpp'),
    };

    for (const [key, value] of Object.entries(values)) collected[key].push(value);
    lines.push(
      `| ${row.fixture} | ${Object.values(values).map(ratio).join(' | ')} |`,
    );
  }

  lines.push(
    `| **geometric mean** | ${Object.values(collected)
      .map((values) => `**${ratio(geomean(values))}**`)
      .join(' | ')} |`,
  );
  lines.push('');
  lines.push(
    'Gea / Rayon and Gea / C++ are GeaStack\'s time divided by the other\'s: below 1× GeaStack is faster, 1.5× means it takes half again as long. Node / Gea and scriptc / Gea are the other\'s time divided by GeaStack\'s (Node and scriptc run single-threaded): 4× means GeaStack finished in a quarter of the time. Scaling is single-thread time divided by all-thread time.',
  );
  lines.push('');
}

lines.push('## Complete implementation parity');
lines.push('');
section(parityRows, false);

lines.push('## Idiomatic implementation');
lines.push('');

if (idiomaticRows.length) {
  lines.push(
    'The Rust and C++ references as previously published where they differ from the TypeScript: for sort, Rayon\'s `par_sort_by` and a C++ stable-sort-then-pairwise-merge, where the TypeScript runs `@geastack/parallel`\'s fixed-shape sample sort; for strings, a presized Rust `write!` hashing a lazy `split`, and C++ `operator+` temporaries hashing one `substr` per part, where the TypeScript concatenates and materializes `split(\',\')`.',
  );
  lines.push('');
  section(idiomaticRows, true);
} else {
  lines.push('No idiomatic rows were recorded.');
  lines.push('');
}

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

  lines.push(`| ${keyOf(row)} | ${cells.join(' | ')} |`);
}

lines.push('');

const problems = [];

for (const row of result.rows) {
  for (const name of Object.keys(row.runtimes)) {
    if (row.runtimes[name].sharedWith) continue;
    const s = status(row, name);
    if (s !== 'ok') problems.push(`- ${keyOf(row)} / ${label[name] ?? name}: ${s}`);
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
