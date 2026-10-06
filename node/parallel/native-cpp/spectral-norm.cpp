#include <cmath>
#include "par.hpp"

static double entry(double i, double j) { return 1 / ((i + j) * (i + j + 1) / 2 + i + 1); }

static std::vector<double> times(const std::vector<double> &u) {
  size_t n = u.size();
  return par::map<double>(n, [&](size_t i) {
    double sum = 0;
    for (size_t j = 0; j < n; j++)
      sum += entry(double(i), double(j)) * u[j];
    return sum;
  });
}

static std::vector<double> timesTransposed(const std::vector<double> &u) {
  size_t n = u.size();
  return par::map<double>(n, [&](size_t i) {
    double sum = 0;
    for (size_t j = 0; j < n; j++)
      sum += entry(double(j), double(i)) * u[j];
    return sum;
  });
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double size) -> long long {
    size_t n = size_t(size);
    std::vector<double> u(n, 1.0), v = u;
    for (int iteration = 0; iteration < 10; iteration++) {
      v = timesTransposed(times(u));
      u = timesTransposed(times(v));
    }
    double vBv = 0, vv = 0;
    for (size_t i = 0; i < n; i++) {
      vBv += u[i] * v[i];
      vv += v[i] * v[i];
    }
    // Math.round: halves round up, which floor(x + 0.5) matches for a positive value.
    return (long long)std::floor(std::sqrt(vBv / vv) * 1e9 + 0.5);
  });
}
