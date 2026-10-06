import { range, type int } from '@geastack/parallel';

// `int`, as Rust's are `u64`: the trial divisions are integer divisions.
function isPrime(value: int): boolean {
  if (value < 2) return false;
  if (value % 2 === 0) return value === 2;

  for (let divisor: int = 3; divisor * divisor <= value; divisor += 2) {
    if (value % divisor === 0) return false;
  }

  return true;
}

// Primes below n by trial division: millions of tiny, uneven tasks.
export function main(n: number): number {
  return range(0, n).mapReduce(
    (value): number => (isPrime(value) ? 1 : 0),
    (a, b) => a + b,
    0,
  );
}
