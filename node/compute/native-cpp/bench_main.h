// Shared timing harness for hand-written native C++ benchmark fixtures.
// Matches the geatsc-emitted main: measure startup (process kernel-start ->
// main entry) the same way geatsc does, time bench_run(iterations) with
// steady_clock, then under GEATSC_BENCH_TIMING print "__bench_startup__ %.6f"
// and "__bench_ms__ %.6f", then the result.
#pragma once
#include <cstdio>
#include <cstdlib>
#include <chrono>

#if defined(__APPLE__)
#include <sys/sysctl.h>
#include <sys/time.h>
#include <unistd.h>
#endif

// Process spawn -> here (main entry), in ms. Mirrors geatsc's
// __gea_bench_startup_ms so native startup is a real, comparable measurement
// instead of the coarse `/usr/bin/time -l` wall-minus-workload fallback (whose
// `real` field has only 0.01 s resolution and floors fast native runs to 0).
static double __bench_startup_ms() {
#if defined(__APPLE__)
  struct kinfo_proc kp;
  size_t kp_len = sizeof(kp);
  int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_PID, (int)getpid()};
  if (sysctl(mib, 4, &kp, &kp_len, nullptr, 0) != 0)
    return -1.0;
  struct timeval now;
  gettimeofday(&now, nullptr);
  double start_ms = (double)kp.kp_proc.p_starttime.tv_sec * 1000.0 +
                    (double)kp.kp_proc.p_starttime.tv_usec / 1000.0;
  double now_ms = (double)now.tv_sec * 1000.0 + (double)now.tv_usec / 1000.0;
  return now_ms - start_ms;
#else
  return -1.0;
#endif
}

long long bench_run(long long iterations);

int main(int argc, char **argv) {
  const char *timing = std::getenv("GEATSC_BENCH_TIMING");
  long long iterations = argc > 1 ? atoll(argv[1]) : 0;
  if (!timing || timing[0] == '0' || timing[0] == '\0') {
    std::printf("%lld\n", bench_run(iterations));
    return 0;
  }
  double startup_ms = __bench_startup_ms();
  auto t0 = std::chrono::steady_clock::now();
  long long result = bench_run(iterations);
  auto t1 = std::chrono::steady_clock::now();
  if (timing && timing[0] != '0' && timing[0] != '\0') {
    double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();
    if (startup_ms >= 0.0)
      std::printf("__bench_startup__ %.6f\n", startup_ms);
    std::printf("__bench_ms__ %.6f\n", ms);
  }
  std::printf("%lld\n", result);
  return 0;
}
