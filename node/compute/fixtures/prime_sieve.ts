// The sieve is a byte array allocated at its final size and filled once, in
// every language: `new Uint8Array(n).fill(1)` here, a zeroed
// `std::vector<uint8_t>(n)` filled with 1 in C++. idiomatic/prime_sieve.ts
// keeps the `boolean[]` built by ten million pushes.
export function main(iterations: number): number {
  const LIMIT = 10000000;
  let total = 0;

  for (let r = 0; r < iterations; r++) {
    const sieve = new Uint8Array(LIMIT + 1);
    sieve.fill(1);
    sieve[0] = 0;
    sieve[1] = 0;

    for (let i = 2; i * i <= LIMIT; i++) {
      if (sieve[i] === 1) {
        for (let j = i * i; j <= LIMIT; j += i) sieve[j] = 0;
      }
    }

    let count = 0;
    for (let i = 2; i <= LIMIT; i++) if (sieve[i] === 1) count++;
    total = (total + count) % 1000000000;
  }

  return total;
}
