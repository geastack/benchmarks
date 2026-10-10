//! Parity with fixtures/strings.ts: each task builds its line by appending the
//! pieces in order to one fresh, unsized string (integers formatted by the
//! standard library), splits it on ',' into a container of owned strings, and
//! hashes each part. src/idiomatic/strings.rs keeps a presized `write!` and the
//! lazy `split` without the container.
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
                let mut line = String::new();
                line.push_str("item-");
                write!(line, "{}", i).unwrap();
                line.push(',');
                write!(line, "{}", i * 7919 % 10007).unwrap();
                line.push(',');
                line.push_str(if i % 13 == 0 { "thirteen" } else { "other" });
                let parts: Vec<String> = line.split(',').map(String::from).collect();
                let mut total: i64 = 0;
                for part in &parts {
                    total += (fnv(part) % 1000) as i64;
                }
                total
            })
            .sum()
    });
}
