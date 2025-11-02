/* eslint-disable */
import { Dispatcher } from './utils/dispatcher.js';
import { Theme } from './theme.js';
import { LayoutConstants as Settings } from './layout_constants.js';
import { utils } from './utils/utils.js';
import { TimelineCollection } from './views/timeline-collection.js';
import { TargetCollection } from './views/target-collection.js';
import { TimelinePanel } from './views/timeline-panel.js';
import './styles/css-loader.js';
const style = utils.style;

const Z_INDEX = 999;

const TIMELINE_TEMPLATE = {
	id: 'fake-timeline',
	name: "",
	ui: {
		currentTime: 0,
		totalTime: Settings.default_length,
		scrollTime: 0,
		timeScale: Settings.time_scale
	},
	targets: []
};

class LayerProp {
	constructor(name) {
		this.name = name;
		this.frames = [];
	}
}

class TargetProp {
	constructor(id, name) {
		this.id = id;
		this.name = name;
		this.ui = {
			expand: true
		};
		this.layers = [];
	}
}

class Timeliner {
	#options;
	#dispatcher;
	#data;
	#layers;
	#timeline_collection;
	#timeline_panel;
	#target_collection;
	#start_play = null;
	#played_from = 0; // requires some more tweaking
	#needs_resize = true;
	#subDom = document.createElement('div');
	#dom = document.createElement('div');
	#selected_timeline = null;

	constructor(data, container, options) {
		this.#dispatcher = new Dispatcher();
		this.#data = data;
		this.#selected_timeline = this.#data.timelines.length > 0 ? this.#data.timelines[0] : {
			ui: {
				currentTime: 0,
				totalTime: 20,
				scrollTime: 0,
				timeScale: 60,
			},
			targets: []
		};
		this.#timeline_collection = new TimelineCollection(this.#data.timelines, this.#dispatcher);
		this.#target_collection = new TargetCollection(this.#selected_timeline, this.#dispatcher);
		this.#timeline_panel = new TimelinePanel(this.#selected_timeline, this.#dispatcher);

		this.#options = options;
		this.#dispatcher.on('keyframe', (target, layer) => {
			const currentTime = this.#selected_timeline.ui.currentTime;
			const timeInLayer = utils.findTimeinLayer(layer, currentTime);
			if (typeof (timeInLayer) === 'number') {
				layer.frames.splice(timeInLayer, 0, {
					time: currentTime,
					value: layer._value,
					_color: '#' + (Math.random() * 0xffffff | 0).toString(16)
				});
			} else {
				layer.frames.splice(timeInLayer.index, 1);
			}
			this.#repaintAll();
		});
		this.#dispatcher.on('layer.remove', (target, layer) => {
			target.layers.splice(target.layers.indexOf(layer), 1);
			if (target.layers.length == 0) {
				this.#selected_timeline.targets.splice(this.#selected_timeline.targets.indexOf(target), 1);
			}
			this.#repaintAll();
		});
		
		this.#dispatcher.on('value.change', (layer, value, dont_save) => {
			if (layer._mute) {
				return;
			}
			const currentTime = this.#selected_timeline.get('ui:currentTime').value;
			const timeInLayer = utils.findTimeinLayer(layer, currentTime);
			if (typeof (timeInLayer) === 'number') {
				layer.frames.splice(timeInLayer, 0, {
					time: currentTime,
					value: value,
					_color: '#' + (Math.random() * 0xffffff | 0).toString(16)
				});
				if (!dont_save) {
				}
			} else {
				timeInLayer.object.value = value;
				if (!dont_save) {
				}
			}
			this.#repaintAll();
		});
		this.#dispatcher.on('action:mute', (layer, mute) => {
			layer._mute = mute;
			// When a track is mute, playback does not play
			// frames of those muted layers.

			// also feels like hidden feature in photoshop

			// when values are updated, eg. from slider,
			// no tweens will be created.
			// we can decide also to "lock in" layers
			// no changes to tween will be made etc.
		});
		this.#dispatcher.on('ease', (layer, ease_type) => {
			const currentTime = this.#selected_timeline.get('ui:currentTime').value;
			const timeInLayer = utils.timeAtLayer(layer, currentTime);
			if (timeInLayer && timeInLayer.entry) {
				timeInLayer.entry.tween = ease_type;
			}
			this.#repaintAll();
		});
		this.#dispatcher.on('controls.toggle_play', () => {
			if(this.#selected_timeline.targets.length == 0) {
				return;
			}
			if (this.#start_play) {
				this.pausePlaying();
			} else {
				this.startPlaying();
			}
		});
		this.#dispatcher.on('controls.restart_play', () => {
			if (!this.#start_play) {
				this.startPlaying();
			}
			this.setCurrentTime(this.#played_from);
		});
		this.#dispatcher.on('controls.pause', () => {
			this.pausePlaying();
		});
		this.#dispatcher.on('controls.stop', () => {
			if(this.#selected_timeline.targets.length == 0) {
				return;
			}
			this.pausePlaying();
		});
		this.#dispatcher.on('controls.stop', () => {
			if(this.#selected_timeline.targets.length == 0) {
				return;
			}
			if (this.#start_play !== null) {
				this.pausePlaying();
			}
			this.setCurrentTime(0);
		});
		this.#dispatcher.on('time.update', (time) => {
			this.#selected_timeline.ui.currentTime = time;
			this.#repaintAll();
		});
		this.#dispatcher.on('totalTime.update', (value) => {
			// context.totalTime = value;
			// controller.setDuration(value);
			// timeline.repaint();
		});
		this.#dispatcher.on('update.scrollTime', (time) => {
			time = Math.max(0, time);
			this.#selected_timeline.ui.scrollTime = time;
			this.#repaintAll();
		});
		this.#dispatcher.on('update.scale', (timeScale) => {
			console.log('update.scale', timeScale);
			this.#selected_timeline.ui.timeScale = timeScale;
			this.#timeline_panel.repaint();
		});
		this.#dispatcher.on('state:save', (description) => {
			this.#dispatcher.fire('status', description);
			this.save('autosave');
		});
		// this.#dispatcher.on('status', this.setStatus.bind(this));
		this.#dispatcher.on('timeline.select', (timeline) => {
			this.#timeline_panel.data = timeline;
			this.#target_collection.data = timeline;
			this.#selected_timeline = timeline;
		});
		this.#dispatcher.on('timeline.add', () => {
			const timeline = JSON.parse(JSON.stringify(TIMELINE_TEMPLATE));
			timeline.name = 'Untitled timeline';
			timeline.id = utils.generateUUID();
			this.#data.timelines.push(timeline);
			this.#selected_timeline = timeline;
			this.#repaintAll();
		});
		this.#dispatcher.on('timeline.remove', (timeline) => {
			this.#data.timelines.splice(this.#data.timelines.indexOf(timeline), 1);
			if (this.#selected_timeline === timeline) {
				this.#selected_timeline = this.#data.timelines.length > 0 ? this.#data.timelines[0] : TIMELINE_TEMPLATE;
			}
			this.#repaintAll();
		});
		this.#dispatcher.on('target.ui.expand', (state) => {
			this.#timeline_panel.data = this.#selected_timeline;
		});

		this.#subDom.appendChild(this.#timeline_collection.dom);
		this.#subDom.appendChild(this.#target_collection.dom);
		this.#subDom.appendChild(this.#timeline_panel.dom);
		// this.#subDom.appendChild(this.#vertical_scroll_bar.dom);

		this.#dom.appendChild(this.#subDom);

		style(this.#dom, {
			position: 'relative',
			margin: 0,
			border: '1px solid ' + Theme.a,
			padding: 0,
			overflow: 'hidden',
			backgroundColor: Theme.a,
			color: Theme.d,
			zIndex: Z_INDEX,
			fontFamily: 'monospace',
			fontSize: '12px'
		});
		container.appendChild(this.#dom);
		this.paint();
	}

	startPlaying() {
		this.#start_play = performance.now() - this.#selected_timeline.ui.currentTime * 1000;
		this.#target_collection.setControlStatus(true);
		if (this.#options?.dispatcherEventCb) {
			if (this.#selected_timeline.ui.currentTime > 0) {
				this.#options.dispatcherEventCb("resume");
			} else {
				this.#options.dispatcherEventCb("start");
			}
		}
	}

	pausePlaying() {
		this.#start_play = null;
		this.#target_collection.setControlStatus(false);
		if (this.#options?.dispatcherEventCb) {
			this.#options.dispatcherEventCb("pause");
		}
	}

	setCurrentTime(time) {
		time = Math.max(0, time);
		this.#selected_timeline.ui.currentTime = time;
		if (this.#start_play) {
			this.#start_play = performance.now() - time * 1000;
		}
		this.#repaintAll();
		if (this.#options?.dispatcherEventCb) {
			this.#options.dispatcherEventCb("change-time", this.#selected_timeline.ui.currentTime);
		}
	}

	paint() {
		requestAnimationFrame(this.paint.bind(this));
		if (this.#start_play) {
			const time = (performance.now() - this.#start_play) / 1000;
			this.setCurrentTime(time);
			if (time > this.#selected_timeline.ui.totalTime) {
				this.#start_play = performance.now();
			}
		}
		if (this.#needs_resize) {
			this.#subDom.style.width = Settings.width + 'px';
			this.#subDom.style.height = Settings.height + 'px';
			this.restyle(this.#timeline_collection.dom, this.#target_collection.dom, this.#timeline_panel.dom);
			this.#timeline_panel.resize();
			this.#repaintAll();
			this.#needs_resize = false;
			this.#dispatcher.fire('resize');
		}
		this.#timeline_panel._paint();
	}


	loadJSONString(stringData) {
		try {
			const jsonData = JSON.parse(stringData);
			this.loadData(jsonData);
		} catch (error) {
			throw error;
		}
	}

	loadData(jsonData) {
		this.#data.setJSON(jsonData);
		if (this.#data.getValue('ui') === undefined) {
			this.#data.setValue('ui', {
				currentTime: 0,
				totalTime: Settings.default_length,
				scrollTime: 0,
				timeScale: Settings.time_scale
			});
		}
	}

	#repaintAll() {
		if (!this.#selected_timeline) { return; }
		const currentTime = this.#selected_timeline.ui.currentTime;

		this.#timeline_collection.data = this.#data.timelines;
		this.#timeline_collection.updateSelected(this.#selected_timeline.id);

		this.#target_collection.data = this.#selected_timeline;
		this.#target_collection.updateStateAtTime(currentTime);

		this.#timeline_panel.data = this.#selected_timeline;
		this.#timeline_panel.repaint(currentTime);
	}

	resize(width, height) {
		// width -= 4;
		Settings.width = width - Settings.LEFT_PANE_WIDTH;
		Settings.height = height;
		Settings.TIMELINE_SCROLL_HEIGHT = height - Settings.MARKER_TRACK_HEIGHT;
		this.#needs_resize = true;
	}

	restyle(timelineCabinet, layerCabinet, panel) {
		style(timelineCabinet, {
			position: 'absolute',
			left: '0px',
			top: '0px',
			// height: Settings.height + 'px',
			width: Settings.LEFT_PANE_WIDTH + 'px',
			overflow: 'hidden',
			// border: '2px solid yellow'
		});
		style(layerCabinet, {
			position: 'absolute',
			left: Settings.LEFT_PANE_WIDTH + 'px',
			top: '0px',
			height: Settings.height + 'px',
			width: Settings.LEFT_PANE_WIDTH + 'px',
			overflow: 'hidden',
			// border: '2px solid yellow'
		});

		style(panel, {
			position: 'absolute',
			left: 2 * Settings.LEFT_PANE_WIDTH + 'px',
			top: '0px',
			// border: '2px solid yellow'
		});
	}

	// API functions
	addLayerToTarget(targetID, layerName) {
		if(!this.#selected_timeline) {
			return;
		}
		const target = this.#selected_timeline.targets.find(t => t.id == targetID);
		if (!target) {
			throw new Error('Target not found');
		}
		target.layers.push(new LayerProp(layerName));
		this.#repaintAll();
	}

	addTarget({ id, name }) {
		if(!this.#selected_timeline) {
			return;
		}
		this.#selected_timeline.targets.push(new TargetProp(id, name));
		this.#repaintAll();
	}

	removeLayerFromTarget(targetID, layerName) {
		const target = this.#selected_timeline.targets.find(t => t.id == targetID);
		if (!target) {
			throw new Error('Target not found');
		}
		const layer = target.layers.find(l => l.name == layerName);
		if (!layer) {
			throw new Error('Layer not found');
		}
		target.layers.splice(target.layers.indexOf(layer), 1);
		if (target.layers.length == 0) {
			this.#selected_timeline.targets.splice(this.#selected_timeline.targets.indexOf(target), 1);
		}
		this.#repaintAll();
	}

	getValueRanges(ranges, interval) {
		interval = interval ? interval : 0.15;
		ranges = ranges ? ranges : 2;
		const currentTime = this.#selected_timeline.get('ui:currentTime').value;
		const values = [];
		for (let u = -ranges; u <= ranges; u++) {
			const o = {};
			for (const l = 0; l < this.#layers.length; l++) {
				const layer = this.#layers[l];
				const m = utils.timeAtLayer(layer, currentTime + u * interval);
				o[layer.name] = m.value;
			}
			values.push(o);
		}
		return values;
	}

	getValueJson = () => {
		return JSON.stringify(this.#data);
	}
}

window.Timeliner = Timeliner;

export { Timeliner }