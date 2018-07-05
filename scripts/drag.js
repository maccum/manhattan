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
            offset.y -= transform.matrix.f;
        }
    }

    function drag(evt) {
        if (selectedElement) {
            evt.preventDefault();
            var coord = getMousePosition(evt);
            transform.setTranslate(coord.x - offset.x, coord.y - offset.y);
        }
    }

    function endDrag(evt) {
        evt.preventDefault();
        console.log("endDrag");
        selectedElement = false;
    }

}