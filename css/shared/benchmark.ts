declare function __css_bench_samples(): number;
declare function __css_bench_clear(): void;
declare function __css_bench_finish(): void;
declare function __css_bench_has_class(selector: string, value: string): boolean;
declare function __css_bench_has_text(selector: string, value: string): boolean;
declare function __css_bench_metric(name: string, value: number): void;
// Typed native benchmark ABI. Implementations are supplied by the platform runner.
declare function __css_bench_begin(name: string): void;
declare function __css_bench_end(): void;
declare function __css_bench_check(condition: boolean, message: string): void;
declare function __css_bench_touch(phase: number, x: number, y: number): void;
declare function __css_bench_scroll(selector: string, value: number): void;
declare function __css_bench_scroll_value(selector: string, horizontal: boolean): number;
declare function __css_bench_width(selector: string): number;

let completion: () => void = () => {};

export function setCompletionCallback(callback: () => void): void {
  completion = callback;
}

export function run(name: string, update: (frame: number) => void, verify: () => void): void {
  let frame = 0;

  function tick(): void {
    if (frame === 0) __css_bench_begin(name);

    if (frame === 60 + __css_bench_samples()) {
      verify();
      __css_bench_end();
      completion();

      return;
    }

    update(frame);
    frame++;
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export function check(condition: boolean, message: string): void {
  __css_bench_check(condition, message);
}

export function down(x: number, y: number): void {
  __css_bench_touch(0, x, y);
}

export function move(x: number, y: number): void {
  __css_bench_touch(1, x, y);
}

export function up(x: number, y: number): void {
  __css_bench_touch(2, x, y);
}

export function scrollValue(selector: string, horizontal: boolean = false): number {
  return __css_bench_scroll_value(selector, horizontal);
}

export function width(selector: string): number {
  return __css_bench_width(selector);
}

export function clear(): void {
  __css_bench_clear();
}

export function finish(): void {
  __css_bench_finish();
}

export function metric(name: string, value: number): void {
  __css_bench_metric(name, value);
}

export function setScrollOffset(selector: string, value: number): void {
  __css_bench_scroll(selector, value);
}

export function hasClass(selector: string, value: string): boolean {
  return __css_bench_has_class(selector, value);
}

export function hasText(selector: string, value: string): boolean {
  return __css_bench_has_text(selector, value);
}
