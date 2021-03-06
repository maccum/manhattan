var page = require('../gui/page.js').page;
var selectors = require('../gui/selectors.js').selectors;
var plot = require('../plot/plot.js').plot;

plot.initializeVisible(2, { width: 1024, height: 256 });
plot.initializeHidden(3, { width: 2048, height: 256 });

//var tileFolderPath = "../plots/svg_tutorial_plots/";
var tileFolderPath = document.getElementById('plot_url').innerHTML;
console.log("tileFolderPath"+tileFolderPath);

function addTile(level, column) {
    var tilePath = tileFolderPath + "/" + level + "/" + column + ".png";

    var x = column * 256;
    var y = 0;
    var width = 256;
    var height = 256;

    var svg = new page().select(selectors.ids.svgLayer(level));
    
    //create tile
    new page()
        .create('image')
        .attribute('x', String(x))
        .attribute('y', String(y))
        .attribute('width', String(width))
        .attribute('height', String(height))
        .addHREF(tilePath)
        .place(svg);
}

function addAllTilesForLayer(level) {
    var columns = Math.pow(2, level);
    var x = 0;
    for (var c = 0; c < columns; c++) {
        addTile(level, c);
        x = x + 256;
    }
}

function addLayerToPage(level, visibility) {
    //console.log(selectors.plot);
    var plt = new page().select(selectors.ids.plot);
    //console.log(plt.element);
    var columns = Math.pow(2, level);

    var group = new page()
        .create('g')
        .attribute('id', 'layer-' + level)
        .attribute('visibility', visibility)
        .place(plt);

    var width = columns * 256;
    var height = 256;

    //create <svg> inside <g>
    new page()
        .create('svg')
        .attribute('id', 'svg-layer-' + level)
        .attribute('width', String(width))
        .attribute('height', String(height))
        .place(group);

    addAllTilesForLayer(level);

    plot.initializeHidden(level, { width: width, height: height });
    console.log(plot.hiddens);
}

var smallestZoom = parseInt(document.getElementById('smallest_zoom').innerHTML);
var largestZoom = parseInt(document.getElementById('largest_zoom').innerHTML);

/*
addLayerToPage(4);
addLayerToPage(5);
addLayerToPage(6);
addLayerToPage(7);*/

addLayerToPage(smallestZoom, 'visible');
for (var i = smallestZoom+1; i<largestZoom+1; i++) {
    addLayerToPage(i, 'hidden');
}
