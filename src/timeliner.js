/* eslint-disable */
import { UndoManager, UndoState } from './utils/util_undo.js'
import { Dispatcher } from './utils/util_dispatcher.js'
import { Theme } from './theme.js'
import { LayoutConstants as Settings } from './layout_constants.js';
import { utils } from './utils/utils.js'
import { TimelineCabinet } from './views/timeline_cabinet.js';
import { LayerCabinet } from './views/layer_cabinet.js'
import { TimelinePanel } from './views/panel.js'
import './styles/css-loader.js' // Auto-load CSS with pseudo-classes
var style = utils.style
var saveToFile = utils.saveToFile
var STORAGE_PREFIX = utils.STORAGE_PREFIX
import { ScrollBar } from './ui/scrollbar.js'
import { DataStore } from './utils/util_datastore.js'

const Z_INDEX = 999;

class LayerProp {
	constructor(name) {
		this.name = name;
		this.values = [];
		this._value = 0;
		this._color = '#' + (Math.random() * 0xffffff | 0).toString(16);
	}
}

class Timeliner {
	#options;
	#dispatcher;
	#data;
	#layer_store;
	#layers;
	#undo_manager;
	#timeline_cabinet;
	#timeline_panel;
	#layer_cabinet;
	#start_play = null;
	#played_from = 0; // requires some more tweaking
	#needs_resize = true;
	#subDom = document.createElement('div');
	#dom = document.createElement('div');
	#vertical_scroll_bar = new ScrollBar(200, 10);
	#selected_timeline = null;

	constructor(data, container, options) {
		this.#dispatcher = new Dispatcher();
		this.#data = new DataStore(data);
		this.#selected_timeline = this.#data.get('timelines:0');
		this.#undo_manager = new UndoManager(this.#dispatcher);
		this.#timeline_cabinet = new TimelineCabinet(this.#data.get('timelines'), this.#dispatcher);
		this.#layer_cabinet = new LayerCabinet(this.#selected_timeline, this.#dispatcher);
		this.#timeline_panel = new TimelinePanel(this.#selected_timeline, this.#dispatcher);

		this.#options = options;
		this.#dispatcher.on('keyframe', (layer, value) => {
			const currentTime = this.#selected_timeline.get('ui:currentTime').value;
			const timeInLayer = utils.findTimeinLayer(layer, currentTime);
			if (typeof (timeInLayer) === 'number') {
				layer.frames.splice(timeInLayer, 0, {
					time: currentTime,
					value: value,
					_color: '#' + (Math.random() * 0xffffff | 0).toString(16)
				});
				this.#undo_manager.save(new UndoState(this.#data, 'Add Keyframe'));
			} else {
				console.log('remove from index', timeInLayer);
				layer.frames.splice(timeInLayer.index, 1);
				this.#undo_manager.save(new UndoState(this.#data, 'Remove Keyframe'));
			}
			this.repaintAll();
		});
		this.#dispatcher.on('layer.remove', (layer) => {
			let paths = layer.path;
			paths = paths.split(':');
			const index = parseInt(paths[paths.length - 1]);
			paths.splice(paths.length - 1, 1);
			const layers = this.#data.get(paths.join(':'));
			layers.value.splice(index, 1);
			if(layers.value.length == 0) {
				const index = parseInt(paths[paths.length -2]);
				paths.splice(paths.length -2, 2);
				const targets = this.#data.get(paths.join(':'));
				targets.value.splice(index, 1);
			}
			this.#undo_manager.save(new UndoState(this.#data, 'Remove Layer'));
			// trigger to reinit
			// this.#layer_cabinet.createLayers(this.#selected_timeline);
			this.#layer_cabinet.data = this.#selected_timeline;

			this.repaintAll();
		});
		this.#dispatcher.on('keyframe.move', (layer, value) => {
			this.#undo_manager.save(new UndoState(this.#data, 'Move Keyframe'));
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
					this.#undo_manager.save(new UndoState(this.#data, 'Add value'));
				}
			} else {
				timeInLayer.object.value = value;
				if (!dont_save) {
					this.#undo_manager.save(new UndoState(this.#data, 'Update value'));
				}
			}
			this.repaintAll();
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
			this.#undo_manager.save(new UndoState(this.#data, 'Add Ease'));
			this.repaintAll();
		});
		this.#dispatcher.on('controls.toggle_play', () => {
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
			if (this.#start_play !== null) {
				this.pausePlaying();
			}
			this.setCurrentTime(0);
		});
		this.#dispatcher.on('time.update', (time) => {
			this.#selected_timeline.get('ui:currentTime').value = time;
			this.repaintAll();
		});
		this.#dispatcher.on('totalTime.update', (value) => {
			// context.totalTime = value;
			// controller.setDuration(value);
			// timeline.repaint();
		});
		this.#dispatcher.on('update.scrollTime', (time) => {
			time = Math.max(0, time);
			this.#selected_timeline.get('ui:scrollTime').value = time;
			this.repaintAll();
		});
		// this.#dispatcher.on('target.notify', (name, value) => {
		// 	if (this.#target) {
		// 		this.#target[name] = value;
		// 	}
		// });
		this.#dispatcher.on('update.scale', (timeScale) => {
			this.#selected_timeline.get('ui:timeScale').value = timeScale;
			this.#timeline_panel.repaint();
		});
		this.#dispatcher.on('controls.undo', () => {
			const history = this.#undo_manager.undo();
			if(!history) { return; }
			this.#data.setJSONString(history.state);
			this.updateState();
		});
		this.#dispatcher.on('controls.redo', () => {
			const history = this.#undo_manager.redo();
			this.#data.setJSONString(history.state);
			this.updateState();
		});
		this.#dispatcher.on('export', this.exportJSON.bind(this));
		this.#dispatcher.on('save', this.saveSimply.bind(this));
		this.#dispatcher.on('save_as', this.saveAs.bind(this));
		this.#dispatcher.on('state:save', (description) => {
			this.#dispatcher.fire('status', description);
			this.save('autosave');
		});
		// this.#dispatcher.on('status', this.setStatus.bind(this));
		this.#dispatcher.on('timeline.select', (timeline) => {
			this.#timeline_panel.data = timeline;
			this.#layer_cabinet.data = timeline;
			this.#selected_timeline = timeline;
		});
		this.#dispatcher.on('target.ui.expand', (state) => {
			this.#timeline_panel.data = this.#selected_timeline;
			// console.log('target.ui.expand: ', state)
		});


		this.#vertical_scroll_bar.onScroll.do((type, scrollTo) => {
			switch (type) {
				case 'scrollto':
					this.#layer_cabinet.scrollTo(scrollTo);
					this.#timeline_panel.scrollTo(scrollTo);
					break;
			}
		});

		this.#subDom.appendChild(this.#timeline_cabinet.dom);
		this.#subDom.appendChild(this.#layer_cabinet.dom);
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

		setTimeout(() => {
			this.#undo_manager.save(new UndoState(this.#data, 'Loaded'), true);
		});
	}

	startPlaying() {
		this.#start_play = performance.now() - this.#selected_timeline.get('ui:currentTime').value * 1000;
		this.#layer_cabinet.setControlStatus(true);
		if (this.#options?.dispatcherEventCb) {
			if (this.#selected_timeline.get('ui:currentTime').value > 0) {
				this.#options.dispatcherEventCb("resume");
			} else {
				this.#options.dispatcherEventCb("start");
			}
		}
	}

	pausePlaying() {
		this.#start_play = null;
		this.#layer_cabinet.setControlStatus(false);
		if (this.#options?.dispatcherEventCb) {
			this.#options.dispatcherEventCb("pause");
		}
	}

	setCurrentTime(time) {
		time = Math.max(0, time);
		this.#selected_timeline.get('ui:currentTime').value = time;
		if (this.#start_play) {
			this.#start_play = performance.now() - time * 1000;
		}
		this.repaintAll();
		if (this.#options?.dispatcherEventCb) {
			this.#options.dispatcherEventCb("change-time", this.#selected_timeline.get('ui:currentTime').value);
		}
	}

	paint() {
		requestAnimationFrame(this.paint.bind(this));
		if (this.#start_play) {
			const time = (performance.now() - this.#start_play) / 1000;
			this.setCurrentTime(time);
			if (time > this.#data.get('ui:totalTime').value) {
				this.#start_play = performance.now();
			}
		}
		if (this.#needs_resize) {
			this.#subDom.style.width = Settings.width + 'px';
			this.#subDom.style.height = Settings.height + 'px';
			this.restyle(this.#timeline_cabinet.dom, this.#layer_cabinet.dom, this.#timeline_panel.dom);
			this.#timeline_panel.resize();
			this.repaintAll();
			this.#needs_resize = false;
			this.#dispatcher.fire('resize');
		}
		this.#timeline_panel._paint();
	}

	save(name) {
		if (!name) {
			name = 'autosave';
		}
		const timeLineData = this.#data.getJSONString();
		try {
			localStorage[STORAGE_PREFIX + name] = timeLineData;
			this.#dispatcher.fire('save:done');
		} catch (e) {
			console.log('Cannot save', name, timeLineData);
		}
	}

	saveAs(name) {
		if (!name) name = this.#data.get('name').value;
		name = prompt('Pick a name to save to (localStorage)', name);
		if (name) {
			this.#data.data.name = name;
			this.save(name);
		}
	}

	saveSimply() {
		const name = this.#data.get('name').value;
		if (name) {
			this.save(name);
		} else {
			this.saveAs(name);
		}
	}

	exportJSON() {
		const timelinerData = this.#data.getJSONString();
		const fileName = 'timeliner-data' + '.json';
		saveToFile(timelinerData, fileName);
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
		this.#undo_manager.clear();
		this.#undo_manager.save(new UndoState(this.#data, 'Loaded'), true);
		this.updateState();
	}

	updateState() {
		this.#layer_cabinet.data = this.#selected_timeline;
		// this.#timeline_panel.setState(this.#selected_timeline);
		this.repaintAll();
	}

	repaintAll() {
		// const contentHeight = this.#layers.length * Settings.LINE_HEIGHT;
		// this.#vertical_scroll_bar.setLength(Settings.TIMELINE_SCROLL_HEIGHT / contentHeight);
		const currentTime = this.#selected_timeline.get('ui:currentTime').value;
		this.#layer_cabinet.updateStateAtTime(currentTime);
		this.#timeline_panel.repaint(currentTime);
	}

	resize(width, height) {
		width -= 4;
		// height -= 44;
		Settings.width = width - Settings.LEFT_PANE_WIDTH;
		Settings.height = height;
		Settings.TIMELINE_SCROLL_HEIGHT = height - Settings.MARKER_TRACK_HEIGHT;
		const scrollableHeight = Settings.TIMELINE_SCROLL_HEIGHT;
		this.#vertical_scroll_bar.setHeight(scrollableHeight - 2);
		style(this.#vertical_scroll_bar.dom, {
			top: Settings.MARKER_TRACK_HEIGHT + 'px',
			left: (width - 16) + 'px',
		});
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

	addLayer(name) {
		const layer = new LayerProp(name);
		this.#layers = this.#layer_store.value;
		this.#layers.push(layer);
		this.#layer_cabinet.data = this.#layer_store;
		this.#undo_manager.save(new UndoState(this.#data, 'Layer added'));
		this.repaintAll();
	}

	dispose() {
		const domParent = this.#dom.parentElement;
		domParent.removeChild(this.#dom);
	}

	// setTarget(target) {
	// 	this.#target = target;
	// }

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
		return this.#data.getJSONString();
	}
}

window.Timeliner = Timeliner;

export { Timeliner }