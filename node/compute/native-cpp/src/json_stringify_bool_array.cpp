#include <vector>
#include <string>
#include "bench_main.h"

// Parity with fixtures/json_stringify_bool_array.ts: one byte per boolean (the
// TypeScript runtime's layout, not std::vector<bool>'s bitset), and a fresh,
// unsized string per JSON.stringify call.
static std::string stringify(const std::vector<char> &items) {
  std::string text;
  text += '[';
  for (size_t k = 0; k < items.size(); k++) {
    if (k)
      text += ',';
    text += items[k] ? "true" : "false";
  }
  text += ']';
  return text;
}

long long bench_run(long long it) {
  std::vector<char> items;
  for (long long i = 0; i < 10000; i++)
    items.push_back(i % 2 == 0);
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % (long long)items.size())] = (i + total) % 2 == 0;
    std::string text = stringify(items);
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
