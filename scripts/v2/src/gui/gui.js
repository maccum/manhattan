var gui = {
    render: function (visibleLayers, hiddenLevels) {

        //console.log(hiddenLevels);
        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            throw "Must have 1-2 visible layers.";
        }

        for (index in hiddenLevels) {
            var level = hiddenLevels[index];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw "GUI ERROR: expected a list of numbers for hiddenLayers.";
            }
            
            new editSVG().set(level).hide();
        }

        for (index in visibleLayers) {
            var layer = visibleLayers[index];
            if (!schema.layer(layer)) throw "GUI: expected layer schema.";

            
            new editSVG()
                .set(layer.level)
                .translate(layer.topLeft.x, layer.topLeft.y)
                .scale(layer.scale.x/plot.scaleFactor, layer.scale.y/plot.scaleFactor) // where best to put scaleFactor
                .fade(layer.opacity)
                .show();
        }

        var visiblesString = "";
        var scalesString = "";
        var opacityString = "";
        for (key in plot.visibles) {
            visiblesString += " " + key;
            scalesString += " " + plot.visibles[key].scale.x/10000;
            opacityString += " "+ plot.visibles[key].opacity;
        }
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
        $("#opacity-div").text(opacityString);
    },
}