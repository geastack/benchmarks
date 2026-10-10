use rayon::prelude::*;
use std::fmt::Write;

fn fnv(text: &str) -> u32 {
    let mut hash: u32 = 2166136261;
    for byte in text.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(16777619);
    }
    hash
}

fn main() {
    parallel_bench::bench(|n| {
        (0..n as u64)
            .into_par_iter()
            .map(|i| {
                // Sized once: `format!` grows its buffer by `realloc`, and at 20
                // threads glibc's arena locks then cost more than the work.
                let mut line = String::with_capacity(40);
                write!(line, "item-{},{},{}", i, i * 7919 % 10007, if i % 13 == 0 { "thirteen" } else { "other" }).unwrap();
                line.split(',').map(|part| (fnv(part) % 1000) as i64).sum::<i64>()
            })
            .sum()
    });
}
