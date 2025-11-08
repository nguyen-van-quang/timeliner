/* eslint-disable */
/**************************/
// Tweens
/**************************/

var Tweens = {
	linear: function (k) {
		return k;
	},
	step: function (k) {
		return k < 1 ? 0 : 1;
	},
	ease_in: function (k) {
		return k * k * k;
	},
	ease_out: function (k) {
		return --k * k * k + 1;
	},
	ease_in_out: function (k) {
		if ((k *= 2) < 1) return 0.5 * k * k;
		return - 0.5 * (--k * (k - 2) - 1);
	},
	ease_in_sine: function (k) {
		return 1 - Math.cos(k * Math.PI / 2);
	},
	ease_out_sine: function (k) {
		return Math.sin(k * Math.PI / 2);
	},
	ease_in_out_sine: function (k) {
		return -0.5 * (Math.cos(Math.PI * k) - 1);
	},
	ease_in_cubic: function (k) {
		return k * k * k;
	},
	ease_out_cubic: function (k) {
		return --k * k * k + 1;
	},
	ease_in_out_cubic: function (k) {
		if ((k *= 2) < 1) return 0.5 * k * k * k;
		return 0.5 * ((k -= 2) * k * k + 2);
	},
	ease_in_expo: function (k) {
		return k === 0 ? 0 : Math.pow(2, 10 * (k - 1));
	},
	ease_out_expo: function (k) {
		return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
	},
	ease_in_out_expo: function (k) {
		if (k === 0) return 0;
		if (k === 1) return 1;
		if ((k *= 2) < 1) return 0.5 * Math.pow(2, 10 * (k - 1));
		return 0.5 * (2 - Math.pow(2, -10 * --k));
	},
	ease_in_back: function (k) {
		var s = 1.70158;
		return k * k * ((s + 1) * k - s);
	},
	ease_out_back: function (k) {
		var s = 1.70158;
		return --k * k * ((s + 1) * k + s) + 1;
	},
	ease_in_out_back: function (k) {
		var s = 1.70158;
		if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s));
		return 0.5 * (--k * k * ((s + 1) * k + s) + 2);
	},
	ease_in_quad: function (k) {
		return k * k;
	},
	ease_out_quad: function (k) {
		return -k * (k - 2);
	},
	ease_in_out_quad: function (k) {
		if ((k *= 2) < 1) return 0.5 * k * k;
		return -0.5 * (k * (k - 2) - 1);
	},
	ease_in_quart: function (k) {
		return k * k * k * k;
	},
	ease_out_quart: function (k) {
		return --k * k * k * k + 1;
	},
	ease_in_out_quart: function (k) {
		if ((k *= 2) < 1) return 0.5 * k * k * k * k;
		return 0.5 * ((k -= 2) * k * k * k + 2);
	},
	ease_in_quint: function (k) {
		return k * k * k * k * k;
	},
	ease_out_quint: function (k) {
		return --k * k * k * k * k + 1;
	},
	ease_in_out_quint: function (k) {
		if ((k *= 2) < 1) return 0.5 * k * k * k * k * k;
		return 0.5 * ((k -= 2) * k * k * k * k + 2);
	},
	ease_in_circ: function (k) {
		return 1 - Math.sqrt(1 - k * k);
	},
	ease_out_circ: function (k) {
		return Math.sqrt(1 - --k * k);
	},
	ease_in_out_circ: function (k) {
		if ((k *= 2) < 1) return -0.5 * (Math.sqrt(1 - k * k) - 1);
		return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
	},
	overshoot: function (k) {
		var s = 1.70158;
		return k * k * ((s + 1) * k - s);
	},
	bounce: function (k) {
		if (k < 1 / 2.75) {
			return 7.5625 * k * k;
		} else if (k < 2 / 2.75) {
			return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
		} else if (k < 2.5 / 2.75) {
			return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
		} else {
			return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
		}
	}
};

export { Tweens }