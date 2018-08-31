var selectors = require('./selectors.js').selectors;

/*Manipulate svg zoom levels.*/
var editSVG = function () {
    this.layer; // <g> element for a zoom level
    this.plot; // <svg id='plot> element (plot viewing window)
};

/* Initialize  */
editSVG.prototype.set = function (plotID, level) {
    // <g>
    this.layer = document.getElementById(selectors.ids.group(plotID, level));
    // svg viewing window for plots
    this.plot = document.getElementById(selectors.ids.plot);
    // <svg> inside the <g>
    this.innerContainer = document.getElementById(selectors.ids.svgLayer(plotID, level));
    return this;
};

editSVG.prototype.dimensions = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    if (!this.innerContainer) throw new Error('editSVG: innerContainer must be initialized');
    //return [this.innerContainer.getBBox().width, this.innerContainer.getBBox().height];
    return [this.innerContainer.width.baseVal.value, this.innerContainer.height.baseVal.value];
}

/*Get list of transformations for a <g> zoom level.

Transformations list should always contain 2 items only: a translate(x,y) and a scale(x,y).
When layers are manipulated (moved and scaled), these transforms should be edited in place.*/
editSVG.prototype.transformations = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    
    var transformations = this.layer.transform.baseVal;
    if (!transformations.length || transformations.length === 0) {
        // if transformations list is empty, create it
        var translate = this.plot.createSVGTransform();
        translate.setTranslate(0, 0);
        this.layer.transform.baseVal.insertItemBefore(translate, 0);

        var scale = this.plot.createSVGTransform();
        scale.setScale(1.0, 1.0);
        this.layer.transform.baseVal.insertItemBefore(scale, 1);
    } else {
        // if transforms is not empty, double check that there are only 2 transforms
        if (transformations.length !== 2) throw new Error("editSVG: expected transformations to be a list of length 2, not"+transformations.length);
        if (transformations.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw new Error("editSVG: first transform is not a Translate.");
        if (transformations.getItem(1).type !== SVGTransform.SVG_TRANSFORM_SCALE) throw new Error("editSVG: transform is not a Scale.");
    }
    return this.layer.transform.baseVal;
};

/*Edit the position of a <g> layer */
editSVG.prototype.translate = function (shiftX, shiftY) {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.")
    if ((!shiftX || !shiftY) && (shiftX != 0 && shiftY != 0)) throw new Error("editSVG: cannot translate SVG object with null, undefined, or empty shift values. shiftX: "+shiftX+" shiftY:"+shiftY);
    var translation = this.transformations().getItem(0);
    if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw new Error("editSVG: first transform is not a Translate.");
    translation.setTranslate(shiftX, shiftY);
    return this;
};

/* Edit the scale of a <g> layer */
editSVG.prototype.scale = function (scaleX, scaleY) {
    var scale = this.transformations().getItem(1);
    if (scale.type !== SVGTransform.SVG_TRANSFORM_SCALE) throw new Error("editSVG: second transform is not a Scale.");
    scale.setScale(scaleX, scaleY);
    return this;
};

/* Edit the opacity of a <g> layer */
editSVG.prototype.fade = function (opacity) {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("opacity", opacity);
    return this;
};

/* Hide layer */
editSVG.prototype.hide = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("visibility", "hidden");
    return this;
};

/* Show layer */
editSVG.prototype.show = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("visibility", "visible");
    return this;
};

module.exports.editSVG = editSVG;