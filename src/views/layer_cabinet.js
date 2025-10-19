/* eslint-disable */
import { LayoutConstants } from '../layout_constants.js'
import { LayerView } from './view_layer.js'
import { IconButton } from '../ui/icon_button.js'
import { utils } from '../utils/utils.js'
import { Theme } from '../theme.js'
import { UINumber } from '../ui/ui_number.js'

const { STORAGE_PREFIX, style, addClass } = utils
const btnStyles = {
    width: '22px',
    height: '22px',
    padding: '2px'
};
const operationBtnStyles = {
    width: '32px',
    padding: '3px 4px 3px 4px'
};

class LayerCabinet {
    #data;
    #layer_store;
    #domContainer;
    // #domOperation;
    #domLayerScroll;
    #dispatcher;
    #isPlaying = false;
    #currentTimeStore;
    #playBtn;
    #stopBtn;
    #undoBtn;
    #redoBtn;
    #domTop;
    #domRange;
    #draggingRange = 0;
    #layer_uis = [];
    #unused_layers = [];
    #visible_layers = 0;
    #treeViewLayer;
    #subUlDom;

    constructor(data, dispatcher) {
        this.#data = data;
        this.#layer_store = data.get('layers');
        this.#dispatcher = dispatcher;
        this.#currentTimeStore = data.get('ui:currentTime');
        this.#domContainer = document.createElement('div');

        this.#domTop = document.createElement('div');
        this.#domTop.style.cssText = 'margin: 0px; top: 0; left: 0; height: ' + LayoutConstants.MARKER_TRACK_HEIGHT + 'px';

        this.#domRange = document.createElement('input');
        this.#domRange.type = "range";
        this.#domRange.value = 0;
        this.#domRange.min = -1;
        this.#domRange.max = +1;
        this.#domRange.step = 0.125;
        style(this.#domRange, {
            width: '90px',
            margin: '0px',
            marginLeft: '2px',
            marginRight: '2px'
        });

        this.#domRange.addEventListener('mousedown', () => {
            this.#draggingRange = 1;
        });

        this.#domRange.addEventListener('mouseup', () => {
            this.#draggingRange = 0;
            this.changeRange();
        });

        this.#domRange.addEventListener('mousemove', () => {
            if (!this.#draggingRange) return;
            this.changeRange();
        });
        this.#domTop.appendChild(this.#domRange);

        this.#domTop.appendChild(this.initDomOperation(dispatcher));

        this.#domLayerScroll = document.createElement('div');
        this.initDomLayerScroll(this.#domLayerScroll);
        this.#domContainer.appendChild(this.#domLayerScroll);

        this.#domContainer.appendChild(this.#domTop);

        this.initTreeView();

        this.setState(this.#layer_store);
        this.repaint();
    }

    initTreeView() {
        this.#treeViewLayer = document.createElement('ul');
        addClass(this.#treeViewLayer, 'tree-animation');

        const liDom = document.createElement('li');
        const detailDom = document.createElement('details');
        detailDom.setAttribute('open', '');
        detailDom.addEventListener('toggle', () => {
            if (detailDom.open) {
                this.#dispatcher.fire('layer.tree.opened');
            } else {
                this.#dispatcher.fire('layer.tree.closed');
            }
        });

        const summaryDom = document.createElement('summary');
        summaryDom.innerText = 'Layers';
        detailDom.appendChild(summaryDom);
        liDom.appendChild(detailDom);

        this.#subUlDom = document.createElement('ul');
        detailDom.appendChild(this.#subUlDom);
        this.#treeViewLayer.appendChild(liDom);
        this.#domLayerScroll.appendChild(this.#treeViewLayer);
    }

    initDomOperation(dispatcher) {
        const domOperation = document.createElement('div');
        style(domOperation, {
            marginTop: '4px',
        });
        const span = document.createElement('span');
        span.style.width = '20px';
        span.style.display = 'inline-block';
        domOperation.appendChild(span);

        this.#playBtn = new IconButton(16, 'play', 'play', dispatcher);
        style(this.#playBtn.dom, this.btnStyles, { marginTop: '2px' });
        this.#playBtn.onClick(function (e) {
            e.preventDefault();
            dispatcher.fire('controls.toggle_play');
        });
        domOperation.appendChild(this.#playBtn.dom);

        this.#stopBtn = new IconButton(16, 'stop', 'stop', dispatcher);
        style(this.#stopBtn.dom, this.btnStyles, { marginTop: '2px' });
        this.#stopBtn.onClick(function (e) {
            dispatcher.fire('controls.stop');
        });
        domOperation.appendChild(this.#stopBtn.dom);

        this.#undoBtn = new IconButton(16, 'undo', 'undo', dispatcher);
        style(this.#undoBtn.dom, this.operationBtnStyles);
        this.#undoBtn.onClick(function () {
            dispatcher.fire('controls.undo');
        });
        domOperation.appendChild(this.#undoBtn.dom);

        this.#redoBtn = new IconButton(16, 'repeat', 'redo', dispatcher);
        style(this.#redoBtn.dom, this.operationBtnStyles);
        this.#redoBtn.onClick(function () {
            dispatcher.fire('controls.redo');
        });
        domOperation.appendChild(this.#redoBtn.dom);
        return domOperation;
    }

    initDomLayerScroll(domLayerScroll) {
        style(domLayerScroll, {
            position: 'absolute',
            top: LayoutConstants.MARKER_TRACK_HEIGHT + 'px',
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden'
        });
        domLayerScroll.id = 'layer_cabinet';
    }

    setState(state) {
        this.#layer_store = state;
        var layers = this.#layer_store.value;
        var i, layer;


        console.log('layers', layers);


        for (i = 0; i < layers.length; i++) {
            layer = layers[i];
            if (!this.#layer_uis[i]) {
                let layer_ui;
                if (this.#unused_layers.length) {
                    layer_ui = this.#unused_layers.pop();
                    layer_ui.dom.style.display = 'block';
                } else {
                    layer_ui = new LayerView(layer, this.#dispatcher);
                    // this.#domLayerScroll.appendChild(layer_ui.dom);
                    const liDom = document.createElement('li');
                    // liDom.style.listStyle = 'none';
                    liDom.appendChild(layer_ui.dom);
                    this.#subUlDom.appendChild(liDom);
                }
                this.#layer_uis.push(layer_ui);
            }
        }
    }

    setControlStatus(state) {
        this.#isPlaying = state;
        if (this.#isPlaying) {
            this.#playBtn.setIcon('pause');
            this.#playBtn.setTip('Pause');
        }
        else {
            this.#playBtn.setIcon('play');
            this.#playBtn.setTip('Play');
        }
    }

    repaint(s) {
        s = this.#currentTimeStore.value;
        var i;
        s = s || 0;
        var layers = this.#layer_store.value;
        for (i = this.#layer_uis.length; i-- > 0;) {
            if (i >= layers.length) {
                this.#layer_uis[i].dom.style.display = 'none';
                this.#unused_layers.push(this.#layer_uis.pop());
                continue;
            }
            this.#layer_uis[i].setState(layers[i], this.#layer_store.get(i));
            this.#layer_uis[i].repaint(s);
        }
        this.#visible_layers = this.#layer_uis.length;
    }

    scrollTo = function (x) {
        this.#domLayerScroll.scrollTop = x * (this.#domLayerScroll.scrollHeight - this.#domLayerScroll.clientHeight);
    }

    get dom() {
        return this.#domContainer;
    }

    addLayer(layer) {
        this.#layer_store.push(layer);
    }

    removeLayer(layer) {
        const index = this.#layer_store.indexOf(layer);
        if (index > -1) {
            this.#layer_store.splice(index, 1);
        }
    }

    get layers() {
        return this.#layer_uis;
    }

    changeRange() {
        this.#dispatcher.fire('update.scale', 6 * Math.pow(100, -range.value));
    }

    convertPercentToTime(t) {
        var min_time = 10 * 60; // 10 minutes
        min_time = this.#data.get('ui:totalTime').value;
        var max_time = 1;
        var v = LayoutConstants.width * 0.8 / (t * (max_time - min_time) + min_time);
        return v;
    }

    convertTimeToPercent(v) {
        var min_time = 10 * 60; // 10 minutes
        min_time = this.#data.get('ui:totalTime').value;
        var max_time = 1;
        var t = ((LayoutConstants.width * 0.8 / v) - min_time) / (max_time - min_time);
        return t;
    }
}

export { LayerCabinet };