// Flat row-major matrices in every language: `Float64Array(N * N)` here,
// `std::vector<double>(N * N)` in C++, indexed `i * N + j`. The flat layout is
// expressible in both, so both use it. idiomatic/matrix_multiply.ts keeps the
// nested `number[][]` a TypeScript author reaches for first.
export function main(iterations: number): number {
  const N = 256;
  const a = new Float64Array(N * N);
  const b = new Float64Array(N * N);

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      a[i * N + j] = ((i * 1103515245 + j * 12345) & 0x7fffffff) / 2147483647;
      b[i * N + j] = ((i * 134775813 + j * 1) & 0x7fffffff) / 2147483647;
    }
  }

  let checksum = 0;

  for (let r = 0; r < iterations; r++) {
    const c = new Float64Array(N * N);

    for (let i = 0; i < N; i++) {
      for (let k = 0; k < N; k++) {
        for (let j = 0; j < N; j++) c[i * N + j] += a[i * N + k] * b[k * N + j];
      }
    }

    for (let i = 0; i < N; i++) checksum += c[i * N + i];
  }

  return Math.floor(Math.abs(checksum) * 1000) % 1000000000;
}
