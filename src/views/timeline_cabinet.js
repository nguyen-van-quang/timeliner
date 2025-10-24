import { utils } from '../utils/utils.js'
const { style } = utils;

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
      const liDom = document.createElement('li');
      liDom.textContent = `${this.#timelines.get(i).value.name}`;
      liDom.dataset.index = i;
      liDom.addEventListener('click', (e) => {
        this.#dispatcher.fire('timeline.select', this.#timelines.get(i));
      });
      ulDom.appendChild(liDom);
    }
    this.#dom.appendChild(ulDom);
  }

  get dom() {
    return this.#dom;
  }
}

export { TimelineCabinet }