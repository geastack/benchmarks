#include <vector>
#include <string>
#include "json_util.h"
#include "../simdjson/simdjson.h"
#include "bench_main.h"

struct Item {
  long long id;
  std::string name;
  long long score;
  std::vector<std::string> tags;
};

long long bench_run(long long it) {
  std::vector<Item> items;
  items.reserve(10000);
  for (long long i = 0; i < 10000; i++) {
    std::string n = "item-";
    n += std::to_string(i);
    items.push_back(Item{i, n, (i * 7919) % 1000, {"alpha", "beta", "gamma"}});
  }
  simdjson::dom::parser parser;
  long long totalLength = 0;
  std::string text;
  text.reserve(700000 + simdjson::SIMDJSON_PADDING);
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % items.size())].score = (i + totalLength) % 1000;
    text.clear();
    text += '[';
    for (size_t k = 0; k < items.size(); k++) {
      if (k)
        text += ',';
      text += "{\"id\":";
      ju::appendUInt(text, items[k].id);
      text += ",\"name\":\"";
      text += items[k].name;
      text += '"';
      text += ",\"score\":";
      ju::appendUInt(text, items[k].score);
      text += ",\"tags\":[";
      for (size_t tg = 0; tg < items[k].tags.size(); tg++) {
        if (tg)
          text += ',';
        text += '"';
        text += items[k].tags[tg];
        text += '"';
      }
      text += "]}";
    }
    text += ']';
    totalLength = (totalLength + (long long)text.size()) % 1000000000LL;
    simdjson::dom::element doc;
    if (parser.parse(text).get(doc))
      return -1;
    simdjson::dom::array arr;
    if (doc.get_array().get(arr))
      return -1;
    long long len = (long long)arr.size();
    simdjson::dom::element el;
    arr.at((size_t)(i % len)).get(el);
    int64_t score = 0;
    el["score"].get(score);
    totalLength = (totalLength + score) % 1000000000LL;
  }
  return totalLength;
}
