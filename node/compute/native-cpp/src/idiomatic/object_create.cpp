#include <vector>
#include "bench_main.h"

// Mirror of fixtures/object_create.ts: a fixed ring of materialized objects.
// Storing each fresh object into the vector and reading a different, dynamically
// indexed slot back forces real materialization (no scalar replacement); the
// loop-carried `total` defeats hoisting. gea/native store value structs into a
// contiguous vector (no per-object heap alloc / GC); node heap-allocates each.
struct Point {
  long long x, y, z;
};

long long bench_run(long long it) {
  std::vector<Point> ring(256, Point{0, 0, 0});
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    ring[(size_t)(i % 256)] = Point{(i + total) % 100000, i * 2, i * 3};
    const Point &o = ring[(size_t)((i * 31 + 7) % 256)];
    total = (total + o.x + o.y + o.z) % 1000000000LL;
  }
  return total;
}
