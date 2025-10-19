/* eslint-disable */
import { Theme } from '../theme.js'
import { UINumber } from '../ui/ui_number.js'
import { Tweens } from '../utils/util_tween.js'
import { LayoutConstants } from '../layout_constants.js'
import { utils } from '../utils/utils.js'
const { style } = utils;

class LayerView {
    #layer;
    #dispatcher;
    #dom;
    #state;
    #keyframe_button;
    #dropdown;
    #number;
    #label;

    constructor(layer, dispatcher) {
        this.#layer = layer;
        this.#dispatcher = dispatcher;
        this.#dom = document.createElement('div');
        style(this.#dom, {
            textAlign: 'left',
            margin: '0px 0px 0px 5px',
            borderBottom: '1px solid ' + Theme.b,
            top: 0,
            left: 0,
            height: (LayoutConstants.LINE_HEIGHT - 1) + 'px',
            color: Theme.c,
            display: 'flex',
            alignItems: 'center'
        });

        this.#label = document.createElement('span');
        this.#label.style.cssText = 'font-size: 12px; padding: 4px;';
        this.#label.addEventListener('click', function (e) {
            // context.dispatcher.fire('label', channelName);
        });
        this.#label.addEventListener('mouseover', function (e) {
            // context.dispatcher.fire('label', channelName);
        });
        this.#dom.appendChild(this.#label);

        this.#number = new UINumber(layer, dispatcher);
        this.#number.onChange.do(function (value, done) {
            this.#state.get('_value').value = value;
            dispatcher.fire('value.change', layer, value, done);
        }.bind(this));
        style(this.#number.dom, {
            // float: 'right'
        });
        this.#dom.appendChild(this.#number.dom);

        this.#dropdown = document.createElement('select');
        this.#dropdown.style.cssText = 'font-size: 10px; width: 60px; margin: 0; float: right; text-align: right;';
        for (const k in Tweens) {
            const option = document.createElement('option');
            option.text = k;
            this.#dropdown.appendChild(option);
        }
        this.#dropdown.addEventListener('change', function () {
            dispatcher.fire('ease', layer, dropdown.value);
        });
        this.#dom.appendChild(this.#dropdown);

        const height = (LayoutConstants.LINE_HEIGHT - 1);
        this.#keyframe_button = document.createElement('button');
        this.#keyframe_button.innerHTML = '&#9672;'; // '&diams;' &#9671; 9679 9670 9672
        this.#keyframe_button.style.cssText = 'background: none; font-size: 12px; padding: 0px; font-family: monospace; float: right; width: 20px; height: ' + height + 'px; border-style:none; outline: none;'; //  border-style:inset;
        this.#keyframe_button.addEventListener('click', function (e) {
            dispatcher.fire('keyframe', layer, this.#state.get('_value').value);
        }.bind(this));
        this.#dom.appendChild(this.#keyframe_button);

        const remove_layer_btn = document.createElement('button');
        remove_layer_btn.innerHTML = '&minus;';
        remove_layer_btn.style.cssText = 'color: ' + Theme.b + '; background: none; font-size: 16px; padding: 0px; font-family: monospace; float: right; width: 20px; height: ' + (LayoutConstants.LINE_HEIGHT - 5) + 'px; border-style:none; outline: none;';
        remove_layer_btn.addEventListener('click', function (e) {
            dispatcher.fire('layer.remove', layer);
        });
        this.#dom.appendChild(remove_layer_btn);
    }

    setState(l, s) {
        this.#layer = l;
        this.#state = s;

        var tmp_value = this.#state.get('_value');
        if (tmp_value.value === undefined) {
            tmp_value.value = 0;
        }

        this.#number.setValue(tmp_value.value);
        this.#label.textContent = this.#state.get('name').value;

        this.repaint();
    }

    repaint(s) {
        this.#dropdown.style.opacity = 0;
        this.#dropdown.disabled = true;
        this.#keyframe_button.style.color = Theme.b;

        const o = utils.timeAtLayer(this.#layer, s);

        if (!o) return;

        if (o.can_tween) {
            this.#dropdown.style.opacity = 1;
            this.#dropdown.disabled = false;
            this.#dropdown.value = o.tween ? o.tween : 'none';
            if (this.#dropdown.value === 'none') this.#dropdown.style.opacity = 0.5;
        }

        if (o.keyframe) {
            this.#keyframe_button.style.color = Theme.c;
        }

        this.#state.get('_value').value = o.value;
        this.#number.setValue(o.value);
        this.#number.paint();

        this.#dispatcher.fire('target.notify', this.#layer.name, o.value);
    }

    get dom() {
        return this.#dom;
    }
}

export { LayerView };