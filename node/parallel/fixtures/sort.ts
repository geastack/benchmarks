import { sorted } from '@geastack/parallel';

// A stable parallel sort of n pseudo-random 31-bit integers with a comparator
// callback, then an order-sensitive checksum of the result.
export function main(n: number): number {
  const items: number[] = [];
  let seed = 42;

  for (let i = 0; i < n; i++) {
    seed = (seed * 16807) % 2147483647;
    items.push(seed);
  }

  const result = sorted(items, (a, b) => a - b);
  let checksum = 0;
  for (const value of result) checksum = (checksum * 31 + value) % 1000000007;

  return checksum;
}
