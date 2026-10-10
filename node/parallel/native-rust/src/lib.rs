//! Times `body(n)` with n from argv[1] and prints what the harness reads.
//! `RAYON_NUM_THREADS` picks the thread count, so one binary measures the
//! one-thread and all-thread columns. The pool is built before the clock
//! starts, as the other runtimes' pools are.
pub fn bench(body: fn(f64) -> i64) {
    let n: f64 = std::env::args()
        .nth(1)
        .and_then(|a| a.parse().ok())
        .unwrap_or(0.0);
    rayon::broadcast(|_| ());
    if std::env::var_os("GEA_BENCH_VERIFY_ONLY").is_some() {
        println!("{}", body(n));
        return;
    }
    let start = std::time::Instant::now();
    let result = body(n);
    let ms = start.elapsed().as_secs_f64() * 1000.0;
    println!("__bench_ms__ {:.6}\n{}", ms, result);
}
