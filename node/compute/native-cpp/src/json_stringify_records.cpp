#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

// Parity with fixtures/json_stringify_records.ts: a fresh, unsized string per
// JSON.stringify call; every field written from the record, every string
// value (name, each tag) scanned for characters JSON must escape. Key names
// are part of the type and written as literals.
struct Item {
  long long id;
  std::string name;
  long long score;
  std::vector<std::string> tags;
};

static std::string stringify(const std::vector<Item> &items) {
  std::string text;
  text += '[';
  for (size_t k = 0; k < items.size(); k++) {
    const Item &item = items[k];
    if (k)
      text += ',';
    text += "{\"id\":";
    ju::appendInt(text, item.id);
    text += ",\"name\":";
    ju::appendQuoted(text, item.name);
    text += ",\"score\":";
    ju::appendInt(text, item.score);
    text += ",\"tags\":[";
    for (size_t t = 0; t < item.tags.size(); t++) {
      if (t)
        text += ',';
      ju::appendQuoted(text, item.tags[t]);
    }
    text += "]}";
  }
  text += ']';
  return text;
}

long long bench_run(long long it) {
  std::vector<Item> items;
  for (long long i = 0; i < 10000; i++)
    items.push_back(Item{i, "item-" + std::to_string(i), (i * 7919) % 1000, {"alpha", "beta", "gamma"}});
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % (long long)items.size())].score = (i + total) % 1000;
    std::string text = stringify(items);
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
