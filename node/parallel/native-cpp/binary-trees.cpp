#include <memory>
#include "par.hpp"

struct TreeNode {
  std::unique_ptr<TreeNode> left, right;
};

static std::unique_ptr<TreeNode> build(int depth) {
  auto node = std::make_unique<TreeNode>();
  if (depth > 0) {
    node->left = build(depth - 1);
    node->right = build(depth - 1);
  }
  return node;
}

static long long count(const TreeNode &node) {
  return 1 + (node.left ? count(*node.left) : 0) + (node.right ? count(*node.right) : 0);
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double n) -> long long {
    return par::sum<long long>(size_t(n), [](size_t index) { return count(*build(16)) + (long long)index; });
  });
}
