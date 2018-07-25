var selectors = {
    ids: {
        widget: "widget",
        plot: "plot",
        layer: function (level) {
            return "layer-" + level;
        },
        svgLayer: function (level) {
            return "svg-layer-" + level;
        },
    },
}