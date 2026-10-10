class Counter {
  value: number = 0;

  tick(n: number): number {
    this.value = (this.value + n) % 1000000000;

    return this.value;
  }
}

export function main(iterations: number): number {
  const c = new Counter();
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    total = (total + c.tick(i)) % 1000000000;
  }

  return total;
}
