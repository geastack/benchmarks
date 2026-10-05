type Node = {
  id: number;
  label: string;
  values: number[];
  children: Node[];
};

function build(depth: number, fanOut: number, idStart: number): Node {
  if (depth === 0) {
    return { id: idStart, label: `leaf-${idStart}`, values: [1, 2, 3, 4, 5], children: [] };
  }

  const children: Node[] = [];
  const nextId = idStart * fanOut + 1;

  for (let i = 0; i < fanOut; i++) {
    children.push(build(depth - 1, fanOut, nextId + i));
  }

  return {
    id: idStart,
    label: `node-${idStart}`,
    values: [idStart, idStart * 2, idStart * 3],
    children,
  };
}

export function main(iterations: number): number {
  // depth 6, fanOut 4 → 5461 total nodes; reasonable JSON size for a structured-doc payload.
  // Pool of variant texts; selection feeds back through `total` so the parse
  // argument is loop-carried and the call cannot be hoisted out of the loop.
  const texts: string[] = [];
  for (let seed = 0; seed < 4; seed++) texts.push(JSON.stringify(build(6, 4, seed + 1)));
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(texts[(i + total) % 4]) as Node;
    total =
      (total + parsed.id + parsed.children.length + parsed.values[i % parsed.values.length]) %
      1000000000;
  }

  return total;
}
