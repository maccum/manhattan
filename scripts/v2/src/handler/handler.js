var gui = require('../gui/gui.js').gui;
var plot = require('../plot/plot.js').plot;

//browserify --debug scripts/v2/src/handler/initializer.js scripts/v2/src/handler/handler.js -o bundles/v2/v2_bundle.js

function callGUI(visiblesAndHiddens) {
    gui.render(visiblesAndHiddens[0], visiblesAndHiddens[1]);
}

function listenForDrag(evt) {
    console.log("listenForDrag");
    var isDragging = false;
    var svg = evt.target;

    svg.addEventListener('mousedown', beginDrag, false);
    svg.addEventListener('mousemove', drag, false);
    svg.addEventListener('mouseup', endDrag, false);

    var mousePositionSinceLastMove;

    function getMousePosition(evt) {
        return getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
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

            callGUI(plot.getInfoForGUI());

            mousePositionSinceLastMove = currentMousePosition;
        }
    }

    function endDrag(evt) {
        evt.preventDefault();
        isDragging = false;
    }
}

function onWheel(evt) {
    evt.preventDefault();
    var horizontal = evt.deltaX;
    var vertical = evt.deltaY;

    if (Math.abs(vertical) >= Math.abs(horizontal)) {
        var svg = document.getElementById("plot");
        var mousePos = getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
        plot.zoom(mousePos, vertical);
    } else {
        plot.drag({ x: horizontal, y: 0 });
    }

    callGUI(plot.getInfoForGUI());
}

function getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
    var ctm = boundingObject.getScreenCTM();
    return {
        x: (mouseX - ctm.e) / ctm.a,
        y: (mouseY - ctm.f) / ctm.d
    };
}

document.getElementById("plot").addEventListener("wheel", onWheel);

document.getElementById("zoom-in-button").addEventListener("click", function () {
    plot.zoom({ x: 512, y: 128 }, -5);
    var interval = setInterval(function () {
        try {
            if (plot.snapIn({ x: 512, y: 128 })) {
                clearInterval(interval);
            }
            callGUI(plot.getInfoForGUI());
        } catch (e) {
            console.error(e.stack);
            clearInterval(interval);
        }
    }, .1);
});

document.getElementById("zoom-out-button").addEventListener("click", function () {
    console.log("snap zoom out");

    plot.zoom({ x: 512, y: 128 }, 5);
    var interval = setInterval(function () {
        try {
            if (plot.snapOut({ x: 512, y: 128 })) {
                clearInterval(interval);
            }
            callGUI(plot.getInfoForGUI());
        } catch (e) {
            console.error(e.stack);
            clearInterval(interval);
        }
    }, .1);
});

document.getElementById("plot").addEventListener("load", listenForDrag);