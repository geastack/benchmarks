# @geastack/parallel benchmarks

Nine data-parallel workloads, each written once in TypeScript against [`@geastack/parallel`](https://github.com/geastack/parallel) and run five ways:

| runtime           | what runs                                                                      | threads                                  |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| **Node 24**       | the TypeScript as written, against the library's `src/index.ts`, transpiled    | 1 (the library is sequential under Node) |
| **scriptc 0.2.3** | the same program compiled by scriptc                                           | 1                                        |
| **GeaStack**      | the same program compiled by geatsc to C++                                     | 1 and all (`GEA_PARALLEL_THREADS`)       |
| **Rust + Rayon**  | the same algorithm on Rayon (`native-rust/`)                                   | 1 and all (`RAYON_NUM_THREADS`)          |
| **C++**           | the same algorithm on a hand-written `std::thread` pool (`native-cpp/par.hpp`) | 1 and all (`PAR_THREADS`)                |

Every workload has a **parity** implementation in each language -- the same algorithm, data layout, allocation pattern and timed work as the TypeScript, so the TypeScript, Rust and C++ do the same task the same way (`fixtures/<name>.ts`, `native-rust/src/bin/<name>.rs`, `native-cpp/<name>.cpp`). An optimization that can be written in every language is written in every language. Where a language's own way differs, the workload also has an **idiomatic** implementation (`fixtures/idiomatic/`, `native-rust/src/idiomatic/` built as `<name>-idiomatic`, `native-cpp/idiomatic/`): today sort (Rayon's `par_sort_by` and a C++ stable-sort-and-merge, against the TypeScript library's fixed-shape sample sort, which the parity Rust and C++ port step for step) and strings (a presized Rust `write!` with a lazy `split`, C++ `operator+` and `substr`, against the TypeScript's concatenation and materialized `split`, which parity Rust and C++ follow). A language without its own idiomatic source runs its parity build, measured once. Reports have one section per variant; `--variant parity` or `--variant idiomatic` runs one.

Every program prints its answer, and every answer must equal Node's. A floating-point workload (spectral-norm, mandelbrot) is compiled with `-ffp-contract=off` so C++ keeps JavaScript's rounding.

## Latest results

[2026-10-06 report](results/parallel-2026-10-06.md) ([raw JSON](results/parallel-2026-10-06.json)), Ryzen 9 9900X3D, 20 threads, WSL2:

| workload      | Node | scriptc | GeaStack ×1 | Rayon ×1 | C++ ×1 | GeaStack ×20 | Rayon ×20 | C++ ×20 |
| ------------- | ---: | ------: | ----------: | -------: | -----: | -----------: | --------: | ------: |
| binary-trees  |  391 |    8293 |         583 |      916 |    542 |         72.0 |       113 |    99.7 |
| collatz       | 2893 |    2527 |         250 |      250 |    249 |         14.7 |      14.9 |    14.5 |
| mandelbrot    |  562 |    1122 |         556 |      556 |    569 |         33.5 |      34.8 |    34.2 |
| matmul        |  209 |    3351 |         185 |      200 |    183 |         14.9 |      23.6 |    14.8 |
| nqueens       | 32.5 |    56.5 |        21.8 |     22.0 |   21.9 |         1.72 |      2.80 |    1.68 |
| primes        |  490 |    1652 |         486 |      486 |    481 |         42.0 |      41.7 |    42.6 |
| sort          |  643 |    1649 |        77.7 |     87.8 |   86.2 |         21.8 |      25.1 |    38.4 |
| spectral-norm |  345 |    1899 |         140 |      148 |    138 |         12.8 |      12.3 |    16.7 |
| strings       |  338 |     888 |        80.1 |     80.9 |   95.6 |         7.61 |      7.92 |    7.66 |

Milliseconds, best of seven. Geometric means at 20 threads:

- GeaStack runs **23× faster than Node** and **86× faster than scriptc**, on the same library source.
- GeaStack runs **1.19× faster than Rayon** and **1.14× faster than the hand-written C++ pool**. No workload is slower than Rayon beyond run-to-run noise: primes (42.0 against 41.7 ms) and spectral-norm (12.8 against 12.3 ms here; 13.0 against 13.2 ms over fifteen samples).
- GeaStack **scales 10.6× from 1 to 20 threads**, against Rayon's 9.7× and C++'s 9.5×.

What closed the gap to Rayon, in the order it was found:

- **Typed loop counters.** `int`, the opt-in 64-bit integer from `@geastack/core` (a plain number under Node), keeps indices and counters out of doubles: collatz 2130 → 598 ms single-threaded, and the library's own leaf loops index without conversions. A power-of-two remainder is the plain `%`, so `v % 2 === 0` is a low-bit test.
- **Callbacks called by name.** `mapReduce`'s leaf calls `read`, `fn` and `combine` once per element. Each is a parameter, a capture or a field, so nothing proves which function it holds, and each was an indirect call where Rayon inlines its closure. The compiler now records which one function reaches each of them and calls it through an identity guard: the callable's entry is compared with that function's, and a match calls it by name, where the C++ compiler inlines it. A mismatch runs the original call, so a wrong guess costs one compare and no body is ever copied. primes 529 → 485 ms, collatz 261 → 250 ms.
- **`&&` conditions.** A short-circuit loop condition lowered to a `bool` written on both arms and tested again; clang lays that loop out 1.5% slower than the `&&` it came from. The edge whose value is already decided now goes straight to its target: mandelbrot 566 → 557 ms.
- **The join.** Freed cells a region leaves behind are handed back to the joining thread's pool. The hand-off walked each list to its end, serially, after every worker had finished: binary-trees' 52 million nodes held the join for 50 ms. Each list now keeps its tail: 119 → 72 ms at 20 threads.
- **Strings.** Concatenation writes its pieces with stores the size of the loads that read them back, and integer-to-text conversion produces eight digits in one word: strings 327 → 80.1 ms single-threaded.

## Running it

From `benchmarks/node/`, on Linux (Node 24, clang 18, cargo, GNU time):

```sh
npm --prefix .. run parallel -- --samples 5 --output parallel/results/parallel-$(date +%F).json
npm --prefix .. run parallel:report -- parallel/results/parallel-$(date +%F).json > parallel/results/parallel-$(date +%F).md
```

`--only a,b` picks workloads and `--threads 1,all` the thread counts. `--remote <ssh-host>` emits the C++ locally, then builds and measures on the host's WSL.

For output correctness without timing or ranking, use:

```sh
npm --prefix .. run parallel -- --verify-only --threads 1,2
```

Verification builds the same five runtime implementations and compares every output with
Node at small boundary sizes. Each selected thread configuration runs each size once.
Queens includes nonzero solution counts, and spectral norm uses defined nonempty matrices.
Build failures, omitted runtimes, abnormal exits and output mismatches fail the command.
The default report is `node/dist/parallel/parallel-verification.json`; historical timing
reports are unchanged. Compiler and runtime fingerprints remain mandatory.

The harness resolves `@geastack/parallel` from `node_modules`, or from `PARALLEL_ROOT` for a local checkout. Emission uses the single sibling workspace compiler; `GEA_COMPILER_DIR` explicitly selects that root (`PARALLEL_COMPILER_ROOT` remains a compatible alias). Registry/private compiler copies are refused. Results retain complete compiler JavaScript and native runtime fingerprints. Runtime-only remote execution receives emitted C++ and authenticated headers, not another compiler build. A failed or mismatched cell saves its raw results and makes the command fail.

The Rust reference builds with `cargo build --release --locked` against the tracked `native-rust/Cargo.lock`. Raw results record both its manifest and lockfile hashes, alongside `rustc --version`. Update the lockfile deliberately when changing the reference dependencies; a benchmark run must not resolve a newer Rayon release implicitly. The [Linux container instructions](../README.md#linux-container) provide the pinned toolchain environment.

All three single-source runtimes run one library source, `src/index.ts`. Node runs it transpiled, as any TypeScript build would, rather than the package's built `dist/`, which is only as current as its last build. geatsc compiles it directly (it maps the package's `dist/` back to its source). scriptc can only compile npm packages through its embedded dynamic engine (`--dynamic`), which would measure an interpreter, so the harness vendors the same file next to the program with `tasks` inlined as the sequential loop it is under Node. The report records the source's SHA-256.
