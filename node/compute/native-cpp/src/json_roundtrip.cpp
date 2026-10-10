#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parity with fixtures/json_roundtrip.ts: each iteration stringifies every
// record into a fresh, unsized string (string values scanned for characters
// JSON must escape), then parses it back into a whole new `Item[]` -- every
// record, field and tag -- before one record is read. Built with
// -fno-exceptions, so simdjson's error-code API.
struct Item {
  double id = 0;
  std::string name;
  double score = 0;
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
    ju::appendInt(text, (long long)item.id);
    text += ",\"name\":";
    ju::appendQuoted(text, item.name);
    text += ",\"score\":";
    ju::appendInt(text, (long long)item.score);
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

static bool readItem(simdjson::dom::element element, Item &item) {
  simdjson::dom::object object;
  if (element.get_object().get(object))
    return false;
  for (simdjson::dom::key_value_pair field : object) {
    if (field.key == "id") {
      if (field.value.get_double().get(item.id))
        return false;
    } else if (field.key == "name") {
      std::string_view name;
      if (field.value.get_string().get(name))
        return false;
      item.name = name;
    } else if (field.key == "score") {
      if (field.value.get_double().get(item.score))
        return false;
    } else if (field.key == "tags") {
      simdjson::dom::array tags;
      if (field.value.get_array().get(tags))
        return false;
      for (simdjson::dom::element tag : tags) {
        std::string_view text;
        if (tag.get_string().get(text))
          return false;
        item.tags.emplace_back(text);
      }
    }
  }
  return true;
}

static bool parse(simdjson::dom::parser &parser, const std::string &text, std::vector<Item> &out) {
  simdjson::dom::array array;
  if (parser.parse(text).get_array().get(array))
    return false;
  for (simdjson::dom::element element : array) {
    Item item;
    if (!readItem(element, item))
      return false;
    out.push_back(std::move(item));
  }
  return true;
}

long long bench_run(long long it) {
  std::vector<Item> items;
  for (long long i = 0; i < 10000; i++)
    items.push_back(Item{(double)i, "item-" + std::to_string(i), (double)((i * 7919) % 1000),
                         {"alpha", "beta", "gamma"}});
  simdjson::dom::parser parser;
  long long totalLength = 0;
  for (long long i = 0; i < it; i++) {
    items[(size_t)(i % (long long)items.size())].score = (double)((i + totalLength) % 1000);
    std::string text = stringify(items);
    totalLength = (totalLength + (long long)text.size()) % 1000000000LL;
    std::vector<Item> parsed;
    if (!parse(parser, text, parsed))
      return -1;
    totalLength =
        (totalLength + (long long)parsed[(size_t)(i % (long long)parsed.size())].score) %
        1000000000LL;
  }
  return totalLength;
}
