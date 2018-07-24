var gui = {
    render: function (visibleLayers, hiddenLevels) {
        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            throw "Must have 1-2 visible layers.";
        }

        for (level in hiddenLevels) {
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw "GUI ERROR: expected a list of numbers for hiddenLayers.";
            }

            new editSVG().set(level).hide();
        }

        for (layer in visibleLayers) {
            if (!schema.layer(layer)) throw "GUI: expected layer schema.";
            
            new editSVG()
                .set(layer.level)
                .translate(layer.topLeft.x, layer.topLeft.y)
                .scale(layer.scale.x/plot.scaleFactor, layer.scale.y/plot.scaleFactor) // where best to put scaleFactor
                .fade(layer.opacity)
                .show();
        }
    },
}