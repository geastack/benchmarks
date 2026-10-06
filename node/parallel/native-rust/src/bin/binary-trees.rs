use rayon::prelude::*;

struct TreeNode {
    left: Option<Box<TreeNode>>,
    right: Option<Box<TreeNode>>,
}

fn build(depth: u32) -> Box<TreeNode> {
    if depth == 0 {
        Box::new(TreeNode { left: None, right: None })
    } else {
        Box::new(TreeNode { left: Some(build(depth - 1)), right: Some(build(depth - 1)) })
    }
}

fn count(node: &TreeNode) -> i64 {
    1 + node.left.as_deref().map_or(0, count) + node.right.as_deref().map_or(0, count)
}

fn main() {
    parallel_bench::bench(|n| (0..n as i64).into_par_iter().map(|index| count(&build(16)) + index).sum());
}
