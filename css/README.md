# CSS engine benchmarks

All commands below start at the repository root (`benchmarks/`). These runners
use Node.js 20.19 or newer and the surrounding geastack workspace.

The CSS TypeScript project resolves `@geastack/core` declarations from
`examples/node_modules/@geastack/core`, matching the default build SDK. This
provides editor diagnostics and JSX types without installing a second SDK in the
benchmark repository. Run `npm run css:typecheck` to check every shared scene and
board entry. If you use a different SDK tree, update the path in `css/tsconfig.json`
to match it.

| Runner                                                 | Inputs                                                                                    | Measurement                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Desktop comparison](desktop/README.md)                | Two immutable Git refs in `core/`, identical shared compiled TSX/CSS scenes               | CPU/layout/software-raster frame work and final output hashes           |
| [Feature profiles](desktop/check-feature-profiles.mjs) | Shared box, flex and complex JSX sources; selected compiler/plugin/CLI and native headers | Required/unused feature gates and native node/style storage sizes       |
| Desktop `--minimal`                                    | Two Git refs, shared one-box/four-box fixtures and compiler-derived box defines           | Frame work with unused CSS features disabled                            |
| [ESP32-S3 AMOLED 2.06](esp32/s3/amoled-206/README.md)  | A matching package tree, shared compiled TSX/CSS scenes and the registered board          | Completed-frame work, cadence, memory and software gestures on hardware |

## Shared timing fixtures

[`shared/catalog.json`](shared/catalog.json) declares the case names, component paths
and required checks. Each directory under [`shared/fixtures/`](shared/fixtures/)
contains a `Scene.tsx` and imports the CSS it needs. Cases with additional styles
have their own `style.css`; others use `fixtures/base.css` directly. The component
owns its markup, reactive store updates, touch sequence and behavioral assertions.
The shipping Gea frontend compiles these actual CSS files. Platform folders supply execution, timing and result collection; future
boards belong under `esp32/<chip>/<board>/`.

[`shared/benchmark.ts`](shared/benchmark.ts) exposes `run`, `check`, `down`, `move`,
`up`, scroll operations and diagnostics to each component. Its typed native ABI is
[`benchmark-native.h`](shared/benchmark-native.h), registered through the compiler
plugin. The shared native adapter supplies touch injection, measurements and
queries; scene styling stays in CSS and class/text mutations use Gea stores.
Adding a case requires its component/CSS, a catalog entry and registration in the
shared suite entry. Neither platform runner needs case-specific code.

For example, a scene’s `start()` mounts its component and calls `benchmark.run`:

```tsx
benchmark.run(
  'my-swipe',
  (frame: number) => {
    const step = frame % 64;
    if (step === 0) benchmark.down(205, 430);
    else if (step < 12) benchmark.move(205, 430 - step * 24);
    else if (step === 12) benchmark.up(205, 166);
  },
  () => benchmark.check(benchmark.scrollValue('#list') > 0, 'scroll moved'),
);
```

Frame numbers include warm-up. Assertions and final output hashes run outside
measured frame work. These compiled component workloads replace the former C++
fixture construction, so establish new baselines rather than comparing with old
fixture results.

The normal suite has **19 cases**, with a 410 × 502 viewport, 60 warm-up frames
and 240 measured frames by default:

| Cases                                                 | Workload                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `flex-layout-16`, `flex-layout-96`                    | Resize a flex list; rows contain text and an icon                                                                                              |
| `grid-layout-64`                                      | Resize a four-column grid                                                                                                                      |
| `class-update`, `matching-sibling-update`             | Batch 12 selection changes, including matching sibling invalidation                                                                            |
| `text-update`                                         | Change 12 equal-length labels                                                                                                                  |
| `scroll-16`, `scroll-96`, `rounded-scroll`            | Scroll lists back and forth, including rounded clipping                                                                                        |
| `nested-scroll`                                       | Scroll an inner list beneath a stationary header                                                                                               |
| `horizontal-swipe`, `vertical-drag`, `momentum-flick` | Inject touch sequences; require scroll movement and post-release inertia                                                                       |
| `minimal-box-1`, `minimal-boxes-4`                    | Resize layouts with one or four plain children                                                                                                 |
| `minimal-text-12`                                     | Update twelve labels in a small layout                                                                                                         |
| `wrapped-layout-96`                                   | Resize a wrapping flex layout with 96 cards                                                                                                    |
| `selector-cascade-256`                                | Flip classes with 256 nonmatching descendant rules and matching compound/sibling rules                                                         |
| `dashboard-mixed-96`                                  | Change width, classes, text and scroll together across 96 grid/flex cards, with borders, rounded corners, padding, inset shadows and gradients |

Normal desktop and board timing runs retain full CSS support. All scenes are
compiled into one application and share its stylesheet, so each timing includes
the cost of matching against that stylesheet. Small cases in that configuration
measure overhead of the generic engine. The separate desktop `--minimal` entry
imports only the two box scenes and their CSS, allowing unused rules and features
to be omitted. Desktop uses a
controlled 16 ms simulation clock; the board uses its actual scheduler. Absolute
CPU timings and board cadence/FPS are different metrics; compare implementations
within the same runner and mode.

## Feature stripping and minimal performance

Shared JSX inputs and expectations live in [`shared/profiles/`](shared/profiles/).
The actual compiler/plugin analyzes each source, and the CLI converts that
analysis to defines. Checks require unused feature gates to be disabled and
required gates to remain enabled. Box and flex profiles also check every emitted
optional CSS gate against an explicit allowlist, excluding compact numeric-storage
macros. The device runner performs these checks before a fresh build.

```sh
node css/desktop/check-feature-profiles.mjs
node css/desktop/compare-css-performance.mjs RELEASE_REF CANDIDATE_REF --minimal
```

The first command compiles native `sizeof` probes for full, box, flex and complex
profiles and requires the box profile to reduce node and style storage. The second
runs only the shared one-box and four-box fixtures with box-profile defines
applied to both native revisions. It does not include the twelve-label case.

These checks measure feature defines, native ABI storage and stripped compiled component
performance. They do not measure the application's
flash size or its performance on the board. Board timings still use one full-CSS
firmware for all cases.

Use matching package trees for profile checks. Defaults are the single workspace
compiler, installed packages under `examples/node_modules/@geastack`, and local
CLI. `GEA_PLUGIN_DIR` and `GEA_CLI_DIR` select analysis implementations;
`GEA_ENGINE_DIR`, `GEA_HOST_DIR` and `GEA_CORE_DIR` select native size-probe headers.
The size probe's elements include path remains the installed examples package.
Keep the workspace compiler fixed for native runtime comparisons. To assess an
analyzer change, run the profile checker separately against each plugin/CLI tree.

See the runner READMEs for output files, diagnostic counters, optional regression
gates and comparisons against releases or arbitrary PRs.
