type Point = { x: number; y: number; z: number };

export function main(iterations: number): number {
  // Genuinely create objects that must be materialized (not scalar-replaced away
  // by -O3): every iteration constructs a fresh object and stores it into a
  // fixed-size ring, so it escapes; a *different*, dynamically-indexed slot is
  // read back, so the compiler cannot forward the just-written value and must
  // keep the objects in memory. The new object's fields are loop-carried through
  // `total`, which also defeats hoisting. In JS each literal is a heap object
  // (allocation + GC churn); in geatsc each is a value-typed record stored in a
  // contiguous vector — the comparison is exactly "JS heap objects vs gea value
  // objects", which is what this fixture is meant to measure.
  const ring: Point[] = [];
  for (let i = 0; i < 256; i++) ring.push({ x: 0, y: 0, z: 0 });
  let total = 0;

  for (let i = 0; i < iterations; i++) {
    ring[i % ring.length] = { x: (i + total) % 100000, y: i * 2, z: i * 3 };
    const o = ring[(i * 31 + 7) % ring.length];
    total = (total + o.x + o.y + o.z) % 1000000000;
  }

  return total;
}
