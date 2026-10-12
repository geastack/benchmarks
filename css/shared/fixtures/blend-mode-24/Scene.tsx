import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class blend_mode_24State extends Store {
  selected = false;
}
export const state = new blend_mode_24State();
export class blend_mode_24 extends Component {
  template() {
    return (
      <div class="blend-mode-24 fixture">
        <div id="row-0" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-0" class="label">
            row 000
          </span>
          <div class="icon" />
        </div>
        <div id="row-1" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-1" class="label">
            row 001
          </span>
          <div class="icon" />
        </div>
        <div id="row-2" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-2" class="label">
            row 002
          </span>
          <div class="icon" />
        </div>
        <div id="row-3" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-3" class="label">
            row 003
          </span>
          <div class="icon" />
        </div>
        <div id="row-4" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-4" class="label">
            row 004
          </span>
          <div class="icon" />
        </div>
        <div id="row-5" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-5" class="label">
            row 005
          </span>
          <div class="icon" />
        </div>
        <div id="row-6" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-6" class="label">
            row 006
          </span>
          <div class="icon" />
        </div>
        <div id="row-7" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-7" class="label">
            row 007
          </span>
          <div class="icon" />
        </div>
        <div id="row-8" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-8" class="label">
            row 008
          </span>
          <div class="icon" />
        </div>
        <div id="row-9" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-9" class="label">
            row 009
          </span>
          <div class="icon" />
        </div>
        <div id="row-10" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-10" class="label">
            row 010
          </span>
          <div class="icon" />
        </div>
        <div id="row-11" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-11" class="label">
            row 011
          </span>
          <div class="icon" />
        </div>
        <div id="row-12" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-12" class="label">
            row 012
          </span>
          <div class="icon" />
        </div>
        <div id="row-13" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-13" class="label">
            row 013
          </span>
          <div class="icon" />
        </div>
        <div id="row-14" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-14" class="label">
            row 014
          </span>
          <div class="icon" />
        </div>
        <div id="row-15" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-15" class="label">
            row 015
          </span>
          <div class="icon" />
        </div>
        <div id="row-16" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-16" class="label">
            row 016
          </span>
          <div class="icon" />
        </div>
        <div id="row-17" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-17" class="label">
            row 017
          </span>
          <div class="icon" />
        </div>
        <div id="row-18" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-18" class="label">
            row 018
          </span>
          <div class="icon" />
        </div>
        <div id="row-19" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-19" class="label">
            row 019
          </span>
          <div class="icon" />
        </div>
        <div id="row-20" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-20" class="label">
            row 020
          </span>
          <div class="icon" />
        </div>
        <div id="row-21" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-21" class="label">
            row 021
          </span>
          <div class="icon" />
        </div>
        <div id="row-22" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-22" class="label">
            row 022
          </span>
          <div class="icon" />
        </div>
        <div id="row-23" class={state.selected ? 'row card selected' : 'row card'}>
          <span id="label-23" class="label">
            row 023
          </span>
          <div class="icon" />
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.selected = false;
  mount(blend_mode_24);

  benchmark.run(
    'blend-mode-24',
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
