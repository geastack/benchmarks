import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilerRoot } from '../../../node-compat/scripts/resolve-compiler.mjs';
import {
  compilerInputs,
  assertCompilerInputs,
  assertRuntimeInputs,
} from '../../../node-compat/scripts/compiler-input.mjs';

export { assertCompilerInputs, assertRuntimeInputs };

/** Benchmark emission always uses the workspace's single compiler build. */
export function benchmarkCompilerInputs(env = process.env) {
  const canonical = realpathSync(fileURLToPath(new URL('../../../compiler/', import.meta.url)));
  const selected = compilerRoot({ ...env, GEA_COMPILER_DIR: env.GEA_COMPILER_DIR || canonical });

  if (selected !== canonical)
    throw new Error(
      'Benchmarks must use the shared workspace compiler/dist; private or registry compiler copies are refused',
    );

  return compilerInputs(selected);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.indexOf('--check');
  const output = process.argv.indexOf('--output');
  const selected = benchmarkCompilerInputs();

  if (check >= 0) {
    const expected = JSON.parse(readFileSync(process.argv[check + 1], 'utf8'));

    if (expected.compilerRoot !== selected.compilerRoot)
      throw new Error('Saved build used a different compiler root');
    assertCompilerInputs(expected);
  }

  if (output >= 0)
    writeFileSync(process.argv[output + 1], JSON.stringify(selected, null, 2) + '\n');
  console.log(JSON.stringify(selected));
}
