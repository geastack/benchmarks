#include <vector>
#include <string>
#include "bench_main.h"

long long bench_run(long long it) {
  std::vector<std::string> items;
  items.reserve(10000);
  for (long long i = 0; i < 10000; i++) {
    std::string s = "item-";
    s += std::to_string(i);
    s += "-text-payload";
    items.push_back(s);
  }
  const char *swaps[4] = {"swap-a", "swap-bb", "swap-ccc", "swap-dddd"};
  long long total = 0;
  std::string text;
  text.reserve(300000);
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % 10000)] = swaps[(size_t)((i + total) % 4)];
    text.clear();
    text += '[';
    for (size_t k = 0; k < items.size(); k++) {
      if (k)
        text += ',';
      text += '"';
      text += items[k];
      text += '"';
    }
    text += ']';
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
