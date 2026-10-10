#include <cmath>
#include "bench_main.h"

// Parity with fixtures/factorial.ts: `acc` is a JavaScript number, so `acc * i`
// rounds to a double above 2^53 and `%` is the floating-point remainder. The
// hand range reduction (integer `%` below 2^53) is in idiomatic/factorial.cpp;
// TypeScript has no integer type to write it with.
long long bench_run(long long it) {
  const double MOD = 1000000007.0;
  double acc = 1.0;
  for (long long i = 1; i <= it; i++)
    acc = std::fmod(acc * (double)i, MOD);
  return (long long)acc;
}
