#include <vector>
#include <string>
#include "json_util.h"
#include "../simdjson/simdjson.h"
#include "bench_main.h"

static std::string serBool(long long seed) {
  std::string o = "[";
  for (long long i = 0; i < 10000; i++) {
    if (i)
      o += ',';
    o += ((i + seed) % 2 == 0) ? "true" : "false";
  }
  o += ']';
  return o;
}

long long bench_run(long long it) {
  simdjson::dom::parser parser;
  simdjson::padded_string texts[4];
  for (long long s = 0; s < 4; s++)
    texts[(size_t)s] = simdjson::padded_string(serBool(s));
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    simdjson::dom::element doc;
    if (parser.parse(texts[(size_t)((i + total) % 4)]).get(doc))
      return -1;
    simdjson::dom::array arr;
    if (doc.get_array().get(arr))
      return -1;
    long long len = (long long)arr.size();
    bool b = false;
    arr.at((size_t)(i % len)).get(b);
    total = (total + len + (b ? 1 : 0)) % 1000000000LL;
  }
  return total;
}
