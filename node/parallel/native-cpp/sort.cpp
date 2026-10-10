#include "par.hpp"

// Parity with fixtures/sort.ts: a port of @geastack/parallel's `sorted`, the
// fixed-shape sample sort the TypeScript runs. The input is cut into 256
// leaves, each a copy sorted with the standard stable sort. Eight samples from
// every sorted leaf, sorted, choose 255 splitters; each leaf finds its cut
// point for every splitter by binary search (forced non-decreasing). Output
// piece p gathers its range from every leaf, in leaf order, and stable-sorts
// it; the pieces are concatenated into a result sized once. Every step that is
// a task there is a pool task here, and the comparator is the TypeScript's
// `(a, b) => a - b`. idiomatic/sort.cpp keeps stable-sorted runs and pairwise
// merges.
namespace {

constexpr size_t sortLeaves = 256;
constexpr size_t sortSamples = 8;

size_t boundary(size_t leaf, size_t leaves, size_t length) {
  return leaf * length / leaves;
}

template <class T, class Compare>
size_t upperBound(const std::vector<T> &run, const T &value, Compare compare) {
  size_t low = 0, high = run.size();
  while (low < high) {
    size_t middle = (low + high) / 2;
    if (compare(run[middle], value) > 0)
      high = middle;
    else
      low = middle + 1;
  }
  return low;
}

template <class T, class Compare>
std::vector<T> sorted(const std::vector<T> &items, Compare compare) {
  size_t length = items.size();
  if (length == 0)
    return {};
  auto before = [&](const T &left, const T &right) { return compare(left, right) < 0; };

  std::vector<std::vector<T>> leaves(sortLeaves);
  par::pool().run(sortLeaves, [&](size_t leaf) {
    std::vector<T> out(items.begin() + boundary(leaf, sortLeaves, length),
                       items.begin() + boundary(leaf + 1, sortLeaves, length));
    std::stable_sort(out.begin(), out.end(), before);
    leaves[leaf] = std::move(out);
  });

  std::vector<T> pool;
  for (const std::vector<T> &run : leaves)
    for (size_t sample = 1; sample <= sortSamples; sample++) {
      size_t at = sample * run.size() / (sortSamples + 1);
      if (at < run.size())
        pool.push_back(run[at]);
    }
  std::stable_sort(pool.begin(), pool.end(), before);
  std::vector<T> splitters;
  for (size_t piece = 1; piece < sortLeaves; piece++)
    splitters.push_back(pool[piece * pool.size() / sortLeaves]);

  std::vector<std::vector<size_t>> cuts(sortLeaves);
  par::pool().run(sortLeaves, [&](size_t leaf) {
    const std::vector<T> &run = leaves[leaf];
    std::vector<size_t> at{0};
    size_t previous = 0;
    for (const T &splitter : splitters) {
      size_t cut = upperBound(run, splitter, compare);
      previous = cut > previous ? cut : previous;
      at.push_back(previous);
    }
    at.push_back(run.size());
    cuts[leaf] = std::move(at);
  });

  std::vector<std::vector<T>> pieces(sortLeaves);
  par::pool().run(sortLeaves, [&](size_t piece) {
    std::vector<T> out;
    for (size_t leaf = 0; leaf < sortLeaves; leaf++) {
      const std::vector<T> &run = leaves[leaf];
      const std::vector<size_t> &bounds = cuts[leaf];
      for (size_t index = bounds[piece]; index < bounds[piece + 1]; index++)
        out.push_back(run[index]);
    }
    std::stable_sort(out.begin(), out.end(), before);
    pieces[piece] = std::move(out);
  });

  size_t total = 0;
  for (const std::vector<T> &piece : pieces)
    total += piece.size();
  std::vector<T> result;
  result.reserve(total);
  for (const std::vector<T> &piece : pieces)
    result.insert(result.end(), piece.begin(), piece.end());
  return result;
}

} // namespace

int main(int argc, char **argv) {
  return par::bench(argc, argv, [](double size) -> long long {
    size_t n = size_t(size);
    std::vector<int64_t> items;
    int64_t seed = 42;
    for (size_t i = 0; i < n; i++) {
      seed = seed * 16807 % 2147483647;
      items.push_back(seed);
    }
    std::vector<int64_t> result = sorted(items, [](int64_t a, int64_t b) { return a - b; });
    long long checksum = 0;
    for (int64_t value : result)
      checksum = (checksum * 31 + value) % 1000000007;
    return checksum;
  });
}
