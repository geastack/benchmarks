# Desktop CSS comparisons

All commands below start at the repository root (`benchmarks/`). The surrounding
geastack workspace must contain `core/`; refs must be available in that repository.
Comparisons need Node.js 20.19 or newer, Clang with C++20 support, the single
workspace compiler and matching installed Geastack frontend/native packages.

```sh
node css/desktop/compare-css-performance.mjs BASE_REF CANDIDATE_REF
```

For correctness without collecting durations or applying a speed gate:

```sh
node css/desktop/compare-css-performance.mjs BASE_REF CANDIDATE_REF --verify-only --jobs 2
```

This builds the same shared application and runs each revision once. All 19 scenes
still execute their complete frame and gesture sequences and their behavioral checks;
final pixel and geometry hashes must agree. The native loop advances the controlled
simulation clock without reading the wall clock. Reports contain checks and hashes,
with no synthetic timing values, percentiles or rankings. `--minimal` selects the same
two box cases as timing mode. Instrumentation and speed thresholds are incompatible
with verification. Reports use `css-verification.json` or
`css-verification-minimal.json`, leaving timing reports unchanged.

The runner measures committed native sources, with the same working-tree
[shared fixtures](../README.md#shared-timing-fixtures) in both builds. It maps
tracked package blobs through Clang's virtual filesystem rather than changing
branches or creating another checkout. Sources and host stubs come from each
revision's native test harness; its source-list format must be supported by the
runner. Both modes compile the shared TSX/CSS once with the shipping Gea frontend
and workspace compiler, then link that identical generated application against
each native revision. The runner does not install dependencies. Frontend package
selection uses `GEA_CORE_DIR` and `GEA_PLUGIN_DIR`; defaults are the installed
packages under `examples/node_modules/@geastack`. Keep the frontend fixed when
comparing native engine revisions.

Git blobs, overlays, objects, binaries and reports use the existing ignored
`core/packages/core/test/.build` directory. Builds use `-O2 -DNDEBUG` and two
compiler jobs by default. Cache keys include the revision, native compiler,
flags, benchmark source and shared sources. Objects and binaries enter the cache
only after successful compilation/linking. `CC` and `CXX` override the compiler
executables.

## Execution and comparison

Normal mode runs the [shared timing catalog](../README.md#shared-timing-fixtures).
Each frame includes mutation, engine frame processing and software raster refresh.
The native harness dispatches touch events and advances its clock by 16 ms per frame.

Setup and 60 warm-up frames are outside timing. Defaults are 240 measured frames
per case and seven fresh processes per revision. Base/candidate order alternates
between rounds. `--rounds`, `--samples` and `--jobs` override these values; minima
are three rounds, 32 samples and one compiler job.

The summary reports the median of process medians, median p95, percentage change
and spread of process medians. Positive change means slower. JSON retains raw
runs, counters, native node sizes, fixture hashes and resolved source commits.
Desktop RAM/PSRAM fields are `null`; only the device runner samples free memory.

Shared checks require actual scroll movement, post-release momentum, width changes
and isolated nested scrolling. Pixel and geometry hashes are computed after each
case, outside timing. `same` requires identical final hashes across every run of
both versions. `DIFF` needs investigation before interpreting a timing ratio;
final hashes do not verify every intermediate frame.

## Stripping checks and minimal mode

These commands additionally require the workspace compiler, installed Geastack
plugin and native packages, and the local CLI's define mapper:

```sh
node css/desktop/check-feature-profiles.mjs
node css/desktop/compare-css-performance.mjs BASE_REF CANDIDATE_REF --minimal
```

The checker asserts feature gates for the [shared profiles](../README.md#feature-stripping-and-minimal-performance),
then compiles native node/style size probes. Header selection and
measurement limits are documented in the [CSS overview](../README.md#feature-stripping-and-minimal-performance).

`--minimal` applies the compiler-derived defines and runs the subset documented
in the [shared profile catalog](../README.md#feature-stripping-and-minimal-performance).
The analyzer toolchain is identical for both builds; run profile checks separately against release/candidate plugin and
CLI trees to compare analyzer behavior. Native sources still come from the two
Git refs, independently of package-header overrides used by the size checker.

## Counters and regression gates

Production timing disables `GEA_EMBEDDED_PERF`. To diagnose a slowdown:

```sh
node css/desktop/compare-css-performance.mjs BASE_REF CANDIDATE_REF --instrumented --rounds 3
```

This enables refresh counters and internal timers: layout calls, full records,
recorded commands, accepted root-scroll shortcuts and flushed pixels. Instrumented
work includes timer overhead; compare it only with equally instrumented runs.

Exploratory timing changes do not fail the command. After establishing a stable
runner, add a median-regression gate:

```sh
node css/desktop/compare-css-performance.mjs BASE_REF CANDIDATE_REF \
  --rounds 9 --samples 512 --max-regression 15
```

With a gate, any output mismatch or slowdown above the threshold fails. Behavioral
validation or build failures fail regardless of whether a timing gate is enabled.
Desktop timings do not measure board FPS, display transport, transient heap peaks
or application flash size. Use repeated runs and inspect spread before interpreting
small deltas.

| Mode                                     | Report in native `.build` output    |
| ---------------------------------------- | ----------------------------------- |
| Full                                     | `css-performance.json`              |
| Instrumented full                        | `css-performance-instrumented.json` |
| Minimal, with or without instrumentation | `css-performance-minimal.json`      |
| Feature/size checker                     | `css-feature-profiles.json`         |

Runs overwrite their mode's report; save a result before another run of that mode.

## Compare a PR with a release

Use the source commit corresponding to the published package versions as the
baseline, rather than assuming the PR base represents the release. Fetch the
candidate without switching branches:

```sh
git -C ../core fetch origin "pull/${PR_NUMBER}/head"
node css/desktop/compare-css-performance.mjs RELEASE_REF FETCH_HEAD
```

Set `PR_NUMBER` and replace `RELEASE_REF` with a locally available tag or commit.
Record package versions and resolved commits. The [board runner](../esp32/s3/amoled-206/README.md)
compares package trees when hardware timings are required.
