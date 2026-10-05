# AMOLED 2.06 device suite

This runner measures the shipping engine and software renderer on the Waveshare
ESP32-S3 Touch AMOLED 2.06 (410 × 502). All commands below start at the repository
root (`benchmarks/`) inside the geastack workspace.

## Run and prerequisites

Node.js 20.19 or newer, ESP-IDF with its Xtensa toolchain, and the workspace Gea
CLI/compiler and matching native packages must already be available. Connect the
registered board with USB serial `80:B5:4E:DA:73:88` using its data port.

```sh
node css/esp32/s3/amoled-206/run.mjs
node css/esp32/s3/amoled-206/run.mjs --rounds 1
node css/esp32/s3/amoled-206/run.mjs --build-only
node css/esp32/s3/amoled-206/run.mjs --no-build --rounds 1
node --test css/esp32/s3/amoled-206/run.test.mjs
```

A fresh run checks the shared feature profiles, builds firmware, verifies the
registered board, flashes it and captures three rebooted runs by default.
`--rounds` accepts 1–9. `--build-only` stops before flashing. `--no-build` reuses
saved firmware provenance and skips fresh profile checks. The benchmark remains
on the board afterwards; unrelated connected boards are not selected. Leave the
touch panel untouched during capture so physical input cannot alter the gestures.

Defaults use matching packages installed in
`examples/node_modules/@geastack`, `cli/bin/gea.mjs`, and the single workspace
compiler at `compiler/dist`. Compilation uses two jobs by default (`GEA_IDF_JOBS`).

| Override                                                                                                                                             | Purpose                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `GEA_BENCH_DEPENDENCY_ROOT`                                                                                                                          | Root containing all required native packages, targets and built plugin |
| `GEA_CORE_DIR`, `GEA_ENGINE_DIR`, `GEA_HOST_DIR`, `GEA_ELEMENTS_DIR`, `GEA_CHIPS_DIR`, `GEA_GEAOS_PACKAGE_DIR`, `GEA_PLUGIN_DIR`, `GEA_TARGETS_ROOT` | Individual package directories; unset ones use the dependency root     |
| `GEA_CLI_BIN`                                                                                                                                        | Executable CLI entry point used to build and flash                     |
| `GEA_CLI_DIR`                                                                                                                                        | CLI source tree whose define mapper is used by shared feature checks   |

If changing the CLI, set both CLI overrides to the corresponding tree. Keep the
single workspace compiler and unchanged dependencies fixed when comparing native
runtime implementations. Record package versions and flags for every comparison.

## Execution settings

The runner executes the [shared timing catalog](../../../README.md#shared-timing-fixtures).
The shared TSX components and imported CSS own UI construction, reactive updates,
touch sequences and behavioral checks. This directory imports the shared suite
and supplies platform scheduling, measurement and build/flash/capture.

Each case warms up for 60 frames and measures 240 frames. Layout DPR is 1, so
geometry and injected coordinates use panel pixels. Requested frame rate is 60;
the target's millisecond timer can produce approximately 62.5 FPS. VSync, WiFi and
ordinary per-frame performance instrumentation are disabled. Updates run through
shipping `requestAnimationFrame` callbacks and stop after completion.

The completed-frame hook yields two FreeRTOS ticks after each frame (2 ms on this
target), allowing the idle task a full tick under saturated workloads. That yield is
outside frame-work timing and inside cadence/FPS. The watchdog remains enabled.
The capture timeout is the greater of 240 seconds and 120 seconds per catalog case
per rebooted run, with a short completion drain. `--timeout SECONDS` overrides it.
Real compiled CSS workloads can be substantially slower than direct C++ setters;
slow timing is reported, while watchdogs and invalid checks still fail the run.

Synthetic gestures use `Touchscreen::injectEvent`, the controller cache/observer
route also used by `GEADEV DRAG`. Hit testing, gesture handling and inertia come
from the engine. This measures software touch handling on hardware, not physical
digitizer accuracy or sensor latency. The suite uses the behavioral checks defined by the shared fixtures.

## Scope and metrics

Timing uses **one full-CSS native firmware** for every case. Small layouts measure
generic-engine overhead; they do not prove a separately compiled app has stripped
unused fields or code. Fresh builds additionally run shared source-analysis
assertions for the [shared profiles](../../../README.md#feature-stripping-and-minimal-performance). Native storage measurements and
stripped minimal timing are separate [desktop checks](../../../desktop/README.md).
They do not measure a stripped JSX application's board flash size or runtime.

Per-case results include frame-work p50/p95/p99/max, completion cadence, observed
FPS, work exceeding 16.67 ms, sampled minimum free internal RAM/PSRAM, fixture-declared checks and observations, native node size and final geometry hash. Work
covers the target's frame start through FrameDone, including callbacks, layout,
rendering and the target flush stage. With asynchronous display transport this
is the scheduler's completion contract, not an optical panel scan measurement.

Compare work and tail latency as well as FPS: the frame cap hides spare CPU
capacity. Heap minima sampled at frame completion can miss transient allocations.
Final geometry hashes and a nonempty framebuffer do not prove pixel equality or
replace visual checks. S3 and P4 results are not interchangeable; processors,
memory, rendering paths and display buses differ. Future targets belong under
`esp32/<chip>/<board>/`.

The parser validates all catalog cases in order, sample counts, distributions,
fixture-declared assertions, successful completion and the final framebuffer. Crashes,
timeouts and incomplete or invalid captures fail. Timing itself has no FPS or
regression pass threshold; establish a repeated same-board baseline before adding
one.

## Outputs and firmware provenance

Build logs, raw serial logs and `firmware-provenance.json` use the app's ignored
`.gea/build/esp32-s3-touch-amoled-2.06/app-builds/amoled-206-bench` directory.
Successful JSON results use `results-TIMESTAMP.json` in that same build directory. They contain package/build metadata and the serial capture; review results
before choosing to track them in Git. Failed captures retain their raw logs.

`--no-build` uses saved provenance instead of labeling an old image with current
package metadata. The runner checks firmware hash, shared fixture/profile hashes
and a fingerprint of every JavaScript module in compiler `dist/` before flashing
and after measurement. Missing provenance or changed inputs require rebuilding.
A saved manifest can be supplied with `--no-build --firmware /absolute/path/to/firmware-provenance.json`.

To validate an existing serial capture without flashing:

```sh
node css/esp32/s3/amoled-206/run.mjs --log /absolute/path/to/device.log
```

## Compare a release with any PR

1. Run against a pinned, mutually matching released package tree and save its JSON.
2. Point package overrides at the candidate sources; build its plugin if needed.
   Leave unchanged dependencies on the same released installation. Keep compiler,
   fixture sources, display settings and instrumentation fixed.
3. Rebuild and run the candidate. Do not reuse the release image or treat a failed
   build as a performance result; the runner does not patch candidate sources.
4. Alternate release/candidate runs on the same board. Compare frame work, cadence,
   memory and correctness metadata; investigate changed output before interpreting
   timing ratios.

```sh
GEA_BENCH_DEPENDENCY_ROOT=/absolute/path/to/released/packages \
  node css/esp32/s3/amoled-206/run.mjs
GEA_BENCH_DEPENDENCY_ROOT=/absolute/path/to/candidate/packages \
  node css/esp32/s3/amoled-206/run.mjs
```

A complete override root must contain every required package, including targets
and the built plugin. Use individual overrides for repositories containing only
part of that package set. Keep each result with its package paths/versions,
fixture hashes, image hash, compiler fingerprint and build configuration.
