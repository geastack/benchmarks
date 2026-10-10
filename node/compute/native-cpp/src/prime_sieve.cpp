#include <algorithm>
#include <cstdint>
#include <vector>
#include "bench_main.h"

// Parity with fixtures/prime_sieve.ts: `new Uint8Array(LIMIT + 1)` is a zeroed
// byte array, `.fill(1)` one pass over it.
long long bench_run(long long it) {
  const long long LIMIT = 10000000;
  long long total = 0;
  for (long long r = 0; r < it; r++) {
    std::vector<uint8_t> sieve((size_t)LIMIT + 1);
    std::fill(sieve.begin(), sieve.end(), (uint8_t)1);
    sieve[0] = 0;
    sieve[1] = 0;
    for (long long i = 2; i * i <= LIMIT; i++)
      if (sieve[(size_t)i] == 1)
        for (long long j = i * i; j <= LIMIT; j += i)
          sieve[(size_t)j] = 0;
    long long count = 0;
    for (long long i = 2; i <= LIMIT; i++)
      if (sieve[(size_t)i] == 1)
        count++;
    total = (total + count) % 1000000000LL;
  }
  return total;
}
