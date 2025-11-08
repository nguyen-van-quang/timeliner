/* eslint-disable */
import { LayoutConstants } from '../layout_constants.js'
import { Layer } from './layer.js'
import { IconButton } from '../ui/icon-button.js'
import { utils } from '../utils/utils.js'
import { Theme } from '../theme.js'

const { style, addClass } = utils
const btnStyles = {
    width: '22px',
    height: '22px',
    padding: '2px'
};

class TargetCollection {
    #data;
    #dom;
    #domTargets;
    #dispatcher;
    #isPlaying = false;
    #playBtn;
    #stopBtn;
    #domOperations;
    #domRange;
    #draggingRange = 0;
    #layer_uis = [];

    constructor(data, dispatcher) {
        this.#data = data;
        this.#dispatcher = dispatcher;
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
        return domOperation;
    }

    #createLayers() {
        if (!this.#data) return;
        this.#layer_uis = [];
        while (this.#domTargets.firstChild) {
            this.#domTargets.removeChild(this.#domTargets.firstChild);
        }
        const targets = this.#data.targets;
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const treeViewLayer = document.createElement('ul');
            style(treeViewLayer, {
                margin: '0px',
                padding: '0px',
                paddingLeft: '5px'
            })
            addClass(treeViewLayer, 'tree-animation');

            const liDom = document.createElement('li');
            const detailDom = document.createElement('details');
            if(target.ui.expand) {
                detailDom.setAttribute('open', 'true');
            }
            detailDom.addEventListener('toggle', () => {
                target.ui.expand = detailDom.open;
                this.#dispatcher.fire('target.ui.expand', detailDom.open);
            });

            const summaryDom = document.createElement('summary');
            summaryDom.innerText = target.name;
            detailDom.appendChild(summaryDom);
            liDom.appendChild(detailDom);

            const subUlDom = document.createElement('ul');
            detailDom.appendChild(subUlDom);

            const layers = target.layers;
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                const layer_ui = new Layer(layer, (event, data) => {
                    switch(event) {
                        case 'ease':
                            // layer.tween = data;
                            this.#dispatcher.fire('ease', target, layer, data);
                            break;
                        case 'keyframe':
                            this.#dispatcher.fire('keyframe', target, layer);
                            break;
                        case 'layer.remove':
                            this.#dispatcher.fire('layer.remove', target, layer);
                            break;
                        case 'value.change':
                            this.#dispatcher.fire('value.change', target, layer, data);
                            break;
                    }
                });
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

    updateState(time) {
        time = time || 0;
        for(let i = 0; i < this.#layer_uis.length; i++) {
            this.#layer_uis[i].updateState(time);
        }
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
}

export { TargetCollection };