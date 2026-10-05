export function main(iterations: number): number {
  const W = 800;
  const H = 800;
  const MAX_ITER = 100;
  let escapeSum = 0;

  for (let r = 0; r < iterations; r++) {
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const y0 = (py / H) * 2 - 1;
        const x0 = (px / W) * 3 - 2;
        let x = 0;
        let y = 0;
        let it = 0;

        while (x * x + y * y <= 4 && it < MAX_ITER) {
          const xt = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xt;
          it++;
        }

        escapeSum += it;
      }
    }
  }

  return Math.floor(Math.abs(escapeSum) % 1000000000);
}
