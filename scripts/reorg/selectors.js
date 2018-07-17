var selectors = {
    widget: "widget",
    plot: "plot",
    layer: "layer-",
    svgLayer: "svg-layer-",
    layerID: function(level) {
        return this.layer + level;
    },
    svgLayerID: function(level) {
        return this.svgLayer + level;
    }
}



