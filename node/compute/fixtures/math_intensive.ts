export function main(iterations: number): number {
  let total = 0;

  for (let i = 1; i <= iterations; i++) {
    total += 1 / i;
  }

  return Math.floor(Math.abs(total) * 1000000) % 1000000000;
}
