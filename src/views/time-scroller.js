/* eslint-disable */
import { Theme } from '../theme.js'
import { utils } from '../utils/utils.js'
const proxy_ctx = utils.proxy_ctx;
import { handleDrag } from '../utils/handle-drag.js'

/* This is the top bar where it shows a horizontal scrolls as well as a custom view port */
class Rect {
	constructor(x, y, w, h, color, outline) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.color = color;
		this.outline = outline;
	}

	set(x, y, w, h, color, outline) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.color = color;
		this.outline = outline;
	}

	paint(ctx) {
		ctx.fillStyle = Theme.b;
		ctx.strokeStyle = Theme.c;
		this.shape(ctx);
		ctx.stroke();
		ctx.fill();
	}

	shape(ctx) {
		ctx.beginPath();
		ctx.rect(this.x, this.y, this.w, this.h);
	}

	contains(x, y) {
		return x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h;
	}
}

class ScrollCanvas {
	#MARGINS = 15;
	#width;
	#height;
	#scroller = {
		left: 0,
		grip_length: 0,
		k: 1
	};
	#scrollRect = new Rect();
	#draggingx = null;
	#data;
	#dispatcher;

	constructor(dispatcher, data) {
		this.#dispatcher = dispatcher;
		this.#data = data;
	}

	setSize(w, h) {
		this.#width = w;
		this.#height = h;
	}

	paint(ctx) {
		const totalTime = this.#data.ui.totalTime;
		const scrollTime = this.#data.ui.scrollTime;
		const pixels_per_second = this.#data.ui.timeScale;

		ctx.save();
		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
		ctx.clearRect(0, 0, this.#width, this.#height);
		ctx.translate(this.#MARGINS, 5);

		// outline scroller
		ctx.beginPath();
		ctx.strokeStyle = Theme.b;
		const w = this.#width - 2* this.#MARGINS;
		const h = 16;
		ctx.rect(0, 0, w, h);
		ctx.stroke();

		const totalTimePixels = totalTime * pixels_per_second;
		const k = w / totalTimePixels;
		if (k <= 1) {
			this.#scroller.k = k;
			const grip_length = Math.min(w, w * k);
			this.#scroller.grip_length = grip_length;
			this.#scroller.left = scrollTime * (w - grip_length) / totalTime;
			// draw scroller grip
			this.#scrollRect.set(this.#scroller.left, 0, this.#scroller.grip_length, h);
			this.#scrollRect.paint(ctx);
		}
		else {
			this.#scrollRect.set(0, 0, w, h);
			this.#scrollRect.paint(ctx);
			this.#data.ui.scrollTime = 0;
		}
		ctx.restore();
	}

	onDown(e) {
		if (this.#scrollRect.contains(e.offsetx - this.#MARGINS, e.offsety -5)) {
			this.#draggingx = this.#scroller.left;
			return;
		}
		const totalTime = this.#data.ui.totalTime;
		const w = this.#width - 2 * this.#MARGINS;
		const t = (e.offsetx - this.#MARGINS) / w * totalTime;
		this.#dispatcher.fire('time.update', t);
		// recalculate scroll time
		const scrollTime = (e.offsetx - this.#MARGINS) / (w - this.#scroller.grip_length) * totalTime;
		this.#dispatcher.fire('update.scrollTime', scrollTime);
		if (e.preventDefault) e.preventDefault();
	}

	onMove(e) {
		if (this.#draggingx != null) {
			const totalTime = this.#data.ui.totalTime;
			const w = this.#width - 2 * this.#MARGINS;
			const scrollTime = (this.#draggingx + e.dx) / w * totalTime;
			if (this.#draggingx  + e.dx + this.#scroller.grip_length > w) { return; }
			this.#dispatcher.fire('update.scrollTime', scrollTime);
		} else {
			this.onDown(e);
		}
	}

	onUp(e) {
		this.#draggingx = null;
	}
}

export { ScrollCanvas }