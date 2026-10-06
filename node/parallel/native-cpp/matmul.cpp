#include "par.hpp"

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double size) -> long long {
    size_t n = size_t(size);
    std::vector<double> a(n * n), bt(n * n);
    for (size_t i = 0; i < n; i++)
      for (size_t j = 0; j < n; j++) {
        a[i * n + j] = double(long((i * 7 + j * 3) % 11) - 5);
        bt[j * n + i] = double(long((i * 5 + j * 13) % 9) - 4);
      }
    return (long long)par::sum<double>(n, [&](size_t i) {
      double rowSum = 0;
      for (size_t j = 0; j < n; j++) {
        double cell = 0;
        for (size_t k = 0; k < n; k++)
          cell += a[i * n + k] * bt[j * n + k];
        rowSum += cell * double(j % 7 + 1);
      }
      return rowSum * double(i % 5 + 1);
    });
  });
}
