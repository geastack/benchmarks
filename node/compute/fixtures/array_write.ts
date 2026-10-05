export function main(iterations: number): number {
  const data: number[] = [];

  for (let i = 0; i < iterations; i++) {
    data.push((i * 2 + 1) % 1000000);
  }

  let checksum = 0;
  for (let i = 0; i < iterations; i += 1024) checksum += data[i];

  return checksum % 1000000000;
}
