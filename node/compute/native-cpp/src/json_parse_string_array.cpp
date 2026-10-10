#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parity with fixtures/json_parse_string_array.ts: every JSON.parse builds the
// whole `string[]`, one owned string per element, before one element is read.
// simdjson parses (and unescapes); the walk over its DOM materializes. Built
// with -fno-exceptions, so simdjson's error-code API.
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

static bool parse(simdjson::dom::parser &parser, const simdjson::padded_string &text,
                  std::vector<std::string> &out) {
  simdjson::dom::array array;
  if (parser.parse(text).get_array().get(array))
    return false;
  for (simdjson::dom::element element : array) {
    std::string_view value;
    if (element.get_string().get(value))
      return false;
    out.emplace_back(value);
  }
  return true;
}

long long bench_run(long long it) {
  std::vector<simdjson::padded_string> texts;
  for (long long seed = 0; seed < 4; seed++) {
    std::vector<std::string> items;
    for (long long i = 0; i < 10000; i++)
      items.push_back("item-" + std::to_string(i + seed) + "-text-payload");
    texts.push_back(simdjson::padded_string(stringify(items)));
  }
  simdjson::dom::parser parser;
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    std::vector<std::string> parsed;
    if (!parse(parser, texts[(size_t)((i + total) % 4)], parsed))
      return -1;
    long long len = (long long)parsed.size();
    total = (total + len + (long long)parsed[(size_t)(i % len)].size()) % 1000000000LL;
  }
  return total;
}
