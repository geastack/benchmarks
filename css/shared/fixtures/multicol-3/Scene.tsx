import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class multicol_3State extends Store {
  selected = false;
}
export const state = new multicol_3State();
export class multicol_3 extends Component {
  template() {
    return (
      <div class="multicol-3 fixture">
        <div id="columns" class={state.selected ? 'columns selected' : 'columns'}>
          <div id="para-0" class="para">
            lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod 
          </div>
          <div id="para-1" class="para">
            sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt 
          </div>
          <div id="para-2" class="para">
            adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore m
          </div>
          <div id="para-3" class="para">
            do eiusmod tempor incididunt ut labore et dolore magna aliqua lorem ip
          </div>
          <div id="para-4" class="para">
            incididunt ut labore et dolore magna aliqua lorem ipsum dolor sit amet
          </div>
          <div id="para-5" class="para">
            et dolore magna aliqua lorem ipsum dolor sit amet consectetur adipisci
          </div>
          <div id="para-6" class="para">
            aliqua lorem ipsum dolor sit amet consectetur adipiscing elit sed do e
          </div>
          <div id="para-7" class="para">
            dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incid
          </div>
          <div id="para-8" class="para">
            consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore
          </div>
          <div id="para-9" class="para">
            sed do eiusmod tempor incididunt ut labore et dolore magna aliqua lore
          </div>
          <div id="para-10" class="para">
            tempor incididunt ut labore et dolore magna aliqua lorem ipsum dolor s
          </div>
          <div id="para-11" class="para">
            labore et dolore magna aliqua lorem ipsum dolor sit amet consectetur a
          </div>
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.selected = false;
  mount(multicol_3);

  benchmark.run(
    'multicol-3',
    (frame: number) => {
      state.selected = frame % 2 === 1;
    },
    () => {
      benchmark.check(
        benchmark.hasClass('#columns', 'selected') === state.selected,
        'selection updated',
      );
    },
  );
}
