import { range } from '@geastack/parallel';

function isPrime(value: number): boolean {
  if (value < 2) return false;
  if (value % 2 === 0) return value === 2;

  for (let divisor = 3; divisor * divisor <= value; divisor += 2) {
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
