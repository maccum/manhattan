var plot = {
    minimumLevel: 2,
    maximumLevel: 7,
    scaleFactor: 10000,
    zoomIncrement: 5,
    scaleRangeInWhichHigherZoomLayerIsTransparent: [6000, 9000],
    scaleRangeInWhichLowerZoomLayerIsTransparent: [12000, 18000],
    visibles: {},
    hiddens: new Set([]),
    initializeVisible: function (level) {
        this.visibles[level] = { level: level, topLeft: { x: 0, y: 0 }, scale: { x: 1 * this.scaleFactor, y: 1 * this.scaleFactor }, opacity: 1 };
    },
    initializeHidden: function (level) {
        this.hiddens.add(level);
    },
    show: function (level, topLeft, scale, opacity) {
        this.visibles[level] = { level: level, topLeft: topLeft, scale: scale, opacity: opacity };
        this.hiddens.delete(level);
    },
    hide: function (level) {
        delete this.visibles[level];
        this.hiddens.add(level);
    },
    calculateOpacity: function (scale) {
        var xScale = scale.x;
        if (xScale < this.scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
            // layer with higher zoom level (on top in current html)
            return this.mapValueOntoRange(xScale, this.scaleRangeInWhichHigherZoomLayerIsTransparent, [0, 1]);
        } else if (xScale > this.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
            // layer with lower zoom level (below in current html)
            return this.mapValueOntoRange(xScale, this.scaleRangeInWhichLowerZoomLayerIsTransparent, [1, 0]);
        } else {
            return 1;
        }
    },
    mapValueOntoRange: function (value, oldRange, newRange) {
        var oldSpan = oldRange[1] - oldRange[0];
        var newSpan = newRange[1] - newRange[0];
        var distanceToValue = value - oldRange[0];
        var percentSpanToValue = distanceToValue / oldSpan;
        var distanceToNewValue = percentSpanToValue * newSpan;
        var newValue = newRange[0] + distanceToNewValue;
        return newValue;
    },
    increaseScale: function () {
        for (key in this.visibles) {
            if (this.visibles[key].scale.x < this.scaleFactor) {
                this.visibles[key].scale.x += this.zoomIncrement;
            } else if (key < this.max) {
                this.visibles[key].scale.x += this.zoomIncrement * 2;
            }
            if (this.visibles[key].scale.x >= scaleRangeInWhichLowerZoomLayerIsTransparent[1] && key < this.max) {
                this.hide(key);
            } else if (this.visibles[key].scale.x == scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
                var layerToReveal = parseInt(key) + 1;
                if (layerToReveal <= this.max) {
                    var scale = { x: scaleRangeInWhichHigherZoomLayerIsTransparent[0], y: 1 * this.scaleFactor };
                    this.show(layerToReveal, this.visibles[key].topLeft, scale, this.calculateOpacity(scale));
                }
            }
        }
    },
    decreaseScale: function () {
        for (key in this.visibles) {
            if (this.visibles[key].scale.x < this.scaleFactor) {
                this.visibles[key].scale.x -= this.zoomIncrement;
            } else if (!(key == this.min && this.visibles[key].scale.x == this.scaleFactor)) {
                this.visibles[key].scale.x -= this.zoomIncrement*2;
            }

            if (this.visibles[key].scale.x <= this.scaleRangeInWhichHigherZoomLayerIsTransparent[0] && key > this.min) {
                this.removeVisible(key);
                this.addHidden(key);
            } else if (this.visibles[key].scale.x == this.scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
                var layerToReveal = parseInt(key) - 1;
                if (layerToReveal >= this.min) {
                    var scale = { x: scaleRangeInWhichLowerZoomLayerIsTransparent[1], y: this.scaleFactor };
                    this.show(layerToReveal, this.visibles[key].topLeft, scale, this.calculateOpacity(scale));
                }
            }
        }
    },
}

module.exports.plot = plot;