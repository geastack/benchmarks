#include <cmath>
#include "bench_main.h"

// acc*i is integer-valued but can exceed 2^53, so JS's `%` is double fmod.
// For products < 2^53 reduce via integer modulo (constant -> multiply-shift),
// only paying the fmod libcall above 2^53. Bit-identical to node/geatsc.
long long bench_run(long long it) {
  const long long MOD = 1000000007LL;
  double acc = 1.0;
  for (long long i = 1; i <= it; i++) {
    double p = acc * (double)i;
    if (p < 9007199254740992.0) {
      long long ai = (long long)p;
      acc = (double)(ai % MOD);
    } else
      acc = std::fmod(p, MOD);
  }
  return (long long)acc;
}
