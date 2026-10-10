// Benchmark entry point and timing functions for Gea-emitted C++.
// Runs module initialization once, reads the iteration count from argv,
// and prints the workload time and result for bench-npm.mjs to validate.
#pragma once
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <string>
#include "gea_runtime.h"

namespace gea::bench {

inline int argCount = 0;
inline char **argValues = nullptr;

/** `process.argv[2]`, the iteration count, as node's own runner reads it. */
inline double argvNumber() {
  return argCount > 1 ? std::strtod(argValues[1], nullptr) : 0.0;
}

/**
 * `performance.now()`.
 *
 * `steady_clock` and not `system_clock`: this measures a duration, and a wall
 * clock can step. The same choice the hand-written baseline's `bench_main.h`
 * makes, so the two columns are timed by the same instrument.
 */
inline double now() {
  return std::chrono::duration<double, std::milli>(
             std::chrono::steady_clock::now().time_since_epoch())
      .count();
}

/** The two lines the harness reads: the inner time, then the workload's result as JS would print
 * it. */
inline void report(double milliseconds, double result) {
  const char *timing = std::getenv("GEATSC_BENCH_TIMING");
  if (timing && timing[0] != '0' && timing[0] != '\0')
    std::printf("__bench_ms__ %.6f\n", milliseconds);
  std::printf("%s\n", gea::host::detail::toString(result).c_str());
}

/** Untimed differential runs publish only the actual workload result. */
inline void result(double value) {
  std::printf("%s\n", gea::host::detail::toString(value).c_str());
}

} // namespace gea::bench

extern void __gea_top_level();

// Weak, because this header is the bench target's whole host and every unit of
// the program includes it through the compiler's own preamble. Under the
// single-unit layout that is one definition of `main`; under `--units
// per-file` it is one per unit, and a weak definition is what lets the linker
// keep one of several identical copies instead of refusing the link.
__attribute__((weak)) int main(int argc, char **argv) {
  gea::bench::argCount = argc;
  gea::bench::argValues = argv;
#if GEA_RUNTIME_PARALLEL
  // Start the region pool and give every thread its first allocation before
  // the clock starts, as the Rust baseline's `rayon::broadcast` and the C++
  // baseline's `pool()` do for theirs. Each task waits for all the others, so
  // no thread can run two of them and every thread runs one.
  {
    const std::size_t threads = gea::detail::parallel::RegionPool::instance().threads();
    std::atomic<std::size_t> arrived{0};
    auto warm = [&](std::size_t) -> bool {
      std::free(std::malloc(64));
      arrived.fetch_add(1);
      while (arrived.load() < threads) std::this_thread::yield();
      return false;
    };
    gea::detail::parallel::runRegion(threads, warm);
  }
#endif
  __gea_top_level();
  return 0;
}
