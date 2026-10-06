#include "par.hpp"

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double size) -> long long {
    const int maxIterations = 200;
    const size_t n = size_t(size);
    return par::sum<long long>(n, [&](size_t row) {
      double ci = (double(row) / size) * 3 - 1.5;
      long long inside = 0;
      for (size_t column = 0; column < n; column++) {
        double cr = (double(column) / size) * 3 - 2;
        double zr = 0, zi = 0;
        int iteration = 0;
        while (iteration < maxIterations && zr * zr + zi * zi <= 4) {
          double next = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = next;
          iteration++;
        }
        if (iteration == maxIterations)
          inside++;
      }
      return inside;
    });
  });
}
