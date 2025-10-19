/* eslint-disable */
/*
 * @author Joshua Koo http://joshuakoo.com
 */

import { UndoManager, UndoState } from './utils/util_undo.js'
import { Dispatcher } from './utils/util_dispatcher.js'
import { Theme } from './theme.js'
import { LayoutConstants as Settings } from './layout_constants.js';
import { utils } from './utils/utils.js'
import { LayerCabinet } from './views/layer_cabinet.js'
import { TimelinePanel } from './views/panel.js'
import { IconButton } from './ui/icon_button.js'
import './styles/css-loader.js' // Auto-load CSS with pseudo-classes
var style = utils.style
var saveToFile = utils.saveToFile
var openAs = utils.openAs
var STORAGE_PREFIX = utils.STORAGE_PREFIX
import { ScrollBar } from './ui/scrollbar.js'
import { DataStore } from './utils/util_datastore.js'

var Z_INDEX = 999;

function LayerProp(name) {
	this.name = name;
	this.values = [];

	this._value = 0;

	this._color = '#' + (Math.random() * 0xffffff | 0).toString(16);
	/*
	this.max
	this.min
	this.step
	*/
}

function Timeliner(target, container, options) {
	// Dispatcher for coordination
	var dispatcher = new Dispatcher();

	// Data
	var data = new DataStore();
	var layer_store = data.get('layers');
	var layers = layer_store.value;

	window._data = data; // expose it for debugging

	// Undo manager
	var undo_manager = new UndoManager(dispatcher);

	// Views
	var timeLinePanel = new TimelinePanel(data, dispatcher);
	var layer_panel = new LayerCabinet(data, dispatcher);

	setTimeout(function () {
		// hack!
		undo_manager.save(new UndoState(data, 'Loaded'), true);
	});

	dispatcher.on('keyframe', function (layer, value) {
		var index = layers.indexOf(layer);

		var t = data.get('ui:currentTime').value;
		var v = utils.findTimeinLayer(layer, t);

		if (typeof (v) === 'number') {
			layer.values.splice(v, 0, {
				time: t,
				value: value,
				_color: '#' + (Math.random() * 0xffffff | 0).toString(16)
			});

			undo_manager.save(new UndoState(data, 'Add Keyframe'));
		} else {
			console.log('remove from index', v);
			layer.values.splice(v.index, 1);

			undo_manager.save(new UndoState(data, 'Remove Keyframe'));
		}

		repaintAll();

	});

	dispatcher.on('layer.remove', function (layer) {
		var index = layers.indexOf(layer);
		if (index > -1) {
			layers.splice(index, 1);

			undo_manager.save(new UndoState(data, 'Remove Layer'));
			repaintAll();
		}
	});

	dispatcher.on('keyframe.move', function (layer, value) {
		undo_manager.save(new UndoState(data, 'Move Keyframe'));
	});

	dispatcher.on('value.change', function (layer, value, dont_save) {
		if (layer._mute) return;

		var t = data.get('ui:currentTime').value;
		var v = utils.findTimeinLayer(layer, t);

		if (typeof (v) === 'number') {
			layer.values.splice(v, 0, {
				time: t,
				value: value,
				_color: '#' + (Math.random() * 0xffffff | 0).toString(16)
			});
			if (!dont_save) undo_manager.save(new UndoState(data, 'Add value'));
		} else {
			v.object.value = value;
			if (!dont_save) undo_manager.save(new UndoState(data, 'Update value'));
		}

		repaintAll();
	});

	dispatcher.on('action:mute', function (layer, mute) {
		layer._mute = mute;

		// When a track is mute, playback does not play
		// frames of those muted layers.

		// also feels like hidden feature in photoshop

		// when values are updated, eg. from slider,
		// no tweens will be created.
		// we can decide also to "lock in" layers
		// no changes to tween will be made etc.
	});

	dispatcher.on('ease', function (layer, ease_type) {
		var t = data.get('ui:currentTime').value;
		var v = utils.timeAtLayer(layer, t);
		if (v && v.entry) {
			v.entry.tween = ease_type;
		}

		undo_manager.save(new UndoState(data, 'Add Ease'));
		repaintAll();
	});

	var start_play = null,
		played_from = 0; // requires some more tweaking

	dispatcher.on('controls.toggle_play', function () {
		if (start_play) {
			pausePlaying();
		} else {
			startPlaying();
		}
	});

	dispatcher.on('controls.restart_play', function () {
		if (!start_play) {
			startPlaying();
		}

		setCurrentTime(played_from);
	});

	// dispatcher.on('controls.play', startPlaying);
	dispatcher.on('controls.pause', pausePlaying);

	function startPlaying() {
		start_play = performance.now() - data.get('ui:currentTime').value * 1000;
		layer_panel.setControlStatus(true);
		if (options?.dispatcherEventCb) {
			if (data.get('ui:currentTime').value > 0) {
				options.dispatcherEventCb("resume");
			} else {
				options.dispatcherEventCb("start");
			}
		}
	}

	function pausePlaying() {
		start_play = null;
		layer_panel.setControlStatus(false);
		if (options?.dispatcherEventCb) {
			options.dispatcherEventCb("pause");
		}
	}

	dispatcher.on('controls.stop', function () {
		if (start_play !== null) pausePlaying();
		setCurrentTime(0);
	});

	var currentTimeStore = data.get('ui:currentTime');
	dispatcher.on('time.update', setCurrentTime);

	dispatcher.on('totalTime.update', function (value) {
		// context.totalTime = value;
		// controller.setDuration(value);
		// timeline.repaint();
	});

	/* update scroll viewport */
	dispatcher.on('update.scrollTime', function (v) {
		v = Math.max(0, v);
		data.get('ui:scrollTime').value = v;
		repaintAll();
	});


	function setCurrentTime(value) {
		value = Math.max(0, value);
		currentTimeStore.value = value;

		if (start_play) start_play = performance.now() - value * 1000;
		repaintAll();
		if (options?.dispatcherEventCb) {
			options.dispatcherEventCb("change-time", currentTimeStore.value);
		}
		// layer_panel.repaint(s);
	}

	dispatcher.on('target.notify', function (name, value) {
		if (target) target[name] = value;
	});

	dispatcher.on('update.scale', function (v) {
		console.log('range', v);
		data.get('ui:timeScale').value = v;

		timeLinePanel.repaint();
	});

	// handle undo / redo
	dispatcher.on('controls.undo', function () {
		var history = undo_manager.undo();
		data.setJSONString(history.state);

		updateState();
	});

	dispatcher.on('controls.redo', function () {
		var history = undo_manager.redo();
		data.setJSONString(history.state);

		updateState();
	});

	/*
		Paint Routines
	*/

	function paint() {
		requestAnimationFrame(paint);

		if (start_play) {
			var t = (performance.now() - start_play) / 1000;
			setCurrentTime(t);


			if (t > data.get('ui:totalTime').value) {
				// simple loop
				start_play = performance.now();
			}
		}

		if (needsResize) {
			div.style.width = Settings.width + 'px';
			div.style.height = Settings.height + 'px';

			restyle(layer_panel.dom, timeLinePanel.dom);

			timeLinePanel.resize();
			repaintAll();
			needsResize = false;

			dispatcher.fire('resize');
		}

		timeLinePanel._paint();
	}

	paint();

	/*
		End Paint Routines
	*/

	function save(name) {
		if (!name) name = 'autosave';

		var json = data.getJSONString();

		try {
			localStorage[STORAGE_PREFIX + name] = json;
			dispatcher.fire('save:done');
		} catch (e) {
			console.log('Cannot save', name, json);
		}
	}

	function saveAs(name) {
		if (!name) name = data.get('name').value;
		name = prompt('Pick a name to save to (localStorage)', name);
		if (name) {
			data.data.name = name;
			save(name);
		}
	}

	function saveSimply() {
		var name = data.get('name').value;
		if (name) {
			save(name);
		} else {
			saveAs(name);
		}
	}

	function exportJSON() {
		var json = data.getJSONString();
		var ret = prompt('Hit OK to download otherwise Copy and Paste JSON', json);

		console.log(JSON.stringify(data.data, null, '\t'));
		if (!ret) return;

		// make json downloadable
		json = data.getJSONString('\t');
		var fileName = 'timeliner-test' + '.json';

		saveToFile(json, fileName);
	}

	function loadJSONString(o) {
		// should catch and check errors here
		var json = JSON.parse(o);
		load(json);
	}

	function load(o) {
		data.setJSON(o);
		//
		if (data.getValue('ui') === undefined) {
			data.setValue('ui', {
				currentTime: 0,
				totalTime: Settings.default_length,
				scrollTime: 0,
				timeScale: Settings.time_scale
			});
		}

		undo_manager.clear();
		undo_manager.save(new UndoState(data, 'Loaded'), true);

		updateState();
	}

	function updateState() {
		layers = layer_store.value; // FIXME: support Arrays
		layer_panel.setState(layer_store);
		timeLinePanel.setState(layer_store);

		repaintAll();
	}

	function repaintAll() {
		var content_height = layers.length * Settings.LINE_HEIGHT;
		scrollbar.setLength(Settings.TIMELINE_SCROLL_HEIGHT / content_height);

		layer_panel.repaint();
		timeLinePanel.repaint();
	}

	function promptImport() {
		var json = prompt('Paste JSON in here to Load');
		if (!json) return;
		console.log('Loading.. ', json);
		loadJSONString(json);
	}

	function open(title) {
		if (title) {
			loadJSONString(localStorage[STORAGE_PREFIX + title]);
		}
	}

	this.openLocalSave = open;

	dispatcher.on('import', function () {
		promptImport();
	}.bind(this));

	dispatcher.on('new', function () {
		data.blank();
		updateState();
	});

	dispatcher.on('openfile', function () {
		openAs(function (data) {
			// console.log('loaded ' + data);
			loadJSONString(data);
		}, div);
	});

	dispatcher.on('open', open);
	dispatcher.on('export', exportJSON);

	dispatcher.on('save', saveSimply);
	dispatcher.on('save_as', saveAs);

	// Expose API
	this.save = save;
	this.load = load;

	/*
		Start DOM Stuff (should separate file)
	*/

	var div = document.createElement('div');

	var pane = document.createElement('div');

	style(pane, {
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


	var header_styles = {
		position: 'absolute',
		top: '0px',
		width: '100%',
		height: '22px',
		lineHeight: '22px',
		overflow: 'hidden'
	};

	var button_styles = {
		width: '20px',
		height: '20px',
		padding: '2px',
		marginRight: '2px'
	};


	var footer_styles = {
		position: 'absolute',
		width: '100%',
		height: '22px',
		lineHeight: '22px',
		bottom: '0',
		// padding: '2px',
		background: Theme.a,
		fontSize: '11px'
	};

	pane.appendChild(div);

	var label_status = document.createElement('span');
	label_status.textContent = 'hello!';
	label_status.style.marginLeft = '10px';

	this.setStatus = function (text) {
		label_status.textContent = text;
	};

	dispatcher.on('state:save', function (description) {
		dispatcher.fire('status', description);
		save('autosave');
	});

	dispatcher.on('status', this.setStatus);

	var bottom_right = document.createElement('div');
	style(bottom_right, footer_styles, {
		textAlign: 'right'
	});

	// add layer
	var plus = new IconButton(12, 'plus', 'New Layer', dispatcher);
	plus.onClick(function () {
		var name = prompt('Layer name?');
		addLayer(name);

		undo_manager.save(new UndoState(data, 'Layer added'));

		repaintAll();
	});
	style(plus.dom, button_styles);
	bottom_right.appendChild(plus.dom);


	// trash
	var trash = new IconButton(12, 'trash', 'Delete save', dispatcher);
	trash.onClick(function () {
		var name = data.get('name').value;
		if (name && localStorage[STORAGE_PREFIX + name]) {
			var ok = confirm('Are you sure you wish to delete ' + name + '?');
			if (ok) {
				delete localStorage[STORAGE_PREFIX + name];
				dispatcher.fire('status', name + ' deleted');
				dispatcher.fire('save:done');
			}
		}
	});
	style(trash.dom, button_styles, { marginRight: '2px' });
	bottom_right.appendChild(trash.dom);

	/*
			End DOM Stuff
	*/

	//
	// Handle DOM Views
	//
	container.appendChild(pane);

	div.appendChild(layer_panel.dom);
	div.appendChild(timeLinePanel.dom);

	var scrollbar = new ScrollBar(200, 10);
	div.appendChild(scrollbar.dom);

	// percentages
	scrollbar.onScroll.do(function (type, scrollTo) {
		switch (type) {
			case 'scrollto':
				layer_panel.scrollTo(scrollTo);
				timeLinePanel.scrollTo(scrollTo);
				break;
			//		case 'pageup':
			// 			scrollTop -= pageOffset;
			// 			me.draw();
			// 			me.updateScrollbar();
			// 			break;
			// 		case 'pagedown':
			// 			scrollTop += pageOffset;
			// 			me.draw();
			// 			me.updateScrollbar();
			// 			break;
		}
	});



	// document.addEventListener('keypress', function(e) {
	// 	console.log('kp', e);
	// });
	// document.addEventListener('keyup', function(e) {
	// 	if (undo) console.log('UNDO');

	// 	console.log('kd', e);
	// });

	// TODO: Keyboard Shortcuts
	// Esc - Stop and review to last played from / to the start?
	// Space - play / pause from current position
	// Enter - play all
	// k - keyframe

	document.addEventListener('keydown', function (e) {
		var play = e.keyCode == 32; // space
		var enter = e.keyCode == 13; //
		var undo = e.metaKey && e.keyCode == 91 && !e.shiftKey;

		var active = document.activeElement;
		// console.log( active.nodeName );

		if (active.nodeName.match(/(INPUT|BUTTON|SELECT|TIMELINER)/)) {
			active.blur();
		}

		if (play) {
			dispatcher.fire('controls.toggle_play');
		}
		else if (enter) {
			// FIXME: Return should play from the start or last played from?
			dispatcher.fire('controls.restart_play');
			// dispatcher.fire('controls.undo');
		}
		else if (e.keyCode == 27) {
			// Esc = stop. FIXME: should rewind head to last played from or Last pointed from?
			dispatcher.fire('controls.pause');
		}
		else console.log('keydown', e.keyCode);
	});

	var needsResize = true;

	function resize(width, height) {
		// data.get('ui:bounds').value = {
		// 	width: width,
		// 	height: height
		// };
		// TODO: remove ugly hardcodes
		width -= 4;
		height -= 44;

		Settings.width = width - Settings.LEFT_PANE_WIDTH;
		Settings.height = height;

		Settings.TIMELINE_SCROLL_HEIGHT = height - Settings.MARKER_TRACK_HEIGHT;
		var scrollable_height = Settings.TIMELINE_SCROLL_HEIGHT;

		scrollbar.setHeight(scrollable_height - 2);

		style(scrollbar.dom, {
			top: Settings.MARKER_TRACK_HEIGHT + 'px',
			left: (width - 16) + 'px',
		});

		needsResize = true;
	}

	function restyle(left, right) {
		left.style.cssText = 'position: absolute; left: 0px; top: 0px; height: ' + Settings.height + 'px;';
		style(left, {
			// background: Theme.a,
			overflow: 'hidden'
		});
		left.style.width = Settings.LEFT_PANE_WIDTH + 'px';

		// right.style.cssText = 'position: absolute; top: 0px;';
		right.style.position = 'absolute';
		right.style.top = '0px';
		right.style.left = Settings.LEFT_PANE_WIDTH + 'px';
	}

	function addLayer(name) {
		var layer = new LayerProp(name);

		layers = layer_store.value;
		layers.push(layer);

		layer_panel.setState(layer_store);
	}

	this.addLayer = addLayer;

	this.dispose = function dispose() {

		var domParent = pane.parentElement;
		domParent.removeChild(pane);
	};

	this.setTarget = function (t) {
		target = t;
	};

	function getValueRanges(ranges, interval) {
		interval = interval ? interval : 0.15;
		ranges = ranges ? ranges : 2;

		// not optimized!
		var t = data.get('ui:currentTime').value;

		var values = [];

		for (var u = -ranges; u <= ranges; u++) {
			// if (u == 0) continue;
			var o = {};

			for (var l = 0; l < layers.length; l++) {
				var layer = layers[l];
				var m = utils.timeAtLayer(layer, t + u * interval);
				o[layer.name] = m.value;
			}

			values.push(o);

		}

		return values;
	}

	// Expose API
	this.getValues = getValueRanges;
	this.getValueJson = () => {
		return data.getJSONString();
	}
	this.resize = resize;
}


window.Timeliner = Timeliner;

export { Timeliner }