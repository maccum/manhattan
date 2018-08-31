var plot = require('../model/plot.js').plot;
var gui = require('../ui/gui.js').gui;

/* Event handlers:
- dragging plot with mouse
- pressing on the zoom in/out buttons
- zooming in/out with mouse wheel
*/
var handlers = {
    currentlyZoomingInWithButton: false,
    currentlyZoomingOutWithButton: false,

    callGUI: function () {
        gui.render(plot.getInfoForGUI());
    },

    getMousePositionWithinObject: function (mouseX, mouseY, boundingObject) {
        var ctm = boundingObject.getScreenCTM();
        return {
            x: (mouseX - ctm.e) / ctm.a,
            y: (mouseY - ctm.f) / ctm.d
        };
    },

    listenForDrag: function (svg) {
        console.log("listenForDrag");
        var isDragging = false;
        //var svg = evt.target;

        svg.addEventListener('mousedown', beginDrag, false);
        svg.addEventListener('mousemove', drag, false);
        svg.addEventListener('mouseup', endDrag, false);

        var mousePositionSinceLastMove;

        function getMousePosition(evt) {
            return handlers.getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
        }

        function beginDrag(evt) {
            evt.preventDefault();
            isDragging = true;
            var mousePositionOnStartDrag = getMousePosition(evt);
            mousePositionSinceLastMove = mousePositionOnStartDrag;
        }

        function drag(evt) {
            if (isDragging) {
                evt.preventDefault();
                var currentMousePosition = getMousePosition(evt);
                var changeInMousePosition = {
                    x: currentMousePosition.x - mousePositionSinceLastMove.x,
                    y: currentMousePosition.y - mousePositionSinceLastMove.y,
                };

                plot.drag(changeInMousePosition);
                handlers.callGUI();

                mousePositionSinceLastMove = currentMousePosition;
            }
        }

        function endDrag(evt) {
            evt.preventDefault();
            isDragging = false;
        }
    },

    onWheel: function (evt) {
        evt.preventDefault();
        var horizontal = evt.deltaX;
        var vertical = evt.deltaY;

        if (Math.abs(vertical) >= Math.abs(horizontal)) {
            // zoom in/out if user scrolls up/down on mousepad
            var svg = document.getElementById("plot");
            var mousePos = handlers.getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
            plot.zoom(mousePos, vertical);
        } else {
            // shift plot left/right if user scrolls left/right on mousepad
            // TODO: should stop this from being called immediately after/during zoom actions, because it looks bad-ish if user accidentally scrolls horizontally when trying to zoom
            plot.drag({ x: horizontal, y: 0 });
        }

        handlers.callGUI();
    },

    onButtonClickZoomIn: function () {
        plot.zoom({ x: 512, y: 128 }, -5);
        var interval = setInterval(function () {
            try {
                if (!handlers.currentlyZoomingOutWithButton) {
                    if (plot.snapIn({ x: 512, y: 128 })) {
                        handlers.currentlyZoomingInWithButton = false;
                        clearInterval(interval);
                    } else {
                        handlers.currentlyZoomingInWithButton = true;
                        handlers.callGUI();
                    }
                } else {
                    clearInterval(interval);
                }
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },

    onButtonClickZoomOut: function () {

        plot.zoom({ x: 512, y: 128 }, 5);
        var interval = setInterval(function () {
            try {
                if (!handlers.currentlyZoomingInWithButton) {
                    if (plot.snapOut({ x: 512, y: 128 })) {
                        handlers.currentlyZoomingOutWithButton = false;
                        clearInterval(interval);
                    } else {
                        handlers.currentlyZoomingOutWithButton = true;
                        handlers.callGUI();
                    }
                } else {
                    clearInterval(interval);
                }
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },
};

module.exports.handlers = handlers;