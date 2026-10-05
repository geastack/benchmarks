"""Compare scriptc's bundled LLVM helper at O2/O3, same shipped runtime/link recipe."""

import argparse, hashlib, json, os, re, subprocess, time
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("--package-root", required=True)
p.add_argument("--baseline", required=True)
p.add_argument("--output", required=True)
p.add_argument("--only")
a = p.parse_args()
root = Path(a.package_root).resolve()
baseline = json.loads(Path(a.baseline).read_text())
work = Path(__file__).resolve().parent.parent / "dist"
scriptc = root / "node_modules/.bin/scriptc"
helper = (
    root
    / "node_modules/@scriptc/cli-linux-x64-gnu/dist/lib/llvm/bin/scriptc-llvm-codegen"
)
hashfile = lambda x: hashlib.sha256(Path(x).read_bytes()).hexdigest()


def command(args):
    r = subprocess.run(
        list(map(str, args)), capture_output=True, text=True, timeout=200
    )
    if r.returncode:
        raise RuntimeError(r.stderr or r.stdout)
    return r.stdout


result = {
    "utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "compiler_version": command([scriptc, "--version"]).strip(),
    "helper_version": command([helper, "version", "--format=json"]),
    "helper_sha256": hashfile(helper),
    "runtime": "unchanged shipped release runtime",
    "samples": 5,
    "cpu": 0,
    "rows": [],
}


def save():
    Path(a.output).write_text(json.dumps(result, indent=2) + "\n")


def run(exe, iters):
    t = time.monotonic()
    r = subprocess.run(
        [
            "/usr/bin/time",
            "-v",
            "timeout",
            "--kill-after=5s",
            "180s",
            "taskset",
            "-c",
            "0",
            str(exe),
            str(iters),
        ],
        capture_output=True,
        text=True,
        timeout=200,
    )
    inner = re.search(r"^__bench_ms__\s+([\d.eE+-]+)", r.stdout, re.M)
    rss = re.search(r"Maximum resident set size \(kbytes\):\s*(\d+)", r.stderr)
    return {
        "status": r.returncode,
        "wallMs": (time.monotonic() - t) * 1000,
        "innerMs": float(inner[1]) if inner else None,
        "rssBytes": int(rss[1]) * 1024 if rss else None,
        "output": "\n".join(
            x for x in r.stdout.splitlines() if not x.startswith("__bench_")
        ).strip(),
        "stderr": r.stderr if r.returncode else None,
    }


for row in baseline["rows"]:
    fx = row["fx"]
    if a.only and fx not in a.only.split(","):
        continue
    stem = work / ("compute-" + fx + "-scriptc")
    entry = stem.with_suffix(".ts")
    ll = stem.with_suffix(".ll")
    obj = work / ("compute-" + fx + "-scriptc-helper.o")
    info = json.loads(
        command(
            [
                scriptc,
                "build",
                entry,
                "--emit",
                "obj",
                "-o",
                obj,
                "--print",
                "native-link-info",
            ]
        )
    )
    command([scriptc, "build", entry, "--emit", "llvm", "-o", ll])
    out = {
        "fx": fx,
        "iters": row["iters"],
        "llvmSha256": hashfile(ll),
        "linkInfo": info,
        "variants": {},
    }
    result["rows"].append(out)
    save()
    try:
        for level in (2, 3):
            dest = work / ("compute-" + fx + "-scriptc-o" + str(level))
            ob = dest.with_suffix(".o")
            args = [
                helper,
                "emit",
                "--input",
                ll,
                "--output",
                ob,
                "--filetype",
                "obj",
                "--target",
                info["target"]["llvm_triple"],
                "--opt-level",
                str(level),
                "--relocation-model",
                "pic",
                "--diagnostic-format",
                "json",
            ]
            command(args)
            inputs = [
                str(ob) if x == info["program"]["object"] else x
                for x in info["link"]["input_order"]
            ]
            link = [
                "clang",
                *inputs,
                *info["link"]["driver_flags"],
                *["-l" + x for x in info["link"]["system_libraries"]],
                "-s",
                "-o",
                dest,
            ]
            command(link)
            out["variants"][str(level)] = {
                "binary": str(dest),
                "sha256": hashfile(dest),
                "bytes": dest.stat().st_size,
                "commands": [list(map(str, args)), list(map(str, link))],
                "runs": [],
            }
        # Prime sieve previously timed out: test O3 first; no redundant O2 timeout.
        levels = (3,) if fx == "prime_sieve" else (2, 3)
        for i in range(5):
            for level in levels if i % 2 == 0 else levels[::-1]:
                v = out["variants"][str(level)]
                if v["runs"] and v["runs"][-1]["status"] != 0:
                    continue
                v["runs"].append(run(v["binary"], row["iters"]))
                save()
        oracle = row["runtimes"]["node"]["runs"][0]["output"]
        for v in out["variants"].values():
            v["match"] = bool(v["runs"]) and all(
                x["status"] == 0 and x["output"] == oracle and x["innerMs"] is not None
                for x in v["runs"]
            )
            v["bestMs"] = min(x["innerMs"] for x in v["runs"]) if v["match"] else None
        print(
            fx,
            {
                k: round(v["bestMs"], 3) if v["match"] else "timeout/not run"
                for k, v in out["variants"].items()
            },
            flush=True,
        )
    except Exception as e:
        out["error"] = str(e)
        print(fx, "ERROR", str(e)[:250], flush=True)
    save()
result["complete"] = True
save()
