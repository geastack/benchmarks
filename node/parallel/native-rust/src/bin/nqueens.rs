use rayon::prelude::*;

fn solve(size: u32, row: u32, columns: u32, left: u32, right: u32) -> i64 {
    if row == size {
        return 1;
    }
    let all = (1u32 << size) - 1;
    let mut free = all & !(columns | left | right);
    let mut count = 0;
    while free != 0 {
        let bit = free & free.wrapping_neg();
        free ^= bit;
        count += solve(size, row + 1, columns | bit, ((left | bit) << 1) & all, (right | bit) >> 1);
    }
    count
}

fn main() {
    parallel_bench::bench(|size| {
        let n = size as u32;
        let all = (1u32 << n) - 1;
        (0..n * n)
            .into_par_iter()
            .map(|placement| {
                let first = 1u32 << (placement / n);
                let second = 1u32 << (placement % n);
                let left = (first << 1) & all;
                let right = first >> 1;
                if second & (first | left | right) != 0 {
                    return 0;
                }
                solve(n, 2, first | second, ((left | second) << 1) & all, (right | second) >> 1)
            })
            .sum()
    });
}
