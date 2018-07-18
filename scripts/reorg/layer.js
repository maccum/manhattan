class Layer {
    constructor(layer) {
        this.layer = document.getElementById(selectors.layerID(layer));
        this.svgLayer = document.getElementById(selectors.svgLayerID(layer));
        this.svg = document.getElementById(selectors.plot);
    }

    transformations() {
        var transformations = this.layer.transform.baseVal;
        if (transformations.length===0) {
            var translate = this.svg.createSVGTransform();
            translate.setTranslate(0,0);
            this.layer.transform.baseVal.insertItemBefore(translate, 0);

            var scale = this.svg.createSVGTransform();
            scale.setScale(1.0,1.0);
            this.layer.transform.baseVal.insertItemBefore(scale, 1);
        } else {
            //assert(transformations.getItem(0).type === SVGTransform.SVG_TRANSFORM_TRANSLATE);
            //assert(transformations.getItem(1).type === SVGTransform.SVG_TRANSFORM_SCALE);
        }
        return this.layer.transform.baseVal;
    }

    translate(shiftX, shiftY) {
        var translation = this.transformations().getItem(0);
        //assert(translation.type === SVGTransform.SVG_TRANSFORM_TRANSLATE);
        translation.setTranslate(shiftX, shiftY);
    }

    scale(scaleX, scaleY) {
        var scale = this.transformations().getItem(1);
        //assert(scale.type === SVGTransform.SVG_TRANSFORM_SCALE);
        scale.setScale(scaleX, scaleY);
    }

    shift(shiftX) {
        var translation = this.transformations().getItem(0);
        //assert(translation.type === SVGTransform.SVG_TRANSFORM_TRANSLATE);
        translation.setTranslate(shiftX + translation.matrix.e, translation.matrix.f);
    }

    x() {
        return this.transformations().getItem(0).matrix.e;
    }

    y() {
        return this.transformations().getItem(0).matrix.f;
    }

    topLeft() {
        return {
            x: this.x(),
            y: this.y(),
        }
    }

    hide() {
        this.layer.setAttribute("visibility", "hidden");
    }

    show() {
        this.layer.setAttribute("visibility", "visibile");
    }

    width() {
        return this.svgLayer.width.baseVal.value;
    }

    height() {
        return this.svgLayer.height.baseVal.value;
    }
}