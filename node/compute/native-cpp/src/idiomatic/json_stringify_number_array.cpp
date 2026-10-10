#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

long long bench_run(long long it) {
  std::vector<long long> items;
  items.reserve(10000);
  for (long long i = 0; i < 10000; i++)
    items.push_back((i * 7919) % 1000000);
  long long total = 0;
  std::string text;
  text.reserve(80000);
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % 10000)] = (i * 31 + total) % 1000000;
    text.clear();
    text += '[';
    for (size_t k = 0; k < items.size(); k++) {
      if (k)
        text += ',';
      ju::appendUInt(text, items[k]);
    }
    text += ']';
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
