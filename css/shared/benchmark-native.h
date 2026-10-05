#pragma once
#include <string>
void __css_bench_begin(const std::string &name);
void __css_bench_end();
void __css_bench_check(bool condition, const std::string &message);
void __css_bench_touch(double phase, double x, double y);
void __css_bench_scroll(const std::string &selector, double value);
double __css_bench_scroll_value(const std::string &selector, bool horizontal);
double __css_bench_width(const std::string &selector);

void __css_bench_clear();
void __css_bench_finish();
bool __css_bench_has_class(const std::string &, const std::string &);
bool __css_bench_has_text(const std::string &, const std::string &);
void __css_bench_metric(const std::string &, double);

double __css_bench_samples();
