var dragPlotModule = {
    container: document.getElementById("container"),
    svg: document.getElementById("slippyplot"),
    xPositionOffset: 0,
    beforeDrag: function (mouseStartPosition) {
        var transform = this.addTranslateTransformIfNotExists();
        offset = mouseStartPosition.x - transform.matrix.e;
    },
    dragPlot: function (currentMousePosition) {
        //var transform = this.addTranslateTransformIfNotExists();
        //var offset = mouseStartPositionOffset.x - transform.matrix.e;
        this.moveContainerToPosition(currentMousePosition.x - offset);
    },
    addTranslateTransformIfNotExists: function () {
        // ensure the first transform on the element is a translate transform
        var transforms = this.container.transform.baseVal;
        if (transforms.length ===  0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
            // create a transform that translates by (0, 0)
            console.log("adding first transform");
            var translate = this.svg.createSVGTransform();
            translate.setTranslate(0, 0);
            this.container.transform.baseVal.insertItemBefore(translate, 0);
        }
    
        // get initial translation
        var transform = transforms.getItem(0);
        return transform;
    },
    moveContainerToPosition: function (horizontalPos) {
        var transform = this.addTranslateTransformIfNotExists();
        transform.setTranslate(horizontalPos, 0);
    },
    moveContainerByAmount: function (horizontalShift) {
        var transform = this.addTranslateTransformIfNotExists();
        transform.setTranslate(horizontalShift+transform.matrix.e, 0);
    }, 
};

/*adapted from
http://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/
 */
/*
function makeDraggable(evt) {
    var selectedElement, offset, transform;
    var svg = evt.target;
    console.log(svg);

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

    function startDrag(evt) {
        evt.preventDefault();
        var g = document.getElementById("container")
        if (evt.target.classList.contains('tile')) {
            selectedElement = g;
            offset = getMousePosition(evt);

            transform = addTranslateTransformIfNotExists(selectedElement);

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

function addTranslateTransformIfNotExists(elt) {
    var svg = document.getElementById("slippyplot")
    console.log("translate: ");
    console.log(svg);
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
    var transform = addTranslateTransformIfNotExists(elt);
    transform.setTranslate(horizontalPos, 0);
}

function moveElementByAmount(elt, horizontalShift) {
    var transform = addTranslateTransformIfNotExists(elt);
    transform.setTranslate(horizontalShift+transform.matrix.e, 0);
}*/
