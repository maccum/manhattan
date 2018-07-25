plot.initializeVisible(2, { width: 1024, height: 256 });
plot.initializeHidden(3, { width: 2048, height: 256 });

var tileFolderPath = "../plots/svg_tutorial_plots/";

function addTile(level, column) {
    var tilePath = tileFolderPath + "/" + level + "/" + column + ".png";

    var x = column * 256;
    var y = 0;
    var width = 256;
    var height = 256;

    var svg = new page().select(selectors.ids.svgLayer(level));
    var tile = new page()
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
        this.addTile(level, c);
        x = x + 256;
    }
}

function addLayerToPage(level) {
    console.log(selectors.plot);
    var plt = new page().select(selectors.ids.plot);
    console.log(plt.element);
    var columns = Math.pow(2, level);

    var group = new page()
        .create('g')
        .attribute('id', 'layer-' + level)
        .attribute('visibility', 'hidden')
        .place(plt);

    var width = columns * 256;
    var height = 256;

    var svg = new page()
        .create('svg')
        .attribute('id', 'svg-layer-' + level)
        .attribute('width', String(width))
        .attribute('height', String(height))
        .place(group);

    addAllTilesForLayer(level);

    plot.initializeHidden(level, { width: width, height: height });
    console.log("Hiddens: " + plot.hiddens);
}

addLayerToPage(4);
addLayerToPage(5);
addLayerToPage(6);
addLayerToPage(7);