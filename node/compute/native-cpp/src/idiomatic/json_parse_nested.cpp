#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

struct Node {
  long long id;
  std::string label;
  std::vector<long long> values;
  std::vector<Node> children;
};

static Node build(int depth, int fanOut, long long idStart) {
  if (depth == 0)
    return Node{idStart, std::string("leaf-") + std::to_string(idStart), {1, 2, 3, 4, 5}, {}};
  std::vector<Node> children;
  long long nextId = idStart * fanOut + 1;
  for (int i = 0; i < fanOut; i++)
    children.push_back(build(depth - 1, fanOut, nextId + i));
  return Node{idStart,
              std::string("node-") + std::to_string(idStart),
              {idStart, idStart * 2, idStart * 3},
              std::move(children)};
}

static void ser(std::string &o, const Node &n) {
  o += "{\"id\":";
  ju::appendUInt(o, n.id);
  o += ",\"label\":\"";
  o += n.label;
  o += '"';
  o += ",\"values\":[";
  for (size_t k = 0; k < n.values.size(); k++) {
    if (k)
      o += ',';
    ju::appendUInt(o, n.values[k]);
  }
  o += "],\"children\":[";
  for (size_t k = 0; k < n.children.size(); k++) {
    if (k)
      o += ',';
    ser(o, n.children[k]);
  }
  o += "]}";
}

long long bench_run(long long it) {
  simdjson::dom::parser parser;
  simdjson::padded_string texts[4];
  for (long long s = 0; s < 4; s++) {
    std::string o;
    ser(o, build(6, 4, s + 1));
    texts[(size_t)s] = simdjson::padded_string(o);
  }
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    simdjson::dom::element doc;
    if (parser.parse(texts[(size_t)((i + total) % 4)]).get(doc))
      return -1;
    int64_t id = 0;
    doc["id"].get(id);
    simdjson::dom::array children;
    doc["children"].get_array().get(children);
    simdjson::dom::array values;
    if (doc["values"].get_array().get(values))
      return -1;
    long long vlen = (long long)values.size();
    double v = 0;
    values.at((size_t)(i % vlen)).get(v);
    total = (total + id + (long long)children.size() + (long long)v) % 1000000000LL;
  }
  return total;
}
