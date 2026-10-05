import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
export class flex_layout_16State extends Store {
  narrow = false;
}
export const state = new flex_layout_16State();
export class flex_layout_16 extends Component {
  template() {
    return (
      <div class={state.narrow ? 'flex-layout-16 fixture narrow' : 'flex-layout-16 fixture'}>
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
  state.narrow = false;
  mount(flex_layout_16);
  let resized = false;

  benchmark.run(
    'flex-layout-16',
    (frame: number) => {
      state.narrow = frame % 2 === 1;
      if (frame >= 60 && benchmark.width('.flex-layout-16') === 402) resized = true;
    },
    () => {
      benchmark.check(resized, 'layout changed');
    },
  );
}
