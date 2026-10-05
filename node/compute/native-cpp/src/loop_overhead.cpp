#include <cmath>
#include "bench_main.h"

// JS accumulates in double; at 3e8 the sum exceeds 2^53 so precision matches
// node (not an exact integer). Use double + fmod to reproduce node's result.
long long bench_run(long long it) {
  double total = 0;
  for (long long i = 0; i < it; i++)
    total += (double)i;
  return (long long)std::fmod(total, 1000000000.0);
}
