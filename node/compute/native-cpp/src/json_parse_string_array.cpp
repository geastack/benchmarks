#include <vector>
#include <string>
#include "json_util.h"
#include "../simdjson/simdjson.h"
#include "bench_main.h"

static std::string serStr(long long seed) {
  std::string o = "[";
  for (long long i = 0; i < 10000; i++) {
    if (i)
      o += ',';
    o += '"';
    o += "item-";
    o += std::to_string(i + seed);
    o += "-text-payload";
    o += '"';
  }
  o += ']';
  return o;
}

long long bench_run(long long it) {
  simdjson::dom::parser parser;
  simdjson::padded_string texts[4];
  for (long long s = 0; s < 4; s++)
    texts[(size_t)s] = simdjson::padded_string(serStr(s));
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    simdjson::dom::element doc;
    if (parser.parse(texts[(size_t)((i + total) % 4)]).get(doc))
      return -1;
    simdjson::dom::array arr;
    if (doc.get_array().get(arr))
      return -1;
    long long len = (long long)arr.size();
    std::string_view sv;
    arr.at((size_t)(i % len)).get(sv);
    total = (total + len + (long long)sv.size()) % 1000000000LL;
  }
  return total;
}
