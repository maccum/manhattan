var editSVG = require('../utils/svg.js').editSVG;
var schema = require('../utils/schema.js').schema;
var tag = require('../utils/tag.js').tag;
var setup = require('../ui/setup.js').setup;
var selectors = require('../utils/selectors.js').selectors;

/*Render plot images on page.*/

var gui = {
    plotURLs: {
        // 0: '/path/to/images',
    },
    hide: function(plotName) {
        new tag().select(plotName).attribute('display', 'none');
    },
    addTileIfNotExists: function(plotName, level, column, url, imageWidth, imageHeight) {
        var tileID = selectors.ids.tileID(plotName, level, column)
        var tile = document.getElementById(tileID);
        if (tile === null) {
            setup.addTile(plotName, level, column, url, imageWidth, imageHeight);
        }
    },
    render: function (args) {
        schema.check(args, ['plotName', 'visibleLayers', 'hiddenLevels', 'dimensions', 'tilesInView']);
        var plotName = args.plotName,
            plotID = args.plotID,
            visibleLayers = args.visibleLayers,
            hiddenLevels = args.hiddenLevels,
            dims = args.dimensions
            tilesInView = args.tilesInView;

        // add images in view to page, if they need to be added
        var levelsInView = Object.keys(tilesInView);
        var url = gui.plotURLs[plotID];
        for (var i = 0; i < levelsInView.length; i++) {
            var columnsInView = tilesInView[levelsInView[i]];
            for (var c = 0; c < columnsInView.length; c++) {
                this.addTileIfNotExists(plotName, levelsInView[i], columnsInView[c], url, 256, 256);
            }
        }

        new tag().select(plotName).attribute('display', 'inline');

        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            throw new Error("Must have 1-2 visible layers.");
        }

        for (var hiddenIndex in hiddenLevels) {
            var level = hiddenLevels[hiddenIndex];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw new Error("GUI ERROR: expected a list of numbers for hiddenLayers.");
            }
            new editSVG().set(plotName, level).hide();
        }

        for (var visibleIndex in visibleLayers) {
            var layer = visibleLayers[visibleIndex];
            if (!schema.layer(layer)) throw new Error("GUI: expected layer schema.");
            if (layer.scale.x > 2 || layer.scale.x < .5 || layer.scale.y > 2 || layer.scale.y < .5) {
                throw new Error("GUI: scale outside [.5,2] range. Scale should be converted to [.5,2] before being passed to GUI. [" + layer.scale.x + ", " + layer.scale.y + "]");
            }

            var svgBundle = new editSVG().set(plotName, layer.level);
            
            var dimsFromPage = svgBundle.dimensions();
            if ((dimsFromPage[0] != dims[layer.level].width) || (dimsFromPage[1] != dims[layer.level].height)) {
                throw new Error("GUI: dimensions of plot on page don't match dimensions of plot from model");
            }

            svgBundle
                .translate(layer.topLeft.x, layer.topLeft.y)
                .scale(layer.scale.x, layer.scale.y)
                .fade(layer.opacity)
                .show();
        }

        var visiblesString = "";
        var scalesString = "";
        var opacityString = "";
        for (var key in visibleLayers) {
            visiblesString += " " + visibleLayers[key].level;
            scalesString += " " + visibleLayers[key].scale.x;
            opacityString += " " + visibleLayers[key].opacity;
        }

        // these are just for displaying which zoom level is visible, and the fractional zoom and opacity of the visible layers
        // can be deleted
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
        $("#opacity-div").text(opacityString);
    },
};

module.exports.gui = gui;