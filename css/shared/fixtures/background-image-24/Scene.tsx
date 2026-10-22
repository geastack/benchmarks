import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class background_image_24State extends Store {
  label = 'tail';
}
export const state = new background_image_24State();
export class background_image_24 extends Component {
  template() {
    return (
      <div class="background-image-24 fixture">
        <div id="row-0" class="line">
          row 000 <span id="label-0">{state.label}</span>
        </div>
        <div id="row-1" class="line">
          row 001 <span id="label-1">{state.label}</span>
        </div>
        <div id="row-2" class="line">
          row 002 <span id="label-2">{state.label}</span>
        </div>
        <div id="row-3" class="line badge">
          row 003 <span id="label-3">{state.label}</span>
          <img class="thumb" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" />
        </div>
        <div id="row-4" class="line">
          row 004 <span id="label-4">{state.label}</span>
        </div>
        <div id="row-5" class="line">
          row 005 <span id="label-5">{state.label}</span>
        </div>
        <div id="row-6" class="line">
          row 006 <span id="label-6">{state.label}</span>
        </div>
        <div id="row-7" class="line badge">
          row 007 <span id="label-7">{state.label}</span>
          <img class="thumb" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" />
        </div>
        <div id="row-8" class="line">
          row 008 <span id="label-8">{state.label}</span>
        </div>
        <div id="row-9" class="line">
          row 009 <span id="label-9">{state.label}</span>
        </div>
        <div id="row-10" class="line">
          row 010 <span id="label-10">{state.label}</span>
        </div>
        <div id="row-11" class="line badge">
          row 011 <span id="label-11">{state.label}</span>
          <img class="thumb" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" />
        </div>
        <div id="row-12" class="line">
          row 012 <span id="label-12">{state.label}</span>
        </div>
        <div id="row-13" class="line">
          row 013 <span id="label-13">{state.label}</span>
        </div>
        <div id="row-14" class="line">
          row 014 <span id="label-14">{state.label}</span>
        </div>
        <div id="row-15" class="line badge">
          row 015 <span id="label-15">{state.label}</span>
          <img class="thumb" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" />
        </div>
        <div id="row-16" class="line">
          row 016 <span id="label-16">{state.label}</span>
        </div>
        <div id="row-17" class="line">
          row 017 <span id="label-17">{state.label}</span>
        </div>
        <div id="row-18" class="line">
          row 018 <span id="label-18">{state.label}</span>
        </div>
        <div id="row-19" class="line badge">
          row 019 <span id="label-19">{state.label}</span>
          <img class="thumb" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" />
        </div>
        <div id="row-20" class="line">
          row 020 <span id="label-20">{state.label}</span>
        </div>
        <div id="row-21" class="line">
          row 021 <span id="label-21">{state.label}</span>
        </div>
        <div id="row-22" class="line">
          row 022 <span id="label-22">{state.label}</span>
        </div>
        <div id="row-23" class="line badge">
          row 023 <span id="label-23">{state.label}</span>
          <img class="thumb" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" />
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.label = 'tail';
  mount(background_image_24);

  benchmark.run(
    'background-image-24',
    (frame: number) => {
      state.label = frame % 2 ? 'a longer tail' : 'tail';
    },
    () => {
      benchmark.check(benchmark.hasText('#label-0', state.label), 'text updated');
    },
  );
}
