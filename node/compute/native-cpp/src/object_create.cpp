#include <vector>
#include "bench_main.h"

// Parity with fixtures/object_create.ts: a ring of 256 records, a fresh record
// stored per iteration and a different, dynamically indexed slot read back.
// Both indices reduce by the ring's length, as the TypeScript does, not by a
// literal 256. Records are value structs in a contiguous vector, the same
// representation every other fixture here gives a TypeScript object type
// (`Item`, `Node`): the program never aliases a Point, so a record and a
// reference to one cannot be told apart.
struct Point {
  long long x, y, z;
};

long long bench_run(long long it) {
  std::vector<Point> ring;
  for (int i = 0; i < 256; i++)
    ring.push_back(Point{0, 0, 0});
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    ring[(size_t)(i % (long long)ring.size())] = Point{(i + total) % 100000, i * 2, i * 3};
    const Point &o = ring[(size_t)((i * 31 + 7) % (long long)ring.size())];
    total = (total + o.x + o.y + o.z) % 1000000000LL;
  }
  return total;
}
