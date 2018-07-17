function listenForDrag(evt) {
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
        if (evt.target.classList.contains('tile')) {
            isDragging = true;
            var mousePositionOnStartDrag = getMousePosition(evt);
            plot.beforeDrag(mousePositionOnStartDrag);
        }
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
        plot.zoom({x: evt.clientX, y: evt.clientY}, vertical);
    } else {
        plot.shift(horizontal);
    }
}

function getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
    console.log("mouseX: "+mouseX);
    console.log("mosueY: "+mouseY);
    // get mouse coordinates relative to the bounding object
    var ctm = boundingObject.getScreenCTM();
    return {
        x: (mouseX - ctm.e) / ctm.a,
        y: (mouseY - ctm.f) / ctm.d
    };
}


document.getElementById("plot").addEventListener("wheel", onWheel);

document.getElementById("zoom-in-button").addEventListener("click", function (e) {
    plot.snapZoomIn({x: 512, y: 128});
});
document.getElementById("zoom-out-button").addEventListener("click", function (e) {
    plot.snapZoomOut({x: 512, y: 128});
});