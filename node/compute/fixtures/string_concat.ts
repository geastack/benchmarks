export function main(iterations: number): number {
  let s = '';

  for (let i = 0; i < iterations; i++) {
    s += 'a';
  }

  return s.length;
}
