#!/usr/bin/env node
import { featureProfiles } from '../../../shared/feature-profiles.mjs';
import { createHash } from 'node:crypto';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

import { names, parseLog, parseResultLine, fault } from '../../../shared/results.mjs';

export { names, parseLog };

const app = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(app, '../../../../..');
const build = path.join(app, '.gea/build/esp32-s3-touch-amoled-2.06/app-builds/amoled-206-bench');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function environment() {
  // This workspace's installed, mutually matching package set is the default.
  // Callers may supply a different package root or individual GEA_* overrides.
  const dependencyRoot =
    process.env.GEA_BENCH_DEPENDENCY_ROOT ||
    path.join(workspace, 'examples/node_modules/@geastack');

  const env = { ...process.env, GEA_IDF_JOBS: process.env.GEA_IDF_JOBS || '2' };
  for (const [key, pkg] of Object.entries({
    GEA_CORE_DIR: 'core',
    GEA_ENGINE_DIR: 'engine',
    GEA_HOST_DIR: 'host',
    GEA_ELEMENTS_DIR: 'elements',
    GEA_CHIPS_DIR: 'chips',
    GEA_GEAOS_PACKAGE_DIR: 'geaos',
    GEA_PLUGIN_DIR: 'geatsc-plugin-gea',
    GEA_TARGETS_ROOT: 'targets',
  }))
    env[key] ||= path.join(dependencyRoot, pkg);
  // Always use the single workspace compiler dist, never an installed/private copy.
  env.GEA_COMPILER_DIR ||= path.join(workspace, 'compiler');
  if (!existsSync(path.join(env.GEA_COMPILER_DIR, 'dist/compiler.js')))
    throw new Error('Build the single compiler dist first');

  return env;
}

async function command(cli, args, env, logName) {
  mkdirSync(build, { recursive: true });
  const destination = path.join(build, logName);
  const output = createWriteStream(destination);

  const child = spawn(
    process.execPath,
    [cli, ...args, '--project', app, '--boards-config', path.join(app, 'boards.json')],
    { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  child.stdout.pipe(output, { end: false });
  child.stderr.pipe(output, { end: false });
  let timer;

  const status = await new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Command timed out: ' + args[0]));
    }, 900000);
    child.on('error', reject);
    child.on('close', resolve);
  }).finally(() => clearTimeout(timer));

  await new Promise((resolve) => output.end(resolve));
  if (status !== 0)
    throw new Error(
      `${args[0]} failed (${status}); ${destination}\n${readFileSync(destination, 'utf8').slice(-4000)}`,
    );

  return destination;
}

export function fixtureHashes() {
  const shared = path.resolve(app, '../../../shared');

  const files = [
    'index.tsx',
    'benchmark-plugin.mjs',
    'suite.cpp',
    'package.json',
    'vite.config.ts',
    'boards.json',
    ...readdirSync(shared, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(app, path.join(entry.parentPath || entry.path, entry.name)))
      .sort(),
  ];

  return Object.fromEntries(
    files.map((file) => [file, sha256(readFileSync(path.join(app, file)))]),
  );
}

export function compilerFingerprint(directory) {
  const hash = createHash('sha256');

  function walk(relative) {
    for (const entry of readdirSync(path.join(directory, relative), { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const file = path.join(relative, entry.name);

      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.js')) {
        hash.update(file + '\0');
        hash.update(sha256(readFileSync(path.join(directory, file))) + '\0');
      }
    }
  }

  walk('dist');

  return hash.digest('hex');
}

export function assertProvenance(inputs, current) {
  if (!inputs.compilerDistHash || inputs.compilerDistHash !== current.compilerDistHash)
    throw new Error(
      'Compiler dist changed or full build provenance is missing; rebuild before measuring',
    );
  if (JSON.stringify(inputs.sourceHashes) !== JSON.stringify(current.sourceHashes))
    throw new Error('Fixture sources changed since firmware build; rebuild before measuring');
  if (inputs.imageSha256 !== current.imageSha256)
    throw new Error('Saved firmware image does not match its build provenance');
}

function currentInputs(env, image) {
  return {
    compilerDistHash: compilerFingerprint(env.GEA_COMPILER_DIR),
    sourceHashes: fixtureHashes(),
    imageSha256: sha256(readFileSync(image)),
  };
}

export function provenance(env, cli) {
  const packages = {};

  for (const [key, directory] of Object.entries(env)) {
    if (
      !/^GEA_(?:CORE|ENGINE|HOST|ELEMENTS|CHIPS|GEAOS_PACKAGE|PLUGIN|COMPILER)_DIR$|^GEA_TARGETS_ROOT$/.test(
        key,
      )
    )
      continue;
    const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    packages[key] = { path: directory, name: manifest.name, version: manifest.version };
  }

  const sourceHashes = fixtureHashes();

  const compilerHash = sha256(readFileSync(path.join(env.GEA_COMPILER_DIR, 'dist/compiler.js')));
  const image = path.join(build, 'gea_embedded.bin');

  return {
    packages,
    cli,
    sourceHashes,
    compilerHash,
    compilerDistHash: compilerFingerprint(env.GEA_COMPILER_DIR),
    image,
    imageSha256: sha256(readFileSync(image)),
    buildConfig: JSON.parse(readFileSync(path.join(build, 'gea-build-config.json'), 'utf8')),
  };
}

async function capture(cli, env, round, timeoutMs) {
  const { SerialDevice } = await import(
    pathToFileURL(path.join(path.dirname(cli), '../src/device/serial.mjs'))
  );

  const ports = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, 'boards', 'discover', '--json', '--boards-config', path.join(app, 'boards.json')],
      { env, encoding: 'utf8' },
    ),
  );

  const board = ports.find((port) => port.serial?.toUpperCase() === '80:B5:4E:DA:73:88');
  if (!board) throw new Error('The registered AMOLED 2.06 USB board is not connected');
  const device = await SerialDevice.open({ path: board.path });

  const destination = path.join(
    build,
    `device-${new Date().toISOString().replaceAll(':', '-')}-round-${round}.log`,
  );

  let log = '';

  try {
    await device.writeLine('GEADEV REBOOT');
    const deadline = Date.now() + timeoutMs;
    let completeAt = 0;

    while (Date.now() < deadline && (!completeAt || Date.now() < completeAt + 1500)) {
      const line = await device.readLine(1000);
      if (device.closed) throw new Error('USB serial disconnected during capture');
      if (line === null || line === undefined) continue;
      log += line + '\n';

      if (line.includes('CSS_BENCH BEGIN')) console.log('  ' + line.trim());

      if (line.includes('CSS_BENCH RESULT ')) {
        const row = parseResultLine(line);
        console.log(
          `  ${row.name}: ${row.fps.toFixed(1)} FPS, p95 ${(row.work_p95_us / 1000).toFixed(2)} ms, ok=${row.ok}`,
        );
      }

      if (fault.test(line)) throw new Error('Device fault: ' + line);
      if (line.includes('CSS_BENCH DONE')) completeAt = Date.now();
    }

    if (!completeAt) throw new Error('Timed out waiting for suite completion');

    const results = parseLog(log);
    const state = await device.command('GEADEV STATE', ['GEADEV:STATE']);
    // Standalone firmware has no launcher AppState ID. Identity comes from the
    // verified flashed image and complete suite markers, not that optional ID.
    if (
      !/\bwidth=410 height=502\b/.test(state) ||
      !/\bdraw_nonblack=[1-9]\d*/.test(state) ||
      !/\bpresented_nonblack=[1-9]\d*/.test(state)
    )
      throw new Error('Final framebuffer validation failed: ' + state);

    return { board, results, state, log, logFile: destination };
  } finally {
    writeFileSync(destination, log);
    await device.close();
  }
}

export async function main(args = process.argv.slice(2)) {
  const env = environment();
  const cli = process.env.GEA_CLI_BIN || path.join(workspace, 'cli/bin/gea.mjs');
  const timeoutFlag = args.indexOf('--timeout');

  const timeoutMs =
    timeoutFlag < 0
      ? Math.max(240000, names.length * 120000)
      : Number(args[timeoutFlag + 1]) * 1000;

  if (!Number.isInteger(timeoutMs) || timeoutMs < 10000)
    throw new Error('--timeout must be at least 10 seconds');
  const roundsFlag = args.indexOf('--rounds');
  const rounds = roundsFlag < 0 ? 3 : Number(args[roundsFlag + 1]);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 9)
    throw new Error('--rounds must be between 1 and 9');

  if (args.includes('--log')) {
    const results = parseLog(readFileSync(args[args.indexOf('--log') + 1], 'utf8'));
    console.log(`Validated ${results.length} device cases`);

    return results;
  }

  const firmwareFlag = args.indexOf('--firmware');
  if (firmwareFlag >= 0 && !args.includes('--no-build'))
    throw new Error('Use --no-build with a saved --firmware manifest');
  const cachedManifest = path.join(build, 'firmware-provenance.json');
  let inputs;

  if (!args.includes('--no-build')) {
    await featureProfiles(env);

    const before = {
      compilerDistHash: compilerFingerprint(env.GEA_COMPILER_DIR),
      sourceHashes: fixtureHashes(),
    };

    console.log('Building AMOLED 206 suite; log: ' + path.join(build, 'build.log'));
    await command(
      cli,
      ['build', '--board', 'amoled', '--app', 'amoled-206-bench'],
      env,
      'build.log',
    );
    inputs = provenance(env, cli);
    assertProvenance({ ...before, imageSha256: inputs.imageSha256 }, inputs);
    writeFileSync(cachedManifest, JSON.stringify(inputs, null, 2) + '\n');
  } else {
    const manifest = firmwareFlag < 0 ? cachedManifest : args[firmwareFlag + 1];
    if (!manifest || !existsSync(manifest))
      throw new Error('Saved firmware provenance is missing; run --build-only first');
    inputs = JSON.parse(readFileSync(manifest, 'utf8'));
  }

  assertProvenance(inputs, currentInputs(env, inputs.image));
  if (args.includes('--build-only')) return inputs;
  console.log('Flashing the suite to the registered AMOLED 2.06 board');
  await command(
    cli,
    [
      'flash',
      '--board',
      'amoled',
      '--app',
      'amoled-206-bench',
      '--no-build',
      '--image',
      inputs.image,
    ],
    env,
    'flash.log',
  );
  if (inputs.imageSha256 !== sha256(readFileSync(inputs.image)))
    throw new Error(
      'Firmware image changed while flashing; wait for the build to finish and rerun',
    );
  const runs = [];

  try {
    for (let round = 1; round <= rounds; ++round) {
      console.log(`Device round ${round}/${rounds}`);
      runs.push(await capture(cli, env, round, timeoutMs));
    }

    assertProvenance(inputs, currentInputs(env, inputs.image));

    const now = new Date().toISOString();

    const report = {
      measuredAt: now,
      ...inputs,
      requestedFrameRate: 60,
      vsync: false,
      layoutDpr: 1,
      interFrameIdleTickUs: 1000,
      touchInput: 'synthetic hardware-controller injection',
      runs,
    };

    const destination = path.join(build, 'results-' + now.replaceAll(':', '-') + '.json');
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
    console.log('Device suite passed: ' + destination);

    return report;
  } finally {
    // The board remains running the benchmark. Restoration of another app is
    // a separate explicit operation, not a hidden additional flash.
    assertProvenance(inputs, currentInputs(env, inputs.image));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
