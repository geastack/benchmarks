#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

// SOUND/fair native: store and serialize the real `tags` field generically (the
// data structure actually has it), instead of dropping the field and hardcoding
// the constant literal. This is what a correct serializer of arbitrary records
// must do — and what gea does.
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
  long long total = 0;
  std::string text;
  text.reserve(900000);
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % 10000)].score = (i + total) % 1000;
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
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
