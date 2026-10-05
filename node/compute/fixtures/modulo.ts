export function main(iterations: number): number {
  // Modulo-by-constant throughput. Each step adds a value below the modulus, so
  // the running accumulator stays in [0, 2*MOD); the `% MOD` is the dominant
  // per-iteration cost and it sits on a loop-carried dependency (each `h`
  // depends on the previous), so the modulo's latency directly sets the loop
  // time and cannot be hidden by instruction-level parallelism. This is the
  // common modular-accumulation pattern (running checksums, hashes, `% (1e9+7)`)
  // that `object_create` was accidentally measuring before it was isolated here.
  let h = 0;

  for (let i = 0; i < iterations; i++) {
    h = (h + i * 3 + 1) % 1000000007;
  }

  return h;
}
