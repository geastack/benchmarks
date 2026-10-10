#include <vector>
#include "bench_main.h"

long long bench_run(long long it) {
  const int LIMIT = 10000000;
  long long total = 0;
  for (long long r = 0; r < it; r++) {
    std::vector<char> sieve((size_t)LIMIT + 1, 1);
    sieve[0] = 0;
    sieve[1] = 0;
    for (long long i = 2; i * i <= LIMIT; i++)
      if (sieve[(size_t)i])
        for (long long j = i * i; j <= LIMIT; j += i)
          sieve[(size_t)j] = 0;
    long long count = 0;
    for (int i = 2; i <= LIMIT; i++)
      if (sieve[(size_t)i])
        count++;
    total = (total + count) % 1000000000LL;
  }
  return total;
}
