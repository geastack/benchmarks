import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import './style.css';
export class minimal_text_12State extends Store {
  label = 'row 000';
}
export const state = new minimal_text_12State();
export class minimal_text_12 extends Component {
  template() {
    return (
      <div class="minimal-text-12">
        <span id="label-0" class="box">
          {state.label}
        </span>
        <span id="label-1" class="box">
          {state.label}
        </span>
        <span id="label-2" class="box">
          {state.label}
        </span>
        <span id="label-3" class="box">
          {state.label}
        </span>
        <span id="label-4" class="box">
          {state.label}
        </span>
        <span id="label-5" class="box">
          {state.label}
        </span>
        <span id="label-6" class="box">
          {state.label}
        </span>
        <span id="label-7" class="box">
          {state.label}
        </span>
        <span id="label-8" class="box">
          {state.label}
        </span>
        <span id="label-9" class="box">
          {state.label}
        </span>
        <span id="label-10" class="box">
          {state.label}
        </span>
        <span id="label-11" class="box">
          {state.label}
        </span>
      </div>
    );
  }
}
export function start(): void {
  state.label = 'row 000';
  mount(minimal_text_12);

  benchmark.run(
    'minimal-text-12',
    (frame: number) => {
      state.label = frame % 2 ? 'row 111' : 'row 000';
    },
    () => {
      benchmark.check(benchmark.hasText('#label-0', state.label), 'text updated');
    },
  );
}
