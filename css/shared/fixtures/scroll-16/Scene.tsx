import { Component, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
export class scroll_16 extends Component {
  template() {
    return (
      <div class="scroll-16 fixture">
        <div id="row-0" class="row">
          <span id="label-0" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-1" class="row">
          <span id="label-1" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-2" class="row">
          <span id="label-2" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-3" class="row">
          <span id="label-3" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-4" class="row">
          <span id="label-4" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-5" class="row">
          <span id="label-5" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-6" class="row">
          <span id="label-6" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-7" class="row">
          <span id="label-7" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-8" class="row">
          <span id="label-8" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-9" class="row">
          <span id="label-9" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-10" class="row">
          <span id="label-10" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-11" class="row">
          <span id="label-11" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-12" class="row">
          <span id="label-12" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-13" class="row">
          <span id="label-13" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-14" class="row">
          <span id="label-14" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-15" class="row">
          <span id="label-15" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
      </div>
    );
  }
}
export function start(): void {
  mount(scroll_16);
  let low = 1000000,
    high = 0;

  benchmark.run(
    'scroll-16',
    (frame: number) => {
      const current = benchmark.scrollValue('.scroll-16', false);
      if (frame >= 60) {
        low = Math.min(low, current);
        high = Math.max(high, current);
      }
      const step = frame % 64;
      benchmark.setScrollOffset('.scroll-16', (step <= 32 ? step : 64 - step) * 5);
    },
    () => {
      benchmark.metric('scroll_min', low);
      benchmark.metric('scroll_max', high);
      benchmark.check(high > low, 'scroll moved');
    },
  );
}
