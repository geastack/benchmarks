#!/usr/bin/env bash
# Runs the release performance gate on the benchmark machine instead of here.
#
#   GEA_PERF_HOST=<ssh host> bash node/release-gate/remote.sh [perf-gate options]
#
# A desktop, and a WSL VM on one above all, is never quiet enough for the
# gate's controls: Node and the C++ pool drift a few percent run to run and
# fail it on their own. The gate measures on a dedicated machine with its own
# baseline. This copies the four checkouts the gate builds from (compiler,
# node-compat, parallel, benchmarks) from GEASTACK_ROOT to that machine,
# installs their locked packages where the lockfile changed, runs perf-gate
# there under one lock, and with --write copies the new baseline back.
set -euo pipefail

host=${GEA_PERF_HOST:?set GEA_PERF_HOST to the ssh host of the benchmark machine}
root=${GEASTACK_ROOT:?set GEASTACK_ROOT to the geastack checkout root}
remote=${GEA_PERF_ROOT:-Projects/Code/github/geastack}

# No --delete: the machine keeps its own build outputs (Rust targets, emitted
# fixtures) between runs, and other work lives beside these trees.
sync() {
  rsync -az --exclude node_modules --exclude .git --exclude measurements "$@"
}
ssh "$host" "mkdir -p $remote"
sync "$root/compiler/" "$host:$remote/compiler/"
sync --exclude dist "$root/node-compat/" "$host:$remote/node-compat/"
sync --exclude dist --exclude target "$root/parallel/" "$host:$remote/parallel/"
sync --exclude dist --exclude target --exclude results "$root/benchmarks/" "$host:$remote/benchmarks/"

status=0
ssh "$host" GEA_PERF_NODE="${GEA_PERF_NODE:-24}" bash -s -- "$remote" "$@" <<'REMOTE' || status=$?
set -euo pipefail
remote=$1
shift
export PATH=$HOME/.cargo/bin:$PATH
# A non-interactive shell loads no nvm, and the system Node may be too old to
# run the TypeScript the Node controls serve.
if [[ -s $HOME/.nvm/nvm.sh ]]; then
  . "$HOME/.nvm/nvm.sh" >/dev/null
  nvm use --silent "${GEA_PERF_NODE:-24}"
fi
cd "$HOME/$remote"
# parallel has no lockfile and the gate needs nothing installed there: it
# compiles against GEA_COMPILER_DIR.
for dir in compiler node-compat benchmarks; do
  stamp=$dir/node_modules/.lock-installed
  if ! cmp -s "$dir/package-lock.json" "$stamp" 2>/dev/null; then
    echo "remote: npm ci in $dir"
    (cd "$dir" && npm ci --ignore-scripts --no-audit --no-fund >/dev/null)
    cp "$dir/package-lock.json" "$stamp"
  fi
done
cd benchmarks
exec flock "$HOME/geastack-box-build.lock" env \
  GEA_COMPILER_DIR="$HOME/$remote/compiler" \
  GEA_NODE_COMPAT_DIR="$HOME/$remote/node-compat" \
  PARALLEL_ROOT="$HOME/$remote/parallel" \
  node node/release-gate/perf-gate.mjs "$@"
REMOTE

for arg in "$@"; do
  if [[ "$arg" == --write ]]; then
    rsync -az "$host:$remote/benchmarks/node/release-gate/baselines/" "$root/benchmarks/node/release-gate/baselines/"
  fi
done
exit "$status"
