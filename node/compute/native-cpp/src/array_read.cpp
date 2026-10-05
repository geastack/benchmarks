#include <vector>
#include "bench_main.h"

long long bench_run(long long it) {
  std::vector<long long> data;
  data.reserve(it > 0 ? (size_t)it : 0);
  for (long long i = 0; i < it; i++)
    data.push_back(i);
  long long total = 0;
  for (long long i = 0; i < it; i++)
    total += data[(size_t)i];
  return total % 1000000000LL;
}
