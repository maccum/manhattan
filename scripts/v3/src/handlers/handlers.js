var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

var handlers = {
    callGUI: function () {
        //var plotID = plot.getPlotID();
        //var visiblesAndHiddens = plot.getInfoForGUI();
        //gui.render(plotID, visiblesAndHiddens[0], visiblesAndHiddens[1]);
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
            console.log("beginDrag");
            isDragging = true;
            var mousePositionOnStartDrag = getMousePosition(evt);
            mousePositionSinceLastMove = mousePositionOnStartDrag;
        }

        function drag(evt) {
            if (isDragging) {
                console.log('dragging');
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
            var svg = document.getElementById("plot");
            var mousePos = handlers.getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
            plot.zoom(mousePos, vertical);
        } else {
            plot.drag({ x: horizontal, y: 0 });
        }

        handlers.callGUI();
    },

    onButtonClickZoomIn: function () {
        plot.zoom({ x: 512, y: 128 }, -5);
        var interval = setInterval(function () {
            try {
                if (plot.snapIn({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                handlers.callGUI();
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },

    onButtonClickZoomOut: function () {
        console.log("snap zoom out");

        plot.zoom({ x: 512, y: 128 }, 5);
        var interval = setInterval(function () {
            try {
                if (plot.snapOut({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                handlers.callGUI();
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },

    searchPlots: function () {
        console.log("searchPlots");
        var searchText = $('#searchbar').val();
        var plotName = false;
        var plotsByName = plot.getPlotsByName();
        if (plotsByName[searchText]) {
            plotName = searchText;
        }
        if (plotName) {
            // change plot!
            console.log('changing plots');
            var oldPlotID = plot.getPlotID();
            plot.switchPlots(plotName);
            gui.hide(oldPlotID);
            handlers.callGUI();
        }
    },


    /*return {
        listenForDrag: listenForDrag,
        onWheel: onWheel,
        onButtonClickZoomIn: onButtonClickZoomIn,
        onButtonClickZoomOut: onButtonClickZoomOut,
    };*/
};

module.exports.handlers = handlers;