#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parity with fixtures/json_parse_number_array.ts: every JSON.parse builds the
// whole `number[]` (doubles) before one element is read. simdjson parses; the
// walk over its DOM materializes. Built with -fno-exceptions, so simdjson's
// error-code API.
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

static bool parse(simdjson::dom::parser &parser, const simdjson::padded_string &text,
                  std::vector<double> &out) {
  simdjson::dom::array array;
  if (parser.parse(text).get_array().get(array))
    return false;
  for (simdjson::dom::element element : array) {
    double value;
    if (element.get_double().get(value))
      return false;
    out.push_back(value);
  }
  return true;
}

long long bench_run(long long it) {
  std::vector<simdjson::padded_string> texts;
  for (long long seed = 0; seed < 4; seed++) {
    std::vector<long long> items;
    for (long long i = 0; i < 10000; i++)
      items.push_back((i * 7919 + seed * 1013) % 1000000);
    texts.push_back(simdjson::padded_string(stringify(items)));
  }
  simdjson::dom::parser parser;
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    std::vector<double> parsed;
    if (!parse(parser, texts[(size_t)((i + total) % 4)], parsed))
      return -1;
    long long len = (long long)parsed.size();
    total = (total + len + (long long)parsed[(size_t)(i % len)]) % 1000000000LL;
  }
  return total;
}
