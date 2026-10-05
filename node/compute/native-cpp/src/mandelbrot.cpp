#include <cmath>
#include "bench_main.h"
// Inner frame is input-independent, so clang would precompute it at compile
// time. eps is an opaque 0 (volatile) that forces the real per-pixel loop to
// run; adding +0.0 leaves every result bit-identical to node/geatsc.
static volatile double g_zero = 0.0;

long long bench_run(long long it) {
  const int W = 800, H = 800, MAX = 100;
  double eps = g_zero;
  long long escapeSum = 0;
  for (long long r = 0; r < it; r++)
    for (int py = 0; py < H; py++)
      for (int px = 0; px < W; px++) {
        double y0 = ((double)py / H) * 2.0 - 1.0 + eps;
        double x0 = ((double)px / W) * 3.0 - 2.0 + eps;
        double x = 0, y = 0;
        int itc = 0;
        while (x * x + y * y <= 4.0 && itc < MAX) {
          double xt = x * x - y * y + x0;
          y = 2.0 * x * y + y0;
          x = xt;
          itc++;
        }
        escapeSum += itc;
      }
  return escapeSum % 1000000000LL;
}
