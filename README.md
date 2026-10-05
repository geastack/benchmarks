# GeaStack benchmarks

- [Node runtime benchmarks](node/README.md): compute and HTTP comparisons against scriptc, Node.js and native C++/Rust references, with recorded results.
- [CSS engine benchmarks](css/README.md): shared layouts and gestures, desktop comparisons, CSS feature-stripping checks and ESP32 board measurements.

Run the following commands from this repository's root (`benchmarks/`). The Node
runtime harnesses require the Linux environment documented in `node/README.md`:

```sh
npm ci
npm run compute -- --samples 5 --output node/dist/compute.json
npm run compute:report -- node/dist/compute.json
npm run http:build
```

CSS runners use Node.js and the surrounding geastack workspace, with sibling
`core/`, `compiler/`, `cli/` and `examples/` directories. Full desktop comparisons
need Clang and locally available Git refs in `core/`; feature checks, stripped
minimal comparisons and device builds also need the workspace Gea toolchain:

```sh
node css/desktop/compare-css-performance.mjs RELEASE_REF CANDIDATE_REF
node css/desktop/check-feature-profiles.mjs
node css/desktop/compare-css-performance.mjs RELEASE_REF CANDIDATE_REF --minimal
node css/esp32/s3/amoled-206/run.mjs --rounds 1
```

The board command builds and flashes the registered AMOLED 2.06 board. See the
[CSS overview](css/README.md) for coverage, prerequisites and what each measurement proves.
