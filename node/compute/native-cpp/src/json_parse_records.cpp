#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parity with fixtures/json_parse_records.ts: every JSON.parse builds the
// whole `Item[]` -- every record, every field, every tag string -- before one
// record is read. simdjson parses; the walk over its DOM materializes each
// object field by field, by key. Built with -fno-exceptions, so simdjson's
// error-code API.
struct Item {
  double id = 0;
  std::string name;
  double score = 0;
  std::vector<std::string> tags;
};

static std::string stringify(long long seed) {
  std::string text;
  text += '[';
  for (long long i = 0; i < 10000; i++) {
    if (i)
      text += ',';
    text += "{\"id\":";
    ju::appendInt(text, i);
    text += ",\"name\":";
    ju::appendQuoted(text, "item-" + std::to_string(i));
    text += ",\"score\":";
    ju::appendInt(text, (i * 7919 + seed) % 1000);
    text += ",\"tags\":[";
    ju::appendQuoted(text, "alpha");
    text += ',';
    ju::appendQuoted(text, "beta");
    text += ',';
    ju::appendQuoted(text, "gamma");
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

static bool parse(simdjson::dom::parser &parser, const simdjson::padded_string &text,
                  std::vector<Item> &out) {
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
  std::vector<simdjson::padded_string> texts;
  for (long long seed = 0; seed < 4; seed++)
    texts.push_back(simdjson::padded_string(stringify(seed)));
  simdjson::dom::parser parser;
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    std::vector<Item> parsed;
    if (!parse(parser, texts[(size_t)((i + total) % 4)], parsed))
      return -1;
    long long len = (long long)parsed.size();
    total = (total + len + (long long)parsed[(size_t)(i % len)].score) % 1000000000LL;
  }
  return total;
}
