# GeaStack benchmarks

Sources, runners and raw results for our comparisons of GeaStack against scriptc, Node.js and hand-written C++.

## October 6, 2026: `@geastack/parallel` against Rust + Rayon and C++

[`@geastack/parallel`](https://github.com/geastack/parallel) is a Rayon-style data-parallel library for TypeScript. Under Node it runs sequentially, as plain JavaScript; compiled by GeaStack, the same program runs on every core and gives the same answer. Nine workloads, 20 threads, geometric means:

- **Node.** GeaStack is 7.9× faster.
- **scriptc.** GeaStack is 28× faster.
- **Rayon.** GeaStack takes 2.4× as long.
- **Scaling.** GeaStack scales 9.2× from 1 to 20 threads, close to Rayon (9.5×) and hand-written C++ threads (9.4×).

On mandelbrot, GeaStack is level with Rayon and C++. The other workloads trail by GeaStack's single-thread gap, not by the parallel runtime; the suite README lists the causes.

- [Suite, methodology and known gaps](parallel/)
- [Report](parallel/results/parallel-2026-10-06.md) and [raw records](parallel/results/parallel-2026-10-06.json)

## October 5, 2026: scriptc 0.2.3

**Compute.** 27 fixtures covering loops, arrays, objects, numbers, strings and JSON. 26 finished with matching output on all four runtimes. scriptc timed out on the prime sieve after 180 seconds, so the sieve is left out of the averages. Over the other 26, scriptc took 6.50× as long as GeaStack (geometric mean). Compiling scriptc's output at `-O3` brought that to 6.48×.

**HTTP.** A raw `node:http` server with one and four workers. With four workers on `/`, GeaStack served 313,434 requests/s and scriptc 115,519. That is 2.71× the throughput.

Write-up: [scriptc 0.2.3 update: GeaStack is 6.5× faster](https://geastack.com/blog-scriptc-0-2-3).

- [Compute fixtures and C++ references](compute/)
- [Compute report](compute/results/npm-scriptc-2026-10-05.md)
- [`-O3` experiment report](compute/results/scriptc-o3-2026-10-05.md)
- [Raw records and build provenance](results/2026-10-05/)
- [HTTP server sources](apps/raw-http-hello/)
- [HTTP harness](bench/http-matrix.py)

## October 5, 2026: HTTP servers and Hono

The same raw `node:http` server measured against Rust and C++ servers that return the same bytes, and a [Hono app](apps/hono-hello/server.ts) on GeaStack, Node and scriptc. Requests per second on `GET /`, mean of three runs:

| server              | 1 worker | 4 workers | memory, 4 workers |
| ------------------- | -------: | --------: | ----------------: |
| C++ epoll, by hand  |  202,607 |   362,164 |           2.3 MiB |
| **GeaStack**        |  165,122 |   314,081 |           5.4 MiB |
| Rust hyper          |  147,790 |   274,206 |           2.0 MiB |
| C++ Drogon          |  118,183 |   241,866 |           9.2 MiB |
| Rust axum           |  116,865 |   225,047 |           3.2 MiB |
| scriptc 0.2.3       |   51,466 |   115,202 |           1.5 MiB |
| Node.js 24          |   33,606 |    77,239 |         185.0 MiB |
| **GeaStack, Hono**  |   86,203 |   192,071 |           8.1 MiB |
| Node.js 24, Hono    |   34,414 |    77,421 |         258.5 MiB |
| scriptc 0.2.3, Hono |   11,464 |    23,367 |          18.5 MiB |

Memory is proportional set size summed over the server's processes. GeaStack and Node run the same `server.ts` with `hono` 4.12.34 and `@hono/node-server` 2.1.1. scriptc can't build that file in any configuration we tried; what works is a [native `node:http` server](apps/hono-hello/scriptc/server.ts) calling the two routes in Hono, which runs as JavaScript in scriptc's embedded QuickJS engine. [Every configuration and its error](results/2026-10-05/scriptc-0.2.3-hono-attempts.md).

- [Full report, including `/json`, p99 latency, binary sizes and startup](results/2026-10-05/http-2026-10-05.md)
- [Raw records](results/2026-10-05/http-2026-10-05.json) and [startup records](results/2026-10-05/http-startup-2026-10-05.json)
- [Rust](apps/raw-http-hello/rust-server/), [C++ epoll](apps/raw-http-hello/cpp-epoll/server.cpp) and [Drogon](apps/raw-http-hello/cpp-drogon/main.cc) sources

## Running it

These are Node runtime/compute and HTTP benchmarks. Layout, rendering, CSS feature stripping and device gesture benchmarks are documented separately in the [CSS suite](../css/README.md).

You need Linux on x86-64, Node 24, Python 3, clang 18, GNU time, `timeout` (coreutils), `taskset` (util-linux), `ip` (iproute2) and `wrk`. The HTTP servers also need cargo and Drogon (on Ubuntu, `libdrogon-dev`). Use an idle machine. The lockfile pins `@geastack/compiler` 1.0.26, `@geastack/node-compat` 1.0.17, `scriptc` 0.2.3, `hono` 4.12.34 and `@hono/node-server` 2.1.1. Compute output goes to `node/dist/` from the repository root, which is gitignored.

All commands below start in `benchmarks/node/`. npm scripts execute from the repository root; direct commands execute from this directory.

### Compute

```sh
npm --prefix .. ci
npm --prefix .. run compute -- --samples 5 --output node/dist/compute.json
npm --prefix .. run compute:report -- node/dist/compute.json
```

Each fixture runs in five fresh processes pinned to CPU 0, and the fastest inner workload time is reported. Every output is checked against Node. GeaStack and the C++ references build with `-O3 -march=native`; scriptc uses its default release build, `-O2`. The C++ references are hand-optimized (simdjson for parsing, for example), so they show what tuned C++ can do rather than isolate compiler overhead.

### scriptc at `-O3`

The scriptc CLI has no `-O3` flag. This runner takes the LLVM scriptc already emitted, recompiles it at levels 2 and 3 through scriptc's bundled internal helper, and links it with scriptc's own link recipe and shipped runtime. Run the compute benchmark first; it generates the inputs.

```sh
python3 compute/bench-scriptc-o3.py --package-root .. \
  --baseline dist/compute.json --output dist/scriptc-o3.json
```

### Output and scaling checks

```sh
node compute/verify-compute.mjs dist/compute.json dist/compute-checks.json
```

Run this after the compute benchmark. It checks outputs at several iteration counts, records internal and wall-clock timings, and runs seven fixtures at several workload sizes. It reuses the existing binaries; the compute runner builds GeaStack and C++ at `-O3` and does not implement an `--opt-level` option. The sieve is checked only at zero iterations, since scriptc can't finish it at full size.

### HTTP

```sh
npm --prefix .. run http:build
mkdir -p dist
python3 bench/http-matrix.py --output dist/http.json --workers 1 4 \
  --rounds 3 --duration 8s --server-cpus 0-3 --load-cpus 4-7
python3 bench/http-matrix.py --output dist/http-startup.json --workers 1 4 \
  --rounds 5 --startup-only --server-cpus 0-3 --load-cpus 4-7
python3 bench/render-http.py dist/http.json dist/http-startup.json
```

`http-matrix.py` measures all ten servers by default; `--servers` picks a subset (`gea-raw`, `node-raw`, `scriptc-raw`, `rust-hyper`, `rust-axum`, `cpp-epoll`, `cpp-drogon`, `hono-gea`, `hono-node`, `hono-scriptc`). Before measuring, it checks every raw server's `/` and `/json` responses byte for byte, and the Hono servers' bodies and 404s.

Each sample is a two-second warmup followed by eight seconds of `wrk` with four threads and 64 keep-alive connections, and the rounds alternate the order of the servers. One worker runs on CPU 0, four workers on CPUs 0–3, and `wrk` on CPUs 4–7. Multiple workers mean separate processes sharing the port for GeaStack, scriptc and C++ epoll; `node:cluster` for Node; and threads for Rust (tokio) and Drogon. GeaStack builds with node-compat's release defaults (clang 18, `-Os -flto`), the C++ servers with `-O2`, and Rust with `--release`, LTO and one codegen unit.

We ran on an Intel Xeon E3-1231 v3 (4 cores, 8 threads), where CPUs 0–1, 2–3, 4–5 and 6–7 are hyperthread pairs. On another machine, pick CPU sets that keep the server and `wrk` on different physical cores.

## License

Apache-2.0; see [LICENSE](../LICENSE). The vendored simdjson keeps its [own license](compute/native-cpp/simdjson/LICENSE), and npm dependencies keep theirs. The compute fixtures and C++ references come from the GeaStack compiler's comparison suite; the HTTP sources and harness come from [geastack/node-compat](https://github.com/geastack/node-compat).
