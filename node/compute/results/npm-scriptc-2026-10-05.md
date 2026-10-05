# Node compute suite: C++ vs GeaStack vs scriptc — 2026-10-05

Linux dedicated Linux benchmark host ([benchmark host]), Xeon E3-1231 v3. Registry packages: compiler 1.0.26, node-compat 1.0.17, scriptc 0.2.3; Node v24.21.0.

All 27 existing fixtures were attempted. Each successful cell is the fastest of five fresh-process samples, workload time measured inside the process, pinned to logical CPU 0. Every successful sample's output is compared with Node. Startup is a separate best-of-five process run at zero iterations. Peak RSS is the minimum of the per-process peak readings, following the existing suite's convention. Raw data preserves every sample.

GeaStack uses the installed npm compiler with the suite's existing ambient timing plugin and C++ entry header. Its emitted units and the handwritten C++ references use clang 18, -O3 -march=native; binaries are stripped. scriptc uses its default LLVM release optimization (-O2), stripped, with no dynamic engine. These are the suite's Gea/C++ settings versus scriptc's default release settings, not an equal-optimization-flags experiment. Fixture algorithms and iteration counts are unchanged. The Node/scriptc runners differ only in their TypeScript vs transpiled-JavaScript input.

The C++ references are optimized implementations, including simdjson for parsing, specialized serializers, and an arena for binary trees. They provide a practical native reference; they do not isolate language or compiler overhead. This suite does not represent all Node applications. The numeric fixtures can be sensitive to compiler folding; ratios here apply to these exact sources.

## Workload time

Lower is better; milliseconds.

| Fixture | C++ | GeaStack | scriptc | Node | scriptc / Gea |
|---|---:|---:|---:|---:|---:|
| array_read | 36.17 | 44.76 | 956.89 | 264.91 | 21.38× |
| array_write | 36.80 | 43.67 | 568.74 | 257.04 | 13.02× |
| binary_trees | 17.19 | 34.02 | 656.97 | 108.82 | 19.31× |
| closure | 20.25 | 31.51 | 1499.19 | 250.23 | 47.58× |
| factorial | 67.56 | 41.68 | 171.62 | 104.55 | 4.12× |
| fibonacci | 304.83 | 304.78 | 441.78 | 1492.57 | 1.45× |
| json_parse_bool_array | 47.68 | 46.23 | 509.07 | 99.21 | 11.01× |
| json_parse_nested | 112.83 | 151.98 | 3204.48 | 557.58 | 21.08× |
| json_parse_number_array | 60.49 | 57.73 | 278.28 | 76.86 | 4.82× |
| json_parse_records | 82.09 | 134.65 | 2243.56 | 566.10 | 16.66× |
| json_parse_string_array | 43.78 | 240.64 | 596.40 | 211.79 | 2.48× |
| json_roundtrip | 68.12 | 103.97 | 1229.63 | 449.29 | 11.83× |
| json_stringify_bool_array | 51.86 | 60.63 | 208.78 | 128.99 | 3.44× |
| json_stringify_nested | 55.58 | 156.55 | 410.39 | 310.15 | 2.62× |
| json_stringify_number_array | 45.79 | 67.53 | 195.01 | 110.32 | 2.89× |
| json_stringify_records | 51.88 | 92.73 | 204.49 | 325.31 | 2.21× |
| json_stringify_string_array | 38.36 | 71.85 | 239.64 | 249.50 | 3.34× |
| loop_overhead | 79.48 | 79.74 | 127.25 | 81.97 | 1.60× |
| mandelbrot | 56.81 | 57.25 | 64.31 | 71.48 | 1.12× |
| math_intensive | 186.08 | 186.00 | 185.85 | 187.92 | 1.00× |
| matrix_multiply | 4.64 | 6.12 | 1868.27 | 64.97 | 305.45× |
| method_calls | 18.74 | 14.91 | 108.09 | 56.01 | 7.25× |
| modulo | 36.78 | 37.40 | 164.51 | 188.90 | 4.40× |
| nested_loops | 35.06 | 50.95 | 348.94 | 184.62 | 6.85× |
| object_create | 3.80 | 8.85 | 87.28 | 20.29 | 9.86× |
| prime_sieve | 36.96 | 35.21 | TIMEOUT | 435.17 | — |
| string_concat | 0.26 | 0.26 | 1.89 | 9.85 | 7.24× |

## Geometric means

Ratios use only matching, successfully completed fixtures shared by all four runtimes. A ratio above one means the named runtime takes longer than GeaStack. The timeout is excluded; it is not replaced with a guessed time.

| Group | Fixtures | C++ / Gea | scriptc / Gea | Node / Gea |
|---|---:|---:|---:|---:|
| All | 26 | 0.74× | 6.50× | 3.19× |
| Compute | 15 | 0.86× | 7.49× | 3.95× |
| JSON | 11 | 0.60× | 5.36× | 2.38× |

## Memory

Peak RSS, MiB; successful matching runs only.

| Fixture | C++ | GeaStack | scriptc | Node |
|---|---:|---:|---:|---:|
| array_read | 79.38 | 79.59 | 215.75 | 351.78 |
| array_write | 79.38 | 79.59 | 215.75 | 351.92 |
| binary_trees | 27.13 | 44.45 | 186.00 | 119.45 |
| closure | 3.63 | 3.75 | 1.88 | 57.95 |
| factorial | 3.75 | 3.75 | 1.88 | 53.20 |
| fibonacci | 3.63 | 3.75 | 1.88 | 52.83 |
| json_parse_bool_array | 4.10 | 3.96 | 3.88 | 61.08 |
| json_parse_nested | 7.39 | 10.66 | 17.38 | 85.29 |
| json_parse_number_array | 4.22 | 4.02 | 3.91 | 57.20 |
| json_parse_records | 9.16 | 16.91 | 25.45 | 92.50 |
| json_parse_string_array | 5.68 | 6.61 | 5.24 | 87.64 |
| json_roundtrip | 8.68 | 13.24 | 27.79 | 101.29 |
| json_stringify_bool_array | 3.88 | 3.88 | 2.13 | 57.57 |
| json_stringify_nested | 4.52 | 7.01 | 5.75 | 64.59 |
| json_stringify_number_array | 3.88 | 4.00 | 2.13 | 51.20 |
| json_stringify_records | 5.63 | 7.98 | 6.50 | 74.84 |
| json_stringify_string_array | 4.12 | 4.38 | 3.00 | 64.74 |
| loop_overhead | 3.63 | 3.75 | 1.88 | 53.45 |
| mandelbrot | 3.75 | 3.75 | 1.88 | 54.33 |
| math_intensive | 3.63 | 3.75 | 1.88 | 53.08 |
| matrix_multiply | 4.63 | 5.04 | 3.63 | 61.00 |
| method_calls | 3.75 | 3.75 | 1.88 | 53.20 |
| modulo | 3.75 | 3.75 | 1.88 | 53.07 |
| nested_loops | 71.88 | 72.38 | 94.75 | 266.08 |
| object_create | 3.63 | 3.75 | 1.88 | 55.20 |
| prime_sieve | 12.63 | 13.34 | — | 351.82 |
| string_concat | 4.00 | 4.00 | 2.25 | 59.70 |

## Startup and binary size

Cells show startup milliseconds / binary KiB. Node size is the shared Node executable, excluding application JavaScript. Native startup includes fixed setup performed even at zero iterations.

| Fixture | C++ | GeaStack | scriptc | Node |
|---|---:|---:|---:|---:|
| array_read | 7.29 / 14.23 | 6.49 / 70.79 | 5.50 / 62.72 | 33.91 / 123628.36 |
| array_write | 6.43 / 14.23 | 6.40 / 70.79 | 5.67 / 62.72 | 39.69 / 123628.36 |
| binary_trees | 7.10 / 14.21 | 6.74 / 58.74 | 5.27 / 62.77 | 40.30 / 123628.36 |
| closure | 7.25 / 14.30 | 6.56 / 74.79 | 5.84 / 70.88 | 38.91 / 123628.36 |
| factorial | 6.38 / 14.20 | 6.52 / 38.63 | 6.76 / 62.72 | 36.59 / 123628.36 |
| fibonacci | 6.38 / 14.20 | 8.39 / 38.63 | 5.69 / 62.72 | 37.96 / 123628.36 |
| json_parse_bool_array | 7.18 / 126.39 | 7.16 / 86.80 | 7.99 / 151.11 | 48.29 / 123628.36 |
| json_parse_nested | 15.31 / 134.40 | 18.89 / 503.01 | 27.62 / 159.13 | 56.25 / 123628.36 |
| json_parse_number_array | 7.61 / 126.39 | 7.62 / 86.80 | 8.98 / 147.06 | 44.61 / 123628.36 |
| json_parse_records | 12.04 / 130.39 | 18.90 / 475.01 | 31.19 / 159.19 | 64.24 / 123628.36 |
| json_parse_string_array | 9.48 / 130.39 | 12.10 / 90.80 | 15.87 / 155.25 | 50.57 / 123628.36 |
| json_roundtrip | 9.31 / 134.39 | 10.19 / 471.01 | 11.69 / 159.27 | 43.76 / 123628.36 |
| json_stringify_bool_array | 9.29 / 14.23 | 7.68 / 74.79 | 8.20 / 70.73 | 39.30 / 123628.36 |
| json_stringify_nested | 7.65 / 18.25 | 11.81 / 487.00 | 11.68 / 78.88 | 45.22 / 123628.36 |
| json_stringify_number_array | 7.54 / 14.23 | 6.67 / 78.79 | 7.15 / 70.73 | 41.46 / 123628.36 |
| json_stringify_records | 8.93 / 22.23 | 10.25 / 426.99 | 14.11 / 75.07 | 43.26 / 123628.36 |
| json_stringify_string_array | 7.90 / 18.34 | 9.52 / 86.79 | 7.98 / 74.96 | 46.59 / 123628.36 |
| loop_overhead | 7.62 / 14.20 | 6.54 / 38.63 | 6.21 / 62.72 | 39.84 / 123628.36 |
| mandelbrot | 6.33 / 14.20 | 6.76 / 38.63 | 6.00 / 62.72 | 36.79 / 123628.36 |
| math_intensive | 6.77 / 14.20 | 9.19 / 38.63 | 6.79 / 62.72 | 39.52 / 123628.36 |
| matrix_multiply | 8.42 / 14.22 | 8.45 / 78.79 | 9.23 / 71.05 | 52.04 / 123628.36 |
| method_calls | 7.46 / 14.20 | 7.29 / 54.73 | 6.43 / 62.72 | 37.87 / 123628.36 |
| modulo | 7.54 / 14.20 | 6.74 / 38.62 | 8.03 / 62.72 | 37.80 / 123628.36 |
| nested_loops | 39.08 / 14.23 | 52.21 / 74.79 | 168.30 / 66.92 | 261.52 / 123628.36 |
| object_create | 8.25 / 14.22 | 7.68 / 70.79 | 7.89 / 66.91 | 39.90 / 123628.36 |
| prime_sieve | 6.06 / 14.22 | 3.24 / 74.78 | — | 33.22 / 123628.36 |
| string_concat | 7.49 / 14.23 | 5.99 / 38.62 | 6.77 / 62.77 | 34.10 / 123628.36 |

## Failures and limits

- prime_sieve, scriptc: run-failed; exit 124.

The first full run completed 25 fixtures, then was interrupted during scriptc prime_sieve to repair subprocess timeout handling. The two remaining fixtures were retried using timeout 180s, with termination of the whole timed process and no extra samples after a failure. The original and retry harness hashes are recorded in the JSON. No compiler source changes, commits, or pushes were made.

Reproduce from this directory with the registry packages installed in node-compat:

```sh
BENCH_PACKAGE_ROOT=${NODE_COMPAT_ROOT} node bench-npm.mjs --samples 5 --output results/npm-scriptc-2026-10-05.json
node render-npm.mjs results/npm-scriptc-2026-10-05.json
```

Raw result JSON retains build diagnostics, all timings, outputs, peak RSS, startup measurements, source and binary hashes, package versions, CPU metadata, and exact iteration counts.

## Version and configuration audit

Rechecked after the initial run: `scriptc --version`, `scriptc/package.json`,
`@scriptc/cli-linux-x64-gnu/package.json`, and the installed native-toolchain
manifest all identify 0.2.3. The native compiler executable SHA-256 is
`76e3c4d1c326438ee46f29480bf2310407e01f7bcf39fe182e2cd43d2d2a2234`.
An explicit `--optimization release` rebuild of array_read measured 973.240 ms
versus the original 956.886 ms best. Its coverage report says 12/12 statements
compile statically with no dynamic remainder.

Documentation confirms release (-O2) and LLVM are defaults:
https://scriptc.dev/docs/cli . The 0.2.3 changelog primarily reports compatibility
and compiler-analysis changes, plus native array iteration improvements:
https://github.com/vercel-labs/scriptc/blob/main/CHANGELOG.md .

The installed 0.2.3 `scr_array.c` caps dense array storage at 2^20 elements;
higher indices use sorted sparse entries. Its sparse overwrite path removes
and reinserts entries, shifting the remaining entries using memmove twice.
The sieve has 10,000,001 boolean elements and writes many indices above that
cutoff. This is a source-based explanation for the severe timeout, not a
profiled attribution. Array reads also call runtime accessors, and pushes
emit retain/push/release calls. These observations do not establish that every
scriptc workload is slow. Upstream source:
https://github.com/vercel-labs/scriptc/blob/main/packages/runtime/src/scr_array.c .
