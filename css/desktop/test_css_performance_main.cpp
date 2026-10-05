#include "../shared/native-runtime.h"
#include "native_test_harness.h"
#include "display.h"
#include <chrono>
#include <cstdlib>
extern void __gea_top_level();

namespace {
void desktopTouch(int phase, int x, int y) {
  using gea::framework::events::TouchPhase;
  gea::embedded::test::dispatchTouch(phase == 0   ? TouchPhase::Down
                                     : phase == 1 ? TouchPhase::Move
                                                  : TouchPhase::Up,
                                     phase != 2, x, y);
}
} // namespace

int main(int argc, char **argv) {
  using namespace gea::embedded::test;
  using Clock = std::chrono::steady_clock;
  css_bench::samples = argc > 1 ? std::atoi(argv[1]) : 240;
  if (css_bench::samples < 32)
    return 2;
  css_bench::touchInput = desktopTouch;
  css_bench::flushedPixels = []() {
    return static_cast<long long>(gea::embedded::test::flushPixelCount());
  };
  css_bench::pixelHash = []() {
    std::uint64_t hash = 14695981039346656037ull;
    for (int y = 0; y < css_bench::H; y++)
      for (int x = 0; x < css_bench::W; x++) {
        hash ^= gea::embedded::test::displayPixelAt(x, y);
        hash *= 1099511628211ull;
      }
    return hash;
  };
  resetNativeHost();
  setNativeDisplaySize(css_bench::W, css_bench::H);
  gea::embedded::ui::Document::setPreferredMountSize(css_bench::W, css_bench::H);
  gea::embedded::ui::setDevicePixelRatio(1.0);
  gea::embedded::ui::setViewportMetrics(css_bench::W, css_bench::H, 1.0);
  gea::platform::display::Display::setAA(2);
  __gea_top_level();
  const auto started = Clock::now();
  for (int frame = 0; !css_bench::finished && frame < 100000; frame++) {
    gea::embedded::ui::refreshPerfStatsReset();
    const auto start = Clock::now();
    pumpFrame(frame * 16);
    const auto done = Clock::now();
    css_bench::sample(std::chrono::duration<double, std::micro>(start - started).count(),
                      std::chrono::duration<double, std::micro>(done - started).count());
  }
  return css_bench::finished && !css_bench::failed ? 0 : 1;
}
