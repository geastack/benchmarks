// Platform timing and touch adapter. TSX fixtures own every scene and interaction.
#include "../../../shared/native-runtime.h"
#include "display.h"
#include "esp_heap_caps.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
static_assert(gea::platform::display::kWidth == css_bench::W &&
              gea::platform::display::kHeight == css_bench::H);

extern "C" void gea_frame_benchmark_sample(std::int64_t start, std::int64_t done) {
  css_bench::sample(start, done, heap_caps_get_free_size(MALLOC_CAP_INTERNAL),
                    heap_caps_get_free_size(MALLOC_CAP_SPIRAM));
  if (!css_bench::finished)
    // Two ticks guarantee a full tick for IDLE0 even near a tick boundary.
    vTaskDelay(2);
}
