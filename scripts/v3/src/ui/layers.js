var tag = require('./ui_utils/tag.js').tag;
var selectors = require('./ui_utils/selectors.js').selectors;

var layers = (function () {
    function addPlotToPage(target, plotID) {
        // add g for a single plot (phenotype), hidden with display=none
        new tag()
            .createNS('g')
            .attribute('id', plotID)
            .attribute('display', 'none')
            .place(target);
    };

    /* place a zoom layer group <g><svg></svg></g> inside a plot's <svg> */
    function addGroup(plotID, level, width, height) {
        var plot = new tag().select(plotID);

        var group = new tag()
            .createNS('g')
            .attribute('id',selectors.ids.group(plotID, level))
            .attribute('visibility', 'hidden')
            .place(plot);
        new tag()
            .createNS('svg')
            .attribute('id', selectors.ids.svgLayer(plotID, level))
            .attribute('width', width)
            .attribute('height', height)
            .place(group);
    };

    function addTile(plotID, level, column, url, imageWidth, imageHeight) {
        var tileURL = url + "/" + level + "/" + column + ".png";

        var x = column * imageWidth;
        var y = 0;
        var width = imageWidth;
        var height = imageHeight;

        var svg = new tag().select(selectors.ids.svgLayer(plotID, level));

        //create tile
        new tag()
            .createNS('image')
            .attribute('x', String(x))
            .attribute('y', String(y))
            .attribute('width', String(width))
            .attribute('height', String(height))
            .addHREF(tileURL)
            .place(svg);
    };

    function addTiles(plotID, level, url, imageWidth, imageHeight) {
        var columns = Math.pow(2, level);
        var x = 0;
        for (var c = 0; c < columns; c++) {
            addTile(plotID, level, c, url, imageWidth, imageHeight);
            x = x + 256;
        }
    };

    return {
        insertPlotImages(plotID, minLevel, maxLevel, url, imageWidth, imageHeight) {
            var plotContainer = new tag().select('plot');
            addPlotToPage(plotContainer, plotID);
            for (var i = minLevel; i<maxLevel+1; i++) {
                var columns = Math.pow(2, i);
                var width = columns * imageWidth;
                var height = imageHeight;
                addGroup(plotID, i, width, height);
                addTiles(plotID, i, url, imageWidth, imageHeight);
            }
        },
        showPlot: function (plotID) {
            new tag().select(plotID).attribute('display', 'inline');
        },
        hidePlot:function (plotID) {
            new tag().select(plotID).attribute('display', 'none');
        }
    }
}());

module.exports.layers = layers;