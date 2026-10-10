#include <memory>
#include "bench_main.h"

// Parity with fixtures/binary_trees.ts: every node is its own heap allocation,
// children built before their parent (JavaScript evaluates the constructor's
// arguments first), and each iteration's tree is freed when the next one
// replaces it. The arena version is in idiomatic/binary_trees.cpp.
struct TreeNode {
  long long value;
  std::unique_ptr<TreeNode> left;
  std::unique_ptr<TreeNode> right;

  TreeNode(long long value, std::unique_ptr<TreeNode> left, std::unique_ptr<TreeNode> right)
      : value(value), left(std::move(left)), right(std::move(right)) {}
};

static std::unique_ptr<TreeNode> build(int depth, long long value) {
  if (depth == 0)
    return nullptr;
  auto left = build(depth - 1, value * 2);
  auto right = build(depth - 1, value * 2 + 1);
  return std::make_unique<TreeNode>(value, std::move(left), std::move(right));
}

static long long sum(const TreeNode *node) {
  if (node == nullptr)
    return 0;
  return node->value + sum(node->left.get()) + sum(node->right.get());
}

long long bench_run(long long it) {
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    std::unique_ptr<TreeNode> tree = build(20, 1);
    total = (total + sum(tree.get())) % 1000000000LL;
  }
  return total;
}
