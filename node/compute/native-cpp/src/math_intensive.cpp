#include <cmath>
#include "bench_main.h"

long long bench_run(long long it) {
  double total = 0;
  for (long long i = 1; i <= it; i++)
    total += 1.0 / (double)i;
  double v = std::floor(std::fabs(total) * 1000000.0);
  return ((long long)v) % 1000000000LL;
}
