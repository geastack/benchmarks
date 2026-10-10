#include <charconv>
#include <string>
#include "par.hpp"

// Parity with fixtures/strings.ts: each task builds its line by appending the
// pieces in order to one fresh, unsized string (integers formatted by the
// standard library), splits it on ',' into a container of owned strings, and
// hashes each part. idiomatic/strings.cpp keeps `operator+` temporaries and a
// `substr` per part without the container.
static uint32_t fnv(const std::string &text) {
  uint32_t hash = 2166136261u;
  for (unsigned char c : text) {
    hash ^= c;
    hash *= 16777619u;
  }
  return hash;
}

static void appendDecimal(std::string &out, uint64_t value) {
  char digits[24];
  auto end = std::to_chars(digits, digits + sizeof(digits), value).ptr;
  out.append(digits, size_t(end - digits));
}

static std::vector<std::string> split(const std::string &text, char separator) {
  std::vector<std::string> parts;
  size_t start = 0;
  for (;;) {
    size_t at = text.find(separator, start);
    if (at == std::string::npos) {
      parts.push_back(text.substr(start));
      return parts;
    }
    parts.push_back(text.substr(start, at - start));
    start = at + 1;
  }
}

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double n) -> long long {
    return par::sum<long long>(size_t(n), [](size_t i) -> long long {
      std::string line;
      line += "item-";
      appendDecimal(line, i);
      line += ',';
      appendDecimal(line, i * 7919 % 10007);
      line += ',';
      line += i % 13 == 0 ? "thirteen" : "other";
      long long total = 0;
      for (const std::string &part : split(line, ','))
        total += fnv(part) % 1000;
      return total;
    });
  });
}
