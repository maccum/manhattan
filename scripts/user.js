function listenForDrag(evt) {
    var isDragging = false;
    var offset, transform;
    var mousePositionOnStartDrag;
    var svg = evt.target;
    console.log("svg: " + svg);

    svg.addEventListener('mousedown', beginDrag, false);
    svg.addEventListener('mousemove', drag, false);
    svg.addEventListener('mouseup', endDrag, false);

    function getMousePosition(evt) {
        console.log("svg: "+svg);
        return getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
    }

    function beginDrag(evt) {
        evt.preventDefault();
        if (evt.target.classList.contains('tile')) {
            isDragging = true;
            mousePositionOnStartDrag = getMousePosition(evt);
            console.log("mouse start pos: "+mousePositionOnStartDrag.x+" "+mousePositionOnStartDrag.y);
            dragPlotModule.beforeDrag(mousePositionOnStartDrag);
        }
    }

    function drag(evt) {
        if (isDragging) {
            evt.preventDefault();
            var currentMousePosition = getMousePosition(evt);
            dragPlotModule.dragPlot(currentMousePosition);
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

        zoomModule.zoomOnVerticalScroll(vertical, {x: evt.clientX, y: evt.clientY});
    } else {
        zoomModule.shiftOnHorizontalScroll(horizontal);
    }
}

function getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
    console.log("mouseX: "+mouseX);
    console.log("mosueY: "+mouseY);
    // get mouse coordiantes relative to the bounding object
    var ctm = boundingObject.getScreenCTM();
    return {
        x: (mouseX - ctm.e) / ctm.a,
        y: (mouseY - ctm.f) / ctm.d
    };
}