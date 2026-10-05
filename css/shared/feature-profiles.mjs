// Shared source-analysis and emitted-define contract, usable by any platform runner.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(here, '../../..');

export async function featureProfiles(env = process.env) {
  const compiler = env.GEA_COMPILER_DIR || path.join(workspace, 'compiler');

  const plugin =
    env.GEA_PLUGIN_DIR || path.join(workspace, 'examples/node_modules/@geastack/geatsc-plugin-gea');

  const cli = env.GEA_CLI_DIR || path.join(workspace, 'cli');

  const { withRendererFeatureDefines } = await import(
    pathToFileURL(path.join(cli, 'src/esp32/capabilities.mjs'))
  );

  const expectations = JSON.parse(readFileSync(path.join(here, 'profiles/expectations.json')));
  const results = [];

  for (const [name, expected] of Object.entries(expectations)) {
    const source = path.join(here, 'profiles', name + '.tsx');

    const output = execFileSync(
      process.execPath,
      [
        path.join(compiler, 'dist/cli.js'),
        'analyze',
        source,
        '--plugin',
        path.join(plugin, 'dist/index.js'),
      ],
      { encoding: 'utf8', env },
    );

    const line = output.split('\n').find((line) => line.startsWith('features='));
    assert.ok(line, 'Compiler analysis did not report features');
    const features = line.slice('features='.length).split(';');

    const defines = withRendererFeatureDefines('', features, { devicePixelRatio: 1 })
      .split(';')
      .filter(Boolean);

    const values = Object.fromEntries(defines.map((define) => define.split('=')));
    for (const macro of expected.absent)
      assert.equal(values[macro], '0', `${name}: unused ${macro} was not stripped`);
    for (const macro of expected.present)
      assert.equal(values[macro], '1', `${name}: required ${macro} was stripped`);

    if (expected.allowed_css) {
      for (const [macro, value] of Object.entries(values)) {
        if (macro.startsWith('GEA_CSS_') && !macro.startsWith('GEA_CSS_U8_'))
          assert.equal(
            value,
            expected.allowed_css.includes(macro) ? '1' : '0',
            `${name}: unexpected retained CSS gate ${macro}`,
          );
      }
    }

    results.push({
      name,
      source_sha256: createHash('sha256').update(readFileSync(source)).digest('hex'),
      features,
      defines,
    });
    console.log(
      `CSS feature profile ${name}: required features retained, unused features disabled`,
    );
  }

  return { compiler, plugin, cli, profiles: results };
}
