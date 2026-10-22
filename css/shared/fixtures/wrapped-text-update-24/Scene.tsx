import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
// Two paragraphs with the same first 16 bytes; the long one needs more lines.
export const shortText =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore';
export const longText =
  shortText +
  ' et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip';
export class wrapped_text_update_24State extends Store {
  label = longText;
}
export const state = new wrapped_text_update_24State();
export class wrapped_text_update_24 extends Component {
  template() {
    return (
      <div class="wrapped-text-update-24 fixture">
        <div id="row-0" class="row para">
          <span id="label-0" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-1" class="row para">
          <span id="label-1" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-2" class="row para">
          <span id="label-2" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-3" class="row para">
          <span id="label-3" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-4" class="row para">
          <span id="label-4" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-5" class="row para">
          <span id="label-5" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-6" class="row para">
          <span id="label-6" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-7" class="row para">
          <span id="label-7" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-8" class="row para">
          <span id="label-8" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-9" class="row para">
          <span id="label-9" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-10" class="row para">
          <span id="label-10" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-11" class="row para">
          <span id="label-11" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-12" class="row para">
          <span id="label-12" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-13" class="row para">
          <span id="label-13" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-14" class="row para">
          <span id="label-14" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-15" class="row para">
          <span id="label-15" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-16" class="row para">
          <span id="label-16" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-17" class="row para">
          <span id="label-17" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-18" class="row para">
          <span id="label-18" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-19" class="row para">
          <span id="label-19" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-20" class="row para">
          <span id="label-20" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-21" class="row para">
          <span id="label-21" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-22" class="row para">
          <span id="label-22" class="label">
            {state.label}
          </span>
        </div>
        <div id="row-23" class="row para">
          <span id="label-23" class="label">
            {state.label}
          </span>
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.label = longText;
  mount(wrapped_text_update_24);

  benchmark.run(
    'wrapped-text-update-24',
    (frame: number) => {
      state.label = frame % 2 ? longText : shortText;
    },
    () => {
      benchmark.check(benchmark.hasText('#label-0', state.label), 'text updated');
    },
  );
}
