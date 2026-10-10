#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

static std::string serNum(long long seed) {
  std::string o = "[";
  for (long long i = 0; i < 10000; i++) {
    if (i)
      o += ',';
    ju::appendUInt(o, (i * 7919 + seed * 1013) % 1000000);
  }
  o += ']';
  return o;
}

long long bench_run(long long it) {
  simdjson::dom::parser parser;
  simdjson::padded_string texts[4];
  for (long long s = 0; s < 4; s++)
    texts[(size_t)s] = simdjson::padded_string(serNum(s));
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    simdjson::dom::element doc;
    if (parser.parse(texts[(size_t)((i + total) % 4)]).get(doc))
      return -1;
    simdjson::dom::array arr;
    if (doc.get_array().get(arr))
      return -1;
    long long len = (long long)arr.size();
    double v = 0;
    arr.at((size_t)(i % len)).get(v);
    total = (total + len + (long long)v) % 1000000000LL;
  }
  return total;
}
