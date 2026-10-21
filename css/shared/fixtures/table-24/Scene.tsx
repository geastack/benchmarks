import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class table_24State extends Store {
  label = 'tail';
}
export const state = new table_24State();
export class table_24 extends Component {
  template() {
    return (
      <div class="table-24 fixture">
        <div class="t-table">
          <div id="row-0" class="t-row">
            <div class="t-cell t-num">1</div>
            <div class="t-cell">row 000 <span id="label-0">{state.label}</span></div>
            <div class="t-cell t-num">0%</div>
          </div>
          <div id="row-1" class="t-row">
            <div class="t-cell t-num">2</div>
            <div class="t-cell">row 001 <span id="label-1">{state.label}</span></div>
            <div class="t-cell t-num">37%</div>
          </div>
          <div id="row-2" class="t-row">
            <div class="t-cell t-num">3</div>
            <div class="t-cell">row 002 <span id="label-2">{state.label}</span></div>
            <div class="t-cell t-num">74%</div>
          </div>
          <div id="row-3" class="t-row">
            <div class="t-cell t-num">4</div>
            <div class="t-cell">row 003 <span id="label-3">{state.label}</span></div>
            <div class="t-cell t-num">11%</div>
          </div>
          <div id="row-4" class="t-row">
            <div class="t-cell t-num">5</div>
            <div class="t-cell">row 004 <span id="label-4">{state.label}</span></div>
            <div class="t-cell t-num">48%</div>
          </div>
          <div id="row-5" class="t-row">
            <div class="t-cell t-num">6</div>
            <div class="t-cell">row 005 <span id="label-5">{state.label}</span></div>
            <div class="t-cell t-num">85%</div>
          </div>
          <div id="row-6" class="t-row">
            <div class="t-cell t-num">7</div>
            <div class="t-cell">row 006 <span id="label-6">{state.label}</span></div>
            <div class="t-cell t-num">22%</div>
          </div>
          <div id="row-7" class="t-row">
            <div class="t-cell t-num">8</div>
            <div class="t-cell">row 007 <span id="label-7">{state.label}</span></div>
            <div class="t-cell t-num">59%</div>
          </div>
          <div id="row-8" class="t-row">
            <div class="t-cell t-num">9</div>
            <div class="t-cell">row 008 <span id="label-8">{state.label}</span></div>
            <div class="t-cell t-num">96%</div>
          </div>
          <div id="row-9" class="t-row">
            <div class="t-cell t-num">10</div>
            <div class="t-cell">row 009 <span id="label-9">{state.label}</span></div>
            <div class="t-cell t-num">33%</div>
          </div>
          <div id="row-10" class="t-row">
            <div class="t-cell t-num">11</div>
            <div class="t-cell">row 010 <span id="label-10">{state.label}</span></div>
            <div class="t-cell t-num">70%</div>
          </div>
          <div id="row-11" class="t-row">
            <div class="t-cell t-num">12</div>
            <div class="t-cell">row 011 <span id="label-11">{state.label}</span></div>
            <div class="t-cell t-num">7%</div>
          </div>
          <div id="row-12" class="t-row">
            <div class="t-cell t-num">13</div>
            <div class="t-cell">row 012 <span id="label-12">{state.label}</span></div>
            <div class="t-cell t-num">44%</div>
          </div>
          <div id="row-13" class="t-row">
            <div class="t-cell t-num">14</div>
            <div class="t-cell">row 013 <span id="label-13">{state.label}</span></div>
            <div class="t-cell t-num">81%</div>
          </div>
          <div id="row-14" class="t-row">
            <div class="t-cell t-num">15</div>
            <div class="t-cell">row 014 <span id="label-14">{state.label}</span></div>
            <div class="t-cell t-num">18%</div>
          </div>
          <div id="row-15" class="t-row">
            <div class="t-cell t-num">16</div>
            <div class="t-cell">row 015 <span id="label-15">{state.label}</span></div>
            <div class="t-cell t-num">55%</div>
          </div>
          <div id="row-16" class="t-row">
            <div class="t-cell t-num">17</div>
            <div class="t-cell">row 016 <span id="label-16">{state.label}</span></div>
            <div class="t-cell t-num">92%</div>
          </div>
          <div id="row-17" class="t-row">
            <div class="t-cell t-num">18</div>
            <div class="t-cell">row 017 <span id="label-17">{state.label}</span></div>
            <div class="t-cell t-num">29%</div>
          </div>
          <div id="row-18" class="t-row">
            <div class="t-cell t-num">19</div>
            <div class="t-cell">row 018 <span id="label-18">{state.label}</span></div>
            <div class="t-cell t-num">66%</div>
          </div>
          <div id="row-19" class="t-row">
            <div class="t-cell t-num">20</div>
            <div class="t-cell">row 019 <span id="label-19">{state.label}</span></div>
            <div class="t-cell t-num">3%</div>
          </div>
          <div id="row-20" class="t-row">
            <div class="t-cell t-num">21</div>
            <div class="t-cell">row 020 <span id="label-20">{state.label}</span></div>
            <div class="t-cell t-num">40%</div>
          </div>
          <div id="row-21" class="t-row">
            <div class="t-cell t-num">22</div>
            <div class="t-cell">row 021 <span id="label-21">{state.label}</span></div>
            <div class="t-cell t-num">77%</div>
          </div>
          <div id="row-22" class="t-row">
            <div class="t-cell t-num">23</div>
            <div class="t-cell">row 022 <span id="label-22">{state.label}</span></div>
            <div class="t-cell t-num">14%</div>
          </div>
          <div id="row-23" class="t-row">
            <div class="t-cell t-num">24</div>
            <div class="t-cell">row 023 <span id="label-23">{state.label}</span></div>
            <div class="t-cell t-num">51%</div>
          </div>
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.label = 'tail';
  mount(table_24);

  benchmark.run(
    'table-24',
    (frame: number) => {
      state.label = frame % 2 ? 'a longer tail' : 'tail';
    },
    () => {
      benchmark.check(benchmark.hasText('#label-0', state.label), 'text updated');
    },
  );
}
