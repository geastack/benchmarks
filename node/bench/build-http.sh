#!/usr/bin/env bash
# Builds every server bench/http-matrix.py measures.
#
# Needs clang 18 (CXX overrides it), cargo, and Drogon with its dependencies
# (Ubuntu: libdrogon-dev libjsoncpp-dev uuid-dev zlib1g-dev libssl-dev).
set -euo pipefail

# --no-scriptc leaves out the two scriptc servers; the release performance gate
# measures GeaStack against the Rust, C++ and Node servers only.
keep_going=0
scriptc=1
while [[ $# != 0 ]]; do
  case "$1" in
    --keep-going) keep_going=1 ;;
    --no-scriptc) scriptc=0 ;;
    *) echo 'Usage: build-http.sh [--keep-going] [--no-scriptc]' >&2; exit 2 ;;
  esac
  shift
done
failed_builds=()
build_step() {
  local label="$1"
  shift
  echo "=== $label ==="
  if "$@"; then return; fi
  if [[ "$keep_going" == 0 ]]; then return 1; fi
  failed_builds+=("$label")
}

cd "$(dirname "$0")/.."

CXX_BIN=${CXX:-clang++}
CARGO_BIN=${CARGO:-cargo}
BUILD=${GEA_NODE_COMPAT_DIR:-../../node-compat}/scripts/build.mjs
export GEA_COMPILER_DIR=${GEA_COMPILER_DIR:-../../compiler}
SCRIPTC=../node_modules/.bin/scriptc
RAW=apps/raw-http-hello

mkdir -p "$RAW/dist"
node bench/compiler-input.mjs --output "$RAW/dist/compiler-inputs.json"

build_step 'GeaStack: raw node:http' env CXX="$CXX_BIN" node "$BUILD" "$RAW/server.ts" --out "$RAW/dist" --report "$RAW/dist/build-report.json"

build_step 'GeaStack: Hono' env CXX="$CXX_BIN" node "$BUILD" apps/hono-hello/server.ts --out apps/hono-hello/dist --report apps/hono-hello/dist/build-report.json

if [[ "$scriptc" == 1 ]]; then
  build_step 'scriptc: raw node:http with reusePort' "$SCRIPTC" build "$RAW/server.reuseport.ts" -o "$RAW/dist/scriptc-rp" --strip --no-keep-llvm
  build_step 'scriptc: Hono in the embedded QuickJS engine' "$SCRIPTC" build apps/hono-hello/scriptc/server.ts -o apps/hono-hello/dist/scriptc --dynamic --strip --no-keep-llvm
fi

build_step 'C++: epoll' "$CXX_BIN" -O2 -std=c++20 "$RAW/cpp-epoll/server.cpp" -o "$RAW/dist/cpp-epoll"

build_step 'C++: Drogon' "$CXX_BIN" -O2 -std=c++20 "$RAW/cpp-drogon/main.cc" -I/usr/include/jsoncpp \
  -ldrogon -ltrantor -ljsoncpp -lssl -lcrypto -lz -luuid -lpthread \
  -o "$RAW/dist/cpp-drogon"

build_step 'Rust: hyper and axum' "$CARGO_BIN" build --manifest-path "$RAW/rust-server/Cargo.toml" --release --locked
node bench/compiler-input.mjs --check "$RAW/dist/compiler-inputs.json"

if [[ ${#failed_builds[@]} != 0 ]]; then
  printf 'Failed build: %s\n' "${failed_builds[@]}" >&2
  exit 1
fi

scriptc_outputs=()
[[ "$scriptc" == 1 ]] && scriptc_outputs=(apps/hono-hello/dist/scriptc "$RAW/dist/scriptc-rp")
ls -lh apps/hono-hello/dist/server "$RAW/dist/server" "${scriptc_outputs[@]}" \
  "$RAW/dist/cpp-epoll" "$RAW/dist/cpp-drogon" \
  "$RAW/rust-server/target/release/rust-http-hello" \
  "$RAW/rust-server/target/release/axum-http-hello"
