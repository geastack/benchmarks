// Use the shipping frontend/compiler, including its own .css lowering.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shared = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(shared, '../../..');

export function buildComponents(outDir, minimal = false, env = process.env) {
  const core = env.GEA_CORE_DIR || path.join(workspace, 'examples/node_modules/@geastack/core');
  const compiler = env.GEA_COMPILER_DIR || path.join(workspace, 'compiler');

  const plugin =
    env.GEA_PLUGIN_DIR || path.join(workspace, 'examples/node_modules/@geastack/geatsc-plugin-gea');

  const args = [
    path.join(core, 'scripts/build-gea-vite-geatsc.mjs'),
    '--app-dir',
    shared,
    '--entry',
    minimal ? 'minimal.tsx' : 'index.tsx',
    '--out-dir',
    outDir,
    '--gea-embedded-compat',
    '--gea-ir-backend',
    '--geatsc-bin',
    path.join(compiler, 'dist/cli.js'),
    '--geatsc-gea-plugin',
    path.join(plugin, 'dist/index.js'),
    '--extra-geatsc-plugin',
    path.join(shared, 'benchmark-plugin.mjs'),
    '--font-viewport-width',
    '410',
    '--font-viewport-height',
    '502',
    '--font-device-pixel-ratio',
    '1',
  ];

  try {
    writeFileSync(
      path.join(outDir, 'css-component-build.log'),
      execFileSync(process.execPath, args, { env, maxBuffer: 64 * 1024 * 1024 }),
    );
  } catch (error) {
    writeFileSync(
      path.join(outDir, 'css-component-build.log'),
      Buffer.concat([error.stdout || Buffer.alloc(0), error.stderr || Buffer.alloc(0)]),
    );
    throw new Error(
      `Gea component build failed: ${path.join(outDir, 'css-component-build.log')}\n${error.stderr || error.message}`,
    );
  }

  const sources = readFileSync(path.join(outDir, 'geatsc-sources.txt'), 'utf8')
    .trim()
    .split(/\r?\n/);

  for (const name of ['gea_embedded_font_generated.cpp', 'gea_embedded_assets_generated.cpp'])
    if (existsSync(path.join(outDir, name))) sources.push(path.join(outDir, name));

  return sources;
}
