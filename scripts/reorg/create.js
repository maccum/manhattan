function createZoomLayer(level) {
    //var g = document.getElementById("container");
    var plot = document.getElementById(selectors.plot);

    var columns = Math.pow(2, level);
    //var width = 256 * (Math.pow(2, zoom));
    var x = 0;

    var newGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    newGroup.setAttribute("id", "layer-" + level);
    plot.appendChild(newGroup);

    var newSVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    newSVG.setAttribute("id", "svg-layer-" + level);
    newSVG.setAttribute("width", String(columns * 256));
    newSVG.setAttribute("height", "256");
    newGroup.appendChild(newSVG);

    function createTile(c) {
        var newTile = document.createElementNS("http://www.w3.org/2000/svg", 'image');
        //newElement.setAttribute("class", "tile zoom-" + zoomLevel);
        newTile.setAttribute("y", "0");
        newTile.setAttribute("width", '256');
        newTile.setAttribute("height", '256');

        newTile.setAttribute("x", String(x));
        x = x + 256;
        var tilePath = "../plots/svg_tutorial_plots/" + level + "/" + c + ".png";
        newTile.setAttributeNS("http://www.w3.org/1999/xlink", "href", tilePath);

        newSVG.appendChild(newTile);
    }

    for (var c = 0; c < columns; c++) {
        createTile(c);
    }

    //$(".zoom-" + zoomLevel).hide();
    render.getLayer(level).hide();
    //zoomModule.zooms.push("zoom-" + zoomLevel);
    render.layers.push(level);
    console.log(render.layers);
}


createZoomLayer(4);
createZoomLayer(5);
createZoomLayer(6);
createZoomLayer(7);