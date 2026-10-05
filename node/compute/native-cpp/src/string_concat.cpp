#include <string>
#include "bench_main.h"

long long bench_run(long long it) {
  std::string s;
  for (long long i = 0; i < it; i++)
    s += 'a';
  return (long long)s.size();
}
