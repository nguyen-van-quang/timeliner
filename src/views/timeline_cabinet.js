import { utils } from '../utils/utils.js'
const { style } = utils;
import { Theme } from '../theme.js'
import { LayoutConstants } from '../layout_constants.js'

class TimelineCabinet {
  #dom;
  #timelines;
  #dispatcher;

  constructor(timelines, dispatcher) {
    this.#timelines = timelines;
    this.#dispatcher = dispatcher;
    this.#dom = document.createElement('div');
    this.#dom.classList.add('timeline-cabinet');
    this.init();
  }

  init() {
    const ulDom = document.createElement('ul');
    style(ulDom, {
      listStyle: 'none',
    });
    for (let i = 0; i < this.#timelines.value.length; i++) {
      const domDiv = document.createElement('div');
      style(domDiv, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      });
      const domLabel = document.createElement('span');
      domLabel.textContent = this.#timelines.get(i).value.name;
      domLabel.style.cssText = 'font-size: 12px; padding: 4px; width: 100px; overflow: hidden; text-overflow: ellipsis;';
      domDiv.appendChild(domLabel);

      const height = (LayoutConstants.LINE_HEIGHT - 1);
      const remove_layer_btn = document.createElement('button');
      remove_layer_btn.innerHTML = '&minus;';
      remove_layer_btn.style.cssText = 'color: ' + Theme.b + '; background: none; font-size: 12px; padding: 0px; font-family: monospace; float: right; width: 20px; height: ' + height + 'px; border-style:none; outline: none;';
      remove_layer_btn.addEventListener('click', (e) => {
        this.#dispatcher.fire('timeline.remove', this.#timelines.get(i));
      });
      domDiv.appendChild(remove_layer_btn);


      const liDom = document.createElement('li');
      if (i === 0) {
        liDom.classList.add('selected');
      }
      // liDom.textContent = `${this.#timelines.get(i).value.name}`;
      liDom.dataset.index = i;
      liDom.addEventListener('click', (e) => {
        this.#dispatcher.fire('timeline.select', this.#timelines.get(i));
        const selected = this.#dom.querySelector('.selected');
        if (selected) {
          selected.classList.remove('selected');
        }
        liDom.classList.add('selected');
      });
      liDom.appendChild(domDiv);
      ulDom.appendChild(liDom);
    }
    this.#dom.appendChild(ulDom);
  }

  get dom() {
    return this.#dom;
  }
}

export { TimelineCabinet }