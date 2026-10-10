#include "bench_main.h"

// Best-native modular reduction for a constant modulus when the dividend stays
// in [0, 2*MOD): replace the division with a compare + conditional subtract
// (general %-fallback for the rare larger case). This is exactly what geatsc's
// int_mod_const_i64 emits, so this row measures geatsc vs OPTIMAL native — not vs
// a naive `% MOD`, which clang lowers to a ~10-15-cycle magic-number reduction on
// the loop-carried critical path and runs ~8x slower here.
static inline long long mod_const(long long a) {
  const long long M = 1000000007LL;
  if (a >= 0 && a < M)
    return a;
  if (a >= 0 && a < 2 * M)
    return a - M;
  return a % M;
}

long long bench_run(long long it) {
  long long h = 0;
  for (long long i = 0; i < it; i++) {
    h = mod_const(h + i * 3 + 1);
  }
  return h;
}
