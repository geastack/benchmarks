import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class blend_modes_15State extends Store {
  selected = false;
}
export const state = new blend_modes_15State();
export class blend_modes_15 extends Component {
  template() {
    return (
      <div class="blend-modes-15 fixture">
        <div id="row-0" class={state.selected ? 'row card multiply selected' : 'row card multiply'}>
          <span id="label-0" class="label">
            multiply
          </span>
          <div class="icon" />
        </div>
        <div id="row-1" class={state.selected ? 'row card screen selected' : 'row card screen'}>
          <span id="label-1" class="label">
            screen
          </span>
          <div class="icon" />
        </div>
        <div id="row-2" class={state.selected ? 'row card overlay selected' : 'row card overlay'}>
          <span id="label-2" class="label">
            overlay
          </span>
          <div class="icon" />
        </div>
        <div id="row-3" class={state.selected ? 'row card darken selected' : 'row card darken'}>
          <span id="label-3" class="label">
            darken
          </span>
          <div class="icon" />
        </div>
        <div id="row-4" class={state.selected ? 'row card lighten selected' : 'row card lighten'}>
          <span id="label-4" class="label">
            lighten
          </span>
          <div class="icon" />
        </div>
        <div id="row-5" class={state.selected ? 'row card color-dodge selected' : 'row card color-dodge'}>
          <span id="label-5" class="label">
            color-dodge
          </span>
          <div class="icon" />
        </div>
        <div id="row-6" class={state.selected ? 'row card color-burn selected' : 'row card color-burn'}>
          <span id="label-6" class="label">
            color-burn
          </span>
          <div class="icon" />
        </div>
        <div id="row-7" class={state.selected ? 'row card hard-light selected' : 'row card hard-light'}>
          <span id="label-7" class="label">
            hard-light
          </span>
          <div class="icon" />
        </div>
        <div id="row-8" class={state.selected ? 'row card soft-light selected' : 'row card soft-light'}>
          <span id="label-8" class="label">
            soft-light
          </span>
          <div class="icon" />
        </div>
        <div id="row-9" class={state.selected ? 'row card difference selected' : 'row card difference'}>
          <span id="label-9" class="label">
            difference
          </span>
          <div class="icon" />
        </div>
        <div id="row-10" class={state.selected ? 'row card exclusion selected' : 'row card exclusion'}>
          <span id="label-10" class="label">
            exclusion
          </span>
          <div class="icon" />
        </div>
        <div id="row-11" class={state.selected ? 'row card hue selected' : 'row card hue'}>
          <span id="label-11" class="label">
            hue
          </span>
          <div class="icon" />
        </div>
        <div id="row-12" class={state.selected ? 'row card saturation selected' : 'row card saturation'}>
          <span id="label-12" class="label">
            saturation
          </span>
          <div class="icon" />
        </div>
        <div id="row-13" class={state.selected ? 'row card color selected' : 'row card color'}>
          <span id="label-13" class="label">
            color
          </span>
          <div class="icon" />
        </div>
        <div id="row-14" class={state.selected ? 'row card luminosity selected' : 'row card luminosity'}>
          <span id="label-14" class="label">
            luminosity
          </span>
          <div class="icon" />
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.selected = false;
  mount(blend_modes_15);

  benchmark.run(
    'blend-modes-15',
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
