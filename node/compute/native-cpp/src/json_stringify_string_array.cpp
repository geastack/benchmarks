#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

// Parity with fixtures/json_stringify_string_array.ts: a fresh, unsized
// string per JSON.stringify call, and every element scanned for characters
// JSON must escape.
static std::string stringify(const std::vector<std::string> &items) {
  std::string text;
  text += '[';
  for (size_t k = 0; k < items.size(); k++) {
    if (k)
      text += ',';
    ju::appendQuoted(text, items[k]);
  }
  text += ']';
  return text;
}

long long bench_run(long long it) {
  std::vector<std::string> items;
  for (long long i = 0; i < 10000; i++)
    items.push_back("item-" + std::to_string(i) + "-text-payload");
  const std::vector<std::string> swaps = {"swap-a", "swap-bb", "swap-ccc", "swap-dddd"};
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % (long long)items.size())] = swaps[(size_t)((i + total) % 4)];
    std::string text = stringify(items);
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
