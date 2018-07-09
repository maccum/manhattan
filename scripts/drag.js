function makeDraggable(evt) {
    var svg = evt.target;
    svg.addEventListener('mousedown', startDrag, false);
    svg.addEventListener('mousemove', drag, false);
    svg.addEventListener('mouseup', endDrag, false);

    function getMousePosition(evt) {
        var CTM = svg.getScreenCTM();
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }

    var selectedElement, offset, transform;

    function startDrag(evt) {
        evt.preventDefault();
        var g = document.getElementById("container")
        if (evt.target.classList.contains('tile')) {
            selectedElement = g;
            offset = getMousePosition(evt);

            transform = addTranslateTransformIfNotExists(svg, selectedElement);

            offset.x -= transform.matrix.e;
            //offset.y -= transform.matrix.f;
        }
    }

    function drag(evt) {
        if (selectedElement) {
            evt.preventDefault();
            var coord = getMousePosition(evt);
            moveElement(selectedElement, coord.x - offset.x);
        }
    }

    function endDrag(evt) {
        evt.preventDefault();
        selectedElement = false;
    }
}

function addTranslateTransformIfNotExists(svg, elt) {
    // ensure the first transform on the element is a translate transform
    var transforms = elt.transform.baseVal;
    if (transforms.length ===  0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
        // create a transform that translates by (0, 0)
        console.log("adding first transform");
        var translate = svg.createSVGTransform();
        translate.setTranslate(0, 0);
        elt.transform.baseVal.insertItemBefore(translate, 0);
    }

    // get initial translation
    transform = transforms.getItem(0);
    return transform;
}

function moveElement(elt, horizontalPos) {
    var svg = document.getElementById("slippy-plot")
    //var transform = elt.transform.baseVal.getItem(0);
    var transform = addTranslateTransformIfNotExists(svg, elt);
    transform.setTranslate(horizontalPos, 0);
}

function moveElementByAmount(elt, horizontalShift) {
    var svg = document.getElementById("slippy-plot")
    var transform = addTranslateTransformIfNotExists(svg, elt);
    transform.setTranslate(horizontalShift+transform.matrix.e, 0);
}
/*
document.getElementById("container").addEventListener("wheel", onWheel);
var zoom = 2;
var zoomMax = 7;
var zoomMin = 2;

var zooms = ['zoom-2', 'zoom-3'];

var distanceZoomIn = 0;
var distanceZoomOut = 0;

var recentlyZoomed = false;

function onWheel(evt) {
    evt.preventDefault();
    var horizontal = evt.deltaX;
    var vertical = evt.deltaY;

    //console.log("vertical: "+vertical);
    //console.log("horizontal: "+horizontal);

    if (Math.abs(vertical) >= Math.abs(horizontal)) {
        zoomOnVerticalScroll(vertical);
    } else {
        shiftOnHorizontalScroll(horizontal);
    }
}

function shiftOnHorizontalScroll(horizontal) {
    var g = document.getElementById("container")
    console.log("horizontal: "+horizontal);
    moveElementByAmount(g, horizontal);
}

function zoomOnVerticalScroll(vertical) {
    if (vertical < 0) {
        distanceZoomIn += vertical;
        distanceZoomOut = 0;
        if (distanceZoomIn < -20 && !recentlyZoomed) {
            recentlyZoomed = true;
            distanceZoomIn = 0;
            zoomIn();
            setTimeout(function() {
                recentlyZoomed = false;
            }, 1000);
        }
    } else if (vertical > 0) {
        distanceZoomOut += vertical;
        distanceZoomIn = 0;
        if (distanceZoomOut > 20 && !recentlyZoomed) {
            recentlyZoomed = true;
            distanceZoomOut = 0;
            zoomOut();
            setTimeout(function() {
                recentlyZoomed = false;
            }, 1000);
        }
    } else {
        //console.log("no zoom");
    }
}

function zoomIn() {
    if (zoom < zoomMax) {
        zoom = zoom+1;
        changeZoom(zoom-1);
    }
}

function zoomOut() {
    if (zoom > zoomMin) {
        zoom = zoom-1;
        changeZoom(zoom+1);
    }
}

function changeZoom(oldZoom) {
    $("#zoom").text(zoom);
    var zoomID = "zoom-"+zoom;

    changePositionToMatchZoom(oldZoom, zoom);

    for (var i = 0; i < zooms.length; i++) {
        $("."+zooms[i]).hide();
    }
    $("."+zoomID).show();
}

function changePositionToMatchZoom(oldZoom, newZoom) {
    var g = document.getElementById("container");
    var svg = document.getElementById("slippy-plot");
    //g.transform.baseVal.consolidate();
    var transform = addTranslateTransformIfNotExists(svg, g);
    var currentX = transform.matrix.e;

    var newTopLeftX = getNewContainerPosition(currentX, oldZoom, newZoom);
    transform.setTranslate(newTopLeftX, 0);
}

function createZoomLayer(zoom) {
    var g = document.getElementById("container");
    
    var columns = Math.pow(2, zoom);
    //var width = 256 * (Math.pow(2, zoom));
    var x = 0;

    function createTile(c) {
        var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'image');
        newElement.setAttribute("class", "tile zoom-"+zoom);
        newElement.setAttribute("y", "0");
        newElement.setAttribute("width", '256');
        newElement.setAttribute("height", '256');

        newElement.setAttribute("x", String(x));
        x = x + 256;
        var tilePath = "../plots/svg_tutorial_plots/"+zoom+"/"+c+".png";
        newElement.setAttributeNS("http://www.w3.org/1999/xlink", "href", tilePath);

        g.appendChild(newElement);
    }

    for (var c = 0; c < columns; c++) {
        createTile(c);
    }

    $(".zoom-"+zoom).hide();
    zooms.push("zoom-"+zoom)
    console.log(zooms)
}

createZoomLayer(4);
createZoomLayer(5);
createZoomLayer(6);
createZoomLayer(7);


function getXRange(zoom) {
    return [0, 256*Math.pow(2, zoom)]
}

function mapValueOntoRange(value, oldRange, newRange) {
    var oldSpan = oldRange[1] - oldRange[0];
    var newSpan = newRange[1] - newRange[0];
    var distanceToValue = value - oldRange[0];
    var percentSpanToValue = distanceToValue / oldSpan;
    var distanceToNewValue = percentSpanToValue * newSpan;
    var newValue = newRange[0] + distanceToNewValue;
    return newValue;
}

function getNewContainerPosition(oldTopLeftX, oldZoom, newZoom) {
    // get center of current view

    var oldCenterX = Math.abs(oldTopLeftX)+512;
    var oldXRange = getXRange(oldZoom);
    var newXRange = getXRange(newZoom);
    var newCenterX = mapValueOntoRange(oldCenterX, oldXRange, newXRange);
    var newTopLeftX = newCenterX - 512;
    console.log("new negative top left x: "+(-newTopLeftX));
    return -newTopLeftX;
}*/