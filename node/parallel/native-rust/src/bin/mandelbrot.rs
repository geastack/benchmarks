use rayon::prelude::*;

fn main() {
    parallel_bench::bench(|size| {
        let max_iterations = 200;
        let n = size as usize;
        (0..n)
            .into_par_iter()
            .map(|row| {
                let ci = (row as f64 / size) * 3.0 - 1.5;
                let mut inside = 0i64;
                for column in 0..n {
                    let cr = (column as f64 / size) * 3.0 - 2.0;
                    let (mut zr, mut zi, mut iteration) = (0.0f64, 0.0f64, 0);
                    while iteration < max_iterations && zr * zr + zi * zi <= 4.0 {
                        let next = zr * zr - zi * zi + cr;
                        zi = 2.0 * zr * zi + ci;
                        zr = next;
                        iteration += 1;
                    }
                    if iteration == max_iterations {
                        inside += 1;
                    }
                }
                inside
            })
            .sum()
    });
}
