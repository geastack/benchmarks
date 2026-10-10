// `value`, `n` and `total` all stay below 1e9, so a sum is below 2e9 and the
// reduction is one compare and subtract. The C++ reference reduces this way,
// and nothing about it is C++-only, so the TypeScript does too: this fixture
// prices the method call, not a division. idiomatic/method_calls.ts keeps the
// plain `% 1000000000`.
class Counter {
  value: number = 0;

  tick(n: number): number {
    this.value += n;
    if (this.value >= 1000000000) this.value -= 1000000000;

    return this.value;
  }
}

export function main(iterations: number): number {
  const c = new Counter();
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    total += c.tick(i);
    if (total >= 1000000000) total -= 1000000000;
  }

  return total;
}
