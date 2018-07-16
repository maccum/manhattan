/*adapted from
http://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/
 */
var dragPlotModule = {
    container: document.getElementById("container"),
    svg: document.getElementById("slippyplot"),
    xPositionOffset: 0,
    beforeDrag: function (mouseStartPosition) {
        var transform = this.addTranslateTransformIfNotExists();
        offset = mouseStartPosition.x - transform.matrix.e;
    },
    dragPlot: function (currentMousePosition) {
        this.moveContainerToPosition(currentMousePosition.x - offset);
    },
    addTranslateTransformIfNotExists: function () {
        var transforms = this.container.transform.baseVal;
        if (transforms.length ===  0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
            console.log("adding first transform");
            var translate = this.svg.createSVGTransform();
            translate.setTranslate(0, 0);
            this.container.transform.baseVal.insertItemBefore(translate, 0);
        }
    
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

