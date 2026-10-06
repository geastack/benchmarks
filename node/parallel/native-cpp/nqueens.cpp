#include "par.hpp"

static long long solve(int size, int row, uint32_t columns, uint32_t left, uint32_t right) {
  if (row == size)
    return 1;
  uint32_t all = (1u << size) - 1;
  uint32_t free = all & ~(columns | left | right);
  long long count = 0;
  while (free != 0) {
    uint32_t bit = free & -free;
    free ^= bit;
    count += solve(size, row + 1, columns | bit, ((left | bit) << 1) & all, (right | bit) >> 1);
  }
  return count;
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double size) -> long long {
    int n = int(size);
    uint32_t all = (1u << n) - 1;
    return par::sum<long long>(size_t(n * n), [&](size_t placement) -> long long {
      uint32_t first = 1u << (placement / n);
      uint32_t second = 1u << (placement % n);
      uint32_t left = (first << 1) & all;
      uint32_t right = first >> 1;
      if (second & (first | left | right))
        return 0;
      return solve(n, 2, first | second, ((left | second) << 1) & all, (right | second) >> 1);
    });
  });
}
