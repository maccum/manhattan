class Layer {
    constructor(layer) {
        this.layer = document.getElementById(meta.ids.layer(layer));
        this.svgLayer = document.getElementById(meta.ids.svgLayer(layer));
        this.svg = document.getElementById(meta.ids.plot);
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
            if (transformations.length !== 2) slippyPlotError("Layer", "expected transformations to be a list of length 2.");
            if (transformations.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) slippyPlotError("Layer", "first transform is not a Translate.");
            if (transformations.getItem(1).type !== SVGTransform.SVG_TRANSFORM_SCALE) slippyPlotError("Layer", "second transform is not a Scale.");
        }
        return this.layer.transform.baseVal;
    }

    translate(shiftX, shiftY) {
        var translation = this.transformations().getItem(0);
        if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) slippyPlotError("Layer", "first transform is not a Translate.");
        translation.setTranslate(shiftX, shiftY);
    }

    scale(scaleX, scaleY) {
        var scale = this.transformations().getItem(1);
        if (scale.type !== SVGTransform.SVG_TRANSFORM_SCALE) slippyPlotError("Layer", "second transform is not a Scale.");
        scale.setScale(scaleX, scaleY);
    }

    shift(shiftX) {
        var translation = this.transformations().getItem(0);
        if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) slippyPlotError("Layer", "first transform is not a Translate.");
        translation.setTranslate(shiftX + translation.matrix.e, translation.matrix.f);
    }

    fade(opacity) {
        this.layer.setAttribute("opacity", opacity);
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