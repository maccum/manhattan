var schema = require('../utils/schema.js').schema;
var position = require("../plot/position.js").position;

var plot = (function () {
    var plotsByName = {
        // TODO: should check folders exist when initializing
        //'caffeine_consumption': {url: '/path/here/', minZoom: 2, maxZoom: 7},
        //'standing_height' : {url: '/path/here/', minZoom: 2, maxZoom: 8},
    }

    var plotID = null,
        minimumLevel = null,
        maximumLevel = null,
        scaleFactor = 10000,
        zoomIncrement = 5,
        scaleRangeInWhichHigherZoomLayerIsTransparent = [6000, 9000],
        scaleRangeInWhichLowerZoomLayerIsTransparent = [12000, 18000],
        visibles = {},
        hiddens = new Set([]),
        dimensions = {};

    function getPlotsByName() {
        return plotsByName;
    }

    function initializeVisible(level, dims) {
        if (level < minimumLevel || level > maximumLevel) throw new Error("Cannot add visible layer outside [min,max] zoom.");
        if (!schema.dimensions(dims)) throw new Error("Expected dimensions schema");
        visibles[level] = { level: level, topLeft: { x: 0, y: 0 }, scale: { x: 1 * scaleFactor, y: 1 * scaleFactor }, opacity: 1 };
        dimensions[level] = dims;
    }
    function initializeHidden(level, dims) {
        if (level < minimumLevel || level > maximumLevel) throw new Error("Cannot add hidden layer outside [min,max] zoom.");
        if (!schema.dimensions(dims)) throw new Error("Expected dimensions schema");
        hiddens.add(parseInt(level));
        dimensions[level] = dims;
    }

    function addPlotByName(name, url, minZoom, maxZoom) {
        plotsByName[name] = { url: url, minZoom: minZoom, maxZoom: maxZoom };
    }

    function switchPlots(name) {
        reset();
        plotID = name;
        var minZoom = plotsByName[name].minZoom,
            maxZoom = plotsByName[name].maxZoom;
        setMinMaxLevel(minZoom, maxZoom);

        // width and height of plots currently not flexible here
        var nCols = function (z) { return Math.pow(2, z); }
        initializeVisible(minZoom, { width: nCols(minZoom) * 256, height: 256 });
        //var width = 1024;
        for (var i = minZoom + 1; i < maxZoom + 1; i++) {
            //width = width * 2;
            initializeHidden(i, { width: nCols(i) * 256, height: 256 });
        }
    }

    function getDimensions() {
        return dimensions;
    }

    function reset() {
        plotID = null;
        minimumLevel = null;
        maximumLevel = null;
        visibles = {};
        hiddens = new Set([]);
        dimensions = {};
    }

    function setMinMaxLevel(min, max) {
        minimumLevel = min;
        maximumLevel = max;
    }

    function unitScale(scale) {
        if ((scale.x > .5 && scale.x < 2) || (scale.y > .5 && scale.y < 2)) throw new Error('scale already in unit scale');
        return { x: scale.x / scaleFactor, y: scale.y / scaleFactor };
    }

    function show(level, topLeft, scale, opacity) {
        if (!hiddens.has(level)) throw "Tried to show a level that was not hidden.";
        visibles[level] = { level: level, topLeft: topLeft, scale: scale, opacity: opacity };
        hiddens.delete(level);
    }

    function hide(level) {
        if (!visibles[level]) throw "Tried to hide a level that is not visible";
        delete visibles[level];
        hiddens.add(parseInt(level));
    }

    function calculateOpacity(scale) {
        var xScale = scale.x;
        if (xScale < scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
            // layer with higher zoom level (on top in current html)
            return mapValueOntoRange(xScale, scaleRangeInWhichHigherZoomLayerIsTransparent, [0, 1]);
        } /*else if (xScale > plot.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
            // layer with lower zoom level (below in current html)
            return plot.mapValueOntoRange(xScale, plot.scaleRangeInWhichLowerZoomLayerIsTransparent, [1, 0]);
        }*/ else {
            return 1;
        }
    }

    function mapValueOntoRange(value, oldRange, newRange) {
        var oldSpan = oldRange[1] - oldRange[0];
        var newSpan = newRange[1] - newRange[0];
        var distanceToValue = value - oldRange[0];
        var percentSpanToValue = distanceToValue / oldSpan;
        var distanceToNewValue = percentSpanToValue * newSpan;
        var newValue = newRange[0] + distanceToNewValue;
        return newValue;
    }

    function reposition(newTopLeft) {
        if ((!newTopLeft.x && newTopLeft.x != 0) || (!newTopLeft.y && newTopLeft.y != 0)) throw new Error("bad new Top Left: [" + newTopLeft.x + ", " + newTopLeft.y + "]");
        for (var key in visibles) {
            visibles[key].topLeft = newTopLeft;
        }
    }

    function resetOpacities() {
        for (var key in visibles) {
            visibles[key].opacity = calculateOpacity(visibles[key].scale);
        }
    }

    return {
        setPlotID: function (id) {
            plotID = id;
        },
        getInfoForGUI: function () {
            var listOfVisibles = Object.keys(visibles).map(function (key) {
                // convert scale for passing to GUI: 
                var guiLayer = {
                    level: visibles[key].level,
                    topLeft: visibles[key].topLeft,
                    scale: unitScale(visibles[key].scale),
                    opacity: visibles[key].opacity,
                };
                return guiLayer;
            });
            var listOfHiddens = Array.from(hiddens);
            //return [listOfVisibles, listOfHiddens];
            return {
                plotID: plotID,
                visibleLayers: listOfVisibles,
                hiddenLevels: listOfHiddens,
                dimensions: getDimensions(),
            }
        },
        getPlotID: function () {
            return plotID;
        },
        initializeVisible: initializeVisible, 
        initializeHidden: initializeHidden,
        clearForTesting: function () {
            // TODO: better way to clear singleton for testing?
            visibles = {};
            hiddens = new Set([]);
            dimensions = {};
        },
        getVisibles: function () {
            return visibles;
        },
        getHiddens: function () {
            return hiddens;
        },

        increaseScale: function () {
            for (var key in visibles) {
                if (visibles[key].scale.x < scaleFactor) {
                    visibles[key].scale.x += zoomIncrement;
                } else if (key < maximumLevel) {
                    visibles[key].scale.x += zoomIncrement * 2;
                }
                if (visibles[key].scale.x >= scaleRangeInWhichLowerZoomLayerIsTransparent[1] && key < maximumLevel) {
                    hide(key);
                } else if (visibles[key].scale.x == scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
                    var layerToReveal = parseInt(key) + 1;
                    if (layerToReveal <= maximumLevel) {
                        var scale = { x: scaleRangeInWhichHigherZoomLayerIsTransparent[0], y: 1 * scaleFactor };
                        show(layerToReveal, visibles[key].topLeft, scale, calculateOpacity(scale));
                    }
                }
            }
        },
        decreaseScale: function () {
            for (var key in visibles) {
                if (!(key == minimumLevel && visibles[key].scale.x == scaleFactor)) {
                    if (visibles[key].scale.x <= scaleFactor) {
                        visibles[key].scale.x -= zoomIncrement;
                    } else {
                        visibles[key].scale.x -= zoomIncrement * 2;
                    }
                }

                if (visibles[key].scale.x <= scaleRangeInWhichHigherZoomLayerIsTransparent[0] && key > minimumLevel) {
                    hide(key);
                } else if (visibles[key].scale.x == scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
                    var layerToReveal = parseInt(key) - 1;
                    if (layerToReveal >= minimumLevel) {
                        var scale = { x: scaleRangeInWhichLowerZoomLayerIsTransparent[1], y: scaleFactor };
                        show(layerToReveal, visibles[key].topLeft, scale, calculateOpacity(scale));
                    }
                }
            }
        },
        zoom: function (focus, vertical) {

            var firstKey = Object.keys(visibles)[0],
                first = visibles[firstKey],
                width = dimensions[firstKey].width,
                height = dimensions[firstKey].height;

            var percentageCoordinates = position.topLeftToPercentage(focus, first.topLeft, unitScale(first.scale), width, height);

            var howMuch = Math.floor(Math.abs(vertical) / 5);
            for (var i = 0; i < howMuch; i++) {
                if (vertical < 0) {
                    this.increaseScale();
                } else {
                    this.decreaseScale();
                }
            }

            var newFirstKey = Object.keys(visibles)[0],
                newFirst = visibles[newFirstKey],
                newWidth = dimensions[newFirstKey].width,
                newHeight = dimensions[newFirstKey].height;

            var newTopLeft = position.percentageToTopLeft(focus, percentageCoordinates, unitScale(newFirst.scale), newWidth, newHeight);
            reposition(newTopLeft);
            resetOpacities();
        },
        snapIn: function (focus) {
            var keys = Object.keys(visibles);
            if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

            if (Math.abs(10000 - visibles[Object.keys(visibles)[0]].scale.x) > 5) {
                this.zoom(focus, -5);
                return false;
            } else {
                for (var key in visibles) {
                    visibles[key].scale.x = 10000;
                }
                return true;
            }
        },
        snapOut: function (focus) {
            var keys = Object.keys(visibles);
            if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

            if (Math.abs(10000 - visibles[Object.keys(visibles)[0]].scale.x) > 4) {
                this.zoom(focus, 5);
                return false;
            } else {
                for (var key in visibles) {
                    visibles[key].scale.x = 10000;
                }
                return true;
            }
        },
        drag: function (changeInPosition) {
            for (var key in visibles) {
                visibles[key].topLeft.x += changeInPosition.x;
            }
        },
        setMinMaxLevel: setMinMaxLevel,
        reset: reset,
        addPlotByName: addPlotByName,
        switchPlots: switchPlots,
        getDimensions: getDimensions,
        getPlotsByName: getPlotsByName,
    };
}());

module.exports.plot = plot;