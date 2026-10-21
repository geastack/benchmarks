import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class vertical_text_24State extends Store {
  label = 'tail';
}
export const state = new vertical_text_24State();
export class vertical_text_24 extends Component {
  template() {
    return (
      <div class="vertical-text-24 fixture">
        <div class="band">
        <div id="v-0" class="v rl">
          row 000 <span id="label-0">{state.label}</span>
        </div>
        <div id="v-1" class="v lr">
          row 001 <span id="label-1">{state.label}</span>
        </div>
        <div id="v-2" class="v rl">
          row 002 <span id="label-2">{state.label}</span>
        </div>
        <div id="v-3" class="v lr rtl">
          row 003 <span id="label-3">{state.label}</span>
        </div>
        <div id="v-4" class="v rl">
          row 004 <span id="label-4">{state.label}</span>
        </div>
        <div id="v-5" class="v lr">
          row 005 <span id="label-5">{state.label}</span>
        </div>
        <div id="v-6" class="v rl">
          row 006 <span id="label-6">{state.label}</span>
        </div>
        <div id="v-7" class="v lr rtl">
          row 007 <span id="label-7">{state.label}</span>
        </div>
        <div id="v-8" class="v rl">
          row 008 <span id="label-8">{state.label}</span>
        </div>
        <div id="v-9" class="v lr">
          row 009 <span id="label-9">{state.label}</span>
        </div>
        <div id="v-10" class="v rl">
          row 010 <span id="label-10">{state.label}</span>
        </div>
        <div id="v-11" class="v lr rtl">
          row 011 <span id="label-11">{state.label}</span>
        </div>
        <div id="v-12" class="v rl">
          row 012 <span id="label-12">{state.label}</span>
        </div>
        <div id="v-13" class="v lr">
          row 013 <span id="label-13">{state.label}</span>
        </div>
        <div id="v-14" class="v rl">
          row 014 <span id="label-14">{state.label}</span>
        </div>
        <div id="v-15" class="v lr rtl">
          row 015 <span id="label-15">{state.label}</span>
        </div>
        <div id="v-16" class="v rl">
          row 016 <span id="label-16">{state.label}</span>
        </div>
        <div id="v-17" class="v lr">
          row 017 <span id="label-17">{state.label}</span>
        </div>
        <div id="v-18" class="v rl">
          row 018 <span id="label-18">{state.label}</span>
        </div>
        <div id="v-19" class="v lr rtl">
          row 019 <span id="label-19">{state.label}</span>
        </div>
        <div id="v-20" class="v rl">
          row 020 <span id="label-20">{state.label}</span>
        </div>
        <div id="v-21" class="v lr">
          row 021 <span id="label-21">{state.label}</span>
        </div>
        <div id="v-22" class="v rl">
          row 022 <span id="label-22">{state.label}</span>
        </div>
        <div id="v-23" class="v lr rtl">
          row 023 <span id="label-23">{state.label}</span>
        </div>
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.label = 'tail';
  mount(vertical_text_24);

  benchmark.run(
    'vertical-text-24',
    (frame: number) => {
      state.label = frame % 2 ? 'a longer tail' : 'tail';
    },
    () => {
      benchmark.check(benchmark.hasText('#label-0', state.label), 'text updated');
    },
  );
}
