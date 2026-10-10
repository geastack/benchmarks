#include "par.hpp"

// The same shape as Rayon's par_sort and @geastack/parallel's `sorted`: sort
// chunks in parallel with a stable sort, then merge neighbouring runs level
// by level, each level in parallel.
int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double size) -> long long {
    size_t n = size_t(size);
    std::vector<int64_t> items(n);
    int64_t seed = 42;
    for (size_t i = 0; i < n; i++) {
      seed = seed * 16807 % 2147483647;
      items[i] = seed;
    }
    auto less = [](int64_t a, int64_t b) { return a < b; };
    size_t runs = std::min(n, par::pool().size() * 4);
    std::vector<size_t> bounds(runs + 1);
    for (size_t r = 0; r <= runs; r++)
      bounds[r] = r * n / (runs ? runs : 1);
    std::vector<int64_t> out(items), scratch(n);
    par::pool().run(runs, [&](size_t r) {
      std::stable_sort(out.begin() + bounds[r], out.begin() + bounds[r + 1], less);
    });
    while (bounds.size() > 2) {
      size_t pairs = (bounds.size() - 1 + 1) / 2;
      std::vector<size_t> next(pairs + 1);
      for (size_t p = 0; p < pairs; p++)
        next[p] = bounds[p * 2];
      next[pairs] = n;
      par::pool().run(pairs, [&](size_t p) {
        size_t lo = bounds[p * 2], mid = bounds[std::min(p * 2 + 1, bounds.size() - 1)],
               hi = next[p + 1];
        std::merge(out.begin() + lo, out.begin() + mid, out.begin() + mid, out.begin() + hi,
                   scratch.begin() + lo, less);
      });
      out.swap(scratch);
      bounds.swap(next);
    }
    long long checksum = 0;
    for (int64_t value : out)
      checksum = (checksum * 31 + value) % 1000000007;
    return checksum;
  });
}
