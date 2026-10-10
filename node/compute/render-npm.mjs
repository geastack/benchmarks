// Render recorded compute inputs; failed or incorrect cells have no ratios.
// Two sections: complete implementation parity (every fixture, every language
// doing the same task the same way) and idiomatic implementation (only the
// fixtures whose languages each have their own way).
import fs from 'node:fs';
import { rowKey } from '../bench/validate-results.mjs';

const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const names = ['cpp', 'gea', 'scriptc', 'node'];
const variantOf = (row) => row.variant ?? 'parity';
const parityRows = r.rows.filter((row) => variantOf(row) === 'parity');
const idiomaticRows = r.rows.filter((row) => variantOf(row) === 'idiomatic');

const valid = (row, n) => row.runtimes[n]?.state === 'ok' && row.runtimes[n]?.match === true;

const fmt = (x) => (x == null ? '—' : x.toFixed(2));

const geo = (a) => (a.length ? Math.exp(a.reduce((s, v) => s + Math.log(v), 0) / a.length) : null);

const machine =
  r.machine?.match(/^Model name:\s*(.+)$/m)?.[1] ??
  r.machine?.match(/^Architecture:\s*(.+)$/m)?.[1] ??
  'see raw CPU metadata';

const cell = (row, n) =>
  valid(row, n)
    ? fmt(row.runtimes[n].bestMs)
    : row.runtimes[n]?.state === 'ok'
      ? 'MISMATCH'
      : row.runtimes[n]?.runs?.[0]?.status === 124
        ? 'TIMEOUT'
        : (row.runtimes[n]?.state ?? 'missing');

const ratio = (row, a, b) =>
  valid(row, a) && valid(row, b)
    ? fmt(row.runtimes[a].bestMs / row.runtimes[b].bestMs) + '×'
    : '—';

// Which languages run their own idiomatic source in this row; the others run
// their parity source, measured once in the parity row.
const ownSources = (row) => {
  const own = [];
  if (row.runtimes.gea && !row.runtimes.gea.sharedWith) own.push('TypeScript');
  if (row.runtimes.cpp && !row.runtimes.cpp.sharedWith) own.push('C++');

  return own.join(', ');
};

const timeTable = (rows, idiomatic) => {
  let out = `| Fixture |${idiomatic ? ' Own idiomatic source |' : ''} C++ | GeaStack | scriptc | Node | Gea / C++ | Node / Gea | scriptc / Gea |\n|---|${idiomatic ? '---|' : ''}---:|---:|---:|---:|---:|---:|---:|\n`;

  for (const row of rows)
    out +=
      `| ${row.fx} |${idiomatic ? ` ${ownSources(row)} |` : ''} ` +
      names.map((n) => cell(row, n)).join(' | ') +
      ` | ${ratio(row, 'gea', 'cpp')} | ${ratio(row, 'node', 'gea')} | ${ratio(row, 'scriptc', 'gea')} |\n`;

  return out;
};

const meanRow = (label, rows) => {
  const common = rows.filter((x) => names.every((n) => valid(x, n)));
  const mean = (a, b) => geo(common.map((x) => x.runtimes[a].bestMs / x.runtimes[b].bestMs));
  const show = (m) => (m === null ? '—' : fmt(m) + '×');

  return `| ${label} | ${common.length} | ${show(mean('gea', 'cpp'))} | ${show(mean('cpp', 'gea'))} | ${show(mean('scriptc', 'gea'))} | ${show(mean('node', 'gea'))} |\n`;
};

const meanHeader =
  '| Group | Fixtures | Gea / C++ | C++ / Gea | scriptc / Gea | Node / Gea |\n|---|---:|---:|---:|---:|---:|\n';

const groups = [
  ['All', () => true],
  ['Compute', (x) => !x.fx.startsWith('json')],
  ['JSON', (x) => x.fx.startsWith('json')],
];

let out = `# Node compute suite: C++ vs GeaStack vs scriptc — ${r.utc.slice(0, 10)}\n\n`;
out += `Linux benchmark machine: ${machine}. Packages: compiler ${r.packages['@geastack/compiler']}, node-compat ${r.packages['@geastack/node-compat']}, scriptc ${r.packages.scriptc}; Node ${r.node}.\n\n`;
out += `${parityRows.length} fixtures with a parity row and ${idiomaticRows.length} with a distinct idiomatic row were recorded; run complete: ${r.complete === true}. Each successful cell is the fastest of ${r.samples} fresh-process samples, workload time measured inside the process, pinned to logical CPU ${r.cpu}. Every successful sample's output is compared with Node. Startup is a separate best-of-${r.samples} process run at zero iterations. Peak RSS is the minimum of the per-process peak readings, following the existing suite's convention. Raw data preserves every sample.\n\n`;

if (r.compilerInputs)
  out += `GeaStack uses the canonical workspace compiler at \`${r.compilerInputs.compilerRoot}\`. Compiler JavaScript SHA256: \`${r.compilerInputs.compilerDistHash}\`; native runtime SHA256: \`${r.compilerInputs.runtimeHash}\`.\n\n`;
else
  out += `This historical input records an installed registry compiler; see its compiler SHA256 and package metadata in the raw JSON.\n\n`;

out += `The suite uses its existing ambient timing plugin and C++ entry header. Emitted units and the handwritten C++ references use ${r.cxx.split('\n')[0]}, \`${r.flags.join(' ')}\`; binaries are stripped. scriptc uses its default LLVM release optimization (-O2), stripped, with no dynamic engine. These are the suite's Gea/C++ settings versus scriptc's default release settings, not an equal-optimization-flags experiment. The Node/scriptc runners differ only in their TypeScript vs transpiled-JavaScript input.\n\n`;
out += `Gea / C++ above one means GeaStack takes longer than C++; Node / Gea and scriptc / Gea above one mean the named runtime takes longer than GeaStack. Failed or mismatched cells have no ratio and are left out of every mean. This suite does not represent all Node applications, and the numeric fixtures can be sensitive to compiler folding; ratios apply to these exact sources.\n\n`;

out += `## Complete implementation parity\n\nEvery fixture, written so that TypeScript and C++ do the same task the same way: the same algorithm, data layout, allocation pattern, work inside the timed region, and result. Sources: \`fixtures/<fixture>.ts\` and \`native-cpp/src/<fixture>.cpp\`. An optimization that can be written in both languages is written in both. JSON.parse builds the whole typed result in both (C++ parses with simdjson and materializes the same vectors, strings and records); JSON.stringify writes a fresh string and escapes string values in both. Objects are records: value structs in C++, as the compiler may lay them out when no identity is observed; binary trees are one heap allocation per node, freed per iteration.\n\n### Workload time\n\nLower is better; milliseconds.\n\n`;
out += timeTable(parityRows, false);
out += `\n### Geometric means\n\nOver fixtures that completed and matched on all four runtimes.\n\n${meanHeader}`;
for (const [label, pred] of groups) out += meanRow(label, parityRows.filter(pred));

out += `\n## Idiomatic implementation\n\nOnly fixtures whose languages each have their own way of doing the task: each language as its authors would write it, the hand-written C++ references as previously published (simdjson's lazy DOM without materializing, hand-rolled serializers that skip escaping, reserve(), an arena for binary trees, hand range reductions in place of \`%\`). A fixture whose idiomatic code is the same as its parity code appears only in the section above. Sources: \`fixtures/idiomatic/<fixture>.ts\` and \`native-cpp/src/idiomatic/<fixture>.cpp\`; a language without one runs its parity source, and that measurement is the parity row's (the "own idiomatic source" column names the languages that differ).\n\n### Workload time\n\nLower is better; milliseconds.\n\n`;
out += idiomaticRows.length ? timeTable(idiomaticRows, true) : 'No idiomatic rows were recorded.\n';

const suiteRows = parityRows.map(
  (row) => idiomaticRows.find((x) => x.fx === row.fx) ?? row,
);

out += `\n### Geometric means\n\nOver idiomatic fixtures that completed and matched on all four runtimes. The last row is the whole suite with each fixture's idiomatic row where it has one and its parity row otherwise, the shape of the previously published suite.\n\n${meanHeader}`;
for (const [label, pred] of groups) out += meanRow(label, idiomaticRows.filter(pred));
out += meanRow('Whole suite, idiomatic where distinct', suiteRows);

out +=
  '\n## Memory\n\nPeak RSS, MiB; successful matching runs only.\n\n| Fixture | C++ | GeaStack | scriptc | Node |\n|---|---:|---:|---:|---:|\n';
for (const row of r.rows)
  out +=
    `| ${rowKey(row)} | ` +
    names.map((n) => (valid(row, n) ? fmt(row.runtimes[n].rssBytes / 1048576) : '—')).join(' | ') +
    ' |\n';
out +=
  '\n## Startup and binary size\n\nCells show startup milliseconds / binary KiB. Node size is the shared Node executable, excluding application JavaScript. Native startup includes fixed setup performed even at zero iterations.\n\n| Fixture | C++ | GeaStack | scriptc | Node |\n|---|---:|---:|---:|---:|\n';
for (const row of r.rows)
  out +=
    `| ${rowKey(row)} | ` +
    names
      .map((n) =>
        valid(row, n)
          ? `${fmt(row.runtimes[n].bestStartupMs)} / ${fmt(row.runtimes[n].bytes / 1024)}`
          : '—',
      )
      .join(' | ') +
    ' |\n';
out += '\n## Failures and limits\n\n';
let failures = 0;

for (const row of r.rows)
  for (const n of names)
    if (!valid(row, n) && !row.runtimes[n]?.sharedWith) {
      failures++;
      const x = row.runtimes[n];
      out += `- ${rowKey(row)}, ${n}: ${x?.state}; exit ${x?.runs?.[0]?.status ?? x?.build?.status ?? 'unknown'}.\n`;
    }

if (!failures) out += 'None.\n';
out += `\nReproduce a current run from the benchmarks repository root (\`--variant parity\` or \`--variant idiomatic\` runs one section):\n\n\`\`\`sh\nGEA_COMPILER_DIR=/absolute/path/to/compiler npm run compute -- --samples ${r.samples} --output node/dist/compute.json\nnpm run compute:report -- node/dist/compute.json\n\`\`\`\n\nHistorical comparisons require their original harness, compiler inputs and hardware. Raw result JSON retains build diagnostics, all timings, outputs, peak RSS, startup measurements, source paths and hashes, binary hashes, package versions, CPU metadata, and exact iteration counts.\n`;
process.stdout.write(out);
