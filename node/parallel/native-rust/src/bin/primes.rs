use rayon::prelude::*;

fn is_prime(value: u64) -> bool {
    if value < 2 {
        return false;
    }
    if value % 2 == 0 {
        return value == 2;
    }
    let mut divisor = 3;
    while divisor * divisor <= value {
        if value % divisor == 0 {
            return false;
        }
        divisor += 2;
    }
    true
}

fn main() {
    parallel_bench::bench(|n| (0..n as u64).into_par_iter().map(|v| is_prime(v) as i64).sum());
}
