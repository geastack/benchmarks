#include "bench_main.h"

// value,n,total all < 1e9, so (x+y) < 2e9 and `% 1e9` is one compare-subtract
// (no division). Identical result to node/geatsc. fixtures/method_calls.ts
// reduces the same way (parity); idiomatic/method_calls.ts keeps the plain
// `%` and runs against this same C++.
struct Counter {
  long long value = 0;

  long long tick(long long n) {
    value += n;
    if (value >= 1000000000LL)
      value -= 1000000000LL;
    return value;
  }
};

long long bench_run(long long it) {
  Counter c;
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    total += c.tick(i);
    if (total >= 1000000000LL)
      total -= 1000000000LL;
  }
  return total;
}
