// Closure creation + invocation, where the closure has to actually exist.
//
// The first version of this fixture was `const add = makeAdder(i); total +=
// add(i)` in a loop. Both compilers deleted the closure outright: clang inlines
// the factory, devirtualizes the callable's thunk and inlines the lambda body,
// leaving a bare arithmetic loop -- the native baseline needed an `asm volatile`
// barrier to stop the optimizer folding even that. So neither side was
// measuring a closure, and the ratio between them was the ratio of `fadd`
// latency to `add` latency.
//
// A closure only survives optimization when the target of the call is not
// knowable at the call site. Here the closures are kept in a table, one is
// replaced per iteration, and the one invoked is a DIFFERENT slot -- so each
// iteration creates a closure over a fresh `base`, stores it, and makes a real
// indirect call through a callable whose identity the optimizer cannot track.
//
// The bodies are deliberately trivial and additive: the fixture is meant to
// price the closure machinery, not the arithmetic inside it, and additive terms
// keep the running total exactly representable so all three runtimes agree.

type NumberFn = (x: number) => number;

function makeAdder(base: number): NumberFn {
  return (x: number) => base + x;
}

function makeSubtractor(base: number): NumberFn {
  return (x: number) => x - base;
}

function makeInverter(base: number): NumberFn {
  return (x: number) => base - x;
}

function makeBumper(base: number): NumberFn {
  return (x: number) => base + x + 1;
}

function makeKind(kind: number, base: number): NumberFn {
  if (kind === 0) return makeAdder(base);
  if (kind === 1) return makeSubtractor(base);
  if (kind === 2) return makeInverter(base);

  return makeBumper(base);
}

export function main(iterations: number): number {
  const fns: NumberFn[] = [];
  for (let i = 0; i < 16; i++) fns.push(makeKind(i % 4, i));

  let total = 0;

  for (let i = 0; i < iterations; i++) {
    const slot = i % 16;
    fns[slot] = makeKind(i % 4, i);
    const f = fns[(slot + 1) % 16];
    total += f(i);
  }

  return total % 1000000000;
}
