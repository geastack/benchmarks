#include <vector>
#include <cmath>
#include <cstdint>
#include "bench_main.h"

// Nested matrices, as in fixtures/matrix_multiply_nested.ts: one vector per
// row, every row and matrix grown by push_back with no reserve.

// JS '&' coerces via ToInt32, so the mask runs on the low 32 bits.
static inline double mk(long long v) {
  return (double)((uint32_t)(uint64_t)v & 0x7fffffffu);
}

long long bench_run(long long it) {
  const int N = 256;
  std::vector<std::vector<double>> a, b;
  for (int i = 0; i < N; i++) {
    std::vector<double> ra, rb;
    for (int j = 0; j < N; j++) {
      ra.push_back(mk((long long)i * 1103515245LL + (long long)j * 12345LL) / 2147483647.0);
      rb.push_back(mk((long long)i * 134775813LL + (long long)j * 1LL) / 2147483647.0);
    }
    a.push_back(std::move(ra));
    b.push_back(std::move(rb));
  }
  double checksum = 0;
  for (long long r = 0; r < it; r++) {
    std::vector<std::vector<double>> c;
    for (int i = 0; i < N; i++) {
      std::vector<double> row;
      for (int j = 0; j < N; j++) row.push_back(0.0);
      c.push_back(std::move(row));
    }
    for (int i = 0; i < N; i++) {
      std::vector<double>& ci = c[i];
      const std::vector<double>& ai = a[i];
      for (int k = 0; k < N; k++) {
        const double aik = ai[k];
        const std::vector<double>& bk = b[k];
        for (int j = 0; j < N; j++) ci[j] += aik * bk[j];
      }
    }
    for (int i = 0; i < N; i++) checksum += c[i][i];
  }
  double v = std::floor(std::fabs(checksum) * 1000.0);
  return ((long long)v) % 1000000000LL;
}
