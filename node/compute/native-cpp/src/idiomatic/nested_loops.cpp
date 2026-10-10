#include <vector>
#include "bench_main.h"

long long bench_run(long long it) {
  const int N = 3000;
  std::vector<std::vector<long long>> grid;
  grid.reserve(N);
  for (int i = 0; i < N; i++) {
    std::vector<long long> row;
    row.reserve(N);
    for (int j = 0; j < N; j++)
      row.push_back((i * 17 + j * 31) & 0xff);
    grid.push_back(std::move(row));
  }
  long long total = 0;
  for (long long r = 0; r < it; r++)
    for (int i = 0; i < N; i++)
      for (int j = 0; j < N; j++)
        total += grid[(size_t)i][(size_t)j];
  return total % 1000000000LL;
}
