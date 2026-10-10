#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

struct Node {
  long long id;
  std::string label;
  std::vector<long long> values;
  std::vector<Node> children;
};

static Node build(int depth, int fanOut, long long idStart) {
  if (depth == 0) {
    return Node{idStart, std::string("leaf-") + std::to_string(idStart), {1, 2, 3, 4, 5}, {}};
  }
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
  Node tree = build(6, 4, 1);
  long long total = 0;
  std::string text;
  text.reserve(300000);
  for (long long i = 0; i < it; i++) {
    tree.id = (i + total) % 100000;
    text.clear();
    ser(text, tree);
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
