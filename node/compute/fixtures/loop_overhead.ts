export function main(iterations: number): number {
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    total += i;
  }

  return total % 1000000000;
}
