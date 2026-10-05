/** @gea-refcount */
class TreeNode {
  value: number;

  left: TreeNode | null;

  right: TreeNode | null;

  constructor(value: number, left: TreeNode | null, right: TreeNode | null) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

function build(depth: number, value: number): TreeNode | null {
  if (depth === 0) return null;

  return new TreeNode(value, build(depth - 1, value * 2), build(depth - 1, value * 2 + 1));
}

function sum(node: TreeNode | null): number {
  if (node === null) return 0;

  return node.value + sum(node.left) + sum(node.right);
}

export function main(iterations: number): number {
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const tree = build(20, 1);
    total = (total + sum(tree)) % 1000000000;
  }

  return total;
}
