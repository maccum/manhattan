(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;

var plot = require('./plot/plot.js').plot;
var gui = require('./ui/gui.js').gui;

var handlers = require('./ui/handlers.js').handlers;

var hover = require('./ui/hover.js').hover;

function init() {
    // add widget stuff to page
    var widget = setup.setUpWidget('widget-div', selectors.ids.widget, 1124, 350, '#e8ebef');
    setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);

    // add images
    setup.insertPlotImages('caffeine_consumption', 2, 7, '../plots/caffeine_plots/caffeine_consumption', 256, 256);
    setup.insertPlotImages('standing_height', 2, 8, '../plots/standing_height_plots/standing_height', 256, 256);
    setup.insertPlotImages('caffeine_consumption2', 2, 8, '../plots/caffeine_plots_2/caffeine_consumption', 256, 256);

    // initialize info about each plot's name, url, min/max zoom level
    plot.addPlotByName('caffeine_consumption', '../plots/caffeine_plots/caffeine_consumption', 2, 7);
    plot.addPlotByName('standing_height', '../plots/standing_height_plots/standing_height', 2, 8);
    plot.addPlotByName('caffeine_consumption2', '../plots/caffeine_plots_2/caffeine_consumption', 2, 8);

    // set up default plot for model
    plot.switchPlots('caffeine_consumption2');

    // display default plot
    gui.render(plot.getInfoForGUI());

    // set up listeners
    handlers.listenForDrag(document.getElementById('plot'));
    document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
    document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
    document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);

    // hover listener
    hover.insertTextbox('plot');
    document.getElementById('plot').addEventListener('mousemove', hover.hoverListener);
}

init();
},{"./plot/plot.js":2,"./ui/gui.js":4,"./ui/handlers.js":5,"./ui/hover.js":6,"./ui/search.js":7,"./ui/setup.js":8,"./utils/selectors.js":10}],2:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("./position.js").position;

var plot = (function () {
    var plotsByName = {
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


    function getPlotID() {
        return plotID;
    }

    function getPlotsByName() {
        return plotsByName;
    }

    function getDimensions() {
        return dimensions;
    }

    function getVisibles() {
        return visibles;
    }

    function getHiddens() {
        return hiddens;
    }

    function addPlotByName(name, url, minZoom, maxZoom) {
        plotsByName[name] = { url: url, minZoom: minZoom, maxZoom: maxZoom };
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

    function switchPlots(name) {
        reset();
        plotID = name;
        var minZoom = plotsByName[name].minZoom,
            maxZoom = plotsByName[name].maxZoom;
        setMinMaxLevel(minZoom, maxZoom);

        // TODO: make width and height of plots flexible
        var nCols = function (z) { return Math.pow(2, z); }
        initializeVisible(minZoom, { width: nCols(minZoom) * 256, height: 256 });
        for (var i = minZoom + 1; i < maxZoom + 1; i++) {
            initializeHidden(i, { width: nCols(i) * 256, height: 256 });
        }
    }

    function unitScale(scale) {
        if ((scale.x > .5 && scale.x < 2) || (scale.y > .5 && scale.y < 2)) throw new Error('scale already in unit scale');
        return { x: scale.x / scaleFactor, y: scale.y / scaleFactor };
    }

    function show(level, topLeft, scale, opacity) {
        if (!hiddens.has(level)) throw new Error("Tried to show a level that was not hidden.");
        visibles[level] = { level: level, topLeft: topLeft, scale: scale, opacity: opacity };
        hiddens.delete(level);
    }

    function hide(level) {
        if (!visibles[level]) throw new Error("Tried to hide a level that is not visible");
        delete visibles[level];
        hiddens.add(parseInt(level));
    }

    function calculateOpacity(scale) {
        var xScale = scale.x;
        if (xScale < scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
            // layer with higher zoom level (on top in current html)
            return mapValueOntoRange(xScale, scaleRangeInWhichHigherZoomLayerIsTransparent, [.2, 1]);
        } else if (xScale > scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
            // layer with lower zoom level (below in current html)
            return mapValueOntoRange(xScale, scaleRangeInWhichLowerZoomLayerIsTransparent, [1, .2]);
        } else {
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

    function setPlotID(id) {
        plotID = id;
    }

    function getInfoForGUI() {
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
    }

    function clearForTesting() {
        visibles = {};
        hiddens = new Set([]);
        dimensions = {};
    }

    function increaseScale() {
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
    }

    function decreaseScale() {
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
    }

    function zoom(focus, vertical) {
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
    }

    function snapIn(focus) {
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
    }

    function snapOut(focus) {
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
    }

    function drag(changeInPosition) {
        for (var key in visibles) {
            visibles[key].topLeft.x += changeInPosition.x;
        }
    }

    return {
        setPlotID: setPlotID,
        getInfoForGUI: getInfoForGUI,
        getPlotID: getPlotID,
        initializeVisible: initializeVisible,
        initializeHidden: initializeHidden,
        clearForTesting: clearForTesting,
        getVisibles: getVisibles,
        getHiddens: getHiddens,
        increaseScale: increaseScale,
        decreaseScale: decreaseScale,
        zoom: zoom,
        snapIn: snapIn,
        snapOut: snapOut,
        drag: drag,
        setMinMaxLevel: setMinMaxLevel,
        reset: reset,
        addPlotByName: addPlotByName,
        switchPlots: switchPlots,
        getDimensions: getDimensions,
        getPlotsByName: getPlotsByName,
        _hide: hide,
        _show: show,
        _calculateOpacity: calculateOpacity,
        _mapValueOntoRange: mapValueOntoRange,
    };
}());

module.exports.plot = plot;
},{"../utils/schema.js":9,"./position.js":3}],3:[function(require,module,exports){
var position = {
    calculatePercent: function (positionA, positionB, lengthB, scaleB) {
        if (lengthB <= 0) throw new Error("Length must be positive.");
        return (positionA - positionB) / (lengthB * scaleB);
    },
    calculatePosition: function (positionA, percentB, lengthB, scaleB) {
        return positionA - ((lengthB * scaleB) * percentB);
    },
    topLeftToPercentage: function (focus, topLeft, scale, width, height) {
        return {
            x: position.calculatePercent(focus.x, topLeft.x, width, scale.x),
            y: position.calculatePercent(focus.y, topLeft.y, height, scale.y),
        };
    },
    percentageToTopLeft: function (focus, percentage, scale, width, height) {
        return {
            x: position.calculatePosition(focus.x, percentage.x, width, scale.x),
            y: position.calculatePosition(focus.y, percentage.y, height, scale.y),
        };
    }
};

module.exports.position = position;
},{}],4:[function(require,module,exports){
var editSVG = require('../utils/svg.js').editSVG;
var schema = require('../utils/schema.js').schema;
var tag = require('../utils/tag.js').tag;

var gui = {
    hide: function(plotID) {
        new tag().select(plotID).attribute('display', 'none');
    },
    render: function (args) {
        schema.check(args, ['plotID', 'visibleLayers', 'hiddenLevels', 'dimensions']);
        var plotID = args.plotID,
            visibleLayers = args.visibleLayers,
            hiddenLevels = args.hiddenLevels,
            dims = args.dimensions;

        new tag().select(plotID).attribute('display', 'inline');

        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            throw new Error("Must have 1-2 visible layers.");
        }

        for (var hiddenIndex in hiddenLevels) {
            var level = hiddenLevels[hiddenIndex];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw new Error("GUI ERROR: expected a list of numbers for hiddenLayers.");
            }
            new editSVG().set(plotID, level).hide();
        }

        for (var visibleIndex in visibleLayers) {
            var layer = visibleLayers[visibleIndex];
            if (!schema.layer(layer)) throw new Error("GUI: expected layer schema.");
            if (layer.scale.x > 2 || layer.scale.x < .5 || layer.scale.y > 2 || layer.scale.y < .5) {
                throw new Error("GUI: scale outside [.5,2] range. Scale should be converted to [.5,2] before being passed to GUI. [" + layer.scale.x + ", " + layer.scale.y + "]");
            }

            var svgBundle = new editSVG().set(plotID, layer.level);
            
            var dimsFromPage = svgBundle.dimensions();
            if ((dimsFromPage[0] != dims[layer.level].width) || (dimsFromPage[1] != dims[layer.level].height)) {
                throw new Error("GUI: dimensions of plot on page don't match dimensions of plot from model");
            }

            svgBundle
                .translate(layer.topLeft.x, layer.topLeft.y)
                .scale(layer.scale.x, layer.scale.y)
                .fade(layer.opacity)
                .show();
        }

        var visiblesString = "";
        var scalesString = "";
        var opacityString = "";
        for (var key in visibleLayers) {
            visiblesString += " " + visibleLayers[key].level;
            scalesString += " " + visibleLayers[key].scale.x;
            opacityString += " " + visibleLayers[key].opacity;
        }
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
        $("#opacity-div").text(opacityString);
    },
};

module.exports.gui = gui;
},{"../utils/schema.js":9,"../utils/svg.js":11,"../utils/tag.js":12}],5:[function(require,module,exports){
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

var handlers = {
    callGUI: function () {
        gui.render(plot.getInfoForGUI());
    },

    getMousePositionWithinObject: function (mouseX, mouseY, boundingObject) {
        var ctm = boundingObject.getScreenCTM();
        return {
            x: (mouseX - ctm.e) / ctm.a,
            y: (mouseY - ctm.f) / ctm.d
        };
    },

    listenForDrag: function (svg) {
        console.log("listenForDrag");
        var isDragging = false;
        //var svg = evt.target;

        svg.addEventListener('mousedown', beginDrag, false);
        svg.addEventListener('mousemove', drag, false);
        svg.addEventListener('mouseup', endDrag, false);

        var mousePositionSinceLastMove;

        function getMousePosition(evt) {
            return handlers.getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
        }

        function beginDrag(evt) {
            evt.preventDefault();
            isDragging = true;
            var mousePositionOnStartDrag = getMousePosition(evt);
            mousePositionSinceLastMove = mousePositionOnStartDrag;
        }

        function drag(evt) {
            if (isDragging) {
                evt.preventDefault();
                var currentMousePosition = getMousePosition(evt);
                var changeInMousePosition = {
                    x: currentMousePosition.x - mousePositionSinceLastMove.x,
                    y: currentMousePosition.y - mousePositionSinceLastMove.y,
                };

                plot.drag(changeInMousePosition);
                handlers.callGUI();

                mousePositionSinceLastMove = currentMousePosition;
            }
        }

        function endDrag(evt) {
            evt.preventDefault();
            isDragging = false;
        }
    },

    onWheel: function (evt) {
        evt.preventDefault();
        var horizontal = evt.deltaX;
        var vertical = evt.deltaY;

        if (Math.abs(vertical) >= Math.abs(horizontal)) {
            var svg = document.getElementById("plot");
            var mousePos = handlers.getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
            plot.zoom(mousePos, vertical);
        } else {
            plot.drag({ x: horizontal, y: 0 });
        }

        handlers.callGUI();
    },

    onButtonClickZoomIn: function () {
        plot.zoom({ x: 512, y: 128 }, -5);
        var interval = setInterval(function () {
            try {
                if (plot.snapIn({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                handlers.callGUI();
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },

    onButtonClickZoomOut: function () {

        plot.zoom({ x: 512, y: 128 }, 5);
        var interval = setInterval(function () {
            try {
                if (plot.snapOut({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                handlers.callGUI();
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },
};

module.exports.handlers = handlers;
},{"../plot/plot.js":2,"../ui/gui.js":4}],6:[function(require,module,exports){
var typecheck = require('../utils/typecheck.js').typecheck;
var position = require("../plot/position.js").position;
var plot = require('../plot/plot.js').plot;
/* Hover data.

Display metadata when mouse hovers over point. */
var hover = (function () {

    var hoverArea = null;

    function insertTextbox(parentID) {
        hoverArea = document.getElementById(parentID);

        // make svg to contain textbox
        var textbox = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        textbox.setAttribute('id', "textbox");
        textbox.setAttribute('x', "0");
        textbox.setAttribute('y', "0");
        textbox.setAttribute('visibility', "hidden");
        hoverArea.appendChild(textbox);
    
        // insert rect background with line into first svg element
        var rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        rect.setAttribute('id', 'textboxRect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('fill', 'white');
        textbox.appendChild(rect);
    
        // make container for text (with margins) inside textbox
        var innerText = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        innerText.setAttribute('id', 'textboxInner');
        innerText.setAttribute('x', '5');
        innerText.setAttribute('y', '5');
        textbox.appendChild(innerText);
    
        var text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        text.setAttribute('id', 'textboxText');
        text.setAttribute('y', '5');
        text.setAttribute('font-size', '10');
        text.setAttribute('dy', '0');
    
        // insert text into second svg element
        innerText.appendChild(text);
    }

    function _displayTextBox(x, y, lines) {
        var textbox = document.getElementById('textbox');
        textbox.setAttribute('x', String(x+5));
        textbox.setAttribute('y', String(y));
        textbox.setAttribute('visibility', "visible");
    
        // add tspans to text element with tspans
        var lineCount = lines.length;
        var tspans = '<tspan x="0" dy="0.6em" xml:space="preserve">' + lines[0] + '</tspan>';
        for (var i = 1; i < lineCount; i++) {
            tspans += '<tspan x="0" dy="1.2em" xml:space="preserve">' + lines[i] + '</tspan>';
        }
        var text = document.getElementById('textboxText');
        text.innerHTML = tspans;
    
        // get width and height of text element
        var width = text.getBBox().width;
        var height = text.getBBox().height;
    
        // set width/height of background rect
        var rect = document.getElementById('textboxRect');
        rect.setAttribute('width', width + 15);
        rect.setAttribute('height', height + 15);
    
        // set width/height of whole textbox
        textbox.setAttribute('width', width + 15);
        textbox.setAttribute('height', height + 15);
        
        // set width/height of text container
        var innerText = document.getElementById('textboxInner');
        innerText.setAttribute('width', width + 10);
        innerText.setAttribute('height', height + 10);
    }

    function _hideTextBox() {
        var textbox = document.getElementById('textbox');
        textbox.setAttribute('visibility', "hidden");
    }
    
    function _getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
        var ctm = boundingObject.getScreenCTM();
        return {
            x: (mouseX - ctm.e) / ctm.a,
            y: (mouseY - ctm.f) / ctm.d
        };
    };

    function _getFirstPlotLayerInfo() {
        var args = plot.getInfoForGUI();
        var visibles = args.visibleLayers;
        var dimensions = args.dimensions;

        var first = visibles[0],
            firstKey = first.level,
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;

        var nCols = Math.pow(2, first.level);

        return [first.topLeft, first.scale, width, height, first.level, nCols];
    }

    // convert x,y in viewing window coordinates to graph coordinates
    function _getCoordinates(x, y) {
        /*var args = plot.getInfoForGUI();
        var visibles = args.visibleLayers;
        var dimensions = args.dimensions;

        var first = visibles[0],
            firstKey = first.level,
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;*/
        var res = _getFirstPlotLayerInfo();
        var topLeft = res[0], scale = res[1], width = res[2], height = res[3];
        
        var percentageCoordinates = position.topLeftToPercentage({x: x, y: y}, topLeft, scale, width, height);
        var pixelCoordinates = {x: percentageCoordinates.x * width, y: percentageCoordinates.y * height};
        
        // map % coordinates to graph coordinates
        //var graphX = plot._mapValueOntoRange(percentageCoordinates.x, [0,1], [-9095836,3045120653]);
        //var graphY = plot._mapValueOntoRange(percentageCoordinates.y, [1,0], [-1.9999969651507141,11.767494897838054]);

        return [pixelCoordinates, width, height];
    }

    function _getTilesInView(topLeft, scale, width, height, nCols) {
        // get plot coordinate of top left corner of viewing window 
        var percentageCoordinates = position.topLeftToPercentage({x:0,y:0}, topLeft, scale, width, height);
        var topLeftPercent = percentageCoordinates.x;
        // get visible tiles
        var firstTileInView = Math.floor(topLeftPercent * nCols);
        var tilesInView = [firstTileInView, firstTileInView+1, firstTileInView+2, firstTileInView+3];
        return tilesInView;
    }

    function _afterLoadingPoints(points, x_axis_range, y_axis_range, width, height, graphCoords) {
        //console.log(points);
        for (var i = 0; i< points.length; i++) {
            var pixelPoint = {x: plot._mapValueOntoRange(points[i].gp, [x_axis_range[0], x_axis_range[1]], [0,width]), 
                y: plot._mapValueOntoRange(points[i].nlp, [y_axis_range[0], y_axis_range[1]], [height,0])};

            if (Math.abs(graphCoords.x - pixelPoint.x) < 2 && Math.abs(graphCoords.y - pixelPoint.y) < 2) {
                //_displayTextBox(mousepos.x, mousepos.y, [points[i].chrPos, points[i].alleles, 'rs0', 'gene label...', points[i].p]);
                console.log('display text box');
                _displayTextBox(mousepos.x, mousepos.y, points[i].label);
                return;
            } else {
                _hideTextBox();
            }
        }
    }

    return {
        insertTextbox: insertTextbox,
        hoverListener: function (e) {
            if (typecheck.nullOrUndefined(hoverArea)) throw new Error("hover: hoverArea must be initialized.");
            mousepos = _getMousePositionWithinObject(e.clientX, e.clientY, hoverArea);

            var res = _getCoordinates(mousepos.x, mousepos.y);
            var graphCoords = res[0], width = res[1], height = res[2];

            var x_axis_range = null, y_axis_range = null;
            $.getJSON('../plots/caffeine_plots_2/caffeine_consumption/metadata.json', function(data) {
                x_axis_range = data.x_axis_range;
                y_axis_range = data.y_axis_range;

                /*var points = [
                    {x: 504127070, y: 8.19918, chrPos: "3:11677077", alleles: '[C,T]', p: 2.74879},
                    {x: 544549434, y: 9.76749, chrPos: "3:52099441", alleles: '[T,C]', p: 5.72837},
                    {x: 2706668928, y: 8.41574, chrPos: "19:47224607", alleles: '[C,T]', p: 2.21356},
                ];*/
                var res = _getFirstPlotLayerInfo();
                var topLeft = res[0], scale = res[1], width = res[2], height = res[3], zoomLevel = res[4], nCols = res[5];
                $.getJSON('../plots/caffeine_plots_2/caffeine_consumption/'+zoomLevel+'/hover.json', function (data) {
                    var tilesWithHoverData = new Set(data);
                    var points = [];
                    var tilesInView = _getTilesInView(topLeft, scale, width, height, nCols);
                    console.log(new Date().getTime());
                    console.log(tilesInView);
                    for (var i = 0; i<tilesInView.length; i++) {
                        if (tilesWithHoverData.has(tilesInView[i])) {
                            $.getJSON('../plots/caffeine_plots_2/caffeine_consumption/'+zoomLevel+'/'+tilesInView[i]+'.json', function (data) {
                                console.log(new Date().getTime());
                                console.log('loadingpoints');
                                points.push.apply(points,data);
                                _afterLoadingPoints(points, x_axis_range, y_axis_range, width, height, graphCoords);
                            });
                        }                        
                    }
                    
                });
            });
        }
    };
}());

module.exports.hover = hover;
},{"../plot/plot.js":2,"../plot/position.js":3,"../utils/typecheck.js":13}],7:[function(require,module,exports){
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

/* 
Search bar for displaying results of query.

dependency: fuse 
*/
var search = (function () {

    var results = []; // result from search query
    var focus = 1; // n-th row of results table we're focused on

    var phenotypes = [
        {
            id: 0,
            title: "standing_height",
            url: '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height',
            desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed',
        },
        {
            id: 1,
            title: "caffeine_consumption",
            url: '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption',
            desc: 'do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        },
        {
            id: 2,
            title: "caffeine_consumption2",
            url: '/Users/maccum/manhattan_data/plots/caffeine_plots2/caffeine_consumption',
            desc: 'transparent background',
        }
    ];

    // fuse options
    var options = {
        shouldSort: true,
        includeScore: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
            "title",
            "author.firstName"
        ]
    };

    function makeTable() {
        $('<table id="search_table"><tr id="search_titles"></tr></table>').appendTo('#searchbar_target');
        $('#search_titles').append('<th width="20px">id</th>');
        $('#search_titles').append('<th width="100px">phenotype</th>');
        $('#search_titles').append('<th width="400px">description</th>');
    }

    function clearTableContents() {
        $('.row').remove();
    }

    function displayResults(contents, keysToDisplay) {
        clearTableContents();
        for (var i = 0; i < contents.length; i++) {
            var row = '<tr class="row">';
            var item = contents[i].item;
            //var keys = Object.keys(item);
            for (var j = 0; j < keysToDisplay.length; j++) {
                var cell = '<td>' + item[keysToDisplay[j]] + '</td>';
                row += cell;
            }
            row += '</tr>';
            $('#search_table').append(row);
        }
    }

    var fuse = new Fuse(phenotypes, options);
    makeTable();

    function searchBarKeyUp(e) {
        // if key was not the up or down arrow key, display results
        if (e.keyCode != 40 && e.keyCode != 38) {
            var contents = $('#searchbar').val();
            results = fuse.search(contents);
            displayResults(results, ['id', 'title', 'desc']);
            focus = 1;
        }
    }

    function searchBarKeyPress(e) {
        // if enter key was pressed
        if (e.keyCode == 13) {
            e.preventDefault();
            if (focus != 1) {
                var selected = $(".row:nth-of-type(" + focus + ")");
                var phenotype = selected.children().eq(1).html();
                $('#searchbar').val(phenotype);
            } else {
                var query = $('#searchbar').val();
                res = fuse.search(query);
                if (res.length > 0) {
                    if (res[0].score == 0) {
                        console.log('perfect match');
                        switchPlots(query);
                        return;
                    }
                }
                console.log("no match");
            }
        }
    }

    function searchBarKeyDown(e) {
        // change highlighted row in results table
        if (e.keyCode == 40) { // down arrow
            if (focus < results.length + 1) {
                focus += 1;
            }
        } else if (e.keyCode == 38) { // up arrow
            if (focus > 1) {
                focus -= 1;
            }
        }
        $(".row").children('td').css('border', '1px solid #dddddd');
        $(".row:nth-of-type(" + focus + ")").children('td').css('border', '1px solid #000000');
    }

    function switchPlots(plotName) {
        // change visible plot!
        console.log('changing plots');
        var oldPlotID = plot.getPlotID();
        plot.switchPlots(plotName);
        gui.hide(oldPlotID);
        gui.render(plot.getInfoForGUI());
    }

    $('#searchbar').on('keyup', searchBarKeyUp);
    $('#searchbar').on('keypress', searchBarKeyPress);
    $('#searchbar').on('keydown', searchBarKeyDown);

}());

module.exports.search = search;
},{"../plot/plot.js":2,"../ui/gui.js":4}],8:[function(require,module,exports){
var tag = require('../utils/tag.js').tag;
var selectors = require('../utils/selectors.js').selectors;

var setup = (function () {

    function _createWidget(target, widgetID, width, height, backgroundColor) {
        // create widget and append it to the target
        var widget = new tag()
            .createNS('svg')
            .attribute('id', widgetID)
            .attribute('width', String(width))
            .attribute('height', String(height))
            .place(target);

        // create background for plot widget
        new tag()
            .createNS('rect')
            .attribute('width', String(width))
            .attribute('height', String(height))
            .attribute('fill', backgroundColor)
            .attribute('stroke', '#e3e7ed')
            .place(widget);

        return widget;
    }

    function _createPlotWindow(target, plotID, width, height, x, y) {
        // create plot container (width and height dictate the size of the viewing window)
        var window = new tag()
            .createNS('svg')
            .attribute('id', plotID)
            .attribute('width', width)
            .attribute('height', height)
            .attribute('x', x)
            .attribute('y', y)
            .place(target);

        // create plot background
        new tag()
            .createNS('rect')
            .attribute('width', width)
            .attribute('height', height)
            .attribute('fill', '#e8ebef')
            .place(window);
    };

    function _addButtons(target) {

        function addButton(id, _class, type, name) {
            return new tag()
                .create('input')
                .attribute('id', id)
                .attribute('class', _class)
                .attribute('type', type)
                .attribute('name', name)
                .place(target);
        };
        addButton('zoom-in-button', 'zoom-button', 'button', 'increase').attribute('value', '+');
        addButton('zoom-out-button', 'zoom-button', 'button','decrease').attribute('value', '-');
    };

    function _addPlotToPage(target, plotID) {
        // add g for a single plot (phenotype), hidden with display=none
        new tag()
            .createNS('g')
            .attribute('id', plotID)
            .attribute('display', 'none')
            .place(target);
    };

    /* place a zoom layer group <g><svg></svg></g> inside a plot's <svg> */
    function _addGroup(plotID, level, width, height) {
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

    function _addTile(plotID, level, column, url, imageWidth, imageHeight) {
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

    function _addTiles(plotID, level, url, imageWidth, imageHeight) {
        var columns = Math.pow(2, level);
        var x = 0;
        for (var c = 0; c < columns; c++) {
            _addTile(plotID, level, c, url, imageWidth, imageHeight);
            x = x + 256;
        }
    };

    function setUpWidget(targetID, widgetID, width, height, backgroundColor) {
        var target = new tag().select(targetID);
        _addButtons(target);
        var widget = _createWidget(target, widgetID, width, height, backgroundColor);
        return widget;
    }

    function setUpPlot(widget,  plotID, windowWidth, windowHeight, windowX, windowY) {
        _createPlotWindow(widget, plotID, windowWidth, windowHeight, windowX, windowY);
    }

    function insertPlotImages(plotID, minLevel, maxLevel, url, imageWidth, imageHeight) {
        var plotContainer = new tag().select('plot');
        _addPlotToPage(plotContainer, plotID);
        for (var i = minLevel; i<maxLevel+1; i++) {
            var columns = Math.pow(2, i);
            var width = columns * imageWidth;
            var height = imageHeight;
            _addGroup(plotID, i, width, height);
            _addTiles(plotID, i, url, imageWidth, imageHeight);
        }
    }

    return {
        setUpWidget: setUpWidget,
        setUpPlot: setUpPlot,
        insertPlotImages: insertPlotImages,
    }
}());

module.exports.setup = setup;
},{"../utils/selectors.js":10,"../utils/tag.js":12}],9:[function(require,module,exports){
/*Check schema of an object literal. */
var schema = {
    check: function (object, keys) {
        if (Object.keys(object).length != keys.length) {
            return false;
        }
        for (var index in keys) {
            if (!(keys[index] in object)) {
                return false;
            }
        }
        return true;
    },
    xy: function (object) {
        return schema.check(object, ['x', 'y']);
    },
    dimensions: function (object) {
        return schema.check(object, ['width', 'height']);
    },
    point: function (object) {
        return schema.xy(object);
    },
    scale: function (object) {
        return schema.xy(object);
    },
    layer: function (object) {
        return schema.check(object, ['level', 'topLeft', 'scale', 'opacity'])
            && schema.point(object['topLeft'])
            && schema.scale(object['scale']);
    },
};

module.exports.schema = schema;
},{}],10:[function(require,module,exports){
var selectors = {
    ids: {
        widget: 'widget',
        plot: 'plot',
        group: function (plotID, level) {
            return plotID+"-group-layer"+level;
        },
        svgLayer: function (plotID, level) {
            return plotID+"-svg-layer"+level;
        },
    },
};

module.exports.selectors = selectors;
},{}],11:[function(require,module,exports){
var selectors = require('./selectors.js').selectors;

var editSVG = function () {
    this.layer;
    this.plot;
};

editSVG.prototype.set = function (plotID, level) {
    this.layer = document.getElementById(selectors.ids.group(plotID, level));
    this.plot = document.getElementById(selectors.ids.plot);
    this.innerContainer = document.getElementById(selectors.ids.svgLayer(plotID, level));
    return this;
};

editSVG.prototype.dimensions = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    if (!this.innerContainer) throw new Error('editSVG: innerContainer must be initialized');
    return [this.innerContainer.getBBox().width, this.innerContainer.getBBox().height];
}

editSVG.prototype.transformations = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    
    var transformations = this.layer.transform.baseVal;
    if (!transformations.length || transformations.length === 0) {
        var translate = this.plot.createSVGTransform();
        translate.setTranslate(0, 0);
        this.layer.transform.baseVal.insertItemBefore(translate, 0);

        var scale = this.plot.createSVGTransform();
        scale.setScale(1.0, 1.0);
        this.layer.transform.baseVal.insertItemBefore(scale, 1);
    } else {
        if (transformations.length !== 2) throw new Error("editSVG: expected transformations to be a list of length 2, not"+transformations.length);
        if (transformations.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw new Error("editSVG: first transform is not a Translate.");
        if (transformations.getItem(1).type !== SVGTransform.SVG_TRANSFORM_SCALE) throw new Error("editSVG: transform is not a Scale.");
    }
    return this.layer.transform.baseVal;
};

editSVG.prototype.translate = function (shiftX, shiftY) {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.")
    if ((!shiftX || !shiftY) && (shiftX != 0 && shiftY != 0)) throw new Error("editSVG: cannot translate SVG object with null, undefined, or empty shift values. shiftX: "+shiftX+" shiftY:"+shiftY);
    var translation = this.transformations().getItem(0);
    if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw new Error("editSVG: first transform is not a Translate.");
    translation.setTranslate(shiftX, shiftY);
    return this;
};

editSVG.prototype.scale = function (scaleX, scaleY) {
    var scale = this.transformations().getItem(1);
    if (scale.type !== SVGTransform.SVG_TRANSFORM_SCALE) throw new Error("editSVG: second transform is not a Scale.");
    scale.setScale(scaleX, scaleY);
    return this;
};

editSVG.prototype.fade = function (opacity) {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("opacity", opacity);
    return this;
};

editSVG.prototype.hide = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("visibility", "hidden");
    return this;
};

editSVG.prototype.show = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("visibility", "visible");
    return this;
};

module.exports.editSVG = editSVG;
},{"./selectors.js":10}],12:[function(require,module,exports){
var typecheck = require('./typecheck.js').typecheck;

var tag = function () {
    this.element = null;
};

tag.prototype.set = function(element) {
    if (this.element != null) throw new Error("tag().set() cannot override non-null element with new element.");
    this.element = element;
    return this;
}

tag.prototype.create = function (type) {
    if (typecheck.nullOrUndefined(type)) throw new Error("tag().create() must have a `type` argument.");
    this.element = document.createElement(type);
    return this;
};

tag.prototype.createNS = function (type) {
    if (typecheck.nullOrUndefined(type)) throw new Error("tag().createNS() must have a `type` argument.");
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

tag.prototype.select = function (id) {
    if (typecheck.nullOrUndefined(id)) throw new Error("tag().select() must have an `id` argument.");
    this.element = document.getElementById(id);
    return this;
};

tag.prototype.attribute = function (attr, value) {
    if (typecheck.nullOrUndefined(attr) || typecheck.nullOrUndefined(value)) throw new Error("tag().attribute() must have `attr` and `value` arguments.");
    this.element.setAttribute(attr, value);
    return this;
};

tag.prototype.append = function (child) {
    if (typecheck.nullOrUndefined(child)) throw new Error("tag().append() must have a `child` argument.");
    this.element.appendChild(child.element);
    return this;
};

tag.prototype.place = function (parent) {
    if (typecheck.nullOrUndefined(parent)) throw new Error("tag().place() must have a `parent` argument.");
    parent.element.appendChild(this.element);
    return this;
};

tag.prototype.remove = function (parent) {
    if (typecheck.nullOrUndefined(parent)) throw new Error("tag().remove() must have a `parent` argument.");
    parent.element.removeChild(this.element);
};

tag.prototype.addHREF = function (href) {
    if (typecheck.nullOrUndefined(href)) throw new Error("tag().addHREF() must have a `href` argument.");
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
};

module.exports.tag = tag;

},{"./typecheck.js":13}],13:[function(require,module,exports){
/*Utils for typechecking.*/
var typecheck = {
    nullOrUndefined: function(obj) {
        if (typeof obj === "undefined" || obj === null) {
            return true;
        }
        return false;
    },
};

module.exports.typecheck = typecheck;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjQvc3JjL21haW4uanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bsb3QuanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bvc2l0aW9uLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvZ3VpLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvaGFuZGxlcnMuanMiLCJzY3JpcHRzL3Y0L3NyYy91aS9ob3Zlci5qcyIsInNjcmlwdHMvdjQvc3JjL3VpL3NlYXJjaC5qcyIsInNjcmlwdHMvdjQvc3JjL3VpL3NldHVwLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc2NoZW1hLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc2VsZWN0b3JzLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc3ZnLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvdGFnLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvdHlwZWNoZWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIHNlYXJjaCA9IHJlcXVpcmUoJy4vdWkvc2VhcmNoLmpzJykuc2VhcmNoO1xudmFyIHNldHVwID0gcmVxdWlyZSgnLi91aS9zZXR1cC5qcycpLnNldHVwO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgcGxvdCA9IHJlcXVpcmUoJy4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuL3VpL2d1aS5qcycpLmd1aTtcblxudmFyIGhhbmRsZXJzID0gcmVxdWlyZSgnLi91aS9oYW5kbGVycy5qcycpLmhhbmRsZXJzO1xuXG52YXIgaG92ZXIgPSByZXF1aXJlKCcuL3VpL2hvdmVyLmpzJykuaG92ZXI7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gICAgLy8gYWRkIHdpZGdldCBzdHVmZiB0byBwYWdlXG4gICAgdmFyIHdpZGdldCA9IHNldHVwLnNldFVwV2lkZ2V0KCd3aWRnZXQtZGl2Jywgc2VsZWN0b3JzLmlkcy53aWRnZXQsIDExMjQsIDM1MCwgJyNlOGViZWYnKTtcbiAgICBzZXR1cC5zZXRVcFBsb3Qod2lkZ2V0LCBzZWxlY3RvcnMuaWRzLnBsb3QsIDEwMjQsIDI1NiwgNTAsIDMwKTtcblxuICAgIC8vIGFkZCBpbWFnZXNcbiAgICBzZXR1cC5pbnNlcnRQbG90SW1hZ2VzKCdjYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDcsICcuLi9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsIDI1NiwgMjU2KTtcbiAgICBzZXR1cC5pbnNlcnRQbG90SW1hZ2VzKCdzdGFuZGluZ19oZWlnaHQnLCAyLCA4LCAnLi4vcGxvdHMvc3RhbmRpbmdfaGVpZ2h0X3Bsb3RzL3N0YW5kaW5nX2hlaWdodCcsIDI1NiwgMjU2KTtcbiAgICBzZXR1cC5pbnNlcnRQbG90SW1hZ2VzKCdjYWZmZWluZV9jb25zdW1wdGlvbjInLCAyLCA4LCAnLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDI1NiwgMjU2KTtcblxuICAgIC8vIGluaXRpYWxpemUgaW5mbyBhYm91dCBlYWNoIHBsb3QncyBuYW1lLCB1cmwsIG1pbi9tYXggem9vbSBsZXZlbFxuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnY2FmZmVpbmVfY29uc3VtcHRpb24nLCAnLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHMvY2FmZmVpbmVfY29uc3VtcHRpb24nLCAyLCA3KTtcbiAgICBwbG90LmFkZFBsb3RCeU5hbWUoJ3N0YW5kaW5nX2hlaWdodCcsICcuLi9wbG90cy9zdGFuZGluZ19oZWlnaHRfcGxvdHMvc3RhbmRpbmdfaGVpZ2h0JywgMiwgOCk7XG4gICAgcGxvdC5hZGRQbG90QnlOYW1lKCdjYWZmZWluZV9jb25zdW1wdGlvbjInLCAnLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDgpO1xuXG4gICAgLy8gc2V0IHVwIGRlZmF1bHQgcGxvdCBmb3IgbW9kZWxcbiAgICBwbG90LnN3aXRjaFBsb3RzKCdjYWZmZWluZV9jb25zdW1wdGlvbjInKTtcblxuICAgIC8vIGRpc3BsYXkgZGVmYXVsdCBwbG90XG4gICAgZ3VpLnJlbmRlcihwbG90LmdldEluZm9Gb3JHVUkoKSk7XG5cbiAgICAvLyBzZXQgdXAgbGlzdGVuZXJzXG4gICAgaGFuZGxlcnMubGlzdGVuRm9yRHJhZyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGhhbmRsZXJzLm9uV2hlZWwpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZXJzLm9uQnV0dG9uQ2xpY2tab29tSW4pO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1vdXQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbU91dCk7XG5cbiAgICAvLyBob3ZlciBsaXN0ZW5lclxuICAgIGhvdmVyLmluc2VydFRleHRib3goJ3Bsb3QnKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGhvdmVyLmhvdmVyTGlzdGVuZXIpO1xufVxuXG5pbml0KCk7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuL3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuXG52YXIgcGxvdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBsb3RzQnlOYW1lID0ge1xuICAgICAgICAvLydjYWZmZWluZV9jb25zdW1wdGlvbic6IHt1cmw6ICcvcGF0aC9oZXJlLycsIG1pblpvb206IDIsIG1heFpvb206IDd9LFxuICAgICAgICAvLydzdGFuZGluZ19oZWlnaHQnIDoge3VybDogJy9wYXRoL2hlcmUvJywgbWluWm9vbTogMiwgbWF4Wm9vbTogOH0sXG4gICAgfVxuXG4gICAgdmFyIHBsb3RJRCA9IG51bGwsXG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIHNjYWxlRmFjdG9yID0gMTAwMDAsXG4gICAgICAgIHpvb21JbmNyZW1lbnQgPSA1LFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbNjAwMCwgOTAwMF0sXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzEyMDAwLCAxODAwMF0sXG4gICAgICAgIHZpc2libGVzID0ge30sXG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKSxcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuXG5cbiAgICBmdW5jdGlvbiBnZXRQbG90SUQoKSB7XG4gICAgICAgIHJldHVybiBwbG90SUQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UGxvdHNCeU5hbWUoKSB7XG4gICAgICAgIHJldHVybiBwbG90c0J5TmFtZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREaW1lbnNpb25zKCkge1xuICAgICAgICByZXR1cm4gZGltZW5zaW9ucztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRWaXNpYmxlcygpIHtcbiAgICAgICAgcmV0dXJuIHZpc2libGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEhpZGRlbnMoKSB7XG4gICAgICAgIHJldHVybiBoaWRkZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFBsb3RCeU5hbWUobmFtZSwgdXJsLCBtaW5ab29tLCBtYXhab29tKSB7XG4gICAgICAgIHBsb3RzQnlOYW1lW25hbWVdID0geyB1cmw6IHVybCwgbWluWm9vbTogbWluWm9vbSwgbWF4Wm9vbTogbWF4Wm9vbSB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBwbG90SUQgPSBudWxsO1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNaW5NYXhMZXZlbChtaW4sIG1heCkge1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBtaW47XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG1heDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplVmlzaWJsZShsZXZlbCwgZGltcykge1xuICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB7IHg6IDAsIHk6IDAgfSwgc2NhbGU6IHsgeDogMSAqIHNjYWxlRmFjdG9yLCB5OiAxICogc2NhbGVGYWN0b3IgfSwgb3BhY2l0eTogMSB9O1xuICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVIaWRkZW4obGV2ZWwsIGRpbXMpIHtcbiAgICAgICAgaWYgKGxldmVsIDwgbWluaW11bUxldmVsIHx8IGxldmVsID4gbWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIGhpZGRlbiBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIGhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hQbG90cyhuYW1lKSB7XG4gICAgICAgIHJlc2V0KCk7XG4gICAgICAgIHBsb3RJRCA9IG5hbWU7XG4gICAgICAgIHZhciBtaW5ab29tID0gcGxvdHNCeU5hbWVbbmFtZV0ubWluWm9vbSxcbiAgICAgICAgICAgIG1heFpvb20gPSBwbG90c0J5TmFtZVtuYW1lXS5tYXhab29tO1xuICAgICAgICBzZXRNaW5NYXhMZXZlbChtaW5ab29tLCBtYXhab29tKTtcblxuICAgICAgICAvLyBUT0RPOiBtYWtlIHdpZHRoIGFuZCBoZWlnaHQgb2YgcGxvdHMgZmxleGlibGVcbiAgICAgICAgdmFyIG5Db2xzID0gZnVuY3Rpb24gKHopIHsgcmV0dXJuIE1hdGgucG93KDIsIHopOyB9XG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlKG1pblpvb20sIHsgd2lkdGg6IG5Db2xzKG1pblpvb20pICogMjU2LCBoZWlnaHQ6IDI1NiB9KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IG1pblpvb20gKyAxOyBpIDwgbWF4Wm9vbSArIDE7IGkrKykge1xuICAgICAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbihpLCB7IHdpZHRoOiBuQ29scyhpKSAqIDI1NiwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bml0U2NhbGUoc2NhbGUpIHtcbiAgICAgICAgaWYgKChzY2FsZS54ID4gLjUgJiYgc2NhbGUueCA8IDIpIHx8IChzY2FsZS55ID4gLjUgJiYgc2NhbGUueSA8IDIpKSB0aHJvdyBuZXcgRXJyb3IoJ3NjYWxlIGFscmVhZHkgaW4gdW5pdCBzY2FsZScpO1xuICAgICAgICByZXR1cm4geyB4OiBzY2FsZS54IC8gc2NhbGVGYWN0b3IsIHk6IHNjYWxlLnkgLyBzY2FsZUZhY3RvciB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3cobGV2ZWwsIHRvcExlZnQsIHNjYWxlLCBvcGFjaXR5KSB7XG4gICAgICAgIGlmICghaGlkZGVucy5oYXMobGV2ZWwpKSB0aHJvdyBuZXcgRXJyb3IoXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIik7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB0b3BMZWZ0LCBzY2FsZTogc2NhbGUsIG9wYWNpdHk6IG9wYWNpdHkgfTtcbiAgICAgICAgaGlkZGVucy5kZWxldGUobGV2ZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhpZGUobGV2ZWwpIHtcbiAgICAgICAgaWYgKCF2aXNpYmxlc1tsZXZlbF0pIHRocm93IG5ldyBFcnJvcihcIlRyaWVkIHRvIGhpZGUgYSBsZXZlbCB0aGF0IGlzIG5vdCB2aXNpYmxlXCIpO1xuICAgICAgICBkZWxldGUgdmlzaWJsZXNbbGV2ZWxdO1xuICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IHNjYWxlLng7XG4gICAgICAgIGlmICh4U2NhbGUgPCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggaGlnaGVyIHpvb20gbGV2ZWwgKG9uIHRvcCBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gbWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsuMiwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHhTY2FsZSA+IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGxvd2VyIHpvb20gbGV2ZWwgKGJlbG93IGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBtYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMSwgLjJdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFwVmFsdWVPbnRvUmFuZ2UodmFsdWUsIG9sZFJhbmdlLCBuZXdSYW5nZSkge1xuICAgICAgICB2YXIgb2xkU3BhbiA9IG9sZFJhbmdlWzFdIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBuZXdTcGFuID0gbmV3UmFuZ2VbMV0gLSBuZXdSYW5nZVswXTtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9WYWx1ZSA9IHZhbHVlIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBwZXJjZW50U3BhblRvVmFsdWUgPSBkaXN0YW5jZVRvVmFsdWUgLyBvbGRTcGFuO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb05ld1ZhbHVlID0gcGVyY2VudFNwYW5Ub1ZhbHVlICogbmV3U3BhbjtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmV3UmFuZ2VbMF0gKyBkaXN0YW5jZVRvTmV3VmFsdWU7XG4gICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvc2l0aW9uKG5ld1RvcExlZnQpIHtcbiAgICAgICAgaWYgKCghbmV3VG9wTGVmdC54ICYmIG5ld1RvcExlZnQueCAhPSAwKSB8fCAoIW5ld1RvcExlZnQueSAmJiBuZXdUb3BMZWZ0LnkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImJhZCBuZXcgVG9wIExlZnQ6IFtcIiArIG5ld1RvcExlZnQueCArIFwiLCBcIiArIG5ld1RvcExlZnQueSArIFwiXVwiKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQgPSBuZXdUb3BMZWZ0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXRPcGFjaXRpZXMoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5vcGFjaXR5ID0gY2FsY3VsYXRlT3BhY2l0eSh2aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFBsb3RJRChpZCkge1xuICAgICAgICBwbG90SUQgPSBpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJbmZvRm9yR1VJKCkge1xuICAgICAgICB2YXIgbGlzdE9mVmlzaWJsZXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgc2NhbGUgZm9yIHBhc3NpbmcgdG8gR1VJOiBcbiAgICAgICAgICAgIHZhciBndWlMYXllciA9IHtcbiAgICAgICAgICAgICAgICBsZXZlbDogdmlzaWJsZXNba2V5XS5sZXZlbCxcbiAgICAgICAgICAgICAgICB0b3BMZWZ0OiB2aXNpYmxlc1trZXldLnRvcExlZnQsXG4gICAgICAgICAgICAgICAgc2NhbGU6IHVuaXRTY2FsZSh2aXNpYmxlc1trZXldLnNjYWxlKSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlc1trZXldLm9wYWNpdHksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGd1aUxheWVyO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxpc3RPZkhpZGRlbnMgPSBBcnJheS5mcm9tKGhpZGRlbnMpO1xuICAgICAgICAvL3JldHVybiBbbGlzdE9mVmlzaWJsZXMsIGxpc3RPZkhpZGRlbnNdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGxvdElEOiBwbG90SUQsXG4gICAgICAgICAgICB2aXNpYmxlTGF5ZXJzOiBsaXN0T2ZWaXNpYmxlcyxcbiAgICAgICAgICAgIGhpZGRlbkxldmVsczogbGlzdE9mSGlkZGVucyxcbiAgICAgICAgICAgIGRpbWVuc2lvbnM6IGdldERpbWVuc2lvbnMoKSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyRm9yVGVzdGluZygpIHtcbiAgICAgICAgdmlzaWJsZXMgPSB7fTtcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pO1xuICAgICAgICBkaW1lbnNpb25zID0ge307XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5jcmVhc2VTY2FsZSgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDwgc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA+PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSAmJiBrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSArIDE7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPD0gbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdLCB5OiAxICogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVjcmVhc2VTY2FsZSgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgPT0gbWluaW11bUxldmVsICYmIHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZUZhY3RvcikpIHtcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdICYmIGtleSA+IG1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSAtIDE7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPj0gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHpvb20oZm9jdXMsIHZlcnRpY2FsKSB7XG4gICAgICAgIHZhciBmaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgIGZpcnN0ID0gdmlzaWJsZXNbZmlyc3RLZXldLFxuICAgICAgICAgICAgd2lkdGggPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgdW5pdFNjYWxlKGZpcnN0LnNjYWxlKSwgd2lkdGgsIGhlaWdodCk7XG5cbiAgICAgICAgdmFyIGhvd011Y2ggPSBNYXRoLmZsb29yKE1hdGguYWJzKHZlcnRpY2FsKSAvIDUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvd011Y2g7IGkrKykge1xuICAgICAgICAgICAgaWYgKHZlcnRpY2FsIDwgMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5jcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdGaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgIG5ld0ZpcnN0ID0gdmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgbmV3V2lkdGggPSBkaW1lbnNpb25zW25ld0ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgIG5ld0hlaWdodCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgbmV3VG9wTGVmdCA9IHBvc2l0aW9uLnBlcmNlbnRhZ2VUb1RvcExlZnQoZm9jdXMsIHBlcmNlbnRhZ2VDb29yZGluYXRlcywgdW5pdFNjYWxlKG5ld0ZpcnN0LnNjYWxlKSwgbmV3V2lkdGgsIG5ld0hlaWdodCk7XG4gICAgICAgIHJlcG9zaXRpb24obmV3VG9wTGVmdCk7XG4gICAgICAgIHJlc2V0T3BhY2l0aWVzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc25hcEluKGZvY3VzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDUpIHtcbiAgICAgICAgICAgIHRoaXMuem9vbShmb2N1cywgLTUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNuYXBPdXQoZm9jdXMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcyk7XG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSB2aXNpYmxlc1tPYmplY3Qua2V5cyh2aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNCkge1xuICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmFnKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZXRQbG90SUQ6IHNldFBsb3RJRCxcbiAgICAgICAgZ2V0SW5mb0ZvckdVSTogZ2V0SW5mb0ZvckdVSSxcbiAgICAgICAgZ2V0UGxvdElEOiBnZXRQbG90SUQsXG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlOiBpbml0aWFsaXplVmlzaWJsZSxcbiAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbjogaW5pdGlhbGl6ZUhpZGRlbixcbiAgICAgICAgY2xlYXJGb3JUZXN0aW5nOiBjbGVhckZvclRlc3RpbmcsXG4gICAgICAgIGdldFZpc2libGVzOiBnZXRWaXNpYmxlcyxcbiAgICAgICAgZ2V0SGlkZGVuczogZ2V0SGlkZGVucyxcbiAgICAgICAgaW5jcmVhc2VTY2FsZTogaW5jcmVhc2VTY2FsZSxcbiAgICAgICAgZGVjcmVhc2VTY2FsZTogZGVjcmVhc2VTY2FsZSxcbiAgICAgICAgem9vbTogem9vbSxcbiAgICAgICAgc25hcEluOiBzbmFwSW4sXG4gICAgICAgIHNuYXBPdXQ6IHNuYXBPdXQsXG4gICAgICAgIGRyYWc6IGRyYWcsXG4gICAgICAgIHNldE1pbk1heExldmVsOiBzZXRNaW5NYXhMZXZlbCxcbiAgICAgICAgcmVzZXQ6IHJlc2V0LFxuICAgICAgICBhZGRQbG90QnlOYW1lOiBhZGRQbG90QnlOYW1lLFxuICAgICAgICBzd2l0Y2hQbG90czogc3dpdGNoUGxvdHMsXG4gICAgICAgIGdldERpbWVuc2lvbnM6IGdldERpbWVuc2lvbnMsXG4gICAgICAgIGdldFBsb3RzQnlOYW1lOiBnZXRQbG90c0J5TmFtZSxcbiAgICAgICAgX2hpZGU6IGhpZGUsXG4gICAgICAgIF9zaG93OiBzaG93LFxuICAgICAgICBfY2FsY3VsYXRlT3BhY2l0eTogY2FsY3VsYXRlT3BhY2l0eSxcbiAgICAgICAgX21hcFZhbHVlT250b1JhbmdlOiBtYXBWYWx1ZU9udG9SYW5nZSxcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMucGxvdCA9IHBsb3Q7IiwidmFyIHBvc2l0aW9uID0ge1xuICAgIGNhbGN1bGF0ZVBlcmNlbnQ6IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBvc2l0aW9uQiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIGlmIChsZW5ndGhCIDw9IDApIHRocm93IG5ldyBFcnJvcihcIkxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlLlwiKTtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wb3NpdGlvbiA9IHBvc2l0aW9uOyIsInZhciBlZGl0U1ZHID0gcmVxdWlyZSgnLi4vdXRpbHMvc3ZnLmpzJykuZWRpdFNWRztcbnZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG52YXIgdGFnID0gcmVxdWlyZSgnLi4vdXRpbHMvdGFnLmpzJykudGFnO1xuXG52YXIgZ3VpID0ge1xuICAgIGhpZGU6IGZ1bmN0aW9uKHBsb3RJRCkge1xuICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgc2NoZW1hLmNoZWNrKGFyZ3MsIFsncGxvdElEJywgJ3Zpc2libGVMYXllcnMnLCAnaGlkZGVuTGV2ZWxzJywgJ2RpbWVuc2lvbnMnXSk7XG4gICAgICAgIHZhciBwbG90SUQgPSBhcmdzLnBsb3RJRCxcbiAgICAgICAgICAgIHZpc2libGVMYXllcnMgPSBhcmdzLnZpc2libGVMYXllcnMsXG4gICAgICAgICAgICBoaWRkZW5MZXZlbHMgPSBhcmdzLmhpZGRlbkxldmVscyxcbiAgICAgICAgICAgIGRpbXMgPSBhcmdzLmRpbWVuc2lvbnM7XG5cbiAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdpbmxpbmUnKTtcblxuICAgICAgICBpZiAoISh2aXNpYmxlTGF5ZXJzLmxlbmd0aCA+IDAgJiYgdmlzaWJsZUxheWVycy5sZW5ndGggPD0gMikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgaGF2ZSAxLTIgdmlzaWJsZSBsYXllcnMuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaGlkZGVuSW5kZXggaW4gaGlkZGVuTGV2ZWxzKSB7XG4gICAgICAgICAgICB2YXIgbGV2ZWwgPSBoaWRkZW5MZXZlbHNbaGlkZGVuSW5kZXhdO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChsZXZlbCkgIT0gJ1tvYmplY3QgTnVtYmVyXScpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUkgRVJST1I6IGV4cGVjdGVkIGEgbGlzdCBvZiBudW1iZXJzIGZvciBoaWRkZW5MYXllcnMuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKS5zZXQocGxvdElELCBsZXZlbCkuaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgdmlzaWJsZUluZGV4IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZhciBsYXllciA9IHZpc2libGVMYXllcnNbdmlzaWJsZUluZGV4XTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmxheWVyKGxheWVyKSkgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBleHBlY3RlZCBsYXllciBzY2hlbWEuXCIpO1xuICAgICAgICAgICAgaWYgKGxheWVyLnNjYWxlLnggPiAyIHx8IGxheWVyLnNjYWxlLnggPCAuNSB8fCBsYXllci5zY2FsZS55ID4gMiB8fCBsYXllci5zY2FsZS55IDwgLjUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IHNjYWxlIG91dHNpZGUgWy41LDJdIHJhbmdlLiBTY2FsZSBzaG91bGQgYmUgY29udmVydGVkIHRvIFsuNSwyXSBiZWZvcmUgYmVpbmcgcGFzc2VkIHRvIEdVSS4gW1wiICsgbGF5ZXIuc2NhbGUueCArIFwiLCBcIiArIGxheWVyLnNjYWxlLnkgKyBcIl1cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdmdCdW5kbGUgPSBuZXcgZWRpdFNWRygpLnNldChwbG90SUQsIGxheWVyLmxldmVsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGRpbXNGcm9tUGFnZSA9IHN2Z0J1bmRsZS5kaW1lbnNpb25zKCk7XG4gICAgICAgICAgICBpZiAoKGRpbXNGcm9tUGFnZVswXSAhPSBkaW1zW2xheWVyLmxldmVsXS53aWR0aCkgfHwgKGRpbXNGcm9tUGFnZVsxXSAhPSBkaW1zW2xheWVyLmxldmVsXS5oZWlnaHQpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBkaW1lbnNpb25zIG9mIHBsb3Qgb24gcGFnZSBkb24ndCBtYXRjaCBkaW1lbnNpb25zIG9mIHBsb3QgZnJvbSBtb2RlbFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3ZnQnVuZGxlXG4gICAgICAgICAgICAgICAgLnRyYW5zbGF0ZShsYXllci50b3BMZWZ0LngsIGxheWVyLnRvcExlZnQueSlcbiAgICAgICAgICAgICAgICAuc2NhbGUobGF5ZXIuc2NhbGUueCwgbGF5ZXIuc2NhbGUueSlcbiAgICAgICAgICAgICAgICAuZmFkZShsYXllci5vcGFjaXR5KVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlzaWJsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgc2NhbGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIG9wYWNpdHlTdHJpbmcgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmlzaWJsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0ubGV2ZWw7XG4gICAgICAgICAgICBzY2FsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0uc2NhbGUueDtcbiAgICAgICAgICAgIG9wYWNpdHlTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0ub3BhY2l0eTtcbiAgICAgICAgfVxuICAgICAgICAkKFwiI3pvb20tZGl2XCIpLnRleHQodmlzaWJsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI2ZyYWN0aW9uYWwtem9vbS1kaXZcIikudGV4dChzY2FsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI29wYWNpdHktZGl2XCIpLnRleHQob3BhY2l0eVN0cmluZyk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmd1aSA9IGd1aTsiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xuXG52YXIgaGFuZGxlcnMgPSB7XG4gICAgY2FsbEdVSTogZnVuY3Rpb24gKCkge1xuICAgICAgICBndWkucmVuZGVyKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcbiAgICB9LFxuXG4gICAgZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdDogZnVuY3Rpb24gKG1vdXNlWCwgbW91c2VZLCBib3VuZGluZ09iamVjdCkge1xuICAgICAgICB2YXIgY3RtID0gYm91bmRpbmdPYmplY3QuZ2V0U2NyZWVuQ1RNKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiAobW91c2VYIC0gY3RtLmUpIC8gY3RtLmEsXG4gICAgICAgICAgICB5OiAobW91c2VZIC0gY3RtLmYpIC8gY3RtLmRcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgbGlzdGVuRm9yRHJhZzogZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImxpc3RlbkZvckRyYWdcIik7XG4gICAgICAgIHZhciBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIC8vdmFyIHN2ZyA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJlZ2luRHJhZywgZmFsc2UpO1xuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZywgZmFsc2UpO1xuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGVuZERyYWcsIGZhbHNlKTtcblxuICAgICAgICB2YXIgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmU7XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGJlZ2luRHJhZyhldnQpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnID0gZ2V0TW91c2VQb3NpdGlvbihldnQpO1xuICAgICAgICAgICAgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUgPSBtb3VzZVBvc2l0aW9uT25TdGFydERyYWc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkcmFnKGV2dCkge1xuICAgICAgICAgICAgaWYgKGlzRHJhZ2dpbmcpIHtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudE1vdXNlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZUluTW91c2VQb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogY3VycmVudE1vdXNlUG9zaXRpb24ueCAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLngsXG4gICAgICAgICAgICAgICAgICAgIHk6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnkgLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS55LFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBwbG90LmRyYWcoY2hhbmdlSW5Nb3VzZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG5cbiAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IGN1cnJlbnRNb3VzZVBvc2l0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZW5kRHJhZyhldnQpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG9uV2hlZWw6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBob3Jpem9udGFsID0gZXZ0LmRlbHRhWDtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZXZ0LmRlbHRhWTtcblxuICAgICAgICBpZiAoTWF0aC5hYnModmVydGljYWwpID49IE1hdGguYWJzKGhvcml6b250YWwpKSB7XG4gICAgICAgICAgICB2YXIgc3ZnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpO1xuICAgICAgICAgICAgdmFyIG1vdXNlUG9zID0gaGFuZGxlcnMuZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgICAgICAgICBwbG90Lnpvb20obW91c2VQb3MsIHZlcnRpY2FsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBsb3QuZHJhZyh7IHg6IGhvcml6b250YWwsIHk6IDAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tSW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgLTUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBJbih7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG5cbiAgICBvbkJ1dHRvbkNsaWNrWm9vbU91dDogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIDUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuaGFuZGxlcnMgPSBoYW5kbGVyczsiLCJ2YXIgdHlwZWNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbHMvdHlwZWNoZWNrLmpzJykudHlwZWNoZWNrO1xudmFyIHBvc2l0aW9uID0gcmVxdWlyZShcIi4uL3Bsb3QvcG9zaXRpb24uanNcIikucG9zaXRpb247XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG4vKiBIb3ZlciBkYXRhLlxuXG5EaXNwbGF5IG1ldGFkYXRhIHdoZW4gbW91c2UgaG92ZXJzIG92ZXIgcG9pbnQuICovXG52YXIgaG92ZXIgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGhvdmVyQXJlYSA9IG51bGw7XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRUZXh0Ym94KHBhcmVudElEKSB7XG4gICAgICAgIGhvdmVyQXJlYSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhcmVudElEKTtcblxuICAgICAgICAvLyBtYWtlIHN2ZyB0byBjb250YWluIHRleHRib3hcbiAgICAgICAgdmFyIHRleHRib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAnc3ZnJyk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCdpZCcsIFwidGV4dGJveFwiKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3gnLCBcIjBcIik7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd5JywgXCIwXCIpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgndmlzaWJpbGl0eScsIFwiaGlkZGVuXCIpO1xuICAgICAgICBob3ZlckFyZWEuYXBwZW5kQ2hpbGQodGV4dGJveCk7XG4gICAgXG4gICAgICAgIC8vIGluc2VydCByZWN0IGJhY2tncm91bmQgd2l0aCBsaW5lIGludG8gZmlyc3Qgc3ZnIGVsZW1lbnRcbiAgICAgICAgdmFyIHJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAncmVjdCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaWQnLCAndGV4dGJveFJlY3QnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3gnLCAnMCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgneScsICcwJyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWxsJywgJ3doaXRlJyk7XG4gICAgICAgIHRleHRib3guYXBwZW5kQ2hpbGQocmVjdCk7XG4gICAgXG4gICAgICAgIC8vIG1ha2UgY29udGFpbmVyIGZvciB0ZXh0ICh3aXRoIG1hcmdpbnMpIGluc2lkZSB0ZXh0Ym94XG4gICAgICAgIHZhciBpbm5lclRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAnc3ZnJyk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3RleHRib3hJbm5lcicpO1xuICAgICAgICBpbm5lclRleHQuc2V0QXR0cmlidXRlKCd4JywgJzUnKTtcbiAgICAgICAgaW5uZXJUZXh0LnNldEF0dHJpYnV0ZSgneScsICc1Jyk7XG4gICAgICAgIHRleHRib3guYXBwZW5kQ2hpbGQoaW5uZXJUZXh0KTtcbiAgICBcbiAgICAgICAgdmFyIHRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAndGV4dCcpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnaWQnLCAndGV4dGJveFRleHQnKTtcbiAgICAgICAgdGV4dC5zZXRBdHRyaWJ1dGUoJ3knLCAnNScpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnZm9udC1zaXplJywgJzEwJyk7XG4gICAgICAgIHRleHQuc2V0QXR0cmlidXRlKCdkeScsICcwJyk7XG4gICAgXG4gICAgICAgIC8vIGluc2VydCB0ZXh0IGludG8gc2Vjb25kIHN2ZyBlbGVtZW50XG4gICAgICAgIGlubmVyVGV4dC5hcHBlbmRDaGlsZCh0ZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZGlzcGxheVRleHRCb3goeCwgeSwgbGluZXMpIHtcbiAgICAgICAgdmFyIHRleHRib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveCcpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgneCcsIFN0cmluZyh4KzUpKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3knLCBTdHJpbmcoeSkpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgndmlzaWJpbGl0eScsIFwidmlzaWJsZVwiKTtcbiAgICBcbiAgICAgICAgLy8gYWRkIHRzcGFucyB0byB0ZXh0IGVsZW1lbnQgd2l0aCB0c3BhbnNcbiAgICAgICAgdmFyIGxpbmVDb3VudCA9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgdmFyIHRzcGFucyA9ICc8dHNwYW4geD1cIjBcIiBkeT1cIjAuNmVtXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj4nICsgbGluZXNbMF0gKyAnPC90c3Bhbj4nO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGxpbmVDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICB0c3BhbnMgKz0gJzx0c3BhbiB4PVwiMFwiIGR5PVwiMS4yZW1cIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPicgKyBsaW5lc1tpXSArICc8L3RzcGFuPic7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveFRleHQnKTtcbiAgICAgICAgdGV4dC5pbm5lckhUTUwgPSB0c3BhbnM7XG4gICAgXG4gICAgICAgIC8vIGdldCB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRleHQgZWxlbWVudFxuICAgICAgICB2YXIgd2lkdGggPSB0ZXh0LmdldEJCb3goKS53aWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRleHQuZ2V0QkJveCgpLmhlaWdodDtcbiAgICBcbiAgICAgICAgLy8gc2V0IHdpZHRoL2hlaWdodCBvZiBiYWNrZ3JvdW5kIHJlY3RcbiAgICAgICAgdmFyIHJlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveFJlY3QnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGggKyAxNSk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQgKyAxNSk7XG4gICAgXG4gICAgICAgIC8vIHNldCB3aWR0aC9oZWlnaHQgb2Ygd2hvbGUgdGV4dGJveFxuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCArIDE1KTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCArIDE1KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCB3aWR0aC9oZWlnaHQgb2YgdGV4dCBjb250YWluZXJcbiAgICAgICAgdmFyIGlubmVyVGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXh0Ym94SW5uZXInKTtcbiAgICAgICAgaW5uZXJUZXh0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCArIDEwKTtcbiAgICAgICAgaW5uZXJUZXh0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0ICsgMTApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9oaWRlVGV4dEJveCgpIHtcbiAgICAgICAgdmFyIHRleHRib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveCcpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgndmlzaWJpbGl0eScsIFwiaGlkZGVuXCIpO1xuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBfZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChtb3VzZVgsIG1vdXNlWSwgYm91bmRpbmdPYmplY3QpIHtcbiAgICAgICAgdmFyIGN0bSA9IGJvdW5kaW5nT2JqZWN0LmdldFNjcmVlbkNUTSgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogKG1vdXNlWCAtIGN0bS5lKSAvIGN0bS5hLFxuICAgICAgICAgICAgeTogKG1vdXNlWSAtIGN0bS5mKSAvIGN0bS5kXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9nZXRGaXJzdFBsb3RMYXllckluZm8oKSB7XG4gICAgICAgIHZhciBhcmdzID0gcGxvdC5nZXRJbmZvRm9yR1VJKCk7XG4gICAgICAgIHZhciB2aXNpYmxlcyA9IGFyZ3MudmlzaWJsZUxheWVycztcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSBhcmdzLmRpbWVuc2lvbnM7XG5cbiAgICAgICAgdmFyIGZpcnN0ID0gdmlzaWJsZXNbMF0sXG4gICAgICAgICAgICBmaXJzdEtleSA9IGZpcnN0LmxldmVsLFxuICAgICAgICAgICAgd2lkdGggPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgbkNvbHMgPSBNYXRoLnBvdygyLCBmaXJzdC5sZXZlbCk7XG5cbiAgICAgICAgcmV0dXJuIFtmaXJzdC50b3BMZWZ0LCBmaXJzdC5zY2FsZSwgd2lkdGgsIGhlaWdodCwgZmlyc3QubGV2ZWwsIG5Db2xzXTtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IHgseSBpbiB2aWV3aW5nIHdpbmRvdyBjb29yZGluYXRlcyB0byBncmFwaCBjb29yZGluYXRlc1xuICAgIGZ1bmN0aW9uIF9nZXRDb29yZGluYXRlcyh4LCB5KSB7XG4gICAgICAgIC8qdmFyIGFyZ3MgPSBwbG90LmdldEluZm9Gb3JHVUkoKTtcbiAgICAgICAgdmFyIHZpc2libGVzID0gYXJncy52aXNpYmxlTGF5ZXJzO1xuICAgICAgICB2YXIgZGltZW5zaW9ucyA9IGFyZ3MuZGltZW5zaW9ucztcblxuICAgICAgICB2YXIgZmlyc3QgPSB2aXNpYmxlc1swXSxcbiAgICAgICAgICAgIGZpcnN0S2V5ID0gZmlyc3QubGV2ZWwsXG4gICAgICAgICAgICB3aWR0aCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gZGltZW5zaW9uc1tmaXJzdEtleV0uaGVpZ2h0OyovXG4gICAgICAgIHZhciByZXMgPSBfZ2V0Rmlyc3RQbG90TGF5ZXJJbmZvKCk7XG4gICAgICAgIHZhciB0b3BMZWZ0ID0gcmVzWzBdLCBzY2FsZSA9IHJlc1sxXSwgd2lkdGggPSByZXNbMl0sIGhlaWdodCA9IHJlc1szXTtcbiAgICAgICAgXG4gICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKHt4OiB4LCB5OiB5fSwgdG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB2YXIgcGl4ZWxDb29yZGluYXRlcyA9IHt4OiBwZXJjZW50YWdlQ29vcmRpbmF0ZXMueCAqIHdpZHRoLCB5OiBwZXJjZW50YWdlQ29vcmRpbmF0ZXMueSAqIGhlaWdodH07XG4gICAgICAgIFxuICAgICAgICAvLyBtYXAgJSBjb29yZGluYXRlcyB0byBncmFwaCBjb29yZGluYXRlc1xuICAgICAgICAvL3ZhciBncmFwaFggPSBwbG90Ll9tYXBWYWx1ZU9udG9SYW5nZShwZXJjZW50YWdlQ29vcmRpbmF0ZXMueCwgWzAsMV0sIFstOTA5NTgzNiwzMDQ1MTIwNjUzXSk7XG4gICAgICAgIC8vdmFyIGdyYXBoWSA9IHBsb3QuX21hcFZhbHVlT250b1JhbmdlKHBlcmNlbnRhZ2VDb29yZGluYXRlcy55LCBbMSwwXSwgWy0xLjk5OTk5Njk2NTE1MDcxNDEsMTEuNzY3NDk0ODk3ODM4MDU0XSk7XG5cbiAgICAgICAgcmV0dXJuIFtwaXhlbENvb3JkaW5hdGVzLCB3aWR0aCwgaGVpZ2h0XTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0VGlsZXNJblZpZXcodG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQsIG5Db2xzKSB7XG4gICAgICAgIC8vIGdldCBwbG90IGNvb3JkaW5hdGUgb2YgdG9wIGxlZnQgY29ybmVyIG9mIHZpZXdpbmcgd2luZG93IFxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZSh7eDowLHk6MH0sIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdmFyIHRvcExlZnRQZXJjZW50ID0gcGVyY2VudGFnZUNvb3JkaW5hdGVzLng7XG4gICAgICAgIC8vIGdldCB2aXNpYmxlIHRpbGVzXG4gICAgICAgIHZhciBmaXJzdFRpbGVJblZpZXcgPSBNYXRoLmZsb29yKHRvcExlZnRQZXJjZW50ICogbkNvbHMpO1xuICAgICAgICB2YXIgdGlsZXNJblZpZXcgPSBbZmlyc3RUaWxlSW5WaWV3LCBmaXJzdFRpbGVJblZpZXcrMSwgZmlyc3RUaWxlSW5WaWV3KzIsIGZpcnN0VGlsZUluVmlldyszXTtcbiAgICAgICAgcmV0dXJuIHRpbGVzSW5WaWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9hZnRlckxvYWRpbmdQb2ludHMocG9pbnRzLCB4X2F4aXNfcmFuZ2UsIHlfYXhpc19yYW5nZSwgd2lkdGgsIGhlaWdodCwgZ3JhcGhDb29yZHMpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhwb2ludHMpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaTwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGl4ZWxQb2ludCA9IHt4OiBwbG90Ll9tYXBWYWx1ZU9udG9SYW5nZShwb2ludHNbaV0uZ3AsIFt4X2F4aXNfcmFuZ2VbMF0sIHhfYXhpc19yYW5nZVsxXV0sIFswLHdpZHRoXSksIFxuICAgICAgICAgICAgICAgIHk6IHBsb3QuX21hcFZhbHVlT250b1JhbmdlKHBvaW50c1tpXS5ubHAsIFt5X2F4aXNfcmFuZ2VbMF0sIHlfYXhpc19yYW5nZVsxXV0sIFtoZWlnaHQsMF0pfTtcblxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKGdyYXBoQ29vcmRzLnggLSBwaXhlbFBvaW50LngpIDwgMiAmJiBNYXRoLmFicyhncmFwaENvb3Jkcy55IC0gcGl4ZWxQb2ludC55KSA8IDIpIHtcbiAgICAgICAgICAgICAgICAvL19kaXNwbGF5VGV4dEJveChtb3VzZXBvcy54LCBtb3VzZXBvcy55LCBbcG9pbnRzW2ldLmNoclBvcywgcG9pbnRzW2ldLmFsbGVsZXMsICdyczAnLCAnZ2VuZSBsYWJlbC4uLicsIHBvaW50c1tpXS5wXSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Rpc3BsYXkgdGV4dCBib3gnKTtcbiAgICAgICAgICAgICAgICBfZGlzcGxheVRleHRCb3gobW91c2Vwb3MueCwgbW91c2Vwb3MueSwgcG9pbnRzW2ldLmxhYmVsKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaWRlVGV4dEJveCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaW5zZXJ0VGV4dGJveDogaW5zZXJ0VGV4dGJveCxcbiAgICAgICAgaG92ZXJMaXN0ZW5lcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGhvdmVyQXJlYSkpIHRocm93IG5ldyBFcnJvcihcImhvdmVyOiBob3ZlckFyZWEgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgICAgICAgICBtb3VzZXBvcyA9IF9nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGUuY2xpZW50WCwgZS5jbGllbnRZLCBob3ZlckFyZWEpO1xuXG4gICAgICAgICAgICB2YXIgcmVzID0gX2dldENvb3JkaW5hdGVzKG1vdXNlcG9zLngsIG1vdXNlcG9zLnkpO1xuICAgICAgICAgICAgdmFyIGdyYXBoQ29vcmRzID0gcmVzWzBdLCB3aWR0aCA9IHJlc1sxXSwgaGVpZ2h0ID0gcmVzWzJdO1xuXG4gICAgICAgICAgICB2YXIgeF9heGlzX3JhbmdlID0gbnVsbCwgeV9heGlzX3JhbmdlID0gbnVsbDtcbiAgICAgICAgICAgICQuZ2V0SlNPTignLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbi9tZXRhZGF0YS5qc29uJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHhfYXhpc19yYW5nZSA9IGRhdGEueF9heGlzX3JhbmdlO1xuICAgICAgICAgICAgICAgIHlfYXhpc19yYW5nZSA9IGRhdGEueV9heGlzX3JhbmdlO1xuXG4gICAgICAgICAgICAgICAgLyp2YXIgcG9pbnRzID0gW1xuICAgICAgICAgICAgICAgICAgICB7eDogNTA0MTI3MDcwLCB5OiA4LjE5OTE4LCBjaHJQb3M6IFwiMzoxMTY3NzA3N1wiLCBhbGxlbGVzOiAnW0MsVF0nLCBwOiAyLjc0ODc5fSxcbiAgICAgICAgICAgICAgICAgICAge3g6IDU0NDU0OTQzNCwgeTogOS43Njc0OSwgY2hyUG9zOiBcIjM6NTIwOTk0NDFcIiwgYWxsZWxlczogJ1tULENdJywgcDogNS43MjgzN30sXG4gICAgICAgICAgICAgICAgICAgIHt4OiAyNzA2NjY4OTI4LCB5OiA4LjQxNTc0LCBjaHJQb3M6IFwiMTk6NDcyMjQ2MDdcIiwgYWxsZWxlczogJ1tDLFRdJywgcDogMi4yMTM1Nn0sXG4gICAgICAgICAgICAgICAgXTsqL1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBfZ2V0Rmlyc3RQbG90TGF5ZXJJbmZvKCk7XG4gICAgICAgICAgICAgICAgdmFyIHRvcExlZnQgPSByZXNbMF0sIHNjYWxlID0gcmVzWzFdLCB3aWR0aCA9IHJlc1syXSwgaGVpZ2h0ID0gcmVzWzNdLCB6b29tTGV2ZWwgPSByZXNbNF0sIG5Db2xzID0gcmVzWzVdO1xuICAgICAgICAgICAgICAgICQuZ2V0SlNPTignLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbi8nK3pvb21MZXZlbCsnL2hvdmVyLmpzb24nLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGlsZXNXaXRoSG92ZXJEYXRhID0gbmV3IFNldChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvaW50cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGlsZXNJblZpZXcgPSBfZ2V0VGlsZXNJblZpZXcodG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQsIG5Db2xzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aWxlc0luVmlldyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpPHRpbGVzSW5WaWV3Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGlsZXNXaXRoSG92ZXJEYXRhLmhhcyh0aWxlc0luVmlld1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLmdldEpTT04oJy4uL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzXzIvY2FmZmVpbmVfY29uc3VtcHRpb24vJyt6b29tTGV2ZWwrJy8nK3RpbGVzSW5WaWV3W2ldKycuanNvbicsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvYWRpbmdwb2ludHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2guYXBwbHkocG9pbnRzLGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYWZ0ZXJMb2FkaW5nUG9pbnRzKHBvaW50cywgeF9heGlzX3JhbmdlLCB5X2F4aXNfcmFuZ2UsIHdpZHRoLCBoZWlnaHQsIGdyYXBoQ29vcmRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLmhvdmVyID0gaG92ZXI7IiwidmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xudmFyIGd1aSA9IHJlcXVpcmUoJy4uL3VpL2d1aS5qcycpLmd1aTtcblxuLyogXG5TZWFyY2ggYmFyIGZvciBkaXNwbGF5aW5nIHJlc3VsdHMgb2YgcXVlcnkuXG5cbmRlcGVuZGVuY3k6IGZ1c2UgXG4qL1xudmFyIHNlYXJjaCA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgcmVzdWx0cyA9IFtdOyAvLyByZXN1bHQgZnJvbSBzZWFyY2ggcXVlcnlcbiAgICB2YXIgZm9jdXMgPSAxOyAvLyBuLXRoIHJvdyBvZiByZXN1bHRzIHRhYmxlIHdlJ3JlIGZvY3VzZWQgb25cblxuICAgIHZhciBwaGVub3R5cGVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgICBpZDogMCxcbiAgICAgICAgICAgIHRpdGxlOiBcInN0YW5kaW5nX2hlaWdodFwiLFxuICAgICAgICAgICAgdXJsOiAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9zdGFuZGluZ19oZWlnaHRfcGxvdHMvc3RhbmRpbmdfaGVpZ2h0JyxcbiAgICAgICAgICAgIGRlc2M6ICdMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LCBzZWQnLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBpZDogMSxcbiAgICAgICAgICAgIHRpdGxlOiBcImNhZmZlaW5lX2NvbnN1bXB0aW9uXCIsXG4gICAgICAgICAgICB1cmw6ICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzL2NhZmZlaW5lX2NvbnN1bXB0aW9uJyxcbiAgICAgICAgICAgIGRlc2M6ICdkbyBlaXVzbW9kIHRlbXBvciBpbmNpZGlkdW50IHV0IGxhYm9yZSBldCBkb2xvcmUgbWFnbmEgYWxpcXVhLicsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAyLFxuICAgICAgICAgICAgdGl0bGU6IFwiY2FmZmVpbmVfY29uc3VtcHRpb24yXCIsXG4gICAgICAgICAgICB1cmw6ICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzMi9jYWZmZWluZV9jb25zdW1wdGlvbicsXG4gICAgICAgICAgICBkZXNjOiAndHJhbnNwYXJlbnQgYmFja2dyb3VuZCcsXG4gICAgICAgIH1cbiAgICBdO1xuXG4gICAgLy8gZnVzZSBvcHRpb25zXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIHNob3VsZFNvcnQ6IHRydWUsXG4gICAgICAgIGluY2x1ZGVTY29yZTogdHJ1ZSxcbiAgICAgICAgdGhyZXNob2xkOiAwLjYsXG4gICAgICAgIGxvY2F0aW9uOiAwLFxuICAgICAgICBkaXN0YW5jZTogMTAwLFxuICAgICAgICBtYXhQYXR0ZXJuTGVuZ3RoOiAzMixcbiAgICAgICAgbWluTWF0Y2hDaGFyTGVuZ3RoOiAxLFxuICAgICAgICBrZXlzOiBbXG4gICAgICAgICAgICBcInRpdGxlXCIsXG4gICAgICAgICAgICBcImF1dGhvci5maXJzdE5hbWVcIlxuICAgICAgICBdXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG1ha2VUYWJsZSgpIHtcbiAgICAgICAgJCgnPHRhYmxlIGlkPVwic2VhcmNoX3RhYmxlXCI+PHRyIGlkPVwic2VhcmNoX3RpdGxlc1wiPjwvdHI+PC90YWJsZT4nKS5hcHBlbmRUbygnI3NlYXJjaGJhcl90YXJnZXQnKTtcbiAgICAgICAgJCgnI3NlYXJjaF90aXRsZXMnKS5hcHBlbmQoJzx0aCB3aWR0aD1cIjIwcHhcIj5pZDwvdGg+Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCIxMDBweFwiPnBoZW5vdHlwZTwvdGg+Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCI0MDBweFwiPmRlc2NyaXB0aW9uPC90aD4nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhclRhYmxlQ29udGVudHMoKSB7XG4gICAgICAgICQoJy5yb3cnKS5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwbGF5UmVzdWx0cyhjb250ZW50cywga2V5c1RvRGlzcGxheSkge1xuICAgICAgICBjbGVhclRhYmxlQ29udGVudHMoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJvdyA9ICc8dHIgY2xhc3M9XCJyb3dcIj4nO1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBjb250ZW50c1tpXS5pdGVtO1xuICAgICAgICAgICAgLy92YXIga2V5cyA9IE9iamVjdC5rZXlzKGl0ZW0pO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzVG9EaXNwbGF5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNlbGwgPSAnPHRkPicgKyBpdGVtW2tleXNUb0Rpc3BsYXlbal1dICsgJzwvdGQ+JztcbiAgICAgICAgICAgICAgICByb3cgKz0gY2VsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC90cj4nO1xuICAgICAgICAgICAgJCgnI3NlYXJjaF90YWJsZScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGZ1c2UgPSBuZXcgRnVzZShwaGVub3R5cGVzLCBvcHRpb25zKTtcbiAgICBtYWtlVGFibGUoKTtcblxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleVVwKGUpIHtcbiAgICAgICAgLy8gaWYga2V5IHdhcyBub3QgdGhlIHVwIG9yIGRvd24gYXJyb3cga2V5LCBkaXNwbGF5IHJlc3VsdHNcbiAgICAgICAgaWYgKGUua2V5Q29kZSAhPSA0MCAmJiBlLmtleUNvZGUgIT0gMzgpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQoJyNzZWFyY2hiYXInKS52YWwoKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBmdXNlLnNlYXJjaChjb250ZW50cyk7XG4gICAgICAgICAgICBkaXNwbGF5UmVzdWx0cyhyZXN1bHRzLCBbJ2lkJywgJ3RpdGxlJywgJ2Rlc2MnXSk7XG4gICAgICAgICAgICBmb2N1cyA9IDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlQcmVzcyhlKSB7XG4gICAgICAgIC8vIGlmIGVudGVyIGtleSB3YXMgcHJlc3NlZFxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoZm9jdXMgIT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9ICQoXCIucm93Om50aC1vZi10eXBlKFwiICsgZm9jdXMgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgdmFyIHBoZW5vdHlwZSA9IHNlbGVjdGVkLmNoaWxkcmVuKCkuZXEoMSkuaHRtbCgpO1xuICAgICAgICAgICAgICAgICQoJyNzZWFyY2hiYXInKS52YWwocGhlbm90eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gJCgnI3NlYXJjaGJhcicpLnZhbCgpO1xuICAgICAgICAgICAgICAgIHJlcyA9IGZ1c2Uuc2VhcmNoKHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc1swXS5zY29yZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGVyZmVjdCBtYXRjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoUGxvdHMocXVlcnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gbWF0Y2hcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlEb3duKGUpIHtcbiAgICAgICAgLy8gY2hhbmdlIGhpZ2hsaWdodGVkIHJvdyBpbiByZXN1bHRzIHRhYmxlXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gNDApIHsgLy8gZG93biBhcnJvd1xuICAgICAgICAgICAgaWYgKGZvY3VzIDwgcmVzdWx0cy5sZW5ndGggKyAxKSB7XG4gICAgICAgICAgICAgICAgZm9jdXMgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChlLmtleUNvZGUgPT0gMzgpIHsgLy8gdXAgYXJyb3dcbiAgICAgICAgICAgIGlmIChmb2N1cyA+IDEpIHtcbiAgICAgICAgICAgICAgICBmb2N1cyAtPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICQoXCIucm93XCIpLmNoaWxkcmVuKCd0ZCcpLmNzcygnYm9yZGVyJywgJzFweCBzb2xpZCAjZGRkZGRkJyk7XG4gICAgICAgICQoXCIucm93Om50aC1vZi10eXBlKFwiICsgZm9jdXMgKyBcIilcIikuY2hpbGRyZW4oJ3RkJykuY3NzKCdib3JkZXInLCAnMXB4IHNvbGlkICMwMDAwMDAnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hQbG90cyhwbG90TmFtZSkge1xuICAgICAgICAvLyBjaGFuZ2UgdmlzaWJsZSBwbG90IVxuICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgcGxvdHMnKTtcbiAgICAgICAgdmFyIG9sZFBsb3RJRCA9IHBsb3QuZ2V0UGxvdElEKCk7XG4gICAgICAgIHBsb3Quc3dpdGNoUGxvdHMocGxvdE5hbWUpO1xuICAgICAgICBndWkuaGlkZShvbGRQbG90SUQpO1xuICAgICAgICBndWkucmVuZGVyKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcbiAgICB9XG5cbiAgICAkKCcjc2VhcmNoYmFyJykub24oJ2tleXVwJywgc2VhcmNoQmFyS2V5VXApO1xuICAgICQoJyNzZWFyY2hiYXInKS5vbigna2V5cHJlc3MnLCBzZWFyY2hCYXJLZXlQcmVzcyk7XG4gICAgJCgnI3NlYXJjaGJhcicpLm9uKCdrZXlkb3duJywgc2VhcmNoQmFyS2V5RG93bik7XG5cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnNlYXJjaCA9IHNlYXJjaDsiLCJ2YXIgdGFnID0gcmVxdWlyZSgnLi4vdXRpbHMvdGFnLmpzJykudGFnO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4uL3V0aWxzL3NlbGVjdG9ycy5qcycpLnNlbGVjdG9ycztcblxudmFyIHNldHVwID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIF9jcmVhdGVXaWRnZXQodGFyZ2V0LCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgIC8vIGNyZWF0ZSB3aWRnZXQgYW5kIGFwcGVuZCBpdCB0byB0aGUgdGFyZ2V0XG4gICAgICAgIHZhciB3aWRnZXQgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgd2lkZ2V0SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBiYWNrZ3JvdW5kIGZvciBwbG90IHdpZGdldFxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygncmVjdCcpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2ZpbGwnLCBiYWNrZ3JvdW5kQ29sb3IpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdzdHJva2UnLCAnI2UzZTdlZCcpXG4gICAgICAgICAgICAucGxhY2Uod2lkZ2V0KTtcblxuICAgICAgICByZXR1cm4gd2lkZ2V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9jcmVhdGVQbG90V2luZG93KHRhcmdldCwgcGxvdElELCB3aWR0aCwgaGVpZ2h0LCB4LCB5KSB7XG4gICAgICAgIC8vIGNyZWF0ZSBwbG90IGNvbnRhaW5lciAod2lkdGggYW5kIGhlaWdodCBkaWN0YXRlIHRoZSBzaXplIG9mIHRoZSB2aWV3aW5nIHdpbmRvdylcbiAgICAgICAgdmFyIHdpbmRvdyA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneCcsIHgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgeSlcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBwbG90IGJhY2tncm91bmRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2ZpbGwnLCAnI2U4ZWJlZicpXG4gICAgICAgICAgICAucGxhY2Uod2luZG93KTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2FkZEJ1dHRvbnModGFyZ2V0KSB7XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkQnV0dG9uKGlkLCBfY2xhc3MsIHR5cGUsIG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGFnKClcbiAgICAgICAgICAgICAgICAuY3JlYXRlKCdpbnB1dCcpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBpZClcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdjbGFzcycsIF9jbGFzcylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCd0eXBlJywgdHlwZSlcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCduYW1lJywgbmFtZSlcbiAgICAgICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcbiAgICAgICAgfTtcbiAgICAgICAgYWRkQnV0dG9uKCd6b29tLWluLWJ1dHRvbicsICd6b29tLWJ1dHRvbicsICdidXR0b24nLCAnaW5jcmVhc2UnKS5hdHRyaWJ1dGUoJ3ZhbHVlJywgJysnKTtcbiAgICAgICAgYWRkQnV0dG9uKCd6b29tLW91dC1idXR0b24nLCAnem9vbS1idXR0b24nLCAnYnV0dG9uJywnZGVjcmVhc2UnKS5hdHRyaWJ1dGUoJ3ZhbHVlJywgJy0nKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2FkZFBsb3RUb1BhZ2UodGFyZ2V0LCBwbG90SUQpIHtcbiAgICAgICAgLy8gYWRkIGcgZm9yIGEgc2luZ2xlIHBsb3QgKHBoZW5vdHlwZSksIGhpZGRlbiB3aXRoIGRpc3BsYXk9bm9uZVxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHBsb3RJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnbm9uZScpXG4gICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcbiAgICB9O1xuXG4gICAgLyogcGxhY2UgYSB6b29tIGxheWVyIGdyb3VwIDxnPjxzdmc+PC9zdmc+PC9nPiBpbnNpZGUgYSBwbG90J3MgPHN2Zz4gKi9cbiAgICBmdW5jdGlvbiBfYWRkR3JvdXAocGxvdElELCBsZXZlbCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgcGxvdCA9IG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKTtcblxuICAgICAgICB2YXIgZ3JvdXAgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsc2VsZWN0b3JzLmlkcy5ncm91cChwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJylcbiAgICAgICAgICAgIC5wbGFjZShwbG90KTtcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLnBsYWNlKGdyb3VwKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2FkZFRpbGUocGxvdElELCBsZXZlbCwgY29sdW1uLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciB0aWxlVVJMID0gdXJsICsgXCIvXCIgKyBsZXZlbCArIFwiL1wiICsgY29sdW1uICsgXCIucG5nXCI7XG5cbiAgICAgICAgdmFyIHggPSBjb2x1bW4gKiBpbWFnZVdpZHRoO1xuICAgICAgICB2YXIgeSA9IDA7XG4gICAgICAgIHZhciB3aWR0aCA9IGltYWdlV2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSBpbWFnZUhlaWdodDtcblxuICAgICAgICB2YXIgc3ZnID0gbmV3IHRhZygpLnNlbGVjdChzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKHBsb3RJRCwgbGV2ZWwpKTtcblxuICAgICAgICAvL2NyZWF0ZSB0aWxlXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdpbWFnZScpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd4JywgU3RyaW5nKHgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmFkZEhSRUYodGlsZVVSTClcbiAgICAgICAgICAgIC5wbGFjZShzdmcpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkVGlsZXMocGxvdElELCBsZXZlbCwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCkge1xuICAgICAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGxldmVsKTtcbiAgICAgICAgdmFyIHggPSAwO1xuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IGNvbHVtbnM7IGMrKykge1xuICAgICAgICAgICAgX2FkZFRpbGUocGxvdElELCBsZXZlbCwgYywgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgICAgICB4ID0geCArIDI1NjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzZXRVcFdpZGdldCh0YXJnZXRJRCwgd2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvcikge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gbmV3IHRhZygpLnNlbGVjdCh0YXJnZXRJRCk7XG4gICAgICAgIF9hZGRCdXR0b25zKHRhcmdldCk7XG4gICAgICAgIHZhciB3aWRnZXQgPSBfY3JlYXRlV2lkZ2V0KHRhcmdldCwgd2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvcik7XG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0VXBQbG90KHdpZGdldCwgIHBsb3RJRCwgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCwgd2luZG93WCwgd2luZG93WSkge1xuICAgICAgICBfY3JlYXRlUGxvdFdpbmRvdyh3aWRnZXQsIHBsb3RJRCwgd2luZG93V2lkdGgsIHdpbmRvd0hlaWdodCwgd2luZG93WCwgd2luZG93WSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5zZXJ0UGxvdEltYWdlcyhwbG90SUQsIG1pbkxldmVsLCBtYXhMZXZlbCwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCkge1xuICAgICAgICB2YXIgcGxvdENvbnRhaW5lciA9IG5ldyB0YWcoKS5zZWxlY3QoJ3Bsb3QnKTtcbiAgICAgICAgX2FkZFBsb3RUb1BhZ2UocGxvdENvbnRhaW5lciwgcGxvdElEKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IG1pbkxldmVsOyBpPG1heExldmVsKzE7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBpKTtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbHVtbnMgKiBpbWFnZVdpZHRoO1xuICAgICAgICAgICAgdmFyIGhlaWdodCA9IGltYWdlSGVpZ2h0O1xuICAgICAgICAgICAgX2FkZEdyb3VwKHBsb3RJRCwgaSwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgICAgICBfYWRkVGlsZXMocGxvdElELCBpLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNldFVwV2lkZ2V0OiBzZXRVcFdpZGdldCxcbiAgICAgICAgc2V0VXBQbG90OiBzZXRVcFBsb3QsXG4gICAgICAgIGluc2VydFBsb3RJbWFnZXM6IGluc2VydFBsb3RJbWFnZXMsXG4gICAgfVxufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuc2V0dXAgPSBzZXR1cDsiLCIvKkNoZWNrIHNjaGVtYSBvZiBhbiBvYmplY3QgbGl0ZXJhbC4gKi9cbnZhciBzY2hlbWEgPSB7XG4gICAgY2hlY2s6IGZ1bmN0aW9uIChvYmplY3QsIGtleXMpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iamVjdCkubGVuZ3RoICE9IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaW5kZXggaW4ga2V5cykge1xuICAgICAgICAgICAgaWYgKCEoa2V5c1tpbmRleF0gaW4gb2JqZWN0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIHh5OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3gnLCAneSddKTtcbiAgICB9LFxuICAgIGRpbWVuc2lvbnM6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsnd2lkdGgnLCAnaGVpZ2h0J10pO1xuICAgIH0sXG4gICAgcG9pbnQ6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS54eShvYmplY3QpO1xuICAgIH0sXG4gICAgc2NhbGU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS54eShvYmplY3QpO1xuICAgIH0sXG4gICAgbGF5ZXI6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsnbGV2ZWwnLCAndG9wTGVmdCcsICdzY2FsZScsICdvcGFjaXR5J10pXG4gICAgICAgICAgICAmJiBzY2hlbWEucG9pbnQob2JqZWN0Wyd0b3BMZWZ0J10pXG4gICAgICAgICAgICAmJiBzY2hlbWEuc2NhbGUob2JqZWN0WydzY2FsZSddKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuc2NoZW1hID0gc2NoZW1hOyIsInZhciBzZWxlY3RvcnMgPSB7XG4gICAgaWRzOiB7XG4gICAgICAgIHdpZGdldDogJ3dpZGdldCcsXG4gICAgICAgIHBsb3Q6ICdwbG90JyxcbiAgICAgICAgZ3JvdXA6IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gcGxvdElEK1wiLWdyb3VwLWxheWVyXCIrbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgICAgIHN2Z0xheWVyOiBmdW5jdGlvbiAocGxvdElELCBsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHBsb3RJRCtcIi1zdmctbGF5ZXJcIitsZXZlbDtcbiAgICAgICAgfSxcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuc2VsZWN0b3JzID0gc2VsZWN0b3JzOyIsInZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuL3NlbGVjdG9ycy5qcycpLnNlbGVjdG9ycztcblxudmFyIGVkaXRTVkcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5sYXllcjtcbiAgICB0aGlzLnBsb3Q7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocGxvdElELCBsZXZlbCkge1xuICAgIHRoaXMubGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLmdyb3VwKHBsb3RJRCwgbGV2ZWwpKTtcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIHRoaXMuaW5uZXJDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKHBsb3RJRCwgbGV2ZWwpKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmRpbWVuc2lvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIGlmICghdGhpcy5pbm5lckNvbnRhaW5lcikgdGhyb3cgbmV3IEVycm9yKCdlZGl0U1ZHOiBpbm5lckNvbnRhaW5lciBtdXN0IGJlIGluaXRpYWxpemVkJyk7XG4gICAgcmV0dXJuIFt0aGlzLmlubmVyQ29udGFpbmVyLmdldEJCb3goKS53aWR0aCwgdGhpcy5pbm5lckNvbnRhaW5lci5nZXRCQm94KCkuaGVpZ2h0XTtcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNmb3JtYXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICBcbiAgICB2YXIgdHJhbnNmb3JtYXRpb25zID0gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbiAgICBpZiAoIXRyYW5zZm9ybWF0aW9ucy5sZW5ndGggfHwgdHJhbnNmb3JtYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgdHJhbnNsYXRlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICB0cmFuc2xhdGUuc2V0VHJhbnNsYXRlKDAsIDApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUodHJhbnNsYXRlLCAwKTtcblxuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHNjYWxlLnNldFNjYWxlKDEuMCwgMS4wKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHNjYWxlLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogZXhwZWN0ZWQgdHJhbnNmb3JtYXRpb25zIHRvIGJlIGEgbGlzdCBvZiBsZW5ndGggMiwgbm90XCIrdHJhbnNmb3JtYXRpb25zLmxlbmd0aCk7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgwKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9UUkFOU0xBVEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCIpO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMSkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKHNoaWZ0WCwgc2hpZnRZKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpXG4gICAgaWYgKCghc2hpZnRYIHx8ICFzaGlmdFkpICYmIChzaGlmdFggIT0gMCAmJiBzaGlmdFkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGNhbm5vdCB0cmFuc2xhdGUgU1ZHIG9iamVjdCB3aXRoIG51bGwsIHVuZGVmaW5lZCwgb3IgZW1wdHkgc2hpZnQgdmFsdWVzLiBzaGlmdFg6IFwiK3NoaWZ0WCtcIiBzaGlmdFk6XCIrc2hpZnRZKTtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMCk7XG4gICAgaWYgKHRyYW5zbGF0aW9uLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIik7XG4gICAgdHJhbnNsYXRpb24uc2V0VHJhbnNsYXRlKHNoaWZ0WCwgc2hpZnRZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKHNjYWxlWCwgc2NhbGVZKSB7XG4gICAgdmFyIHNjYWxlID0gdGhpcy50cmFuc2Zvcm1hdGlvbnMoKS5nZXRJdGVtKDEpO1xuICAgIGlmIChzY2FsZS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIik7XG4gICAgc2NhbGUuc2V0U2NhbGUoc2NhbGVYLCBzY2FsZVkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuZmFkZSA9IGZ1bmN0aW9uIChvcGFjaXR5KSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwib3BhY2l0eVwiLCBvcGFjaXR5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwidmlzaWJpbGl0eVwiLCBcInZpc2libGVcIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5lZGl0U1ZHID0gZWRpdFNWRzsiLCJ2YXIgdHlwZWNoZWNrID0gcmVxdWlyZSgnLi90eXBlY2hlY2suanMnKS50eXBlY2hlY2s7XG5cbnZhciB0YWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbn07XG5cbnRhZy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnQgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuc2V0KCkgY2Fubm90IG92ZXJyaWRlIG5vbi1udWxsIGVsZW1lbnQgd2l0aCBuZXcgZWxlbWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICByZXR1cm4gdGhpcztcbn1cblxudGFnLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGUoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmNyZWF0ZU5TID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZCh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuY3JlYXRlTlMoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChpZCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnNlbGVjdCgpIG11c3QgaGF2ZSBhbiBgaWRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGF0dHIpIHx8IHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hdHRyaWJ1dGUoKSBtdXN0IGhhdmUgYGF0dHJgIGFuZCBgdmFsdWVgIGFyZ3VtZW50cy5cIik7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGNoaWxkKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYXBwZW5kKCkgbXVzdCBoYXZlIGEgYGNoaWxkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5wbGFjZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5wbGFjZSgpIG11c3QgaGF2ZSBhIGBwYXJlbnRgIGFyZ3VtZW50LlwiKTtcbiAgICBwYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQocGFyZW50KSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkucmVtb3ZlKCkgbXVzdCBoYXZlIGEgYHBhcmVudGAgYXJndW1lbnQuXCIpO1xuICAgIHBhcmVudC5lbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG59O1xuXG50YWcucHJvdG90eXBlLmFkZEhSRUYgPSBmdW5jdGlvbiAoaHJlZikge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGhyZWYpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hZGRIUkVGKCkgbXVzdCBoYXZlIGEgYGhyZWZgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnRhZyA9IHRhZztcbiIsIi8qVXRpbHMgZm9yIHR5cGVjaGVja2luZy4qL1xudmFyIHR5cGVjaGVjayA9IHtcbiAgICBudWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJ1bmRlZmluZWRcIiB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMudHlwZWNoZWNrID0gdHlwZWNoZWNrOyJdfQ==
