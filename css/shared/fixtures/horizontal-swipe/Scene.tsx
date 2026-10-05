import { Component, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class horizontal_swipe extends Component {
  template() {
    return (
      <div class="horizontal-swipe fixture">
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
        <div id="row-16" class="row">
          <span id="label-16" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-17" class="row">
          <span id="label-17" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-18" class="row">
          <span id="label-18" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-19" class="row">
          <span id="label-19" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-20" class="row">
          <span id="label-20" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-21" class="row">
          <span id="label-21" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-22" class="row">
          <span id="label-22" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-23" class="row">
          <span id="label-23" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-24" class="row">
          <span id="label-24" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-25" class="row">
          <span id="label-25" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-26" class="row">
          <span id="label-26" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-27" class="row">
          <span id="label-27" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-28" class="row">
          <span id="label-28" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-29" class="row">
          <span id="label-29" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-30" class="row">
          <span id="label-30" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-31" class="row">
          <span id="label-31" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
      </div>
    );
  }
}
export function start(): void {
  mount(horizontal_swipe);
  let low = 1000000,
    high = 0;

  benchmark.run(
    'horizontal-swipe',
    (frame: number) => {
      const current = benchmark.scrollValue('.horizontal-swipe', true);
      if (frame >= 60) {
        low = Math.min(low, current);
        high = Math.max(high, current);
      }
      const step = frame % 64,
        forward = Math.floor(frame / 64) % 2 === 0;
      const x0 = forward ? 360 : 50,
        x1 = forward ? 50 : 360;
      if (step === 0) benchmark.down(x0, 251);
      else if (step <= 12) benchmark.move(x0 + ((x1 - x0) * step) / 12, 251);
      else if (step === 13) benchmark.up(x1, 251);
    },
    () => {
      benchmark.metric('scroll_min', low);
      benchmark.metric('scroll_max', high);
      benchmark.check(high > low, 'scroll moved');
    },
  );
}
