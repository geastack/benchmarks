export function main(iterations: number): number {
  const MOD = 1000000007;
  let acc = 1;

  for (let i = 1; i <= iterations; i++) {
    acc = (acc * i) % MOD;
  }

  return acc;
}
