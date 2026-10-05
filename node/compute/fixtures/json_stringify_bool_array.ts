function build(): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < 10000; i++) out.push(i % 2 === 0);

  return out;
}

export function main(iterations: number): number {
  const items = build();
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    // Mutate one element through the loop-carried `total` so the stringify
    // input changes every iteration and the call cannot be hoisted.
    items[i % items.length] = (i + total) % 2 === 0;
    const text = JSON.stringify(items);
    total = (total + text.length + text.charCodeAt((i + total) % text.length)) % 1000000000;
  }

  return total;
}
