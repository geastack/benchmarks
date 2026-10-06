use rayon::prelude::*;

fn steps(mut value: u64) -> i64 {
    let mut count = 0;
    while value != 1 {
        value = if value % 2 == 0 { value / 2 } else { 3 * value + 1 };
        count += 1;
    }
    count
}

fn main() {
    parallel_bench::bench(|n| (1..n as u64).into_par_iter().map(steps).sum());
}
