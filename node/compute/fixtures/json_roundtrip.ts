type Item = { id: number; name: string; score: number; tags: string[] };

function build(): Item[] {
  const items: Item[] = [];

  for (let i = 0; i < 10000; i++) {
    items.push({
      id: i,
      name: `item-${i}`,
      score: (i * 7919) % 1000,
      tags: ['alpha', 'beta', 'gamma'],
    });
  }

  return items;
}

export function main(iterations: number): number {
  const items = build();
  let totalLength = 0;

  for (let i = 0; i < iterations; i++) {
    // Mutate one field through the loop-carried total so neither the stringify
    // nor the parse can be hoisted; read a data-dependent parsed value back.
    items[i % items.length].score = (i + totalLength) % 1000;
    const text = JSON.stringify(items);
    totalLength = (totalLength + text.length) % 1000000000;
    const parsed = JSON.parse(text) as Item[];
    totalLength = (totalLength + parsed[i % parsed.length].score) % 1000000000;
  }

  return totalLength;
}
