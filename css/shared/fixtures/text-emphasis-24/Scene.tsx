import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class text_emphasis_24State extends Store {
  selected = false;
}
export const state = new text_emphasis_24State();
export class text_emphasis_24 extends Component {
  template() {
    return (
      <div class="text-emphasis-24 fixture">
        <div id="row-0" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-0" class="label marked">
            emphasis row 000 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-1" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-1" class="label marked">
            emphasis row 001 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-2" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-2" class="label marked">
            emphasis row 002 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-3" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-3" class="label marked">
            emphasis row 003 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-4" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-4" class="label marked">
            emphasis row 004 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-5" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-5" class="label marked">
            emphasis row 005 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-6" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-6" class="label marked">
            emphasis row 006 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-7" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-7" class="label marked">
            emphasis row 007 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-8" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-8" class="label marked">
            emphasis row 008 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-9" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-9" class="label marked">
            emphasis row 009 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-10" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-10" class="label marked">
            emphasis row 010 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-11" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-11" class="label marked">
            emphasis row 011 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-12" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-12" class="label marked">
            emphasis row 012 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-13" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-13" class="label marked">
            emphasis row 013 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-14" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-14" class="label marked">
            emphasis row 014 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-15" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-15" class="label marked">
            emphasis row 015 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-16" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-16" class="label marked">
            emphasis row 016 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-17" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-17" class="label marked">
            emphasis row 017 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-18" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-18" class="label marked">
            emphasis row 018 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-19" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-19" class="label marked">
            emphasis row 019 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-20" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-20" class="label marked">
            emphasis row 020 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-21" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-21" class="label marked">
            emphasis row 021 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-22" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-22" class="label marked">
            emphasis row 022 with marks
          </span>
          <div class="icon" />
        </div>
        <div id="row-23" class={state.selected ? 'row selected' : 'row'}>
          <span id="label-23" class="label marked">
            emphasis row 023 with marks
          </span>
          <div class="icon" />
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.selected = false;
  mount(text_emphasis_24);

  benchmark.run(
    'text-emphasis-24',
    (frame: number) => {
      state.selected = frame % 2 === 1;
    },
    () => {
      benchmark.check(
        benchmark.hasClass('#row-0', 'selected') === state.selected,
        'selection updated',
      );
    },
  );
}
