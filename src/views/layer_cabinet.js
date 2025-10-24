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

const timeline_01_data = [
    {
        id: "label01",
        name: "Label",
        animations: [
            {
                name: "x",
                values: [
                    { time: 0.1, value: 0, _color: "#893c0f", tween: "quadEaseIn" },
                    { time: 3, value: 3.500023, _color: "#b074a0" }
                ],
                tmpValue: -0.5,
				_color: "#8bd589"
            },
            {
                name: "y",
                values: [
                    { time: 0.1, value: 0, _color: "#abac31", tween: "quadEaseOut" },
                    { time: 0.5, value: -1.000001, _color: "#355ce8", tween: "quadEaseIn" },
                    { time: 1.1, value: 0, _color: "#47e90", tween: "quadEaseOut" },
                    { time: 1.7, value: -0.5, _color: "#f76bca", tween: "quadEaseOut" },
                    { time: 2.3, value: 0, _color: "#d59cfd" }
                ],
                tmpValue: -0.5,
				_color: "#8bd589"
            },
            {
                name: "rotate",
                values: [
                    { time: 0.1, value: -25.700014000000003, _color: "#f50ae9", tween: "quadEaseInOut" },
                    { time: 2.8, value: 0, _color: "#2e3712" }
                ],
                tmpValue: -0.5,
				_color: "#8bd589"
            }
        ]
    },
    {
        id: "image01",
        name: "Image",
        animations: [
            {
                name: "x",
                values: [
                    { time: 0.1, value: 0, _color: "#893c0f", tween: "quadEaseIn" },
                    { time: 3, value: 3.500023, _color: "#b074a0" }
                ]
            },
            {
                name: "y",
                values: [
                    { time: 0.1, value: 0, _color: "#abac31", tween: "quadEaseOut" },
                    { time: 0.5, value: -1.000001, _color: "#355ce8", tween: "quadEaseIn" },
                    { time: 1.1, value: 0, _color: "#47e90", tween: "quadEaseOut" },
                    { time: 1.7, value: -0.5, _color: "#f76bca", tween: "quadEaseOut" },
                    { time: 2.3, value: 0, _color: "#d59cfd" }
                ]
            },
            {
                name: "rotate",
                values: [
                    { time: 0.1, value: -25.700014000000003, _color: "#f50ae9", tween: "quadEaseInOut" },
                    { time: 2.8, value: 0, _color: "#2e3712" }
                ]
            }
        ]
    }
]

class LayerCabinet {
    #dataProx;
    #targets;
    #dom;
    // #domOperation;
    #domLayerScroll;
    #dispatcher;
    #isPlaying = false;
    // #currentTimeStore;
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
    #subUlDom2;


    constructor(targets, dispatcher) {
        // this.#data = targets;
        this.#targets = targets.get('layers');
        this.#dispatcher = dispatcher;
        // this.#currentTimeStore = targets.get('ui:currentTime');
        this.#dom = document.createElement('div');

        this.#domTop = document.createElement('div');
        // this.#domTop.style.cssText = 'margin: 0px; top: 0; left: 0; height: ' + LayoutConstants.MARKER_TRACK_HEIGHT + 'px';
        style(this.#domTop, {
            margin: '0px',
            top: '0px',
            left: '0px',
            height: LayoutConstants.MARKER_TRACK_HEIGHT + 'px',
            background: 'red',
            opacity: '0.5',
            border: '2px solid gray'
        });

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
            marginRight: '2px',
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
        style(this.#domLayerScroll, {
            border: '2px solid purple',
            // background: 'blue',
            // opacity: '0.4',
        })
        this.initDomLayerScroll(this.#domLayerScroll);
        this.#dom.appendChild(this.#domLayerScroll);

        this.#dom.appendChild(this.#domTop);

        // this.initTreeView();
        // this.initTreeView2(-10);

        // this.setState(this.#targets);
        // this.repaint();
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
        summaryDom.innerText = 'Label';
        detailDom.appendChild(summaryDom);
        liDom.appendChild(detailDom);

        this.#subUlDom = document.createElement('ul');
        detailDom.appendChild(this.#subUlDom);
        this.#treeViewLayer.appendChild(liDom);
        this.#domLayerScroll.appendChild(this.#treeViewLayer);
    }

    initTreeView2(offset) {
        const treeViewLayer = document.createElement('ul');
        treeViewLayer.style.marginTop = offset + 'px';
        addClass(treeViewLayer, 'tree-animation');

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
        summaryDom.innerText = 'Image';
        detailDom.appendChild(summaryDom);
        liDom.appendChild(detailDom);

        this.#subUlDom2 = document.createElement('ul');
        detailDom.appendChild(this.#subUlDom2);
        treeViewLayer.appendChild(liDom);
        this.#domLayerScroll.appendChild(treeViewLayer);
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

    // setState(state) {
    //     this.#layer_store = state;
    //     const layers = this.#layer_store.value;
    //     for (let i = 0; i < layers.length; i++) {
    //         const layer = layers[i];
    //         if (!this.#layer_uis[i]) {
    //             let layer_ui;
    //             if (this.#unused_layers.length) {
    //                 layer_ui = this.#unused_layers.pop();
    //                 layer_ui.dom.style.display = 'block';
    //             } else {
    //                 console.log('layer: ', layer)
    //                 layer_ui = new LayerView(layer, this.#dispatcher);
    //                 // this.#domLayerScroll.appendChild(layer_ui.dom);
    //                 const liDom = document.createElement('li');
    //                 // liDom.style.listStyle = 'none';
    //                 liDom.appendChild(layer_ui.dom);
    //                 this.#subUlDom.appendChild(liDom);
    //             }
    //             this.#layer_uis.push(layer_ui);
    //         }
    //     }
    // }

    // nen doi ten thanh setData
    setState(dataProx) {
        this.#dataProx = dataProx;
        while (this.#domLayerScroll.firstChild) {
            this.#domLayerScroll.removeChild(this.#domLayerScroll.firstChild);
        }
        const targets = this.#dataProx;
        for (let i = 0; i < targets.value.length; i++) {
            const target = targets.get(i);
            console.log('target', target);

            const treeViewLayer = document.createElement('ul');
            addClass(treeViewLayer, 'tree-animation');

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
            summaryDom.innerText = target.value.name;
            detailDom.appendChild(summaryDom);
            liDom.appendChild(detailDom);

            const subUlDom = document.createElement('ul');
            detailDom.appendChild(subUlDom);

            //
            // create and append view_layer here
            //

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
            this.#domLayerScroll.appendChild(treeViewLayer);


            // const treeViewLayer = document.createElement('ul');
            // addClass(treeViewLayer, 'tree-animation');
            // const liDom = document.createElement('li');
            // const detailDom = document.createElement('details');
            // detailDom.setAttribute('open', '');
            // detailDom.addEventListener('toggle', () => {
            //     if (detailDom.open) {
            //         this.#dispatcher.fire('layer.tree.opened');
            //     } else {
            //         this.#dispatcher.fire('layer.tree.closed');
            //     }
            // });
            // const summaryDom = document.createElement('summary');
            // summaryDom.innerText = 'Label';
            // detailDom.appendChild(summaryDom);
            // liDom.appendChild(detailDom);
            // const subUlDom = document.createElement('ul');
            // detailDom.appendChild(subUlDom);
            // treeViewLayer.appendChild(liDom);
            // this.#domLayerScroll.appendChild(treeViewLayer);
            // for (let j = 0; j < target.animations.length; j++) {
            //     const animation = target.animations[j];
            //     console.log('animation', animation);
            //     const frame_ui = new LayerView(animation, this.#dispatcher);
            //     this.#layer_uis.push(frame_ui);
            //     const liDom = document.createElement('li');
            //     liDom.appendChild(frame_ui.dom);
            //     subUlDom.appendChild(liDom);
            // }
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

    repaint(currentTime) {
        // currentTime = currentTime || 0;
        // const targets = this.#targets.value;
        // for (let i = 0; i < targets.length; i++) {
        //     const target = targets[i];
        //     for (let j = 0; j < target.layers.length; j++) {
        //         for(let k = this.#layer_uis.length; k-- > 0;) {
        //             // if(k >= target.animations.length) {
        //             //     this.#layer_uis[k].dom.style.display = 'none';
        //             //     this.#unused_layers.push(this.#layer_uis.pop());
        //             //     continue;
        //             // }
        //             // this.#layer_uis[k].setState(target.animations.values[k], this.#layer_store.get(k));
        //             this.#layer_uis[k].repaint(currentTime);
        //         }
        //         // this.#visible_layers = this.#layer_uis.length;
        //     }
        // }
    }

    // repaint(s) {
    //     // s = this.#currentTimeStore.value;
    //     var i;
    //     s = s || 0;
    //     var layers = this.#targets.value;
    //     for (i = this.#layer_uis.length; i-- > 0;) {
    //         if (i >= layers.length) {
    //             this.#layer_uis[i].dom.style.display = 'none';
    //             this.#unused_layers.push(this.#layer_uis.pop());
    //             continue;
    //         }
    //         this.#layer_uis[i].setState(layers[i], this.#targets.get(i));
    //         this.#layer_uis[i].repaint(s);
    //     }
    //     this.#visible_layers = this.#layer_uis.length;
    // }

    scrollTo = function (x) {
        this.#domLayerScroll.scrollTop = x * (this.#domLayerScroll.scrollHeight - this.#domLayerScroll.clientHeight);
    }

    get dom() {
        return this.#dom;
    }

    addLayer(layer) {
        this.#targets.push(layer);
    }

    removeLayer(layer) {
        const index = this.#targets.indexOf(layer);
        if (index > -1) {
            this.#targets.splice(index, 1);
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