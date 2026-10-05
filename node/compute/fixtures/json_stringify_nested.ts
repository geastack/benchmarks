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
  const tree = build(6, 4, 1);
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    // Mutate one field through the loop-carried `total` so the stringify
    // input changes every iteration and the call cannot be hoisted.
    tree.id = (i + total) % 100000;
    const text = JSON.stringify(tree);
    total = (total + text.length + text.charCodeAt((i + total) % text.length)) % 1000000000;
  }

  return total;
}
