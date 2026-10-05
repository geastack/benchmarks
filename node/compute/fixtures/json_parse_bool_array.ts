function build(seed: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < 10000; i++) out.push((i + seed) % 2 === 0);

  return out;
}

export function main(iterations: number): number {
  // Pool of variant texts; selection feeds back through `total` so the parse
  // argument is loop-carried and the call cannot be hoisted out of the loop.
  const texts: string[] = [];
  for (let seed = 0; seed < 4; seed++) texts.push(JSON.stringify(build(seed)));
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(texts[(i + total) % 4]) as boolean[];
    total = (total + parsed.length + (parsed[i % parsed.length] ? 1 : 0)) % 1000000000;
  }

  return total;
}
