#include <vector>
#include <string>
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parity with fixtures/json_parse_bool_array.ts: every JSON.parse builds the
// whole `boolean[]` (one byte per element, the TypeScript runtime's layout)
// before one element is read. simdjson parses; the walk over its DOM
// materializes. Built with -fno-exceptions, so simdjson's error-code API.
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

static bool parse(simdjson::dom::parser &parser, const simdjson::padded_string &text,
                  std::vector<char> &out) {
  simdjson::dom::array array;
  if (parser.parse(text).get_array().get(array))
    return false;
  for (simdjson::dom::element element : array) {
    bool value;
    if (element.get_bool().get(value))
      return false;
    out.push_back(value);
  }
  return true;
}

long long bench_run(long long it) {
  std::vector<simdjson::padded_string> texts;
  for (long long seed = 0; seed < 4; seed++) {
    std::vector<char> items;
    for (long long i = 0; i < 10000; i++)
      items.push_back((i + seed) % 2 == 0);
    texts.push_back(simdjson::padded_string(stringify(items)));
  }
  simdjson::dom::parser parser;
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    std::vector<char> parsed;
    if (!parse(parser, texts[(size_t)((i + total) % 4)], parsed))
      return -1;
    long long len = (long long)parsed.size();
    total = (total + len + (parsed[(size_t)(i % len)] ? 1 : 0)) % 1000000000LL;
  }
  return total;
}
