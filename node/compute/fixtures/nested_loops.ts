export function main(iterations: number): number {
  const N = 3000;
  const grid: number[][] = [];

  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (let j = 0; j < N; j++) row.push((i * 17 + j * 31) & 0xff);
    grid.push(row);
  }

  let total = 0;

  for (let r = 0; r < iterations; r++) {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) total += grid[i][j];
    }
  }

  return total % 1000000000;
}
