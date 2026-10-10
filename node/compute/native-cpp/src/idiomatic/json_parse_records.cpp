#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parse baseline using simdjson (DOM API, full parse like JSON.parse). Built with
// -fno-exceptions, so simdjson's throwing accessors are off -> error-code .get() API.
static std::string serRec(long long seed) {
  std::string o = "[";
  for (long long i = 0; i < 10000; i++) {
    if (i)
      o += ',';
    o += "{\"id\":";
    ju::appendUInt(o, i);
    o += ",\"name\":\"item-";
    o += std::to_string(i);
    o += '"';
    o += ",\"score\":";
    ju::appendUInt(o, (i * 7919 + seed) % 1000);
    o += ",\"tags\":[\"alpha\",\"beta\",\"gamma\"]}";
  }
  o += ']';
  return o;
}

long long bench_run(long long it) {
  simdjson::dom::parser parser;
  simdjson::padded_string texts[4];
  for (long long s = 0; s < 4; s++)
    texts[(size_t)s] = simdjson::padded_string(serRec(s));
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    simdjson::dom::element doc;
    if (parser.parse(texts[(size_t)((i + total) % 4)]).get(doc))
      return -1;
    simdjson::dom::array arr;
    if (doc.get_array().get(arr))
      return -1;
    long long len = (long long)arr.size();
    simdjson::dom::element el;
    if (arr.at((size_t)(i % len)).get(el))
      return -1;
    int64_t score = 0;
    el["score"].get(score);
    total = (total + len + score) % 1000000000LL;
  }
  return total;
}
