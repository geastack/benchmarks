# @geastack/parallel benchmarks

Nine data-parallel workloads, each written once in TypeScript against [`@geastack/parallel`](https://github.com/geastack/parallel) and run five ways:

| runtime           | what runs                                                                      | threads                                  |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------- |
| **Node 24**       | the TypeScript as written, through the library's JavaScript                    | 1 (the library is sequential under Node) |
| **scriptc 0.2.3** | the same program compiled by scriptc                                           | 1                                        |
| **GeaStack**      | the same program compiled by geatsc to C++                                     | 1 and all (`GEA_PARALLEL_THREADS`)       |
| **Rust + Rayon**  | the same algorithm written idiomatically for Rayon (`native-rust/`)            | 1 and all (`RAYON_NUM_THREADS`)          |
| **C++**           | the same algorithm on a hand-written `std::thread` pool (`native-cpp/par.hpp`) | 1 and all (`PAR_THREADS`)                |

Every program prints its answer, and every answer must equal Node's. A floating-point workload (spectral-norm, mandelbrot) is compiled with `-ffp-contract=off` so C++ keeps JavaScript's rounding.

## Latest results

[2026-10-06 report](results/parallel-2026-10-06.md) ([raw JSON](results/parallel-2026-10-06.json)), Ryzen 9 9900X3D, 20 threads, WSL2:

| workload      | Node | GeaStack ×1 | GeaStack ×20 | Rayon ×20 | C++ ×20 |
| ------------- | ---: | ----------: | -----------: | --------: | ------: |
| mandelbrot    |  564 |         582 |         35.7 |      35.2 |    34.4 |
| primes        |  489 |         703 |         66.1 |      41.9 |    42.6 |
| nqueens       | 32.7 |        27.1 |         4.02 |      2.70 |    1.83 |
| strings       |  342 |         327 |         28.7 |      7.98 |    7.72 |
| binary-trees  |  390 |        1193 |          208 |       119 |     107 |
| sort          |  625 |         453 |          101 |      24.7 |    38.5 |
| collatz       | 2901 |        2130 |          116 |      14.9 |    14.5 |
| matmul        |  225 |        1083 |          110 |      24.8 |    15.3 |
| spectral-norm |  341 |        1067 |          116 |      14.1 |    30.9 |

Milliseconds, best of five. Geometric means at 20 threads:

- GeaStack runs **6.5× faster than Node** and **23× faster than scriptc**.
- GeaStack takes **2.9× as long as Rayon**.
- GeaStack **scales 9.4× from 1 to 20 threads**, the same as Rayon (9.5×) and C++ (9.4×).

The parallel runtime keeps up with Rayon's: where GeaStack's single-thread code is already at native speed (mandelbrot), it lands at native speed on 20 threads too. Where it is behind, it is behind by the single-thread gap, and the causes are compiler issues unrelated to parallelism:

- **collatz.** `3 * v + 1` has no bound GeaStack can prove, so the value stays a JavaScript Number (a double), and `%` is a floating-point remainder. That is the semantics Node runs; Rust and C++ use `u64`.
- **matmul, spectral-norm.** The callbacks capture their arrays. GeaStack does not yet compile an integer-keyed version of a capturing closure, so each element access converts a double index.
- **binary-trees.** The recursive walk copies its child handles where it could borrow them: one reference-count round-trip per node.
- **sort, strings.** These are string and comparator-call overhead. Under Node the same programs run 4–12× slower than under GeaStack.

## Running it

From `benchmarks/node/`, on Linux (Node 24, clang 18, cargo, GNU time):

```sh
npm --prefix .. run parallel -- --samples 5 --output parallel/results/parallel-$(date +%F).json
npm --prefix .. run parallel:report -- parallel/results/parallel-$(date +%F).json > parallel/results/parallel-$(date +%F).md
```

`--only a,b` picks workloads and `--threads 1,all` the thread counts. `--remote <ssh-host>` emits the C++ locally, then builds and measures on the host's WSL.

The harness resolves `@geastack/parallel` from `node_modules`, or from `PARALLEL_ROOT` for a local checkout. It uses the compiler that package resolves, or the one in `PARALLEL_COMPILER_ROOT`.

scriptc can only compile npm packages through its embedded dynamic engine (`--dynamic`), which would measure an interpreter. So the harness gives scriptc the library's own `src/index.ts`, vendored next to the program, with `tasks` inlined as the sequential loop it is under Node. That is the same code Node runs.
