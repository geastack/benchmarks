use rayon::prelude::*;

fn entry(i: f64, j: f64) -> f64 {
    1.0 / ((i + j) * (i + j + 1.0) / 2.0 + i + 1.0)
}

fn times(u: &[f64]) -> Vec<f64> {
    (0..u.len())
        .into_par_iter()
        .map(|i| u.iter().enumerate().fold(0.0, |sum, (j, x)| sum + entry(i as f64, j as f64) * x))
        .collect()
}

fn times_transposed(u: &[f64]) -> Vec<f64> {
    (0..u.len())
        .into_par_iter()
        .map(|i| u.iter().enumerate().fold(0.0, |sum, (j, x)| sum + entry(j as f64, i as f64) * x))
        .collect()
}

fn main() {
    parallel_bench::bench(|size| {
        let n = size as usize;
        let mut u = vec![1.0f64; n];
        let mut v = u.clone();
        for _ in 0..10 {
            v = times_transposed(&times(&u));
            u = times_transposed(&times(&v));
        }
        let (mut vbv, mut vv) = (0.0, 0.0);
        for i in 0..n {
            vbv += u[i] * v[i];
            vv += v[i] * v[i];
        }
        ((vbv / vv).sqrt() * 1e9 + 0.5).floor() as i64
    });
}
