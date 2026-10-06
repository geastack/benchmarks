import { range } from '@geastack/parallel';

function entry(i: number, j: number): number {
  return 1 / (((i + j) * (i + j + 1)) / 2 + i + 1);
}

/** A x u, a row per element; each element sums in index order, so every runtime agrees bit for bit. */
function times(u: readonly number[]): number[] {
  const n = u.length;

  return range(0, n).map((i) => {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += entry(i, j) * u[j]!;

    return sum;
  });
}

/** A^T x u. */
function timesTransposed(u: readonly number[]): number[] {
  const n = u.length;

  return range(0, n).map((i) => {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += entry(j, i) * u[j]!;

    return sum;
  });
}

// The benchmarks-game spectral norm: ten power iterations of A^T A, each
// matrix-vector product one parallel map. Rounded to nine decimals.
export function main(n: number): number {
  let u: number[] = [];
  for (let i = 0; i < n; i++) u.push(1);
  let v: number[] = u;

  for (let iteration = 0; iteration < 10; iteration++) {
    v = timesTransposed(times(u));
    u = timesTransposed(times(v));
  }

  let vBv = 0;
  let vv = 0;

  for (let i = 0; i < n; i++) {
    vBv += u[i]! * v[i]!;
    vv += v[i]! * v[i]!;
  }

  return Math.round(Math.sqrt(vBv / vv) * 1e9);
}
