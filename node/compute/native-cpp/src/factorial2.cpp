#include <cmath>
#include "bench_main.h"

// Same as factorial.cpp but mirrors geatsc's int_mod_const: avoid the fmod
// libcall whenever the (integer-valued) product is < 2^53.
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
