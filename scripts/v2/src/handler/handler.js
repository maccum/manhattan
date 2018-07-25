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
            console.log(changeInMousePosition);
            plot.drag(changeInMousePosition);

            var visibles = Object.keys(plot.visibles).map(function(key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

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
        var mousePos = getMousePositionWithinObject(evt.clientX, evt.clientY, svg)
        plot.zoom(mousePos, vertical);
    } else {
        plot.drag({x: horizontal, y: 0});
    }

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
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
    plot.snapIn({ x: 512, y: 128 });

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
});

document.getElementById("zoom-out-button").addEventListener("click", function (e) {
    console.log("snap zoom out");
    plot.snapOut({ x: 512, y: 128 });

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
});