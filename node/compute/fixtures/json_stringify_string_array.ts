function build(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 10000; i++) out.push(`item-${i}-text-payload`);

  return out;
}

export function main(iterations: number): number {
  const items = build();
  const swaps = ['swap-a', 'swap-bb', 'swap-ccc', 'swap-dddd'];
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    // Mutate one element through the loop-carried `total` so the stringify
    // input changes every iteration and the call cannot be hoisted.
    items[i % items.length] = swaps[(i + total) % 4];
    const text = JSON.stringify(items);
    total = (total + text.length + text.charCodeAt((i + total) % text.length)) % 1000000000;
  }

  return total;
}
