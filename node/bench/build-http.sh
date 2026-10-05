#!/usr/bin/env bash
# Builds every server bench/http-matrix.py measures.
#
# Needs clang 18 (CXX overrides it), cargo, and Drogon with its dependencies
# (Ubuntu: libdrogon-dev libjsoncpp-dev uuid-dev zlib1g-dev libssl-dev).
set -euo pipefail

cd "$(dirname "$0")/.."

CXX_BIN=${CXX:-clang++}
CARGO_BIN=${CARGO:-cargo}
BUILD=../node_modules/@geastack/node-compat/scripts/build.mjs
SCRIPTC=../node_modules/.bin/scriptc
RAW=apps/raw-http-hello

mkdir -p "$RAW/dist"

echo "=== GeaStack: raw node:http ==="
CXX="$CXX_BIN" node "$BUILD" "$RAW/server.ts" --out "$RAW/dist"

echo "=== GeaStack: Hono ==="
CXX="$CXX_BIN" node "$BUILD" apps/hono-hello/server.ts --out apps/hono-hello/dist

echo "=== scriptc: raw node:http with reusePort ==="
"$SCRIPTC" build "$RAW/server.reuseport.ts" -o "$RAW/dist/scriptc-rp" --strip --no-keep-llvm

echo "=== scriptc: Hono in the embedded QuickJS engine ==="
"$SCRIPTC" build apps/hono-hello/scriptc/server.ts -o apps/hono-hello/dist/scriptc --dynamic --strip --no-keep-llvm

echo "=== C++: epoll ==="
"$CXX_BIN" -O2 -std=c++20 "$RAW/cpp-epoll/server.cpp" -o "$RAW/dist/cpp-epoll"

echo "=== C++: Drogon ==="
"$CXX_BIN" -O2 -std=c++20 "$RAW/cpp-drogon/main.cc" -I/usr/include/jsoncpp \
  -ldrogon -ltrantor -ljsoncpp -lssl -lcrypto -lz -luuid -lpthread \
  -o "$RAW/dist/cpp-drogon"

echo "=== Rust: hyper and axum ==="
"$CARGO_BIN" build --manifest-path "$RAW/rust-server/Cargo.toml" --release --locked

ls -lh apps/hono-hello/dist/server apps/hono-hello/dist/scriptc "$RAW/dist/server" "$RAW/dist/scriptc-rp" \
  "$RAW/dist/cpp-epoll" "$RAW/dist/cpp-drogon" \
  "$RAW/rust-server/target/release/rust-http-hello" \
  "$RAW/rust-server/target/release/axum-http-hello"
