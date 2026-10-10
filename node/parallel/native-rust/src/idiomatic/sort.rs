use rayon::prelude::*;

fn main() {
    parallel_bench::bench(|size| {
        let n = size as usize;
        let mut items = Vec::with_capacity(n);
        let mut seed: i64 = 42;
        for _ in 0..n {
            seed = seed * 16807 % 2147483647;
            items.push(seed);
        }
        // Stable, with a comparator closure, like `sorted(items, (a, b) => a - b)`.
        items.par_sort_by(|a, b| a.cmp(b));
        items.iter().fold(0i64, |checksum, value| (checksum * 31 + value) % 1000000007)
    });
}
