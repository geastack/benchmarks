import { range } from '@geastack/parallel';

// A 32-bit integer, as Rust's board masks are `u32`: a number under Node, an
// `int32_t` compiled. `@geastack/core` declares it globally for apps.
declare const i32Brand: unique symbol;
type i32 = number & { readonly [i32Brand]?: never };

function solve(size: i32, row: i32, columns: i32, left: i32, right: i32): number {
  if (row === size) return 1;
  const all = (1 << size) - 1;
  let free = all & ~(columns | left | right);
  let count = 0;

  while (free !== 0) {
    const bit = free & -free;
    free ^= bit;
    count += solve(size, row + 1, columns | bit, ((left | bit) << 1) & all, (right | bit) >> 1);
  }

  return count;
}

// Solutions to n-queens, one task per placement of the first two queens:
// recursion with a very uneven tree under each task.
export function main(size: number): number {
  const n: i32 = size;
  const all = (1 << n) - 1;

  return range(0, n * n).mapReduce(
    (placement) => {
      const first = 1 << Math.floor(placement / n);
      const second = 1 << (placement % n);
      const left = (first << 1) & all;
      const right = first >> 1;
      if ((second & (first | left | right)) !== 0) return 0;

      return solve(n, 2, first | second, ((left | second) << 1) & all, (right | second) >> 1);
    },
    (a, b) => a + b,
    0,
  );
}
