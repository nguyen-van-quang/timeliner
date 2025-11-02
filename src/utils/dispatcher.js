/* eslint-disable */
function Dispatcher() {
	const event_listeners = {};

	function on(type, listener) {
		if (!(type in event_listeners)) {
			event_listeners[type] = [];
		}
		const listeners = event_listeners[type];
		listeners.push(listener);
	}

	function fire(type) {
		const args = Array.prototype.slice.call(arguments);
		args.shift();
		const listeners = event_listeners[type];
		if (!listeners) return;
		for (let i = 0; i < listeners.length; i++) {
			const listener = listeners[i];
			listener.apply(listener, args);
		}
	}

	this.on = on;
	this.fire = fire;
}

export { Dispatcher }