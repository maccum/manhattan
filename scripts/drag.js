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
        console.log("start drag");
        var g = document.getElementById("container")
        if (evt.target.classList.contains('tile')) {
            //selectedElement = evt.target;
            selectedElement = g;
            console.log("selectedElement: " + selectedElement)
            offset = getMousePosition(evt);

            // ensure the first transform on the element is a translate transform
            var transforms = selectedElement.transform.baseVal;

            if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
                // create a transform that translates by (0, 0)
                var translate = svg.createSVGTransform();
                translate.setTranslate(0, 0);
                selectedElement.transform.baseVal.insertItemBefore(translate, 0);
            }

            // get initial translation
            transform = transforms.getItem(0);
            offset.x -= transform.matrix.e;
            //offset.y -= transform.matrix.f;
        }
    }

    function drag(evt) {
        if (selectedElement) {
            evt.preventDefault();
            var coord = getMousePosition(evt);
            transform.setTranslate(coord.x - offset.x, /*coord.y - offset.y*/0);
        }
    }

    function endDrag(evt) {
        evt.preventDefault();
        console.log("endDrag");
        selectedElement = false;
    }

}

document.getElementById("container").addEventListener("wheel", onWheel);
var zoom = 2;
var zoomMax = 7;
var zoomMin = 2;

var zooms = ['zoom-2', 'zoom-3'];

function onWheel(evt) {
    if (evt.deltaX > 1) {
        zoomIn();
    } else if (evt.deltaX < 0) {
        zoomOut();
    } else {
        console.log("no zoom");
    }

    console.log("change in X: "+evt.deltaX)
}

function zoomIn() {
    if (zoom < zoomMax) {
        zoom = zoom+1;
        changeZoom();
    }
}

function zoomOut() {
    if (zoom > zoomMin) {
        zoom = zoom-1;
        changeZoom();
    }
}

function changeZoom() {
    $("#zoom").text(zoom);
    var zoomID = "zoom-"+zoom;
    for (var i = 0; i < zooms.length; i++) {
        $("."+zooms[i]).hide();
    }
    $("."+zoomID).show();
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
    //d3.select("#container").append(newElement);
}

createZoomLayer(4);
createZoomLayer(5);
createZoomLayer(6);
createZoomLayer(7);