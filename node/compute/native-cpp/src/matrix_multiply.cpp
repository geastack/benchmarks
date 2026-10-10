#include <vector>
#include <cmath>
#include <cstdint>
#include "bench_main.h"

// Parity with fixtures/matrix_multiply.ts (Float64Array): flat row-major
// matrices, zero-initialized, indexed i * N + j; a fresh product per iteration.
// The idiomatic TypeScript (idiomatic/matrix_multiply.ts) nests number[][]
// and runs against this same C++.
//
// JS `&` coerces via ToInt32, so the mask runs on the low 32 bits.
static inline double mk(long long v) {
  return (double)((uint32_t)(uint64_t)v & 0x7fffffffu);
}

long long bench_run(long long it) {
  const int N = 256;
  std::vector<double> a((size_t)N * N), b((size_t)N * N);
  for (int i = 0; i < N; i++)
    for (int j = 0; j < N; j++) {
      a[(size_t)i * N + j] =
          mk((long long)i * 1103515245LL + (long long)j * 12345LL) / 2147483647.0;
      b[(size_t)i * N + j] = mk((long long)i * 134775813LL + (long long)j * 1LL) / 2147483647.0;
    }
  double checksum = 0;
  for (long long r = 0; r < it; r++) {
    std::vector<double> c((size_t)N * N, 0.0);
    for (int i = 0; i < N; i++)
      for (int k = 0; k < N; k++)
        for (int j = 0; j < N; j++)
          c[(size_t)i * N + j] += a[(size_t)i * N + k] * b[(size_t)k * N + j];
    for (int i = 0; i < N; i++)
      checksum += c[(size_t)i * N + i];
  }
  double v = std::floor(std::fabs(checksum) * 1000.0);
  return ((long long)v) % 1000000000LL;
}
