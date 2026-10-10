#include <vector>
#include <string>
#include "json_util.h"
#include "simdjson/simdjson.h"
#include "bench_main.h"

// Parity with fixtures/json_parse_nested.ts: every JSON.parse builds the whole
// `Node` tree -- all 5461 nodes, their labels and value arrays -- before the
// root is read. simdjson parses; the walk over its DOM materializes each
// object field by field, by key. Built with -fno-exceptions, so simdjson's
// error-code API.
struct Node {
  double id = 0;
  std::string label;
  std::vector<double> values;
  std::vector<Node> children;
};

static Node build(int depth, int fanOut, long long idStart) {
  if (depth == 0)
    return Node{(double)idStart, "leaf-" + std::to_string(idStart), {1, 2, 3, 4, 5}, {}};
  std::vector<Node> children;
  long long nextId = idStart * fanOut + 1;
  for (int i = 0; i < fanOut; i++)
    children.push_back(build(depth - 1, fanOut, nextId + i));
  return Node{(double)idStart,
              "node-" + std::to_string(idStart),
              {(double)idStart, (double)(idStart * 2), (double)(idStart * 3)},
              std::move(children)};
}

static void write(std::string &o, const Node &n) {
  o += "{\"id\":";
  ju::appendInt(o, (long long)n.id);
  o += ",\"label\":";
  ju::appendQuoted(o, n.label);
  o += ",\"values\":[";
  for (size_t k = 0; k < n.values.size(); k++) {
    if (k)
      o += ',';
    ju::appendInt(o, (long long)n.values[k]);
  }
  o += "],\"children\":[";
  for (size_t k = 0; k < n.children.size(); k++) {
    if (k)
      o += ',';
    write(o, n.children[k]);
  }
  o += "]}";
}

static bool read(simdjson::dom::element element, Node &node) {
  simdjson::dom::object object;
  if (element.get_object().get(object))
    return false;
  for (simdjson::dom::key_value_pair field : object) {
    if (field.key == "id") {
      if (field.value.get_double().get(node.id))
        return false;
    } else if (field.key == "label") {
      std::string_view label;
      if (field.value.get_string().get(label))
        return false;
      node.label = label;
    } else if (field.key == "values") {
      simdjson::dom::array values;
      if (field.value.get_array().get(values))
        return false;
      for (simdjson::dom::element value : values) {
        double number;
        if (value.get_double().get(number))
          return false;
        node.values.push_back(number);
      }
    } else if (field.key == "children") {
      simdjson::dom::array children;
      if (field.value.get_array().get(children))
        return false;
      for (simdjson::dom::element child : children) {
        Node built;
        if (!read(child, built))
          return false;
        node.children.push_back(std::move(built));
      }
    }
  }
  return true;
}

long long bench_run(long long it) {
  std::vector<simdjson::padded_string> texts;
  for (long long seed = 0; seed < 4; seed++) {
    std::string text;
    write(text, build(6, 4, seed + 1));
    texts.push_back(simdjson::padded_string(text));
  }
  simdjson::dom::parser parser;
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    Node parsed;
    simdjson::dom::element root;
    if (parser.parse(texts[(size_t)((i + total) % 4)]).get(root) || !read(root, parsed))
      return -1;
    long long vlen = (long long)parsed.values.size();
    total = (total + (long long)parsed.id + (long long)parsed.children.size() +
             (long long)parsed.values[(size_t)(i % vlen)]) %
            1000000000LL;
  }
  return total;
}
