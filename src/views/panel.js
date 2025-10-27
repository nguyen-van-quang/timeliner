/* eslint-disable */
import { LayoutConstants } from '../layout_constants.js'
import { Theme } from '../theme.js'
import { utils } from '../utils/utils.js'
import { Tweens } from '../utils/util_tween.js'
import { handleDrag } from '../utils/util_handle_drag.js'
import { ScrollCanvas } from './time_scroller.js'
import { Canvas } from '../ui/canvas.js'

const { proxy_ctx, style } = utils;

const LINE_HEIGHT = LayoutConstants.LINE_HEIGHT,
	DIAMOND_SIZE = LayoutConstants.DIAMOND_SIZE,
	TIME_SCROLLER_HEIGHT = 35,
	MARKER_TRACK_HEIGHT = 38,
	LEFT_PANE_WIDTH = LayoutConstants.LEFT_PANE_WIDTH,
	TOP = 10;

class EasingRect {
	#timeliner;
	#track_canvas;
	#x1;
	#y1;
	#x2;
	#y2;
	#frame1;
	#frame2;

	constructor(timeliner, track_canvas, x1, y1, x2, y2, frame1, frame2) {
		this.#timeliner = timeliner;
		this.#track_canvas = track_canvas;
		this.#x1 = x1;
		this.#y1 = y1;
		this.#x2 = x2;
		this.#y2 = y2;
		this.#frame1 = frame1;
		this.#frame2 = frame2;
	}

	path(ctx) {
		ctx.beginPath();
		ctx.rect(this.#x1, this.#y1, this.#x2 - this.#x1, this.#y2 - this.#y1);
		ctx.closePath();
	}

	paint(ctx) {
		this.path(ctx);
		ctx.fillStyle = this.#frame1._color;
		ctx.fill();
	}

	mouseover() {
		this.#track_canvas.style.cursor = 'pointer'; // pointer move ew-resize
	}

	mouseout() {
		this.#track_canvas.style.cursor = 'default';
	}

	x_to_time(x) {
		return this.#timeliner.x_to_time(x);
	}

	mousedrag(e) {
		console.log('EasingRect.mousedrag');
		let t1 = this.x_to_time(this.#x1 + e.dx);
		t1 = Math.max(0, t1);
		// TODO limit moving to the next neighbor
		this.#frame1.time = t1;

		let t2 = this.x_to_time(this.#x2 + e.dx);
		t2 = Math.max(0, t2);
		this.#frame2.time = t2;
	}

	get position() {
		return {
			x1: this.#x1,
			y1: this.#y1,
			x2: this.#x2,
			y2: this.#y2
		}
	}
}

class Diamond {
	#dispatcher;
	#timeliner;
	#ctx_wrap;
	#track_canvas;
	#isOver = false;
	#x;
	#y2;
	#frame;

	constructor(dispatcher, timeliner, ctx_wrap, track_canvas, frame, y) {
		this.#timeliner = timeliner;
		this.#dispatcher = dispatcher;
		this.#ctx_wrap = ctx_wrap;
		this.#track_canvas = track_canvas;
		this.#frame = frame;
		this.#x = this.time_to_x(frame.time);
		this.#y2 = y + LINE_HEIGHT * 0.5 - DIAMOND_SIZE / 2;
	}

	time_to_x(s) {
		return this.#timeliner.time_to_x(s);
	}

	path() {
		this.#ctx_wrap
			.beginPath()
			.moveTo(this.#x, this.#y2)
			.lineTo(this.#x + DIAMOND_SIZE / 2, this.#y2 + DIAMOND_SIZE / 2)
			.lineTo(this.#x, this.#y2 + DIAMOND_SIZE)
			.lineTo(this.#x - DIAMOND_SIZE / 2, this.#y2 + DIAMOND_SIZE / 2)
			.closePath();
	}

	paint() {
		this.path();
		this.#ctx_wrap.fillStyle(this.#isOver ? 'yellow' : Theme.c);
		this.#ctx_wrap.fill().stroke();
	}

	mouseover() {
		this.#isOver = true;
		this.#track_canvas.style.cursor = 'move'; // pointer move ew-resize
		this.paint();
	}

	mouseout() {
		this.#isOver = false;
		this.#track_canvas.style.cursor = 'default';
		this.paint();
	}

	mousedrag(e) {
		let t = this.#timeliner.x_to_time(this.#x + e.dx);
		t = Math.max(0, t);
		// TODO limit moving to neighbours
		this.#frame.time = t;
		this.#dispatcher.fire('time.update', t);
	}
}

class TimelinePanel {
	#data;
	#dispatcher;
	#dpr;
	#track_canvas;
	#scroll_canvas;
	#targets;
	#scrollTop;
	#scrollLeft;
	#SCROLL_HEIGHT;
	#dom;
	#ctx;
	#ctx_wrap;
	#currentTime; // measured in seconds, technically it could be in frames or  have it in string format (0:00:00:1-60)
	#LEFT_GUTTER = 20;
	#needsRepaint = false;
	#renderItems = [];
	#time_scale = LayoutConstants.time_scale;
	#tickMark1 = this.#time_scale / 60;
	#tickMark2 = 2 * this.#tickMark1;
	#tickMark3 = 10 * this.#tickMark1;

	#over = null;
	#mousedownItem = null;
	#mousedown2 = false;
	#mouseDownThenMove = false;



	// this is the current scroll position.
	#frame_start = 0;

	#canvasBounds;
	#pointer = null;


	constructor(data, dispatcher) {
		this.#data = data;
		this.#dispatcher = dispatcher;
		this.#dpr = window.devicePixelRatio || 1;
		this.#targets = data.get('targets').value;

		this.#track_canvas = document.createElement('canvas');
		this.#track_canvas.addEventListener('dblclick', (e) => {
			this.#canvasBounds = this.#track_canvas.getBoundingClientRect();
			const mx = e.clientX - this.#canvasBounds.left;
			const my = e.clientY - this.#canvasBounds.top;
			const layer = this.y_to_track(my);
			// const s = this.x_to_time(mx);
			console.log('layer: ', layer);
			this.#dispatcher.fire('keyframe', layer, this.#currentTime);
		});
		this.#track_canvas.addEventListener('mouseout', () => {
			this.#pointer = null;
		});
		style(this.#track_canvas, {
			position: 'absolute',
			top: TIME_SCROLLER_HEIGHT + 'px',
			left: '0px',
			// border: '1px solid green'
		});

		this.#scroll_canvas = new Canvas(LayoutConstants.width, TIME_SCROLLER_HEIGHT);
		style(this.#scroll_canvas.dom, {
			position: 'absolute',
			top: '0px',
			left: '10px',
			// border: '2px solid blue'
		});
		this.#scroll_canvas.uses(new ScrollCanvas(dispatcher, data));

		this.#dom = document.createElement('div');
		this.#dom.id = 'timeline-panel';
		this.#dom.appendChild(this.#track_canvas);
		this.#dom.appendChild(this.#scroll_canvas.dom);
		this.#scroll_canvas.dom.id = 'scroll-canvas';
		this.#track_canvas.id = 'track-canvas';

		this.resize();

		this.#ctx = this.#track_canvas.getContext('2d');
		this.#ctx_wrap = proxy_ctx(this.#ctx, this.#dpr);

		this.#time_scale = LayoutConstants.time_scale;

		this.#track_canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

		this.repaint();

		const handleDown = (e) => {
			this.#mousedown2 = true;
			this.#pointer = {
				x: e.offsetx,
				y: e.offsety
			};
			this.pointerEvents();

			if (!this.#mousedownItem) {
				this.#dispatcher.fire('time.update', this.x_to_time(e.offsetx));
			}
		};

		const handleMove = (e) => {
			this.#mousedown2 = false;
			if (this.#mousedownItem) {
				this.#mouseDownThenMove = true;
				if (this.#mousedownItem.mousedrag) {
					this.#mousedownItem.mousedrag(e);
				}
			} else {
				this.#dispatcher.fire('time.update', this.x_to_time(e.offsetx));
			}
		};

		const handleUp = (e) => {
			if (this.#mouseDownThenMove) {
				this.#dispatcher.fire('keyframe.move');
			} else {
				this.#dispatcher.fire('time.update', this.x_to_time(e.offsetx));
			}
			this.#mousedown2 = false;
			this.#mousedownItem = null;
			this.#mouseDownThenMove = false;
		};

		handleDrag(this.#track_canvas, handleDown, handleMove, handleUp);
	}

	scrollTo(top, left) {
		this.#scrollTop = top * Math.max(this.#targets.length * LINE_HEIGHT - this.#SCROLL_HEIGHT, 0);
		this.repaint();
	}

	resize() {
		const h = (LayoutConstants.height - TIME_SCROLLER_HEIGHT);
		this.#dpr = window.devicePixelRatio;
		this.#track_canvas.width = LayoutConstants.width * this.#dpr;
		this.#track_canvas.height = h * this.#dpr;
		this.#track_canvas.style.width = LayoutConstants.width + 'px';
		this.#track_canvas.style.height = h + 'px';
		this.#SCROLL_HEIGHT = LayoutConstants.height - TIME_SCROLLER_HEIGHT;
		this.#scroll_canvas.setSize(LayoutConstants.width, TIME_SCROLLER_HEIGHT);
	}

	repaint() {
		this.#needsRepaint = true;
	}

	paint() {
		this._paint();
	}

	drawLayerContents() {
		this.#renderItems = [];
		// horizontal Layer lines
		if (!this.#targets || this.#targets.length === 0) {
			return;
		}

		let next_target_gap = 0;
		for (let i = 0; i < this.#targets.length; i++) {
			const layers = this.#targets[i].layers;
			for (let j = 0; j <= layers.length + 1; j++) {
				this.#ctx.strokeStyle = Theme.b;
				this.#ctx.beginPath();
				let y = next_target_gap + j * LINE_HEIGHT;
				y = ~~y - 0.5;
				this.#ctx_wrap
					.moveTo(0, y)
					.lineTo(LayoutConstants.width, y)
					.stroke();
			}
			next_target_gap += (layers.length + 2) * LINE_HEIGHT;
		}

		// Draw Easing Rects
		next_target_gap = 0;
		for (let i = 0; i < this.#targets.length; i++) {
			next_target_gap += LINE_HEIGHT;
			const layers = this.#targets[i].layers;
			for (let j = 0; j < layers.length; j++) {
				const layer = layers[j];
				const frames = layer.frames;
				const y = next_target_gap + j * LINE_HEIGHT;

				for (let k = 0; k < frames.length - 1; k++) {
					const frame1 = frames[k];
					const frame2 = frames[k + 1];

					// Draw Tween Rect
					const x1 = this.time_to_x(frame1.time);
					const x2 = this.time_to_x(frame2.time);

					if (!frame1.tween || frame1.tween == 'none') continue;

					const y1 = y + 2;
					const y2 = y + LINE_HEIGHT - 2;

					this.#renderItems.push(new EasingRect(this, this.#track_canvas, x1, y1, x2, y2, frame1, frame2));
				}

				for (let j = 0; j < frames.length; j++) {
					const frame = frames[j];
					this.#renderItems.push(new Diamond(this.#dispatcher, this, this.#ctx_wrap, this.#track_canvas, frame, y));
				}
			}
			next_target_gap += layers.length * LINE_HEIGHT;
		}

		for (let i = 0, il = this.#renderItems.length; i < il; i++) {
			let item = this.#renderItems[i];
			item.paint(this.#ctx);
		}
	}

	timeScaled() {
		/*
			* Subdivison LOD
			* time_scale refers to number of pixels per unit
			* Eg. 1 inch - 60s, 1 inch - 60fps, 1 inch - 6 mins
		*/
		let div = 60;
		this.#tickMark1 = this.#time_scale / div;
		this.#tickMark2 = 2 * this.#tickMark1;
		this.#tickMark3 = 10 * this.#tickMark1;
	}

	setTimeScale() {
		const v = this.#data.get('ui:timeScale').value;
		if (this.#time_scale !== v) {
			this.#time_scale = v;
			this.timeScaled();
		}
	}

	check() {
		let item;
		let last_over = this.#over;
		this.#over = null;
		for (let i = this.#renderItems.length; i-- > 0;) {
			item = this.#renderItems[i];
			item.path(this.#ctx_wrap);
			if (this.#ctx.isPointInPath(this.#pointer.x * this.#dpr, this.#pointer.y * this.#dpr)) {
				this.#over = item;
				break;
			}
		}
		if (last_over && last_over != this.#over) {
			item = last_over;
			if (item.mouseout) item.mouseout();
		}
		if (this.#over) {
			item = this.#over;
			if (item.mouseover) item.mouseover();
			if (this.#mousedown2) {
				this.#mousedownItem = item;
			}
		}
	}

	pointerEvents() {
		if (!this.#pointer) return;
		this.#ctx_wrap
			.save()
			.scale(this.#dpr, this.#dpr)
			.translate(0, MARKER_TRACK_HEIGHT)
			.beginPath()
			.rect(0, 0, LayoutConstants.width, this.#SCROLL_HEIGHT)
			.translate(-this.#scrollLeft, -this.#scrollTop)
			.clip()
			.run(this.check.bind(this))
			.restore();
	}

	_paint() {
		if (!this.#needsRepaint) {
			this.pointerEvents();
			return;
		}
		this.#scroll_canvas.repaint();

		this.setTimeScale();

		this.#currentTime = this.#data.get('ui:currentTime').value;
		this.#frame_start = this.#data.get('ui:scrollTime').value;
		console.log('this.#frame_start: ', this.#frame_start);

		// background
		this.#ctx.fillStyle = Theme.a;
		this.#ctx.clearRect(0, 0, this.#track_canvas.width, this.#track_canvas.height);
		this.#ctx.save();
		this.#ctx.scale(this.#dpr, this.#dpr);

		this.#ctx.lineWidth = 1; // .5, 1, 2

		const width = LayoutConstants.width;
		const height = LayoutConstants.height;

		let units = this.#time_scale / this.#tickMark1;
		const offsetUnits = (this.#frame_start * this.#time_scale) % units;
		let count = (width - this.#LEFT_GUTTER + offsetUnits) / units;

		for (let i = 0; i < count; i++) {
			const x = i * units + this.#LEFT_GUTTER - offsetUnits;
			// draw vertical lines
			this.#ctx.strokeStyle = Theme.b;
			this.#ctx.beginPath();
			this.#ctx.moveTo(x, 0);
			this.#ctx.lineTo(x, height);
			this.#ctx.stroke();

			// draw time index
			this.#ctx.fillStyle = Theme.d;
			this.#ctx.textAlign = 'center';
			let t = (i * units - offsetUnits) / this.#time_scale + this.#frame_start;
			t = utils.format_friendly_seconds(t);
			this.#ctx.fillText(t, x, MARKER_TRACK_HEIGHT);
		}

		this.#ctx.moveTo(13, 35);
			this.#ctx.lineTo(13, 38);
			this.#ctx.stroke();

		units = this.#time_scale / this.#tickMark2;
		count = (width - this.#LEFT_GUTTER + offsetUnits) / units;

		// marker lines - main
		for (let i = 0; i < count; i++) {
			this.#ctx.strokeStyle = Theme.c;
			this.#ctx.beginPath();
			const x = i * units + this.#LEFT_GUTTER - offsetUnits;
			const y = MARKER_TRACK_HEIGHT - 29;
			const h = 16;
			this.#ctx.moveTo(x, y);
			this.#ctx.lineTo(x, y + h);
			this.#ctx.stroke();
		}

		const mul = this.#tickMark3 / this.#tickMark2;
		units = this.#time_scale / this.#tickMark3;
		count = (width - this.#LEFT_GUTTER + offsetUnits) / units;

		// small ticks
		for (let i = 0; i < count; i++) {
			if (i % mul === 0) continue;
			this.#ctx.strokeStyle = Theme.c;
			this.#ctx.beginPath();
			const x = i * units + this.#LEFT_GUTTER - offsetUnits;
			const y = MARKER_TRACK_HEIGHT - 23;
			const h = 10;
			this.#ctx.moveTo(x, y);
			this.#ctx.lineTo(x, y + h);
			this.#ctx.stroke();
		}

		// Encapsulate a scroll rect for the layers
		this.#ctx_wrap
			.save()
			.translate(0, MARKER_TRACK_HEIGHT)
			.beginPath()
			.rect(0, 0, LayoutConstants.width, this.#SCROLL_HEIGHT)
			.translate(-this.#scrollLeft, -this.#scrollTop)
			.clip()
			.run(this.drawLayerContents.bind(this))
			.restore();

		//-----Current Marker------
		this.#ctx.strokeStyle = 'red'; // Theme.c
		const x = (this.#currentTime - this.#frame_start) * this.#time_scale + this.#LEFT_GUTTER;
		const txt = utils.format_friendly_seconds(this.#currentTime);
		const textWidth = this.#ctx.measureText(txt).width;
		const base_line = MARKER_TRACK_HEIGHT - 18;
		const half_rect = textWidth / 2 + 4;
		// draw cursor vertical line
		this.#ctx.beginPath();
		this.#ctx.moveTo(x, base_line);
		this.#ctx.lineTo(x, height);
		this.#ctx.stroke();
		// draw cursor bound
		this.#ctx.fillStyle = 'red';
		this.#ctx.textAlign = 'center';
		this.#ctx.beginPath();
		this.#ctx.moveTo(x, base_line + 5);
		this.#ctx.lineTo(x + 5, base_line);
		this.#ctx.lineTo(x + half_rect, base_line);
		this.#ctx.lineTo(x + half_rect, base_line - 14);
		this.#ctx.lineTo(x - half_rect, base_line - 14);
		this.#ctx.lineTo(x - half_rect, base_line);
		this.#ctx.lineTo(x - 5, base_line);
		this.#ctx.closePath();
		this.#ctx.fill();
		// draw current time cursor
		this.#ctx.fillStyle = 'white';
		this.#ctx.fillText(txt, x, base_line - 4);
		this.#ctx.restore();

		this.#needsRepaint = false;
	}

	y_to_track(y) { 
		if (y - MARKER_TRACK_HEIGHT < 0) {
			return -1;
		}
		for(let i = 0; i < this.#renderItems.length; i++) {
			const item = this.#renderItems[i];
			if(item instanceof EasingRect) {
				const y2 = item.position.y2
				if(y <= y2 && y2 - y <= LINE_HEIGHT) {
					return item;
				}
			}
		}
		return -1;
		// return (y - MARKER_TRACK_HEIGHT + this.#scrollTop) / LINE_HEIGHT | 0;
	}

	x_to_time(x) {
		const units = this.#time_scale / this.#tickMark3;
		return this.#frame_start + ((x - this.#LEFT_GUTTER) / units | 0) / this.#tickMark3;
	}

	time_to_x(s) {
		let ds = s - this.#frame_start;
		ds *= this.#time_scale;
		ds += this.#LEFT_GUTTER;
		return ds;
	}

	onPointerMove(x, y) {
		if (this.#mousedownItem) return;
		this.#pointer = { x, y };
		// console.log('Pointer: ', this.#pointer);
	}

	onMouseMove(e) {
		// console.log('TimelinePanel.onMouseMove');
		this.#canvasBounds = this.#track_canvas.getBoundingClientRect();
		const mx = e.clientX - this.#canvasBounds.left;
		const my = e.clientY - this.#canvasBounds.top;
		this.onPointerMove(mx, my);
	}

	// setState(state) {
	// 	this.#data = state.value;
	// 	this.repaint();
	// }

	set data(data) {
		this.#data = data;
		this.#targets = data.get('targets').value;
		this.repaint();
	}

	get dom() {
		return this.#dom;
	}
}

export { TimelinePanel };