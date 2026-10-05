export function main(iterations: number): number {
  const data: number[] = [];
  for (let i = 0; i < iterations; i++) data.push(i);
  let total = 0;
  for (let i = 0; i < iterations; i++) total += data[i];

  return total % 1000000000;
}
