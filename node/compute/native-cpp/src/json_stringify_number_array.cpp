#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

// Parity with fixtures/json_stringify_number_array.ts: a fresh, unsized
// string per JSON.stringify call, integers formatted by std::to_chars.
static std::string stringify(const std::vector<long long> &items) {
  std::string text;
  text += '[';
  for (size_t k = 0; k < items.size(); k++) {
    if (k)
      text += ',';
    ju::appendInt(text, items[k]);
  }
  text += ']';
  return text;
}

long long bench_run(long long it) {
  std::vector<long long> items;
  for (long long i = 0; i < 10000; i++)
    items.push_back((i * 7919) % 1000000);
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % (long long)items.size())] = (i * 31 + total) % 1000000;
    std::string text = stringify(items);
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
