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
    const c: number[] = [];
    for (let i = 0; i < N * N; i++) c.push(0);

    for (let i = 0; i < N; i++) {
      for (let k = 0; k < N; k++) {
        for (let j = 0; j < N; j++) c[i * N + j] += a[i][k] * b[k][j];
      }
    }

    for (let i = 0; i < N; i++) checksum += c[i * N + i];
  }

  return Math.floor(Math.abs(checksum) * 1000) % 1000000000;
}
