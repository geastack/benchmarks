import { range, type int } from '@geastack/parallel';

function steps(start: int): number {
  // Trajectories from below 3,000,000 peak near 10^11: far past int32, well
  // inside 2^53, so the integer and the Number agree on every value.
  let value = start;
  let count = 0;
  while (value !== 1) {
    value = value % 2 === 0 ? value / 2 : 3 * value + 1;
    count++;
  }
  return count;
}

// Total Collatz steps for every start in [1, n): irregular, branchy integer work.
export function main(n: number): number {
  return range(1, n).mapReduce(
    (start) => steps(start),
    (a, b) => a + b,
    0,
  );
}
