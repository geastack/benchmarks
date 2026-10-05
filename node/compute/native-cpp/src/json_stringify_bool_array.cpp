#include <vector>
#include <string>
#include "bench_main.h"

long long bench_run(long long it) {
  std::vector<char> items;
  items.reserve(10000);
  for (long long i = 0; i < 10000; i++)
    items.push_back(i % 2 == 0 ? 1 : 0);
  long long total = 0;
  std::string text;
  text.reserve(60000);
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % 10000)] = ((i + total) % 2 == 0) ? 1 : 0;
    text.clear();
    text += '[';
    for (size_t k = 0; k < items.size(); k++) {
      if (k)
        text += ',';
      text += items[k] ? "true" : "false";
    }
    text += ']';
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
