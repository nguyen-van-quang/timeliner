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
    #dataProx;
    #data;
    #dom;
    #domTargets;
    #dispatcher;
    #isPlaying = false;
    #currentTimeStore;
    #playBtn;
    #stopBtn;
    #undoBtn;
    #redoBtn;
    #domOperations;
    #domRange;
    #draggingRange = 0;
    #layer_uis = [];
    #unused_layers = [];

    constructor(data, dispatcher) {
        this.#data = data;
        this.#dispatcher = dispatcher;
        // this.#currentTimeStore = data.get('ui:currentTime');
        this.#dom = document.createElement('div');
        style(this.#dom, {
            margin: '0px',
            padding: '0px',
            borderLeft: '2px solid ' + Theme.b,
            borderRight: '2px solid ' + Theme.b
        });

        this.#domOperations = document.createElement('div');
        style(this.#domOperations, {
            margin: '0px',
            marginLeft: '5px',
            padding: '0px',
            top: '0px',
            left: '0px',
            height: LayoutConstants.MARKER_TRACK_HEIGHT / 2 + 'px',
            opacity: '0.5',
        });

        this.#domRange = document.createElement('input');
        this.#domRange.type = "range";
        this.#domRange.value = 0;
        this.#domRange.min = -1;
        this.#domRange.max = +1;
        this.#domRange.step = 0.125;
        style(this.#domRange, {
            top: '25px',
            width: '230px',
            padding: '0px',
            margin: '0px',
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
        this.#domOperations.appendChild(this.#domRange);

        this.#domOperations.appendChild(this.initDomOperation(dispatcher));

        this.#domTargets = document.createElement('div');
        style(this.#domTargets, {
            margin: '0px',
            padding: '0px',
            position: 'absolute',
            top: LayoutConstants.MARKER_TRACK_HEIGHT + 'px',
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden'
        });
        this.#domTargets.id = 'layer_cabinet';

        this.#dom.appendChild(this.#domTargets);
        this.#dom.appendChild(this.#domOperations);

        this.#createLayers();
    }

    initDomOperation(dispatcher) {
        const domOperation = document.createElement('div');
        style(domOperation, {
            marginTop: '4px',
            paddingLeft: '1px',
            display: 'flex',
            alignItems: 'center'
        });

        this.#playBtn = new IconButton(16, 'play', 'play', dispatcher);
        style(this.#playBtn.dom, btnStyles, { marginTop: '2px' });
        this.#playBtn.onClick(function (e) {
            e.preventDefault();
            dispatcher.fire('controls.toggle_play');
        });
        domOperation.appendChild(this.#playBtn.dom);

        this.#stopBtn = new IconButton(16, 'stop', 'stop', dispatcher);
        style(this.#stopBtn.dom, btnStyles, { marginTop: '2px' });
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

    #createLayers() {
        this.#layer_uis = [];
        this.#dataProx = this.#data;
        while (this.#domTargets.firstChild) {
            this.#domTargets.removeChild(this.#domTargets.firstChild);
        }
        const targets = this.#dataProx.get('targets');
        for (let i = 0; i < targets.value.length; i++) {
            const target = targets.get(i);
            const treeViewLayer = document.createElement('ul');
            style(treeViewLayer, {
                margin: '0px',
                padding: '0px',
                paddingLeft: '5px'
            })
            addClass(treeViewLayer, 'tree-animation');

            const liDom = document.createElement('li');
            const detailDom = document.createElement('details');
            if(target.value.ui.expand) {
                detailDom.setAttribute('open', 'true');
            }
            detailDom.addEventListener('toggle', () => {
                target.value.ui.expand = detailDom.open;
                this.#dispatcher.fire('target.ui.expand', detailDom.open);
            });

            const summaryDom = document.createElement('summary');
            summaryDom.innerText = target.value.name;
            detailDom.appendChild(summaryDom);
            liDom.appendChild(detailDom);

            const subUlDom = document.createElement('ul');
            detailDom.appendChild(subUlDom);

            const layersProx = target.get('layers');
            for (let i = 0; i < layersProx.value.length; i++) {
                const layer = layersProx.get(i);
                const layer_ui = new LayerView(layer, this.#dispatcher);
                const liLayerDom = document.createElement('li');
                liLayerDom.appendChild(layer_ui.dom);
                subUlDom.appendChild(liLayerDom);
                this.#layer_uis.push(layer_ui);
            }

            treeViewLayer.appendChild(liDom);
            this.#domTargets.appendChild(treeViewLayer);
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

    updateStateAtTime(time) {
        time = time || 0;
        for(let i = 0; i < this.#layer_uis.length; i++) {
            this.#layer_uis[i].repaint(time);
        }
    }

    scrollTo = function (x) {
        this.#domTargets.scrollTop = x * (this.#domTargets.scrollHeight - this.#domTargets.clientHeight);
    }

    set data(data) {
        this.#data = data;
        this.#createLayers();
    }

    get dom() {
        return this.#dom;
    }

    addLayer(layer) {
        this.#data.push(layer);
    }

    removeLayer(layer) {
        const index = this.#data.indexOf(layer);
        if (index > -1) {
            this.#data.splice(index, 1);
        }
    }

    get layers() {
        return this.#layer_uis;
    }

    changeRange() {
        this.#dispatcher.fire('update.scale', 6 * Math.pow(100, - this.#domRange.value));
    }

    // convertPercentToTime(t) {
    //     var min_time = 10 * 60; // 10 minutes
    //     min_time = this.#data.get('ui:totalTime').value;
    //     var max_time = 1;
    //     var v = LayoutConstants.width * 0.8 / (t * (max_time - min_time) + min_time);
    //     return v;
    // }

    // convertTimeToPercent(v) {
    //     var min_time = 10 * 60; // 10 minutes
    //     min_time = this.#data.get('ui:totalTime').value;
    //     var max_time = 1;
    //     var t = ((LayoutConstants.width * 0.8 / v) - min_time) / (max_time - min_time);
    //     return t;
    // }
}

export { LayerCabinet };