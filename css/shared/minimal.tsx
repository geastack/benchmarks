import { start as first } from './fixtures/minimal-box-1/Scene';
import { start as second } from './fixtures/minimal-boxes-4/Scene';
import * as benchmark from './benchmark';
let index = 0;
function next(): void {
  benchmark.clear();
  if (index === 0) first();
  else if (index === 1) second();
  else benchmark.finish();
  index++;
}
benchmark.setCompletionCallback(next);
next();
