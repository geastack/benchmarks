import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import './style.css';
export class minimal_box_1State extends Store {
  narrow = false;
}
export const state = new minimal_box_1State();
export class minimal_box_1 extends Component {
  template() {
    return (
      <div class={state.narrow ? 'minimal-box-1 narrow' : 'minimal-box-1'}>
        <div class="box" />
      </div>
    );
  }
}
export function start(): void {
  state.narrow = false;
  mount(minimal_box_1);
  let resized = false;

  benchmark.run(
    'minimal-box-1',
    (frame: number) => {
      state.narrow = frame % 2 === 1;
      if (frame >= 60 && benchmark.width('.minimal-box-1') === 402) resized = true;
    },
    () => {
      benchmark.check(resized, 'layout changed');
    },
  );
}
