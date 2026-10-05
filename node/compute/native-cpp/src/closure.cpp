#include "bench_main.h"
#include <vector>

// A faithful port of fixtures/closure.ts: makeX(base) returns a closure over
// `base`, the closures live in a table, one is replaced per iteration and a
// different slot is invoked -- so the call is a real indirect call through a
// type-erased callable, which is what the TypeScript does.
//
// The callable is a thunk pointer beside its captured state, which is both the
// leanest way to spell this in C++ and exactly the representation the compiler
// under test emits (`gea::CallableObject`: thunk + inline environment). This
// column is the speed-of-light reference, so it is the shape to hold.
//
// NOT std::function. It is the idiomatic spelling and it was measured here
// first: 82.4 ms against this version's 20.3 on the bench box, four times the
// cost, for erasure machinery a TypeScript closure never asks for. Swapping it
// back would flatter the compiler by a factor of four -- probes/closure-shapes.cpp
// keeps all three variants so the number can be re-derived rather than trusted.
//
// The previous version of this baseline was `auto add = makeAdder(i); total +=
// add(i)`, which the optimizer deleted entirely: it needed a per-iteration
// `asm volatile` register barrier just to keep the loop alive, and measured no
// closure at all. Nothing here needs a barrier -- an indirect call through a
// table slot cannot be folded away.
struct NumberFn {
  long long (*thunk)(long long, long long);
  long long env;

  long long operator()(long long x) const {
    return thunk(env, x);
  }
};

static NumberFn makeAdder(long long base) {
  return {[](long long b, long long x) { return b + x; }, base};
}

static NumberFn makeSubtractor(long long base) {
  return {[](long long b, long long x) { return x - b; }, base};
}

static NumberFn makeInverter(long long base) {
  return {[](long long b, long long x) { return b - x; }, base};
}

static NumberFn makeBumper(long long base) {
  return {[](long long b, long long x) { return b + x + 1; }, base};
}

static NumberFn makeKind(long long kind, long long base) {
  if (kind == 0)
    return makeAdder(base);
  if (kind == 1)
    return makeSubtractor(base);
  if (kind == 2)
    return makeInverter(base);
  return makeBumper(base);
}

long long bench_run(long long it) {
  std::vector<NumberFn> fns;
  fns.reserve(16);
  for (long long i = 0; i < 16; i++)
    fns.push_back(makeKind(i % 4, i));
  long long total = 0;
  for (long long i = 0; i < it; i++) {
    const long long slot = i % 16;
    fns[slot] = makeKind(i % 4, i);
    const NumberFn &f = fns[(slot + 1) % 16];
    total += f(i);
  }
  return total % 1000000000LL;
}
