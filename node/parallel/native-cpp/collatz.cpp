#include "par.hpp"

static long long steps(uint64_t value) {
  long long count = 0;
  while (value != 1) {
    value = value % 2 == 0 ? value / 2 : 3 * value + 1;
    count++;
  }
  return count;
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double n) -> long long {
    return par::sum<long long>(size_t(n) - 1, [](size_t i) { return steps(i + 1); });
  });
}
