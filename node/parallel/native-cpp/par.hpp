// The hand-written C++ baseline's parallelism: a persistent std::thread pool
// that hands out chunks of an index range through one atomic counter, the
// shape most hand-rolled C++ parallel loops take. `PAR_THREADS` sets the
// thread count (default: every hardware thread), so the same binary measures
// the one-thread and all-thread columns.
#pragma once
#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <functional>
#include <mutex>
#include <thread>
#include <vector>

namespace par {

class Pool {
public:
  Pool() {
    const char *env = std::getenv("PAR_THREADS");
    long requested = env && *env ? std::atol(env) : long(std::thread::hardware_concurrency());
    size_ = requested < 1 ? 1 : size_t(requested);
    for (size_t i = 1; i < size_; i++)
      workers_.emplace_back([this] { loop(); });
  }

  ~Pool() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      stop_ = true;
      generation_++;
    }
    wake_.notify_all();
    for (auto &worker : workers_)
      worker.join();
  }

  size_t size() const {
    return size_;
  }

  /** Calls `body(chunk)` for every chunk in [0, chunks) on every thread; returns when all are done.
   */
  void run(size_t chunks, const std::function<void(size_t)> &body) {
    if (size_ == 1 || chunks <= 1) {
      for (size_t chunk = 0; chunk < chunks; chunk++)
        body(chunk);
      return;
    }
    {
      std::lock_guard<std::mutex> lock(mutex_);
      body_ = &body;
      chunks_ = chunks;
      next_.store(0, std::memory_order_relaxed);
      pending_ = workers_.size();
      generation_++;
    }
    wake_.notify_all();
    work();
    std::unique_lock<std::mutex> lock(mutex_);
    done_.wait(lock, [this] { return pending_ == 0; });
  }

private:
  void work() {
    for (size_t chunk; (chunk = next_.fetch_add(1, std::memory_order_relaxed)) < chunks_;)
      (*body_)(chunk);
  }

  void loop() {
    size_t seen = 0;
    for (;;) {
      {
        std::unique_lock<std::mutex> lock(mutex_);
        wake_.wait(lock, [&] { return generation_ != seen; });
        seen = generation_;
        if (stop_)
          return;
      }
      work();
      std::lock_guard<std::mutex> lock(mutex_);
      if (--pending_ == 0)
        done_.notify_one();
    }
  }

  size_t size_ = 1;
  std::vector<std::thread> workers_;
  std::mutex mutex_;
  std::condition_variable wake_;
  std::condition_variable done_;
  const std::function<void(size_t)> *body_ = nullptr;
  size_t chunks_ = 0;
  std::atomic<size_t> next_{0};
  size_t pending_ = 0;
  size_t generation_ = 0;
  bool stop_ = false;
};

inline Pool &pool() {
  static Pool instance;
  return instance;
}

/** Chunks for `count` items: several per thread, so uneven items still balance. */
inline size_t chunksFor(size_t count) {
  return std::min(count, pool().size() * 16);
}

/** `out[i] = f(i)` for every i in [0, count). */
template <class T, class F> std::vector<T> map(size_t count, F f) {
  std::vector<T> out(count);
  size_t chunks = chunksFor(count);
  pool().run(chunks, [&](size_t chunk) {
    size_t end = (chunk + 1) * count / chunks;
    for (size_t i = chunk * count / chunks; i < end; i++)
      out[i] = f(i);
  });
  return out;
}

/** The sum of f(i) over [0, count), partial sums combined in chunk order. */
template <class T, class F> T sum(size_t count, F f) {
  size_t chunks = chunksFor(count);
  std::vector<T> partial(chunks, T(0));
  pool().run(chunks, [&](size_t chunk) {
    T local = 0;
    size_t end = (chunk + 1) * count / chunks;
    for (size_t i = chunk * count / chunks; i < end; i++)
      local += f(i);
    partial[chunk] = local;
  });
  T total = 0;
  for (T value : partial)
    total += value;
  return total;
}

/** Times `body(n)` with n from argv[1]; prints what the harness reads. */
template <class F> int bench(int argc, char **argv, F body) {
  double n = argc > 1 ? std::strtod(argv[1], nullptr) : 0;
  pool();
  if (std::getenv("GEA_BENCH_VERIFY_ONLY")) {
    std::printf("%lld\n", static_cast<long long>(body(n)));
    return 0;
  }
  auto start = std::chrono::steady_clock::now();
  long long result = body(n);
  double ms =
      std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
  std::printf("__bench_ms__ %.6f\n%lld\n", ms, result);
  return 0;
}

} // namespace par
