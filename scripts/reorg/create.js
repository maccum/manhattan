function populateLayer(level) {
    var columns = Math.pow(2, level);
    var x = 0;
    for (var c = 0; c < columns; c++) {
        var tilePath = "../plots/svg_tutorial_plots/" + level + "/" + c + ".png";
        createTile(level, tilePath, x, 0, 256, 256);
        x = x + 256
    }
}

function createLayer(level) {
    var plot = document.getElementById(selectors.plot);

    var columns = Math.pow(2, level);

    var newGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    newGroup.setAttribute("id", "layer-" + level);
    plot.appendChild(newGroup);

    var newSVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    newSVG.setAttribute("id", "svg-layer-" + level);
    newSVG.setAttribute("width", String(columns * 256));
    newSVG.setAttribute("height", "256");
    newGroup.appendChild(newSVG);

    render.getLayer(level).hide();
    render.layers.push(level);
    console.log(render.layers);
}

function createTile(level, tilePath, x, y, width, height) {
    var svgLayer = document.getElementById(selectors.svgLayerID(level));

    var newTile = document.createElementNS("http://www.w3.org/2000/svg", 'image');
    newTile.setAttribute("y", String(y));
    newTile.setAttribute("width", String(width));
    newTile.setAttribute("height", String(height));
    newTile.setAttribute("x", String(x));
    newTile.setAttributeNS("http://www.w3.org/1999/xlink", "href", tilePath);
    svgLayer.appendChild(newTile);
}

/*createZoomLayer(4);
createZoomLayer(5);
createZoomLayer(6);
createZoomLayer(7);*/

for (var i = 4; i<8; i++) {
    createLayer(i);
    populateLayer(i);
}