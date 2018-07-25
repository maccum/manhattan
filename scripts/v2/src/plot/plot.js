//var schema = require('../plot/schema.js').schema;
//var position = require("../plot/position.js").position;

var plot = {
    minimumLevel: 2,
    maximumLevel: 7,
    scaleFactor: 10000,
    zoomIncrement: 5,
    scaleRangeInWhichHigherZoomLayerIsTransparent: [6000, 9000],
    scaleRangeInWhichLowerZoomLayerIsTransparent: [12000, 18000],
    visibles: {},
    hiddens: new Set([]),
    dimensions: {},
    unitScale: function (scale) {
        return { x: scale.x / plot.scaleFactor, y: scale.y / plot.scaleFactor };
    },
    initializeVisible: function (level, dimensions) {
        if (level < plot.minimumLevel || level > plot.maximumLevel) throw new Error("Cannot add visible layer outside [min,max] zoom.");
        if (!schema.dimensions(dimensions)) throw new Error("Expected dimensions schema");
        plot.visibles[level] = { level: level, topLeft: { x: 0, y: 0 }, scale: { x: 1 * plot.scaleFactor, y: 1 * plot.scaleFactor }, opacity: 1 };
        plot.dimensions[level] = dimensions;
    },
    initializeHidden: function (level, dimensions) {
        if (level < plot.minimumLevel || level > plot.maximumLevel) throw new Error("Cannot add hidden layer outside [min,max] zoom.");
        if (!schema.dimensions(dimensions)) throw new Error("Expected dimensions schema");
        plot.hiddens.add(parseInt(level));
        plot.dimensions[level] = dimensions;
    },
    show: function (level, topLeft, scale, opacity, dimensions) {
        if (!plot.hiddens.has(level)) throw "Tried to show a level that was not hidden.";
        plot.visibles[level] = { level: level, topLeft: topLeft, scale: scale, opacity: opacity };
        plot.hiddens.delete(level);
    },
    hide: function (level) {
        if (!plot.visibles[level]) throw "Tried to hide a level that is not visible";
        delete plot.visibles[level];
        plot.hiddens.add(parseInt(level));
    },
    calculateOpacity: function (scale) {
        var xScale = scale.x;
        if (xScale < plot.scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
            // layer with higher zoom level (on top in current html)
            return plot.mapValueOntoRange(xScale, plot.scaleRangeInWhichHigherZoomLayerIsTransparent, [0, 1]);
        } /*else if (xScale > plot.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
            // layer with lower zoom level (below in current html)
            return plot.mapValueOntoRange(xScale, plot.scaleRangeInWhichLowerZoomLayerIsTransparent, [1, 0]);
        }*/ else {
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
        for (key in plot.visibles) {
            if (plot.visibles[key].scale.x < plot.scaleFactor) {
                plot.visibles[key].scale.x += plot.zoomIncrement;
            } else if (key < plot.maximumLevel) {
                plot.visibles[key].scale.x += plot.zoomIncrement * 2;
            }
            if (plot.visibles[key].scale.x >= plot.scaleRangeInWhichLowerZoomLayerIsTransparent[1] && key < plot.maximumLevel) {
                plot.hide(key);
            } else if (plot.visibles[key].scale.x == plot.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
                var layerToReveal = parseInt(key) + 1;
                if (layerToReveal <= plot.maximumLevel) {
                    var scale = { x: plot.scaleRangeInWhichHigherZoomLayerIsTransparent[0], y: 1 * plot.scaleFactor };
                    plot.show(layerToReveal, plot.visibles[key].topLeft, scale, plot.calculateOpacity(scale));
                }
            }
        }
    },
    decreaseScale: function () {
        for (key in plot.visibles) {
            if (!(key==plot.minimumLevel && plot.visibles[key].scale.x == plot.scaleFactor)) {
                if (plot.visibles[key].scale.x <= plot.scaleFactor) {
                    plot.visibles[key].scale.x -= plot.zoomIncrement;
                } else {
                    plot.visibles[key].scale.x -= plot.zoomIncrement * 2;
                }
            }

            if (plot.visibles[key].scale.x <= plot.scaleRangeInWhichHigherZoomLayerIsTransparent[0] && key > plot.minimumLevel) {
                plot.hide(key);
            } else if (plot.visibles[key].scale.x == plot.scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
                var layerToReveal = parseInt(key) - 1;
                if (layerToReveal >= plot.minimumLevel) {
                    var scale = { x: plot.scaleRangeInWhichLowerZoomLayerIsTransparent[1], y: plot.scaleFactor };
                    plot.show(layerToReveal, plot.visibles[key].topLeft, scale, plot.calculateOpacity(scale));
                }
            }
        }
    },
    reposition: function (newTopLeft) {
        for (key in plot.visibles) {
            plot.visibles[key].topLeft = newTopLeft;
        }
    },
    resetOpacities: function () {
        for (key in plot.visibles) {
            plot.visibles[key].opacity = plot.calculateOpacity(plot.visibles[key].scale);
        }
    },
    zoom: function (focus, vertical) {
        var firstKey = Object.keys(plot.visibles)[0],
            first = plot.visibles[firstKey],
            width = plot.dimensions[firstKey].width,
            height = plot.dimensions[firstKey].height;

        var percentageCoordinates = position.topLeftToPercentage(focus, first.topLeft, plot.unitScale(first.scale), width, height);

        var howMuch = Math.floor(Math.abs(vertical) / 5);
        for (var i = 0; i < howMuch; i++) {
            if (vertical < 0) {
                plot.increaseScale();
            } else {
                plot.decreaseScale();
            }
        }

        var newFirstKey = Object.keys(plot.visibles)[0],
            newFirst = plot.visibles[newFirstKey],
            newWidth = plot.dimensions[newFirstKey].width,
            newHeight = plot.dimensions[newFirstKey].height;
        var newTopLeft = position.percentageToTopLeft(focus, percentageCoordinates, plot.unitScale(newFirst.scale), newWidth, newHeight);
        plot.reposition(newTopLeft);
        plot.resetOpacities();
    },
    snapIn: function (focus) {
        var keys = Object.keys(plot.visibles);
        if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

        plot.zoom(focus, -5);
        var interval = setInterval(function () {
            console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
            if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 5) {
                plot.zoom(focus, -5);
            } else {
                for (key in plot.visibles) {
                    plot.visibles[key].scale.x = 10000;
                }
                clearInterval(interval);
            }
            // TODO: call to gui should be refactored to go elsewhere
            var visibles = Object.keys(plot.visibles).map(function (key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

        }, .1);
    },
    snapOut: function (focus) {
        var keys = Object.keys(plot.visibles);
        if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

        plot.zoom(focus, 5);
        var interval = setInterval(function () {
            console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
            if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 4) {
                plot.zoom(focus, 5);
            } else {
                for (key in plot.visibles) {
                    plot.visibles[key].scale.x = 10000;
                }
                clearInterval(interval);
            }
            // TODO: call to gui should be refactored to go elsewhere
            var visibles = Object.keys(plot.visibles).map(function (key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

        }, .1);
    },
    drag: function (changeInPosition) {
        for (key in plot.visibles) {
            plot.visibles[key].topLeft.x += changeInPosition.x;
        }
    },
}

//module.exports.plot = plot;