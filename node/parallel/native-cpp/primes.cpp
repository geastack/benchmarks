#include "par.hpp"

static bool isPrime(uint64_t value) {
  if (value < 2)
    return false;
  if (value % 2 == 0)
    return value == 2;
  for (uint64_t divisor = 3; divisor * divisor <= value; divisor += 2)
    if (value % divisor == 0)
      return false;
  return true;
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double n) -> long long {
    return par::sum<long long>(size_t(n), [](size_t value) { return isPrime(value) ? 1 : 0; });
  });
}
