import { range } from '@geastack/parallel';

// Points of an n x n grid over [-2, 1] x [-1.5, 1.5] that stay bounded for
// 200 iterations. One task per row, and rows near the set's centre cost far
// more than rows at the edge: a load-balancing test.
export function main(n: number): number {
  const maxIterations = 200;

  return range(0, n).mapReduce(
    (row) => {
      const ci = (row / n) * 3 - 1.5;
      let inside = 0;

      for (let column = 0; column < n; column++) {
        const cr = (column / n) * 3 - 2;
        let zr = 0;
        let zi = 0;
        let iteration = 0;

        while (iteration < maxIterations && zr * zr + zi * zi <= 4) {
          const next = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = next;
          iteration++;
        }

        if (iteration === maxIterations) inside++;
      }

      return inside;
    },
    (a, b) => a + b,
    0,
  );
}
