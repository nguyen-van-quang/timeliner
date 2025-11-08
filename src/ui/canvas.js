/* eslint-disable */
import { handleDrag } from '../utils/handle-drag.js';
class Canvas {
	#canvas;
	#ctx;
	#width;
	#height;
	#dpr;
	#canvasItems = [];
	#child;

	constructor(w, h) {
		this.#create();
		this.setSize(w, h);
		handleDrag(this.#canvas,
			(e) => {
				if (this.#child.onDown) { this.#child.onDown(e) }
			},
			(e) => {
				if (this.#child.onMove) { this.#child.onMove(e) }
			},
			(e) => {
				if (this.#child.onUp) { this.#child.onUp(e) }
			}
		);
	}

	#create() {
		this.#canvas = document.createElement('canvas');
		this.#ctx = this.#canvas.getContext('2d');
	}

	setSize(w, h) {
		this.#width = w;
		this.#height = h;
		this.#dpr = window.devicePixelRatio;
		this.#canvas.width = this.#width * this.#dpr;
		this.#canvas.height = this.#height * this.#dpr;
		this.#canvas.style.width = this.#width + 'px';
		this.#canvas.style.height = this.#height + 'px';
		
		if (this.#child) this.#child.setSize(w, h);
	}

	paint() {
		if(this.#child) {
			if(!this.#child.paint) {
				throw new Error('child does not implement paint()');
			}
			this.#child.paint(this.#ctx);
		}
		for (let item of this.#canvasItems) {
			item.paint();
		}
	}

	add(item) {
		this.#canvasItems.push(item);
	}

	remove(item) {
		this.#canvasItems.splice(this.#canvasItems.indexOf(item), 1);
	}

	uses(child) {
		this.#child = child;
		this.#child.add = this.add.bind(this);
		this.#child.remove = this.remove.bind(this);
	}

	get dom() {
		return this.#canvas;
	}
}

export { Canvas }
