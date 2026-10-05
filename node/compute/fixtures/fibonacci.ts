function fib(n: number): number {
  if (n < 2) return n;

  return fib(n - 1) + fib(n - 2);
}

export function main(iterations: number): number {
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    total += fib(40);
  }

  return total % 1000000000;
}
