import { range } from '@geastack/parallel';

// C = A x B for n x n matrices of small integers, so every sum is exact; the
// answer is a weighted checksum of C. B is read transposed, a row per task.
export function main(n: number): number {
  const a = new Float64Array(n * n);
  const bt = new Float64Array(n * n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      a[i * n + j] = ((i * 7 + j * 3) % 11) - 5;
      bt[j * n + i] = ((i * 5 + j * 13) % 9) - 4;
    }
  }

  return range(0, n).mapReduce(
    (i) => {
      let rowSum = 0;

      for (let j = 0; j < n; j++) {
        let cell = 0;
        for (let k = 0; k < n; k++) cell += a[i * n + k]! * bt[j * n + k]!;
        rowSum += cell * ((j % 7) + 1);
      }

      return rowSum * ((i % 5) + 1);
    },
    (x, y) => x + y,
    0,
  );
}
