use rayon::prelude::*;

fn main() {
    parallel_bench::bench(|size| {
        let n = size as usize;
        let mut a = vec![0.0f64; n * n];
        let mut bt = vec![0.0f64; n * n];
        for i in 0..n {
            for j in 0..n {
                a[i * n + j] = ((i * 7 + j * 3) % 11) as f64 - 5.0;
                bt[j * n + i] = ((i * 5 + j * 13) % 9) as f64 - 4.0;
            }
        }
        let total: f64 = (0..n)
            .into_par_iter()
            .map(|i| {
                let mut row_sum = 0.0;
                for j in 0..n {
                    let mut cell = 0.0;
                    for k in 0..n {
                        cell += a[i * n + k] * bt[j * n + k];
                    }
                    row_sum += cell * ((j % 7) + 1) as f64;
                }
                row_sum * ((i % 5) + 1) as f64
            })
            .sum();
        total as i64
    });
}
