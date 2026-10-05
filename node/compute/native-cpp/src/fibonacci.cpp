#include "bench_main.h"

static long long fib(int n) {
  if (n < 2)
    return n;
  return fib(n - 1) + fib(n - 2);
}

long long bench_run(long long it) {
  long long total = 0;
  for (long long i = 0; i < it; i++)
    total += fib(40);
  return total % 1000000000LL;
}
