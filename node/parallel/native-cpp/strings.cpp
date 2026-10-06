#include <string>
#include "par.hpp"

static uint32_t fnv(const std::string &text) {
  uint32_t hash = 2166136261u;
  for (unsigned char c : text) {
    hash ^= c;
    hash *= 16777619u;
  }
  return hash;
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double n) -> long long {
    return par::sum<long long>(size_t(n), [](size_t i) -> long long {
      std::string line = "item-" + std::to_string(i) + "," + std::to_string(i * 7919 % 10007) + "," +
                         (i % 13 == 0 ? "thirteen" : "other");
      long long total = 0;
      size_t start = 0;
      for (;;) {
        size_t comma = line.find(',', start);
        total += fnv(line.substr(start, comma == std::string::npos ? std::string::npos : comma - start)) % 1000;
        if (comma == std::string::npos)
          break;
        start = comma + 1;
      }
      return total;
    });
  });
}
