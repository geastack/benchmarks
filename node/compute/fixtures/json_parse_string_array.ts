function build(seed: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < 10000; i++) out.push(`item-${i + seed}-text-payload`);

  return out;
}

export function main(iterations: number): number {
  // Pool of variant texts; selection feeds back through `total` so the parse
  // argument is loop-carried and the call cannot be hoisted out of the loop.
  const texts: string[] = [];
  for (let seed = 0; seed < 4; seed++) texts.push(JSON.stringify(build(seed)));
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(texts[(i + total) % 4]) as string[];
    total = (total + parsed.length + parsed[i % parsed.length].length) % 1000000000;
  }

  return total;
}
