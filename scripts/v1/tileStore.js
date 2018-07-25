var tileStore = {
    local: true,
    localURL: null,
    setLocalTileBin: function (path) {
        this.localURL = path;
    },
    fetchTile: function (level, column) {
        if (!this.localURL) throw "Tile Store URL is null.";
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
            x = x + 256;
        }
    },
    createLayer: function (level) {
        var plot = document.getElementById(meta.ids.plot);
        var columns = Math.pow(2, level);

        var newGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        newGroup.setAttribute("id", "layer-" + level);
        newGroup.setAttribute("visibility", "hidden");
        plot.appendChild(newGroup);

        var newSVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        newSVG.setAttribute("id", "svg-layer-" + level);
        newSVG.setAttribute("width", String(columns * 256));
        newSVG.setAttribute("height", "256");
        newGroup.appendChild(newSVG);

        //render.getLayer(level).hide();
        //render.layers.push(level);
        //console.log(render.layers);
        meta.addHidden(level);
        console.log("Hiddens: "+meta.hiddens);
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
    max: 7,
    min: 2,
    /*layers: {
        2: { level: 2, rows: 1, columns: 4, tileDimensions: { x: 256, y: 256 } },
        3: { level: 3, rows: 1, columns: 8, tileDimensions: { x: 256, y: 256 } },
        4: { level: 4, rows: 1, columns: 16, tileDimensions: { x: 256, y: 256 } },
        5: { level: 5, rows: 1, columns: 32, tileDimensions: { x: 256, y: 256 } },
        6: { level: 6, rows: 1, columns: 64, tileDimensions: { x: 256, y: 256 } },
    },*/
    visibles: {

    },
    hiddens: {

    },
    /*listOfLayers: function () {
        var all = [];
        for (var key in this.layers) {
            all.push(key.level);
        }
        return all;
    },
    listOfOtherLayers: function (level) {
        var all = this.listOfLayers();
        return all.splice(all.indexOf(level), 1);
    },*/
    addVisible: function (level, scale) {
        this.visibles[level] = {layer: new Layer(level), scale: scale};
        var newLayer = this.visibles[level].layer;
        newLayer.show();
        newLayer.fade(this.alpha(level));
    },
    addHidden: function (level) {
        this.hiddens[level] = {layer: new Layer(level)};
        this.hiddens[level].layer.hide();
    },
    removeVisible: function(level) {
        delete this.visibles[level];
    },
    removeHidden: function (level) {
        delete this.hiddens[level];
    },
    scaleInUnits: function (scale) {
        return { x: scale.x / 10000, y: 1 };
    },
    increaseScale: function () {
        for (key in this.visibles) {
            if (this.visibles[key].scale.x < 10000) {
                this.visibles[key].scale.x += 5;
            } else if (key < this.max) {
                this.visibles[key].scale.x += 10;
            }
            if (this.visibles[key].scale.x >= 18000 && key < this.max) {
                this.removeVisible(key);
                this.addHidden(key);
            } else if (this.visibles[key].scale.x == 12000) {
                var layerToReveal = parseInt(key)+1;
                if (layerToReveal <= this.max) {
                    this.addVisible(layerToReveal, {x: 6000, y: 10000});
                    this.removeHidden(layerToReveal);
                }
            }
        }
    },
    decreaseScale: function () {
        for (key in this.visibles) {
            if (this.visibles[key].scale.x < 10000) {
                this.visibles[key].scale.x -= 5;
            } else if (!(key == this.min && this.visibles[key].scale.x == 10000)){
                this.visibles[key].scale.x -= 10;
            }

            if (this.visibles[key].scale.x <= 6000 && key > this.min) {
                this.removeVisible(key);
                this.addHidden(key);
            } else if (this.visibles[key].scale.x == 9000) {
                var layerToReveal = parseInt(key)-1;
                if (layerToReveal >= this.min) {
                    this.addVisible(layerToReveal, {x: 18000, y: 10000});
                    this.removeHidden(layerToReveal);
                }
            }
        }
    },
    alpha: function(level) {
        var xScale = this.visibles[level].scale.x;
        if (xScale < 9000) {
            // layer with higher zoom level 
            return this.mapValueOntoRange(xScale, [6000, 9000], [0, 1]); // on top 
        } /*else if (xScale > 12000) {
            // layer with lower zoom level
            return this.mapValueOntoRange(xScale, [12000, 18000], [1, 0]); // on bottom 
        }*/ else {
            return 1;
        }
    },
    mapValueOntoRange: function(value, oldRange, newRange) {
        var oldSpan = oldRange[1] - oldRange[0];
        var newSpan = newRange[1] - newRange[0];
        var distanceToValue = value - oldRange[0];
        var percentSpanToValue = distanceToValue / oldSpan;
        var distanceToNewValue = percentSpanToValue * newSpan;
        var newValue = newRange[0] + distanceToNewValue;
        return newValue;
    },
}

meta.addVisible(2, {x: 10000, y: 10000});
for (var i = 3; i < 8; i++) {
    //meta.addHidden(i); // add hiddens when creating tile layers
}