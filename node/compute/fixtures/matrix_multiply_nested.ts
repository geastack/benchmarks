// Nested matrices in every language: `number[][]` here, rows built by `push`;
// `std::vector<std::vector<double>>` in C++, rows built by `push_back`. Each
// row is its own allocation, the layout most code reaches for first.
// matrix_multiply.ts is the same product over flat row-major storage.
export function main(iterations: number): number {
  const N = 256;
  const a: number[][] = [];
  const b: number[][] = [];

  for (let i = 0; i < N; i++) {
    const ra: number[] = [];
    const rb: number[] = [];

    for (let j = 0; j < N; j++) {
      ra.push(((i * 1103515245 + j * 12345) & 0x7fffffff) / 2147483647);
      rb.push(((i * 134775813 + j * 1) & 0x7fffffff) / 2147483647);
    }

    a.push(ra);
    b.push(rb);
  }

  let checksum = 0;

  for (let r = 0; r < iterations; r++) {
    const c: number[][] = [];
    for (let i = 0; i < N; i++) {
      const row: number[] = [];
      for (let j = 0; j < N; j++) row.push(0);
      c.push(row);
    }

    for (let i = 0; i < N; i++) {
      const ci = c[i];
      const ai = a[i];
      for (let k = 0; k < N; k++) {
        const aik = ai[k];
        const bk = b[k];
        for (let j = 0; j < N; j++) ci[j] += aik * bk[j];
      }
    }

    for (let i = 0; i < N; i++) checksum += c[i][i];
  }

  return Math.floor(Math.abs(checksum) * 1000) % 1000000000;
}
