#include <vector>
#include <string>
#include "json_util.h"
#include "bench_main.h"

// Parity with fixtures/json_stringify_nested.ts: a fresh, unsized string per
// JSON.stringify call, every label scanned for characters JSON must escape.
struct Node {
  long long id;
  std::string label;
  std::vector<long long> values;
  std::vector<Node> children;
};

static Node build(int depth, int fanOut, long long idStart) {
  if (depth == 0)
    return Node{idStart, "leaf-" + std::to_string(idStart), {1, 2, 3, 4, 5}, {}};
  std::vector<Node> children;
  long long nextId = idStart * fanOut + 1;
  for (int i = 0; i < fanOut; i++)
    children.push_back(build(depth - 1, fanOut, nextId + i));
  return Node{idStart,
              "node-" + std::to_string(idStart),
              {idStart, idStart * 2, idStart * 3},
              std::move(children)};
}

static void write(std::string &o, const Node &n) {
  o += "{\"id\":";
  ju::appendInt(o, n.id);
  o += ",\"label\":";
  ju::appendQuoted(o, n.label);
  o += ",\"values\":[";
  for (size_t k = 0; k < n.values.size(); k++) {
    if (k)
      o += ',';
    ju::appendInt(o, n.values[k]);
  }
  o += "],\"children\":[";
  for (size_t k = 0; k < n.children.size(); k++) {
    if (k)
      o += ',';
    write(o, n.children[k]);
  }
  o += "]}";
}

long long bench_run(long long it) {
  Node tree = build(6, 4, 1);
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    tree.id = (i + total) % 100000;
    std::string text;
    write(text, tree);
    long long len = (long long)text.size();
    long long code = (unsigned char)text[(size_t)((i + total) % len)];
    total = (total + len + code) % 1000000000LL;
  }
  return total;
}
