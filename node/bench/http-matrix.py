#!/usr/bin/env python3
"""Linux HTTP comparison. Run from this repository; results retain every wrk sample.

Generated Gea sources must come from the shared compiler/dist. Native binaries
live in the apps' normal dist directories. No private compiler build is used.
"""

import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", required=True)
parser.add_argument("--rounds", type=int, default=2)
parser.add_argument("--duration", default="8s")
parser.add_argument(
    "--verify-only",
    action="store_true",
    help="check every server's responses without measuring startup or throughput",
)
parser.add_argument(
    "--servers",
    nargs="+",
    default=[
        "gea-raw",
        "node-raw",
        "scriptc-raw",
        "rust-hyper",
        "rust-axum",
        "cpp-epoll",
        "cpp-drogon",
        "hono-gea",
        "hono-node",
        "hono-scriptc",
    ],
)
parser.add_argument("--workers", nargs="+", type=int, default=[1, 4])
# `dist` is the historical build; `dist` is what `scripts/build.mjs` writes today.
parser.add_argument("--gea-dist", default="dist")
parser.add_argument(
    "--startup-only",
    action="store_true",
    help="validate readiness/wire behavior and record startup without wrk",
)
parser.add_argument(
    "--server-cpus",
    default=None,
    help="taskset list for multi-worker servers (default 0-7). This box has 4 "
    "physical cores with siblings 0-1, 2-3, 4-5, 6-7 and wrk pinned to 4-7, "
    "so the default overlaps the load generator and measures a saturated "
    "host. Pass 0-3 to give the server two physical cores the load "
    "generator does not touch.",
)
parser.add_argument(
    "--load-cpus",
    default="4-7",
    help="taskset list for wrk (default 4-7, the bench box layout). On a larger "
    "host give wrk whole physical cores the server does not use.",
)
parser.add_argument("--load-threads", type=int, default=4, help="wrk -t (default 4)")
parser.add_argument("--connections", type=int, default=64, help="wrk -c (default 64)")
args = parser.parse_args()
if args.verify_only:
    args.rounds = 1

compiler_inputs = None
if any(name in ("gea-raw", "hono-gea") for name in args.servers):
    compiler_manifest = Path("apps/raw-http-hello/dist/compiler-inputs.json")
    compiler_inputs = json.loads(compiler_manifest.read_text())
    subprocess.run(
        ["node", "bench/compiler-input.mjs", "--check", str(compiler_manifest)],
        check=True,
    )
    for name in args.servers:
        if name not in ("gea-raw", "hono-gea"):
            continue
        app = "raw-http-hello" if name == "gea-raw" else "hono-hello"
        report = json.loads(Path(f"apps/{app}/{args.gea_dist}/build-report.json").read_text())
        if report.get("linked") is not True or report.get("compilerInputs") != compiler_inputs:
            sys.exit(f"http-matrix: {name} has no successful build from the saved canonical compiler inputs")


def command(name, workers):
    env = os.environ.copy()
    for key in (
        "SINGLE_THREAD",
        "GEA_WORKERS",
        "CPP_WORKERS",
        "NODE_WORKERS",
        "DROGON_THREADS",
        "TOKIO_WORKER_THREADS",
    ):
        env.pop(key, None)
    if name in ("hono-gea", "gea-raw"):
        app = "hono-hello" if name == "hono-gea" else "raw-http-hello"
        cmd = [f"apps/{app}/{args.gea_dist}/server"]
        env["GEA_WORKERS"] = str(workers)
    elif name == "hono-node":
        # The same server.ts the hono-gea row compiles, run by Node's type stripping.
        entry = "server.ts" if workers == 1 else "cluster.node.mjs"
        cmd = ["node", f"apps/hono-hello/{entry}"]
        env["NODE_WORKERS"] = str(workers)
    elif name == "node-raw":
        entry = "server" if workers == 1 else "cluster"
        cmd = ["node", f"apps/raw-http-hello/{entry}.node.mjs"]
        env["NODE_WORKERS"] = str(workers)
    elif name.startswith("rust-"):
        binary = "rust-http-hello" if name == "rust-hyper" else "axum-http-hello"
        cmd = [f"apps/raw-http-hello/rust-server/target/release/{binary}"]
        if workers == 1:
            env["SINGLE_THREAD"] = "1"
        else:
            env["TOKIO_WORKER_THREADS"] = str(workers)
    elif name == "hono-scriptc":
        # A native scriptc server calling Hono in scriptc's embedded QuickJS engine
        # (apps/hono-hello/scriptc/); workers are processes, as for scriptc-raw.
        binary = "apps/hono-hello/dist/scriptc"
        cmd = (
            [binary]
            if workers == 1
            else ["bash", "bench/scriptc-cluster.sh", binary, str(workers)]
        )
    elif name == "scriptc-raw":
        # Vercel scriptc's static build of the same raw-http-hello server.ts
        # (with `reusePort: true`, or a second instance dies with EADDRINUSE).
        # scriptc has no cluster module, so N workers are N processes started by
        # bench/scriptc-cluster.sh; one worker runs the binary directly so the
        # startup figure is the binary's own.
        binary = os.environ.get("SCRIPTC_RAW", "apps/raw-http-hello/dist/scriptc-rp")
        cmd = (
            [binary]
            if workers == 1
            else ["bash", "bench/scriptc-cluster.sh", binary, str(workers)]
        )
    else:
        cmd = [f"apps/raw-http-hello/dist/{name}"]
        env["DROGON_THREADS" if name == "cpp-drogon" else "CPP_WORKERS"] = str(workers)
    cpus = "0" if workers == 1 else (args.server_cpus or "0-7")
    return (cmd if args.verify_only else ["taskset", "-c", cpus, *cmd]), env


def port_free(port):
    with socket.socket() as sock:
        return sock.connect_ex(("127.0.0.1", port)) != 0


def request(port, path):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
    try:
        conn.request("GET", path)
        response = conn.getresponse()
        return (
            response.status,
            response.getheader("content-type", ""),
            response.read().decode(),
        )
    finally:
        conn.close()


def raw_wire_response(port, path):
    wire = (f"GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n\r\n").encode()
    with socket.create_connection(("127.0.0.1", port), timeout=2) as conn:
        conn.settimeout(2)
        conn.sendall(wire)
        data = b""
        while b"\r\n\r\n" not in data:
            part = conn.recv(65536)
            if not part:
                raise RuntimeError(f"{path}: connection closed before response headers")
            data += part
        head, body = data.split(b"\r\n\r\n", 1)
        lines = head.split(b"\r\n")
        headers = {}
        for line in lines[1:]:
            name, value = line.split(b":", 1)
            headers.setdefault(name.decode().lower(), []).append(value.strip().decode())
        if headers.get("transfer-encoding") == ["chunked"]:
            while b"\r\n0\r\n\r\n" not in body:
                part = conn.recv(65536)
                if not part:
                    raise RuntimeError(f"{path}: connection closed before final chunk")
                body += part
        elif "content-length" in headers:
            length = int(headers["content-length"][0])
            while len(body) < length:
                part = conn.recv(65536)
                if not part:
                    raise RuntimeError(
                        f"{path}: connection closed before content-length body"
                    )
                body += part
        else:
            raise RuntimeError(f"no response framing for {path}: {head!r}")
    return lines[0].decode(), headers, body, head + b"\r\n\r\n" + body


def validate_raw_wire(port, path):
    status, headers, encoded_body, raw = raw_wire_response(port, path)
    expected_type = (
        "application/json; charset=utf-8"
        if path == "/json"
        else "text/plain; charset=utf-8"
    )
    expected_body = b'{"hello":"world"}' if path == "/json" else b"Hello, World! GET /"
    expected_headers = {
        "content-type": [expected_type],
        "connection": ["keep-alive"],
        "keep-alive": ["timeout=5"],
        "transfer-encoding": ["chunked"],
    }
    if status != "HTTP/1.1 200 OK":
        raise RuntimeError(f"{path}: wrong status line: {status!r}")
    if set(headers) != {*expected_headers, "date"}:
        raise RuntimeError(f"{path}: wrong header set: {headers!r}")
    for name, expected in expected_headers.items():
        if headers.get(name) != expected:
            raise RuntimeError(f"{path}: wrong {name}: {headers.get(name)!r}")
    date = headers["date"]
    if len(date) != 1 or not re.fullmatch(
        r"[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT", date[0]
    ):
        raise RuntimeError(f"{path}: wrong date: {date!r}")
    chunks = []
    remaining = encoded_body
    while True:
        marker = remaining.find(b"\r\n")
        if marker < 0:
            raise RuntimeError(f"{path}: malformed chunk size: {remaining!r}")
        size = int(remaining[:marker], 16)
        remaining = remaining[marker + 2 :]
        if size == 0:
            if remaining != b"\r\n":
                raise RuntimeError(
                    f"{path}: chunk trailers are not empty: {remaining!r}"
                )
            break
        chunk, ending, remaining = (
            remaining[:size],
            remaining[size : size + 2],
            remaining[size + 2 :],
        )
        if ending != b"\r\n":
            raise RuntimeError(f"{path}: malformed chunk ending")
        chunks.append(chunk)
    if chunks != [expected_body]:
        raise RuntimeError(f"{path}: wrong chunks: {chunks!r}")
    expected_bytes = 206 if path == "/json" else 202
    if len(raw) != expected_bytes:
        raise RuntimeError(
            f"{path}: expected {expected_bytes} wire bytes, got {len(raw)}"
        )
    return {
        "path": path,
        "bytes": len(raw),
        "headers": headers,
        "body_sha256": hashlib.sha256(expected_body).hexdigest(),
    }


def process_memory(group):
    members = []
    for file in Path("/proc").glob("[0-9]*/stat"):
        try:
            # comm can contain spaces; pgrp is field 5 (third after comm).
            fields = file.read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) != group:
                continue
            values = dict(
                re.findall(
                    r"^(Rss|Pss):\s+(\d+)",
                    (file.parent / "smaps_rollup").read_text(),
                    re.M,
                )
            )
            members.append(
                {
                    "pid": int(file.parent.name),
                    "rss_kib": int(values.get("Rss", 0)),
                    "pss_kib": int(values.get("Pss", 0)),
                }
            )
        except (FileNotFoundError, ProcessLookupError):
            pass
    return {
        "rss_kib": sum(p["rss_kib"] for p in members),
        "pss_kib": sum(p["pss_kib"] for p in members),
        "processes": members,
    }


def stop(proc, port):
    # start_new_session owns this entire group, including fork/cluster workers.
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
    for _ in range(50):
        if port_free(port):
            return
        time.sleep(0.1)
    raise RuntimeError(f"Port {port} still occupied after stopping group {proc.pid}")


def wrk(port, path, duration, warmup=False):
    cmd = [
        "taskset",
        "-c",
        args.load_cpus,
        "wrk",
        "--latency",
        f"-t{args.load_threads}",
        f"-c{args.connections}",
        f"-d{duration}",
        f"http://127.0.0.1:{port}{path}",
    ]
    output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True)
    if re.search(r"(?:connect|read|write|timeout) [1-9]\d*", output) or re.search(
        r"Non-2xx or 3xx responses:\s*[1-9]", output
    ):
        raise RuntimeError(output)
    if warmup:
        return output
    rps = re.search(r"Requests/sec:\s*([\d.]+)", output)
    if not rps or float(rps[1]) <= 0:
        raise RuntimeError(output)
    return {
        "rps": float(rps[1]),
        "raw": output,
        "latency": dict(re.findall(r"^\s+(50%|90%|99%)\s+(\S+)", output, re.M)),
    }


# Hashes of every source and binary a run can measure; missing files are skipped.
artifacts = [
    f"apps/hono-hello/{args.gea_dist}/server",
    f"apps/hono-hello/{args.gea_dist}/server.cpp",
    f"apps/raw-http-hello/{args.gea_dist}/server",
    f"apps/raw-http-hello/{args.gea_dist}/server.cpp",
    "apps/hono-hello/server.ts",
    "apps/hono-hello/cluster.node.mjs",
    "apps/hono-hello/dist/scriptc",
    "apps/hono-hello/scriptc/server.ts",
    "apps/hono-hello/scriptc/hono-island/index.mjs",
    "apps/raw-http-hello/server.ts",
    "apps/raw-http-hello/server.reuseport.ts",
    "apps/raw-http-hello/server.node.mjs",
    "apps/raw-http-hello/cluster.node.mjs",
    os.environ.get("SCRIPTC_RAW", "apps/raw-http-hello/dist/scriptc-rp"),
    "apps/raw-http-hello/cpp-epoll/server.cpp",
    "apps/raw-http-hello/cpp-drogon/main.cc",
    "apps/raw-http-hello/dist/cpp-epoll",
    "apps/raw-http-hello/dist/cpp-drogon",
    "apps/raw-http-hello/rust-server/Cargo.lock",
    "apps/raw-http-hello/rust-server/src/main.rs",
    "apps/raw-http-hello/rust-server/src/bin/axum-http-hello.rs",
    "apps/raw-http-hello/rust-server/target/release/rust-http-hello",
    "apps/raw-http-hello/rust-server/target/release/axum-http-hello",
    "bench/http-matrix.py",
    "bench/build-http.sh",
    "apps/raw-http-hello/dist/compiler-inputs.json",
    "apps/raw-http-hello/dist/build-report.json",
    "apps/hono-hello/dist/build-report.json",
    "../node_modules/@geastack/compiler/package.json",
    "../node_modules/@geastack/node-compat/package.json",
    "../node_modules/scriptc/package.json",
    "../node_modules/hono/package.json",
    "../node_modules/@hono/node-server/package.json",
]
# An unpinned multi-worker server shares CPUs with wrk and the host saturates;
# the ranking inverts and the gea rows read high (hono-gea 165k against 139k
# pinned, measured 2026-09-22 by exactly this omission). Say so on stderr so a
# result file from an unpinned run cannot pass for a comparison.
if not args.verify_only and args.server_cpus is None and any(workers > 1 for workers in args.workers):
    print(
        "http-matrix: --server-cpus not given; multi-worker servers will share CPUs with wrk. "
        "Not comparable with pinned runs.",
        file=sys.stderr,
    )

# WSL2 in networkingMode=mirrored adds `ip rule ... ipproto tcp lookup 127`,
# which routes 127.0.0.1 through loopback0 to the Windows host and back. Every
# request then crosses the VM boundary twice: cpp-epoll measured 103k rps on one
# worker against 428k once the rules were removed (2026-10-04), and every fast
# server collapsed onto the same ~150k ceiling. Refuse to measure that.
loopback_route = subprocess.run(
    ["ip", "route", "get", "127.0.0.1"], capture_output=True, text=True
).stdout
if loopback_route and " dev lo " not in loopback_route:
    sys.exit(
        "http-matrix: 127.0.0.1 does not route over lo:\n  "
        + loopback_route.splitlines()[0]
        + "\nOn WSL2 mirrored networking remove the table 127/128 rules first:\n"
        "  for p in tcp udp; do sudo ip rule del ipproto $p lookup 127; "
        "sudo ip rule del ipproto $p lookup 128; done\n"
        "(they return on the next WSL restart)."
    )

result = {
    "mode": "verification" if args.verify_only else "measurement",
    "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "settings": vars(args),
    "compiler_inputs": compiler_inputs,
    "server_cpus": {"1": "0", "multi": args.server_cpus or "0-7"},
    "load_cpus": args.load_cpus,
    "connections": args.connections,
    "load_threads": args.load_threads,
    "caveat": "Loopback throughput depends on the recorded server/load CPU assignments.",
    "machine": subprocess.check_output(["lscpu"], text=True),
    "node": subprocess.check_output(["node", "--version"], text=True).strip(),
    "start_load": Path("/proc/loadavg").read_text().strip(),
    "sha256": {
        p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
        for p in artifacts
        if Path(p).exists()
    },
    "wire_contract": [],
    "verification": [],
    "startups": [],
    "samples": [],
}


def save():
    Path(args.output).write_text(json.dumps(result, indent=2) + "\n")


save()
for round_no in range(1, args.rounds + 1):
    cases = [(name, workers) for name in args.servers for workers in args.workers]
    if round_no % 2 == 0:
        cases.reverse()
    for name, workers in cases:
        # Ports are fixed in each server's source.
        port = 3900 if name.startswith("hono-") else 3101
        if not port_free(port):
            raise RuntimeError(f"Port {port} occupied before {name}")
        cmd, env = command(name, workers)
        started = None if args.verify_only else time.monotonic()
        proc = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            start_new_session=True,
        )
        try:
            expected = (
                "Hello Hono!" if name.startswith("hono-") else "Hello, World! GET /"
            )
            for attempt in range(1000):
                if proc.poll() is not None:
                    raise RuntimeError(f"{name} exited: {proc.stdout.read()}")
                try:
                    status, content_type, body = request(port, "/")
                    if (
                        status != 200
                        or body != expected
                        or not content_type.startswith("text/plain")
                    ):
                        raise RuntimeError(
                            f"{name} wrong root: {status} {content_type} {body}"
                        )
                    startup_ms = None if args.verify_only else (time.monotonic() - started) * 1000
                    break
                except (OSError, http.client.HTTPException):
                    time.sleep(0.005)
            else:
                raise RuntimeError(f"{name} not ready")
            if not args.verify_only:
                result["startups"].append(
                    {
                        "round": round_no,
                        "server": name,
                        "workers": workers,
                        "milliseconds": startup_ms,
                    }
                )
            status, content_type, body = request(port, "/json")
            if (
                status != 200
                or body != '{"hello":"world"}'
                or not content_type.startswith("application/json")
            ):
                raise RuntimeError(f"{name} wrong JSON: {status} {content_type} {body}")
            if name.startswith("hono-") and request(port, "/missing")[0] != 404:
                raise RuntimeError(f"{name} wrong missing-route status")
            if not name.startswith("hono-"):
                for path in ("/", "/json"):
                    contract = validate_raw_wire(port, path)
                    contract.update({"server": name, "workers": workers})
                    result["wire_contract"].append(contract)
                save()
            if args.verify_only:
                result["verification"].append({"server": name, "workers": workers})
                save()
                print(f"PASS {name} workers={workers}: HTTP responses verified", flush=True)
                continue
            if args.startup_only:
                save()
                continue
            # Let all cluster/fork workers finish startup before warming up.
            time.sleep(1)
            before = process_memory(proc.pid)
            expected_processes = workers + (
                1 if name in ("hono-node", "node-raw") else 0
            )
            if workers > 1 and name in (
                "hono-gea",
                "gea-raw",
                "hono-node",
                "node-raw",
                "cpp-epoll",
            ):
                if len(before["processes"]) != expected_processes:
                    raise RuntimeError(
                        f"{name}: expected {expected_processes} processes, got {before}"
                    )
            wrk(port, "/", "2s", warmup=True)
            for path in (["/", "/json"] if round_no % 2 else ["/json", "/"]):
                sample = {
                    "round": round_no,
                    "server": name,
                    "workers": workers,
                    "path": path,
                    "memory_before": process_memory(proc.pid),
                    "load_before": Path("/proc/loadavg").read_text().strip(),
                }
                sample.update(wrk(port, path, args.duration))
                sample["memory_after"] = process_memory(proc.pid)
                sample["load_after"] = Path("/proc/loadavg").read_text().strip()
                result["samples"].append(sample)
                save()
                print(
                    f"round={round_no} {name:12} workers={workers} path={path:5} "
                    f"rps={sample['rps']:10.2f} rss_kib={sample['memory_after']['rss_kib']}",
                    flush=True,
                )
        except Exception as error:
            result["error"] = str(error)
            save()
            raise
        finally:
            stop(proc, port)
            proc.stdout.close()
        time.sleep(0.5)
result["complete"] = True
if compiler_inputs is not None:
    try:
        subprocess.run(
            ["node", "bench/compiler-input.mjs", "--check", str(compiler_manifest)],
            check=True,
        )
    except Exception as error:
        result["complete"] = False
        result["error"] = str(error)
        save()
        raise
save()
