import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import './style.css';
export class minimal_boxes_4State extends Store {
  narrow = false;
}
export const state = new minimal_boxes_4State();
export class minimal_boxes_4 extends Component {
  template() {
    return (
      <div class={state.narrow ? 'minimal-boxes-4 narrow' : 'minimal-boxes-4'}>
        <div class="box" />
        <div class="box" />
        <div class="box" />
        <div class="box" />
      </div>
    );
  }
}
export function start(): void {
  state.narrow = false;
  mount(minimal_boxes_4);
  let resized = false;

  benchmark.run(
    'minimal-boxes-4',
    (frame: number) => {
      state.narrow = frame % 2 === 1;
      if (frame >= 60 && benchmark.width('.minimal-boxes-4') === 402) resized = true;
    },
    () => {
      benchmark.check(resized, 'layout changed');
    },
  );
}
