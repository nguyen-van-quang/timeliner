/* eslint-disable */

class FrameProp {
	constructor(time, value) {
		this.time = time;
		this.value = value;
		this._color = utils.generateColor();
	}
}

class LayerProp {
	constructor(name, time, value) {
		this.name = name;
		this.frames = [
			new FrameProp(time, value)
		];
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

class DataManager {
    // Implementation of DataManager class

    static #instance = null;

    #data;
    #selectedTimeline;
    #currentTime = 0;

    constructor(data) {
      if (DataManager.#instance) {
        return DataManager.#instance;
      }
      this.#data = data;
      this.#selectedTimeline = this.#data.timelines.length > 0 ? this.#data.timelines[0] : null;
      DataManager.#instance = this;
    }

    static getInstance(data) {
      if (!DataManager.#instance) {
        DataManager.#instance = new DataManager(data);
      }
      return DataManager.#instance;
    }

    set data(data) {
        this.#data = data;
        this.#selectedTimeline = this.#data.timelines.length > 0 ? this.#data.timelines[0] : null;
    }

    get data() {
        return this.#data;
    }

    get selectedTimeline() {
        return this.#selectedTimeline;
    }

    set selectedTimeline(timeline) {
        this.#selectedTimeline = timeline;
    }

    get currentTime() {
        return this.#currentTime;
    }

    set currentTime(time) {
        this.#currentTime = time;
    }
}