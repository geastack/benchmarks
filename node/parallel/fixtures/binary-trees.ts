import { range } from '@geastack/parallel';

class TreeNode {
  constructor(
    readonly left: TreeNode | null,
    readonly right: TreeNode | null,
  ) {}
}

function build(depth: number): TreeNode {
  return depth === 0 ? new TreeNode(null, null) : new TreeNode(build(depth - 1), build(depth - 1));
}

function count(node: TreeNode): number {
  const left = node.left;
  const right = node.right;

  return 1 + (left === null ? 0 : count(left)) + (right === null ? 0 : count(right));
}

// n trees of depth 16, each built and walked by one task: allocation-bound,
// every node allocated and freed inside the task that made it.
export function main(n: number): number {
  return range(0, n).mapReduce(
    (index) => count(build(16)) + index,
    (a, b) => a + b,
    0,
  );
}
