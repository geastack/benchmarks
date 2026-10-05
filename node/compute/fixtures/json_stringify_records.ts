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
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    // Mutate one field through the loop-carried `total` so the stringify
    // input changes every iteration and the call cannot be hoisted.
    items[i % items.length].score = (i + total) % 1000;
    const text = JSON.stringify(items);
    total = (total + text.length + text.charCodeAt((i + total) % text.length)) % 1000000000;
  }

  return total;
}
