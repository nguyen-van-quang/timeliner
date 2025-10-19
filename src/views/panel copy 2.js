
function TimelinePanel(data, dispatcher) {

	var mousedown2 = false, mouseDownThenMove = false;
	handleDrag(track_canvas, function down(e) {
		mousedown2 = true;
		pointer = {
			x: e.offsetx,
			y: e.offsety
		};
		pointerEvents();

		if (!mousedownItem) dispatcher.fire('time.update', x_to_time(e.offsetx));
		// Hit criteria
	}, function move(e) {
		mousedown2 = false;
		if (mousedownItem) {
			mouseDownThenMove = true;
			if (mousedownItem.mousedrag) {
				mousedownItem.mousedrag(e);
			}
		} else {
			dispatcher.fire('time.update', x_to_time(e.offsetx));
		}
	}, function up(e) {
		if (mouseDownThenMove) {
			dispatcher.fire('keyframe.move');
		}
		else {
			dispatcher.fire('time.update', x_to_time(e.offsetx));
		}
		mousedown2 = false;
		mousedownItem = null;
		mouseDownThenMove = false;
	}
	);

	this.setState = function (state) {
		layers = state.value;
		repaint();
	};

}

export { TimelinePanel }
