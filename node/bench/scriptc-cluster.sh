#!/usr/bin/env bash
# Run N copies of a server binary that shares its port with SO_REUSEPORT (the
# scriptc raw-http-hello build). Used by bench/http-matrix.py for the multi-worker
# scriptc rows: scriptc has no node:cluster, so its "workers" are processes. All
# copies stay in this process group, which is what the harness measures and kills.
set -u
BIN="$1"; N="$2"
for _ in $(seq 2 "$N"); do "$BIN" >/dev/null 2>&1 & done
exec "$BIN"
