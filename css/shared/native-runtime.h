#pragma once
// Platform adapter and measurement only: scenes, CSS and interactions live in TSX.
#include "benchmark-native.h"
#include "touch.h"
#include "ui/document.h"
#include "ui/internal.h"
#include "ui/node.h"
#include "ui/refresh_perf.h"
#include "ui/tree_internal.h"
#include "ui/tree_state.h"
#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <limits>
#include <utility>
#include <vector>

namespace css_bench {
using namespace gea::embedded::ui;
constexpr int W = 410, H = 502, warmup = 60;
inline int samples = 240;
inline bool verificationOnly = false;

inline void defaultTouch(int phase, int x, int y) {
  using namespace gea::platform::touch;
  Touchscreen::injectEvent(phase == 0   ? Phase::Down
                           : phase == 1 ? Phase::Move
                                        : Phase::Up,
                           phase != 2, x, y);
}

inline void (*touchInput)(int, int, int) = defaultTouch;
inline int pointerX = 205, pointerY = 251;
inline std::string name;
inline bool active = false, failed = false, finished = false;
inline int frames = 0, measured = 0, completed = 0, overBudget = 0;
inline double previousDone = 0, sumCadence = 0, sumWork = 0;
inline unsigned minimumInternal = std::numeric_limits<unsigned>::max(),
                minimumPsram = std::numeric_limits<unsigned>::max();
inline std::vector<std::pair<std::string, bool>> checks;
inline std::vector<std::pair<std::string, double>> observations;
inline std::vector<double> workTimes, cadenceTimes;
inline std::uint64_t (*pixelHash)() = nullptr;
inline long long layoutCalls = 0, fullRecords = 0, recordedCommands = 0, scrollFast = 0,
                 flushPixels = 0, previousFlushed = 0;
inline long long (*flushedPixels)() = nullptr;

inline std::string jsonString(const std::string &value) {
  std::string out = "\"";
  for (unsigned char c : value) {
    if (c == '"' || c == '\\') {
      out += '\\';
      out += c;
    } else if (c < 32) {
      char escaped[7];
      std::snprintf(escaped, sizeof(escaped), "\\u%04x", c);
      out += escaped;
    } else
      out += c;
  }
  return out + '"';
}

inline std::uint64_t geometryHash() {
  std::uint64_t hash = 14695981039346656037ull;
  for (int i = 0; i < treeState().nodeCount; i++)
    for (int v : {int(Tree::instance().node(i).layout.x), int(Tree::instance().node(i).layout.y),
                  int(Tree::instance().node(i).layout.width),
                  int(Tree::instance().node(i).layout.height)}) {
      hash ^= static_cast<std::uint32_t>(v);
      hash *= 1099511628211ull;
    }
  return hash;
}

inline NodeHandle find(const std::string &selector) {
  auto node = Document::instance().querySelector(selector);
  if (!node.valid()) {
    failed = true;
    std::printf("CSS_BENCH ERROR missing selector=%s\n", selector.c_str());
  }
  return node;
}

inline void advanceVerificationFrame() {
  if (!active || frames >= warmup + samples)
    return;
  if (frames >= warmup)
    measured++;
  frames++;
}

inline void sample(double start, double done, unsigned internal = 1, unsigned psram = 1) {
  if (!active || frames >= warmup + samples)
    return;
  if (frames >= warmup) {
    const auto work = done - start;
    workTimes[measured] = work;
    cadenceTimes[measured] = done - previousDone;
    sumWork += work;
    sumCadence += done - previousDone;
    overBudget += work > 16667;
    measured++;
    minimumInternal = std::min(minimumInternal, internal);
    minimumPsram = std::min(minimumPsram, psram);
  }
  const auto stats = refreshPerfStatsRead();
  const auto flushed = flushedPixels ? flushedPixels() : 0;
  if (frames >= warmup) {
    layoutCalls += stats.treeLayoutNodeCalls;
    fullRecords += stats.treeFullRecords;
    recordedCommands += stats.treeRecordedCommands;
    scrollFast += stats.rootScrollAccepted;
    flushPixels += flushed - previousFlushed;
  }
  previousFlushed = flushed;
  frames++;
  previousDone = done;
}
} // namespace css_bench

void __css_bench_begin(const std::string &name) {
  using namespace css_bench;
  layoutCalls = fullRecords = recordedCommands = scrollFast = flushPixels = 0;
  previousFlushed = flushedPixels ? flushedPixels() : 0;
  if (!verificationOnly) {
    workTimes.assign(samples, 0);
    cadenceTimes.assign(samples, 0);
  }
  css_bench::name = name;
  active = true;
  frames = measured = overBudget = 0;
  previousDone = sumCadence = sumWork = 0;
  checks.clear();
  observations.clear();
  minimumInternal = minimumPsram = std::numeric_limits<unsigned>::max();
  std::printf("CSS_BENCH BEGIN name=%s warmup=%d samples=%d\n", name.c_str(), warmup, samples);
}

void __css_bench_check(bool condition, const std::string &message) {
  css_bench::checks.emplace_back(message, condition);
  if (!condition)
    css_bench::failed = true;
}

void __css_bench_metric(const std::string &name, double value) {
  css_bench::observations.emplace_back(name, value);
}

void __css_bench_end() {
  using namespace css_bench;
  bool ok = measured == samples && !checks.empty();
  for (const auto &check : checks)
    ok &= check.second;
  failed |= !ok;
  if (!verificationOnly) {
    std::sort(workTimes.begin(), workTimes.begin() + measured);
    std::sort(cadenceTimes.begin(), cadenceTimes.begin() + measured);
  }
  if (measured != samples) {
    std::printf("CSS_BENCH ERROR incomplete samples=%d\n", measured);
    active = false;
    return;
  }
  if (verificationOnly) {
    std::printf(
        "CSS_BENCH RESULT "
        "{\"mode\":\"verification\",\"name\":%s,\"ok\":%s,\"samples\":%d,\"warmup\":%d,"
        "\"node_bytes\":%zu,\"geometry_hash\":\"%llu\",\"pixel_hash\":\"%llu\",\"checks\":{",
        jsonString(name).c_str(), ok ? "true" : "false", samples, warmup, sizeof(Node),
        (unsigned long long)geometryHash(), (unsigned long long)(pixelHash ? pixelHash() : 0));
  } else {
    std::printf(
        "CSS_BENCH RESULT "
        "{\"name\":%s,\"ok\":%s,\"samples\":%d,\"warmup\":%d,\"work_p50_us\":%.3f,\"work_p95_"
        "us\":%.3f,\"work_p99_us\":%.3f,\"work_max_us\":%.3f,\"mean_us\":%.3f,\"cadence_p50_"
        "us\":%.3f,\"cadence_p95_us\":%.3f,\"fps\":%.3f,\"over_16ms\":%d,\"internal_min_"
        "bytes\":%u,\"psram_min_bytes\":%u,\"node_bytes\":%zu,\"geometry_hash\":\"%llu\","
        "\"pixel_hash\":\"%llu\",\"layout_calls\":%lld,\"full_records\":%lld,\"recorded_"
        "commands\":%lld,\"scroll_fast\":%lld,\"flush_pixels\":%lld,\"checks\":{",
        jsonString(name).c_str(), ok ? "true" : "false", samples, warmup, workTimes[samples / 2],
        workTimes[samples * 95 / 100], workTimes[samples * 99 / 100], workTimes[samples - 1],
        double(sumWork) / samples, cadenceTimes[samples / 2], cadenceTimes[samples * 95 / 100],
        samples * 1000000.0 / sumCadence, overBudget, minimumInternal, minimumPsram, sizeof(Node),
        (unsigned long long)geometryHash(), (unsigned long long)(pixelHash ? pixelHash() : 0),
        layoutCalls, fullRecords, recordedCommands, scrollFast, flushPixels);
  }
  bool comma = false;
  for (const auto &[key, value] : checks) {
    std::printf("%s%s:%s", comma ? "," : "", jsonString(key).c_str(), value ? "true" : "false");
    comma = true;
  }
  std::printf("},\"observations\":{");
  comma = false;
  for (const auto &[key, value] : observations) {
    std::printf("%s%s:%.6f", comma ? "," : "", jsonString(key).c_str(), value);
    comma = true;
  }
  std::printf("}}\n");
  active = false;
  completed++;
}

void __css_bench_clear() {
  using namespace css_bench;
  touchInput(2, pointerX, pointerY);
  Document::instance().clear();
  Document::instance().ensureAppRoot();
}

void __css_bench_finish() {
  css_bench::finished = true;
  std::printf("CSS_BENCH DONE cases=%d ok=%s\n", css_bench::completed,
              css_bench::failed ? "false" : "true");
}

void __css_bench_touch(double phase, double x, double y) {
  css_bench::pointerX = int(x);
  css_bench::pointerY = int(y);
  css_bench::touchInput(int(phase), int(x), int(y));
}

void __css_bench_scroll(const std::string &selector, double value) {
  auto node = css_bench::find(selector);
  if (node.valid())
    gea::embedded::ui::Tree::instance().setScrollTop(node.id(), int(value));
}

double __css_bench_scroll_value(const std::string &selector, bool horizontal) {
  auto node = css_bench::find(selector);
  if (!node.valid())
    return 0;
  auto &tree = gea::embedded::ui::Tree::instance();
  return horizontal ? tree.scrollLeft(node.id()) : tree.scrollTop(node.id());
}

double __css_bench_width(const std::string &selector) {
  auto node = css_bench::find(selector);
  return node.valid() ? gea::embedded::ui::Tree::instance().node(node.id()).layout.width : 0;
}

bool __css_bench_has_class(const std::string &selector, const std::string &value) {
  auto node = css_bench::find(selector);
  return node.valid() && node.classList().contains(value);
}

bool __css_bench_has_text(const std::string &selector, const std::string &value) {
  auto node = css_bench::find(selector);
  if (!node.valid())
    return false;
  std::string text;
  auto visit = [&](auto &&self, int id) -> void {
    auto &tree = gea::embedded::ui::Tree::instance();
    const auto &entry = tree.node(id);
    text += entry.text.c_str();
    for (int child = entry.first_child; child >= 0; child = tree.node(child).next_sibling)
      self(self, child);
  };
  visit(visit, node.id());
  return text == value;
}

double __css_bench_samples() {
  return css_bench::samples;
}
