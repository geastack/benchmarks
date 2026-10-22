import { Component, Store, mount } from '@geastack/core';
import * as benchmark from '../../benchmark';
import '../base.css';
import './style.css';
export class sizing_24State extends Store {
  value = '42';
}
export const state = new sizing_24State();
export class sizing_24 extends Component {
  template() {
    return (
      <div class="sizing-24 fixture">
        <div class="s-list">
          <div id="row-0" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 000</div>
            <div class="s-value" id="value-0">{state.value}</div>
          </div>
          <div id="row-1" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 001</div>
            <div class="s-value" id="value-1">{state.value}</div>
          </div>
          <div id="row-2" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 002</div>
            <div class="s-value" id="value-2">{state.value}</div>
          </div>
          <div id="row-3" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 003</div>
            <div class="s-value" id="value-3">{state.value}</div>
          </div>
          <div id="row-4" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 004</div>
            <div class="s-value" id="value-4">{state.value}</div>
          </div>
          <div id="row-5" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 005</div>
            <div class="s-value" id="value-5">{state.value}</div>
          </div>
          <div id="row-6" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 006</div>
            <div class="s-value" id="value-6">{state.value}</div>
          </div>
          <div id="row-7" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 007</div>
            <div class="s-value" id="value-7">{state.value}</div>
          </div>
          <div id="row-8" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 008</div>
            <div class="s-value" id="value-8">{state.value}</div>
          </div>
          <div id="row-9" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 009</div>
            <div class="s-value" id="value-9">{state.value}</div>
          </div>
          <div id="row-10" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 010</div>
            <div class="s-value" id="value-10">{state.value}</div>
          </div>
          <div id="row-11" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 011</div>
            <div class="s-value" id="value-11">{state.value}</div>
          </div>
          <div id="row-12" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 012</div>
            <div class="s-value" id="value-12">{state.value}</div>
          </div>
          <div id="row-13" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 013</div>
            <div class="s-value" id="value-13">{state.value}</div>
          </div>
          <div id="row-14" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 014</div>
            <div class="s-value" id="value-14">{state.value}</div>
          </div>
          <div id="row-15" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 015</div>
            <div class="s-value" id="value-15">{state.value}</div>
          </div>
          <div id="row-16" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 016</div>
            <div class="s-value" id="value-16">{state.value}</div>
          </div>
          <div id="row-17" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 017</div>
            <div class="s-value" id="value-17">{state.value}</div>
          </div>
          <div id="row-18" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 018</div>
            <div class="s-value" id="value-18">{state.value}</div>
          </div>
          <div id="row-19" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 019</div>
            <div class="s-value" id="value-19">{state.value}</div>
          </div>
          <div id="row-20" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 020</div>
            <div class="s-value" id="value-20">{state.value}</div>
          </div>
          <div id="row-21" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 021</div>
            <div class="s-value" id="value-21">{state.value}</div>
          </div>
          <div id="row-22" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 022</div>
            <div class="s-value" id="value-22">{state.value}</div>
          </div>
          <div id="row-23" class="s-row">
            <div class="s-bar"></div>
            <div class="s-media"><img class="s-img" src="gea-asset://sha256/e4ad4f840a4cb979b1de86baf69e538e1de700f4a437e004f903df0bdb57edff/badge.png" /></div>
            <div class="s-name">Sensor 023</div>
            <div class="s-value" id="value-23">{state.value}</div>
          </div>
        </div>
      </div>
    );
  }
}
export function start(): void {
  state.value = '42';
  mount(sizing_24);

  benchmark.run(
    'sizing-24',
    (frame: number) => {
      state.value = frame % 2 ? '1042' : '42';
    },
    () => {
      benchmark.check(benchmark.hasText('#value-0', state.value), 'text updated');
    },
  );
}
