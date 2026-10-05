#!/usr/bin/env python3
"""Render bench/http-matrix.py records as a Markdown report.

Usage: python3 bench/render-http.py <throughput.json> [startup.json]
"""

import json
import re
import statistics
import sys
from pathlib import Path

LABELS = {
    "gea-raw": "GeaStack",
    "scriptc-raw": "scriptc",
    "node-raw": "Node.js",
    "rust-hyper": "Rust hyper",
    "rust-axum": "Rust axum",
    "cpp-epoll": "C++ epoll",
    "cpp-drogon": "C++ Drogon",
    "hono-gea": "GeaStack",
    "hono-node": "Node.js",
    "hono-scriptc": "scriptc, Hono in QuickJS",
}
BINARIES = {
    "gea-raw": "apps/raw-http-hello/dist/server",
    "scriptc-raw": "apps/raw-http-hello/dist/scriptc-rp",
    "rust-hyper": "apps/raw-http-hello/rust-server/target/release/rust-http-hello",
    "rust-axum": "apps/raw-http-hello/rust-server/target/release/axum-http-hello",
    "cpp-epoll": "apps/raw-http-hello/dist/cpp-epoll",
    "cpp-drogon": "apps/raw-http-hello/dist/cpp-drogon",
    "hono-gea": "apps/hono-hello/dist/server",
    "hono-scriptc": "apps/hono-hello/dist/scriptc",
}


def latency_ms(text):
    match = re.fullmatch(r"([\d.]+)(us|ms|s)", text)
    value, unit = float(match[1]), match[2]
    return value / 1000 if unit == "us" else value * 1000 if unit == "s" else value


def mean(values):
    return sum(values) / len(values)


record = json.loads(Path(sys.argv[1]).read_text())
startup = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else None
samples = record["samples"]
servers = list(dict.fromkeys(s["server"] for s in samples))
workers = sorted({s["workers"] for s in samples})
top = max(workers)


def rows(name, path, count):
    return [
        s
        for s in samples
        if s["server"] == name and s["path"] == path and s["workers"] == count
    ]


def throughput(name, path, count):
    return mean([s["rps"] for s in rows(name, path, count)])


def table(group):
    names = sorted(group, key=lambda n: -throughput(n, "/", top))
    head = ["server"]
    for count in workers:
        head += [f"{count}w `/` req/s", f"{count}w `/json` req/s"]
    head += [f"{top}w `/` p99 ms", f"{top}w PSS MiB", "binary"]
    if startup:
        head.append("startup ms")
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for name in names:
        cells = [LABELS.get(name, name)]
        for count in workers:
            cells += [
                f"{throughput(name, '/', count):,.0f}",
                f"{throughput(name, '/json', count):,.0f}",
            ]
        top_rows = rows(name, "/", top)
        cells.append(
            f"{statistics.median(latency_ms(s['latency']['99%']) for s in top_rows):.2f}"
        )
        cells.append(
            f"{mean([s['memory_after']['pss_kib'] for s in top_rows]) / 1024:.1f}"
        )
        binary = BINARIES.get(name)
        size = Path(binary).stat().st_size if binary and Path(binary).exists() else None
        cells.append(f"{size / 1024 / 1024:.2f} MiB" if size else "–")
        if startup:
            times = [
                s["milliseconds"]
                for s in startup["startups"]
                if s["server"] == name and s["workers"] == 1
            ]
            cells.append(f"{statistics.median(times):.1f}" if times else "")
        out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out)


raw = [n for n in servers if not n.startswith("hono-")]
hono = [n for n in servers if n.startswith("hono-")]
print(f"# HTTP results, {record['utc'][:10]}\n")
print(
    f"Mean of {record['settings']['rounds']} interleaved {record['settings']['duration']} "
    f"`wrk` runs, {record['load_threads']} threads, {record['connections']} keep-alive "
    f"connections. One worker on CPU 0, {top} workers on CPUs {record['server_cpus']['multi']}, "
    f"`wrk` on CPUs {record['load_cpus']}. PSS is summed over every server process. "
    "Startup is the median time to the first correct response with one worker.\n"
)
if raw:
    print("## Raw `node:http`\n")
    print(table(raw) + "\n")
if hono:
    print("## Hono\n")
    print(table(hono) + "\n")
