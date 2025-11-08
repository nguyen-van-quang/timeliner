/* eslint-disable */
import { Theme } from '../theme.js'
import { Do } from '../utils/do.js'
import { utils } from '../utils/utils.js'
const { style } = utils;

class UINumber {
	#dom;
	#value = 0;
	#do = new Do();

	constructor() {
		this.#dom = document.createElement('input');
		style(this.#dom, {
			textAlign: 'center',
			fontSize: '10px',
			padding: '1px',
			cursor: 'ns-resize',
			width: '40px',
			margin: 0,
			marginRight: '10px',
			appearance: 'none',
			outline: 'none',
			border: 0,
			background: 'none',
			borderBottom: '1px dotted ' + Theme.c,
			color: Theme.c
		});

		this.#dom.addEventListener('change', (e) => {
			const value = parseInt(this.#dom.value, 10) || 0;
			this.#do.fire(value);
		});

		// Allow keydown presses in inputs, don't allow parent to block them
		this.#dom.addEventListener('keydown', (e) => {
			e.stopPropagation();
		});

		this.#dom.addEventListener('focus', (e) => {
			this.#dom.setSelectionRange(0, this.#dom.value.length);
		});
	}

	get dom() {
		return this.#dom;
	}

	onChange(callback) {
		this.#do.do(callback);
	}

	setValue(v) {
		this.#value = v;
		this.#dom.value = this.#value;
	}

	paint() {
		if (this.#value && document.activeElement !== this.#dom) {
			this.#dom.value = this.#value;
		}
	}
}

export { UINumber }
