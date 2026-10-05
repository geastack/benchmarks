#include <cstdlib>
#include "bench_main.h"

// Bump-allocate nodes from a reused arena (one malloc, reset per iteration)
// instead of per-node new/delete — the allocator was the bottleneck.
struct TreeNode {
  long long value;
  TreeNode *left;
  TreeNode *right;
};

static TreeNode *g_arena = nullptr;
static size_t g_pos = 0;

static TreeNode *build(int depth, long long value) {
  if (depth == 0)
    return nullptr;
  TreeNode *n = &g_arena[g_pos++];
  n->value = value;
  n->left = build(depth - 1, value * 2);
  n->right = build(depth - 1, value * 2 + 1);
  return n;
}

static long long sumtree(TreeNode *n) {
  if (!n)
    return 0;
  return n->value + sumtree(n->left) + sumtree(n->right);
}

long long bench_run(long long it) {
  g_arena = (TreeNode *)malloc((size_t)(1u << 20) * sizeof(TreeNode)); // depth-20 -> 2^20-1 nodes
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    g_pos = 0;
    TreeNode *t = build(20, 1);
    total = (total + sumtree(t)) % 1000000000LL;
  }
  free(g_arena);
  return total;
}
