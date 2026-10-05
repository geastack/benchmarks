// Render registry-package compute results; failed or incorrect cells have no ratios.
import fs from 'node:fs';

const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const names = ['cpp', 'gea', 'scriptc', 'node'];

const valid = (row, n) => row.runtimes[n]?.state === 'ok' && row.runtimes[n]?.match;

const fmt = (x) => (x == null ? '—' : x.toFixed(2));

const geo = (a) => Math.exp(a.reduce((s, v) => s + Math.log(v), 0) / a.length);

const common = r.rows.filter((x) => names.every((n) => valid(x, n)));

let out = `# Node compute suite: C++ vs GeaStack vs scriptc — 2026-10-05\n\n`;
out += `Linux benchmark machine, Xeon E3-1231 v3. Registry packages: compiler ${r.packages['@geastack/compiler']}, node-compat ${r.packages['@geastack/node-compat']}, scriptc ${r.packages.scriptc}; Node ${r.node}.\n\n`;
out += `All 27 existing fixtures were attempted. Each successful cell is the fastest of five fresh-process samples, workload time measured inside the process, pinned to logical CPU 0. Every successful sample's output is compared with Node. Startup is a separate best-of-five process run at zero iterations. Peak RSS is the minimum of the per-process peak readings, following the existing suite's convention. Raw data preserves every sample.\n\n`;
out += `GeaStack uses the installed npm compiler with the suite's existing ambient timing plugin and C++ entry header. Its emitted units and the handwritten C++ references use ${r.cxx.split('\n')[0]}, ${r.flags.join(' ')}; binaries are stripped. scriptc uses its default LLVM release optimization (-O2), stripped, with no dynamic engine. These are the suite's Gea/C++ settings versus scriptc's default release settings, not an equal-optimization-flags experiment. Fixture algorithms and iteration counts are unchanged. The Node/scriptc runners differ only in their TypeScript vs transpiled-JavaScript input.\n\n`;
out += `The C++ references are optimized implementations, including simdjson for parsing, specialized serializers, and an arena for binary trees. They provide a practical native reference; they do not isolate language or compiler overhead. This suite does not represent all Node applications. The numeric fixtures can be sensitive to compiler folding; ratios here apply to these exact sources.\n\n`;
out +=
  '## Workload time\n\nLower is better; milliseconds.\n\n| Fixture | C++ | GeaStack | scriptc | Node | scriptc / Gea |\n|---|---:|---:|---:|---:|---:|\n';

for (const row of r.rows) {
  out +=
    `| ${row.fx} | ` +
    names
      .map((n) =>
        valid(row, n)
          ? fmt(row.runtimes[n].bestMs)
          : row.runtimes[n]?.state === 'ok'
            ? 'MISMATCH'
            : row.runtimes[n]?.runs?.[0]?.status === 124
              ? 'TIMEOUT'
              : (row.runtimes[n]?.state ?? 'missing'),
      )
      .join(' | ') +
    ` | ${valid(row, 'scriptc') && valid(row, 'gea') ? fmt(row.runtimes.scriptc.bestMs / row.runtimes.gea.bestMs) + '×' : '—'} |\n`;
}

out +=
  '\n## Geometric means\n\nRatios use only matching, successfully completed fixtures shared by all four runtimes. A ratio above one means the named runtime takes longer than GeaStack. The timeout is excluded; it is not replaced with a guessed time.\n\n| Group | Fixtures | C++ / Gea | scriptc / Gea | Node / Gea |\n|---|---:|---:|---:|---:|\n';

for (const [label, pred] of [
  ['All', () => true],
  ['Compute', (x) => !x.fx.startsWith('json')],
  ['JSON', (x) => x.fx.startsWith('json')],
]) {
  const rows = common.filter(pred);
  out +=
    `| ${label} | ${rows.length} | ` +
    ['cpp', 'scriptc', 'node']
      .map((n) => fmt(geo(rows.map((x) => x.runtimes[n].bestMs / x.runtimes.gea.bestMs))) + '×')
      .join(' | ') +
    ' |\n';
}

out +=
  '\n## Memory\n\nPeak RSS, MiB; successful matching runs only.\n\n| Fixture | C++ | GeaStack | scriptc | Node |\n|---|---:|---:|---:|---:|\n';
for (const row of r.rows)
  out +=
    `| ${row.fx} | ` +
    names.map((n) => (valid(row, n) ? fmt(row.runtimes[n].rssBytes / 1048576) : '—')).join(' | ') +
    ' |\n';
out +=
  '\n## Startup and binary size\n\nCells show startup milliseconds / binary KiB. Node size is the shared Node executable, excluding application JavaScript. Native startup includes fixed setup performed even at zero iterations.\n\n| Fixture | C++ | GeaStack | scriptc | Node |\n|---|---:|---:|---:|---:|\n';
for (const row of r.rows)
  out +=
    `| ${row.fx} | ` +
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
    if (!valid(row, n)) {
      failures++;
      const x = row.runtimes[n];
      out += `- ${row.fx}, ${n}: ${x?.state}; exit ${x?.runs?.[0]?.status ?? x?.build?.status ?? 'unknown'}.\n`;
    }

if (!failures) out += 'None.\n';
out +=
  '\nThe first full run completed 25 fixtures, then was interrupted during scriptc prime_sieve to repair subprocess timeout handling. The two remaining fixtures were retried using timeout 180s, with termination of the whole timed process and no extra samples after a failure. The original and retry harness hashes are recorded in the JSON. No compiler source changes, commits, or pushes were made.\n\n';
out +=
  'Reproduce from this directory with the registry packages installed in node-compat:\n\n```sh\nBENCH_PACKAGE_ROOT=${NODE_COMPAT_ROOT} node bench-npm.mjs --samples 5 --output results/npm-scriptc-2026-10-05.json\nnode render-npm.mjs results/npm-scriptc-2026-10-05.json\n```\n\nRaw result JSON retains build diagnostics, all timings, outputs, peak RSS, startup measurements, source and binary hashes, package versions, CPU metadata, and exact iteration counts.\n';
process.stdout.write(out);
