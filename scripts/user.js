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
        var CTM = svg.getScreenCTM();
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }

    function beginDrag(evt) {
        evt.preventDefault();
        if (evt.target.classList.contains('tile')) {
            isDragging = true;
            mousePositionOnStartDrag = getMousePosition(evt);
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
        zoomModule.zoomOnVerticalScroll(vertical);
    } else {
        zoomModule.shiftOnHorizontalScroll(horizontal);
    }
}