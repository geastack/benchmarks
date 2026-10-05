#include "ui/node_model.h"
#include <cstdio>
int main() {
  using namespace gea::embedded::ui;
  std::printf("{\"node_bytes\":%zu,\"style_bytes\":%zu,\"rare_style_bytes\":%zu}\n", sizeof(Node), sizeof(ComputedStyle), sizeof(RareStyle));
}
