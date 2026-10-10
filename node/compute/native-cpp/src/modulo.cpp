#include "bench_main.h"

// Parity with fixtures/modulo.ts: the plain `%` the fixture exists to measure.
// The hand compare-and-subtract reduction is in idiomatic/modulo.cpp; written
// into the TypeScript it would delete the operation under test.
long long bench_run(long long it) {
  long long h = 0;
  for (long long i = 0; i < it; i++)
    h = (h + i * 3 + 1) % 1000000007LL;
  return h;
}
