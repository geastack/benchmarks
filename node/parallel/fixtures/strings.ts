import { range } from '@geastack/parallel';

function fnv(text: string): number {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash;
}

// Builds a short string per index from numbers and literals, splits it, and
// hashes the parts: string allocation, number formatting and split per task.
export function main(n: number): number {
  return range(0, n).mapReduce(
    (i) => {
      const line =
        'item-' + i + ',' + ((i * 7919) % 10007) + ',' + (i % 13 === 0 ? 'thirteen' : 'other');

      let total = 0;
      for (const part of line.split(',')) total += fnv(part) % 1000;

      return total;
    },
    (a, b) => a + b,
    0,
  );
}
