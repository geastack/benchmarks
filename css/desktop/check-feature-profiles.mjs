#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { featureProfiles } from '../shared/feature-profiles.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(here, '../../..');
const build = path.join(workspace, 'core/packages/core/test/.build');

const engine =
  process.env.GEA_ENGINE_DIR || path.join(workspace, 'examples/node_modules/@geastack/engine');

const host =
  process.env.GEA_HOST_DIR || path.join(workspace, 'examples/node_modules/@geastack/host');

try {
  const report = await featureProfiles();
  mkdirSync(build, { recursive: true });
  const cxx = process.env.CXX || 'clang++';
  report.native_compiler = execFileSync(cxx, ['--version'], { encoding: 'utf8' }).split('\n')[0];
  report.architecture = process.arch;
  report.engine = engine;

  const measure = (name, defines) => {
    const binary = path.join(build, 'css-profile-' + name);
    execFileSync(
      cxx,
      [
        '-std=c++20',
        '-O2',
        '-I',
        path.join(
          process.env.GEA_CORE_DIR || path.join(workspace, 'examples/node_modules/@geastack/core'),
          'include',
        ),
        '-I',
        path.join(workspace, 'examples/node_modules/@geastack/elements'),
        '-I',
        engine,
        '-I',
        path.join(engine, 'ui'),
        '-I',
        host,
        '-I',
        path.join(host, 'include'),
        ...defines.map((define) => '-D' + define),
        path.resolve(here, '../shared/profiles/layout-size.cpp'),
        '-o',
        binary,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    return JSON.parse(execFileSync(binary, { encoding: 'utf8' }));
  };

  report.full = measure('full', []);
  for (const profile of report.profiles) profile.layout = measure(profile.name, profile.defines);
  assert.ok(
    report.profiles[0].layout.node_bytes < report.full.node_bytes,
    'Minimal profile did not reduce native node storage',
  );
  assert.ok(
    report.profiles[0].layout.style_bytes < report.full.style_bytes,
    'Minimal profile did not reduce native style storage',
  );
  writeFileSync(
    path.join(build, 'css-feature-profiles.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        full: report.full,
        profiles: report.profiles.map(({ name, layout }) => ({ name, ...layout })),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
