export function main(iterations: number): number {
  const LIMIT = 10000000;
  let total = 0;

  for (let r = 0; r < iterations; r++) {
    const sieve: boolean[] = [];
    for (let i = 0; i <= LIMIT; i++) sieve.push(true);
    sieve[0] = false;
    sieve[1] = false;

    for (let i = 2; i * i <= LIMIT; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= LIMIT; j += i) sieve[j] = false;
      }
    }

    let count = 0;
    for (let i = 2; i <= LIMIT; i++) if (sieve[i]) count++;
    total = (total + count) % 1000000000;
  }

  return total;
}
