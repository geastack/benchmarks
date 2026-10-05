type Item = { id: number; name: string; score: number; tags: string[] };

function build(seed: number): Item[] {
  const items: Item[] = [];

  for (let i = 0; i < 10000; i++) {
    items.push({
      id: i,
      name: `item-${i}`,
      score: (i * 7919 + seed) % 1000,
      tags: ['alpha', 'beta', 'gamma'],
    });
  }

  return items;
}

export function main(iterations: number): number {
  // Pool of variant texts; selection feeds back through `total` so the parse
  // argument is loop-carried and the call cannot be hoisted out of the loop.
  const texts: string[] = [];
  for (let seed = 0; seed < 4; seed++) texts.push(JSON.stringify(build(seed)));
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(texts[(i + total) % 4]) as Item[];
    total = (total + parsed.length + parsed[i % parsed.length].score) % 1000000000;
  }

  return total;
}
