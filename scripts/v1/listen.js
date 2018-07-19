function listenForDrag(evt) {
    console.log("listenForDrag");
    var isDragging = false;
    var offset;
    var svg = evt.target;

    svg.addEventListener('mousedown', beginDrag, false);
    svg.addEventListener('mousemove', drag, false);
    svg.addEventListener('mouseup', endDrag, false);

    function getMousePosition(evt) {
        return getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
    }

    function beginDrag(evt) {
        evt.preventDefault();
        console.log("beginDrag");
        isDragging = true;
        var mousePositionOnStartDrag = getMousePosition(evt);
        plot.beforeDrag(mousePositionOnStartDrag);
    }

    function drag(evt) {
        if (isDragging) {
            evt.preventDefault();
            var currentMousePosition = getMousePosition(evt);
            plot.drag(currentMousePosition);
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
        var mousePos = getMousePositionWithinObject(evt.clientX, evt.clientY, svg)
        plot.zoom(mousePos, vertical);
    } else {
        plot.shift(horizontal);
    }
}

function getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
    var ctm = boundingObject.getScreenCTM();
    return {
        x: (mouseX - ctm.e) / ctm.a,
        y: (mouseY - ctm.f) / ctm.d
    };
}


document.getElementById("plot").addEventListener("wheel", onWheel);

document.getElementById("zoom-in-button").addEventListener("click", function (e) {
    console.log("snap zoom in");
    plot.snapZoomIn({ x: 512, y: 128 });
});
document.getElementById("zoom-out-button").addEventListener("click", function (e) {
    console.log("snap zoom out");
    plot.snapZoomOut({ x: 512, y: 128 });
});