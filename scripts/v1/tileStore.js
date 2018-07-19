var tileStore = {
    local: true,
    localURL: null,
    setLocalTileBin: function (path) {
        this.localURL = path;
    },
    fetchTile: function (level, column) {
        var tilePath;
        if (this.local) {
            tilePath = this.localURL + "/" + level + "/" + column + ".png";
        } else {
            tilePath = "";
        }

        var x = column * 256;
        var y = 0;
        var width = 256;
        var height = 256;

        var svgLayer = document.getElementById(meta.ids.svgLayer(level));
        var newTile = document.createElementNS("http://www.w3.org/2000/svg", 'image');
        newTile.setAttribute("x", String(x));
        newTile.setAttribute("y", String(y));
        newTile.setAttribute("width", String(width));
        newTile.setAttribute("height", String(height));
        newTile.setAttributeNS("http://www.w3.org/1999/xlink", "href", tilePath);
        svgLayer.appendChild(newTile);
    },
    fetchLayerTiles: function (level, /*rows, columns, tileDimensions*/) {
        // assumes layers are already created
        
        var columns = Math.pow(2, level);
        var x = 0;
        for (var c = 0; c < columns; c++) {
            this.fetchTile(level, c);
            x = x + 256
        }
    },
    createLayer: function (level) {
        var plot = document.getElementById(meta.ids.plot);

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
    },
}

var meta = {
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
    layers: {
        "2": { level: 2, rows: 1, columns: 4, tileDimensions: { x: 256, y: 256 } },
        "3": { level: 3, rows: 1, columns: 8, tileDimensions: { x: 256, y: 256 } },
        "4": { level: 4, rows: 1, columns: 16, tileDimensions: { x: 256, y: 256 } },
        "5": { level: 5, rows: 1, columns: 32, tileDimensions: { x: 256, y: 256 } },
        "6": { level: 6, rows: 1, columns: 64, tileDimensions: { x: 256, y: 256 } },
    },
    visible: null,
    listOfLayers: function () {
        var all = [];
        for (var key in this.layers) {
            all.push(key.level);
        }
        return all;
    },
}