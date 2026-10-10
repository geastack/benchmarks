#include <vector>
#include "bench_main.h"

long long bench_run(long long it) {
  std::vector<long long> data;
  for (long long i = 0; i < it; i++)
    data.push_back((i * 2 + 1) % 1000000);
  long long checksum = 0;
  for (long long i = 0; i < it; i += 1024)
    checksum += data[(size_t)i];
  return checksum % 1000000000LL;
}
