/* eslint-disable */
import { utils } from '../utils/utils.js'
const { style } = utils;
import { Theme } from '../theme.js'
import { LayoutConstants } from '../layout_constants.js'

class TimelineCollection {
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
    const searchBar = document.createElement('input');
    searchBar.type = 'text';
    searchBar.placeholder = 'Search timelines...';
    searchBar.style.cssText = 'width: calc(100% - 10px); margin: 5px; padding: 4px; box-sizing: border-box;';
    searchBar.addEventListener('input', (e) => {
      const filter = e.target.value.toLowerCase();
      const items = this.#dom.querySelectorAll('ul li');
      items.forEach((item) => {
        const timeline = this.#timelines.find(t => t.id === item.id);
        if (timeline.name.toLowerCase().includes(filter)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });

    const addButton = document.createElement('button');
    addButton.innerHTML = '+';
    addButton.title = 'Add Timeline';
    addButton.style.cssText = 'float: right; margin: 5px; padding: 4px; box-sizing: border-box; font-size: 16px; line-height: 12px;';
    addButton.addEventListener('click', () => {
      this.#dispatcher.fire('timeline.add');
    });

    const container = document.createElement('div');
    style(container, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });
    container.appendChild(searchBar);
    container.appendChild(addButton);
    this.#dom.appendChild(container);

    const ulDom = document.createElement('ul');
    style(ulDom, {
      listStyle: 'none',
    });
    for (let i = 0; i < this.#timelines.length; i++) {
      const timeline = this.#timelines[i];
      const domDiv = document.createElement('div');
      style(domDiv, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      });
      const domLabel = document.createElement('span');
      domLabel.textContent = timeline.name;
      domLabel.style.cssText = 'font-size: 12px; padding: 4px; width: 100px; overflow: hidden; text-overflow: ellipsis;';
      domDiv.appendChild(domLabel);

      const height = (LayoutConstants.LINE_HEIGHT - 1);
      const remove_layer_btn = document.createElement('button');
      remove_layer_btn.innerHTML = '&minus;';
      remove_layer_btn.style.cssText = 'color: ' + Theme.b + '; background: none; font-size: 12px; padding: 0px; font-family: monospace; float: right; width: 20px; height: ' + height + 'px; border-style:none; outline: none;';
      remove_layer_btn.addEventListener('click', (e) => {
        this.#dispatcher.fire('timeline.remove', timeline);
        e.stopPropagation();
        domDiv.remove();
      });
      domDiv.appendChild(remove_layer_btn);

      const inputReName = document.createElement('input');
      inputReName.type = 'text';
      inputReName.style.cssText = 'font-size: 12px; padding: 4px; width: 100%; box-sizing: border-box; display: none;';
      domDiv.appendChild(inputReName);

      const liDom = document.createElement('li');
      if (i === 0) {
        liDom.classList.add('selected');
      }
      liDom.id = timeline.id;
      liDom.addEventListener('click', (e) => {
        this.#dispatcher.fire('timeline.select', timeline);
        const selected = this.#dom.querySelector('.selected');
        if (selected) {
          selected.classList.remove('selected');
        }
        liDom.classList.add('selected');
      });

      liDom.addEventListener('dblclick', (e) => {
        domLabel.style.display = 'none';
        remove_layer_btn.style.display = 'none';
        inputReName.style.display = 'block';
        inputReName.value = timeline.name;
        inputReName.focus();

        inputReName.addEventListener('blur', () => {
          timeline.name = inputReName.value;
          domLabel.textContent = timeline.name;
          domLabel.style.display = 'block';
          remove_layer_btn.style.display = 'block';
          inputReName.style.display = 'none';
        });

        inputReName.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            inputReName.blur();
          }
        });
      });
      liDom.appendChild(domDiv);
      ulDom.appendChild(liDom);
    }
    this.#dom.appendChild(ulDom);
  }

  get dom() {
    return this.#dom;
  }

  set data(timelines) {
    this.#timelines = timelines;
    this.#dom.innerHTML = '';
    this.init();
  }

  updateSelected(timelineID) {
    const items = this.#dom.querySelectorAll('ul li');
    items.forEach((item) => {
      if (item.id === timelineID) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }
}

export { TimelineCollection }