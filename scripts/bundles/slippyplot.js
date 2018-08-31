(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;
var plot = require('./model/plot.js').plot;
var gui = require('./ui/gui.js').gui;
var handlers = require('./ui/handlers.js').handlers;
var hover = require('./ui/hover.js').hover;

function init(jsonFilePath) {

    // load information about each plot (id, title, url, min/max zoom, size)
    function _loadPlotDataFromJSON(data) {
        var plotData = {};
        for (var i = 0; i < data.length; i++) {
            var info = data[i];
            plotData[info.id] = info;
            gui.plotURLs[info.id] = info.url;
        }
        return plotData;
    }

    // initialize fuse.js searchbar with data from plots
    function _initializeFuse(plotData) {
        search(Object.values(plotData));
    }

    // add widget 
    function _addWidget() {
        var widget = setup.setUpWidget(selectors.ids.widgetDiv, selectors.ids.widget, 1124, 350, '#e8ebef');
        setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);
    }

    // add images and set up each plot
    function _addPlots(plotData) {
        // add images and initialize each plot
        Object.keys(plotData).map(function (key) {
            setup.insertPlotImages(plotData[key].title, plotData[key].minZoom,
                plotData[key].maxZoom, plotData[key].url, plotData[key].tileWidth,
                plotData[key].tileHeight);
            plot.addPlotByName(key, plotData[key].title, plotData[key].minZoom,
                plotData[key].maxZoom, plotData[key].url);
        });
    }

    // set up default plot for model
    function _setDefaultPlot(id) {
        plot.switchPlots(id);
        gui.render(plot.getInfoForGUI());
    }

    function _setUpEventListeners() {
        // set up listeners
        handlers.listenForDrag(document.getElementById(selectors.ids.plot));
        document.getElementById(selectors.ids.plot).addEventListener("wheel", handlers.onWheel);
        document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
        document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);

        // hover listener
        hover.insertTextbox(selectors.ids.plot);
        //hover.insertTextbox('widget');
        document.getElementById(selectors.ids.plot).addEventListener('mousemove', hover.hoverListener);
    }

    $.getJSON(jsonFilePath, function (data) {
        var plotData = _loadPlotDataFromJSON(data);
        _initializeFuse(plotData);
        _addWidget();
        _addPlots(plotData);
        _setDefaultPlot(2);
        _setUpEventListeners();
    });
}

// this filepath is relative to html page
init("../scripts/src/slippyplot.json");
},{"./model/plot.js":2,"./ui/gui.js":3,"./ui/handlers.js":4,"./ui/hover.js":5,"./ui/search.js":6,"./ui/setup.js":7,"./utils/selectors.js":10}],2:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("../utils/position.js").position;

/*Stores information about the currently visible plot. */
var plot = (function () {
    var plotsByName = {
        // id: {id: , title: , minZoom: , maxZoom},
    }

    var plotID = null, // id number of plot (phenotype)
        minimumLevel = null, // minimum zoom level available for this plot
        maximumLevel = null, // max zoom level available for this plot
        scaleFactor = 10000, /* multiplication factor for scales, e.g. scale of 1.5 is converted to 15000 to help with floating point errors in javascript */
        zoomIncrement = 5, /* amount to change zoom by each time zoom handler is called */
        scaleRangeInWhichHigherZoomLayerIsTransparent = [6000, 9000], // zoom layer on top fades in between .6 and .9 scale
        scaleRangeInWhichLowerZoomLayerIsTransparent = [12000, 18000], // zoom layer on bottom fades out between 1.2 and 1.8 scale
        visibles = {}, // list of currently visible layers (only 2 at a time)
        hiddens = new Set([]), // set of currently hidden layers
        dimensions = {}; // pixel dimensions of each layer


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

    function addPlotByName(id, title, minZoom, maxZoom, url) {
        plotsByName[id] = { id: id, title: title, minZoom: minZoom, maxZoom: maxZoom, url: url};
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

    function switchPlots(id) {
        reset();
        plotID = id;
        var minZoom = plotsByName[id].minZoom,
            maxZoom = plotsByName[id].maxZoom;
        setMinMaxLevel(minZoom, maxZoom);

        // TODO: width and height of plot should be flexible here by making tile size 256*256 a parameter
        var nCols = function (z) { return Math.pow(2, z); }
        initializeVisible(minZoom, { width: nCols(minZoom) * 256, height: 256 });
        for (var i = minZoom + 1; i < maxZoom + 1; i++) {
            initializeHidden(i, { width: nCols(i) * 256, height: 256 });
        }
    }

    // convert scale proper units [0,1] for setting scale on html page
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

    // opacity of zoom layer is based on its scale
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
            plotName: plotsByName[plotID].title,
            plotID: plotID,
            visibleLayers: listOfVisibles,
            hiddenLevels: listOfHiddens,
            dimensions: getDimensions(),
            tilesInView: getTilesInViewOfAllVisibleLevels(Object.keys(visibles)),
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

    /*Incremental zoom. Zoom in/out by 'vertical' amount. */
    function zoom(focus, vertical) {
        var firstKey = Object.keys(visibles)[0],
            first = visibles[firstKey],
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;

        // calculate % coordinate of mouse position before zooming in
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

        // get a new top left position so that the mouse is positioned at the same % coordinate as it was before the zoom
        var newTopLeft = position.percentageToTopLeft(focus, percentageCoordinates, unitScale(newFirst.scale), newWidth, newHeight);
        reposition(newTopLeft);
        resetOpacities();
    }

    /* snaps zoom all the way to the next level where scale=1 */
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

    /* snaps zoom all the way to the previous level where scale=1 */
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

    function getTilesInView(level, topLeft, scale, width, height, nCols) {
        // get plot coordinate of top left corner of viewing window 
        var percentageCoordinates = position.topLeftToPercentage({x:0,y:0}, topLeft, scale, width, height);
        var topLeftPercent = percentageCoordinates.x;
        // get visible tiles
        var firstTileInView = Math.floor(topLeftPercent * nCols);

        // only necessary if plot is allowed to scroll outside the left/right bounds
        if (firstTileInView < 0) {
            firstTileInView = 0;
        } else if (firstTileInView > nCols-1) {
            firstTileInView = nCols-1;
        }


        var tilesInView = []
        if (firstTileInView > 1) {
            // add tiles to the left even if not showing
            tilesInView.push(firstTileInView-2);
            tilesInView.push(firstTileInView-1);
        } else if (firstTileInView > 0) {
            tilesInView.push(firstTileInView-1);
        }
        var t = firstTileInView;
        for (var i = 0; i < 6; i++) { // add more tiles than will actually be visible
            if (t < nCols) {
                tilesInView.push(t);
            }
            t++;
        }
        return tilesInView;
    }

    function getTilesInViewOfAllVisibleLevels(levels) {
        var tilesInView = {};
        for (var i = 0; i < levels.length; i++) {
            var key = levels[i];
            var topLeft = visibles[key].topLeft,
                scale = unitScale(visibles[key].scale),
                width = dimensions[key].width,
                height = dimensions[key].height,
                nCols = Math.pow(2, key);
            tilesInView[key] = getTilesInView(key, topLeft, scale, width, height, nCols); 
        }
        return tilesInView;
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
        getTilesInViewOfAllVisibleLevels: getTilesInViewOfAllVisibleLevels,
        _hide: hide,
        _show: show,
        _calculateOpacity: calculateOpacity,
        _mapValueOntoRange: mapValueOntoRange,
    };
}());

module.exports.plot = plot;
},{"../utils/position.js":8,"../utils/schema.js":9}],3:[function(require,module,exports){
var editSVG = require('../utils/svg.js').editSVG;
var schema = require('../utils/schema.js').schema;
var tag = require('../utils/tag.js').tag;
var setup = require('../ui/setup.js').setup;
var selectors = require('../utils/selectors.js').selectors;

/*Render plot images on page.*/

var gui = {
    plotURLs: {
        // 0: '/path/to/images',
    },
    hide: function(plotName) {
        new tag().select(plotName).attribute('display', 'none');
    },
    addTileIfNotExists: function(plotName, level, column, url, imageWidth, imageHeight) {
        var tileID = selectors.ids.tileID(plotName, level, column)
        var tile = document.getElementById(tileID);
        if (tile === null) {
            setup.addTile(plotName, level, column, url, imageWidth, imageHeight);
        }
    },
    render: function (args) {
        schema.check(args, ['plotName', 'visibleLayers', 'hiddenLevels', 'dimensions', 'tilesInView']);
        var plotName = args.plotName,
            plotID = args.plotID,
            visibleLayers = args.visibleLayers,
            hiddenLevels = args.hiddenLevels,
            dims = args.dimensions
            tilesInView = args.tilesInView;

        // add images in view to page, if they need to be added
        var levelsInView = Object.keys(tilesInView);
        var url = gui.plotURLs[plotID];
        for (var i = 0; i < levelsInView.length; i++) {
            var columnsInView = tilesInView[levelsInView[i]];
            for (var c = 0; c < columnsInView.length; c++) {
                this.addTileIfNotExists(plotName, levelsInView[i], columnsInView[c], url, 256, 256);
            }
        }

        new tag().select(plotName).attribute('display', 'inline');

        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            throw new Error("Must have 1-2 visible layers.");
        }

        for (var hiddenIndex in hiddenLevels) {
            var level = hiddenLevels[hiddenIndex];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw new Error("GUI ERROR: expected a list of numbers for hiddenLayers.");
            }
            new editSVG().set(plotName, level).hide();
        }

        for (var visibleIndex in visibleLayers) {
            var layer = visibleLayers[visibleIndex];
            if (!schema.layer(layer)) throw new Error("GUI: expected layer schema.");
            if (layer.scale.x > 2 || layer.scale.x < .5 || layer.scale.y > 2 || layer.scale.y < .5) {
                throw new Error("GUI: scale outside [.5,2] range. Scale should be converted to [.5,2] before being passed to GUI. [" + layer.scale.x + ", " + layer.scale.y + "]");
            }

            var svgBundle = new editSVG().set(plotName, layer.level);
            
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

        // these are just for displaying which zoom level is visible, and the fractional zoom and opacity of the visible layers
        // can be deleted
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
        $("#opacity-div").text(opacityString);
    },
};

module.exports.gui = gui;
},{"../ui/setup.js":7,"../utils/schema.js":9,"../utils/selectors.js":10,"../utils/svg.js":11,"../utils/tag.js":12}],4:[function(require,module,exports){
var plot = require('../model/plot.js').plot;
var gui = require('../ui/gui.js').gui;

/* Event handlers:
- dragging plot with mouse
- pressing on the zoom in/out buttons
- zooming in/out with mouse wheel
*/
var handlers = {
    currentlyZoomingInWithButton: false,
    currentlyZoomingOutWithButton: false,

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
            // zoom in/out if user scrolls up/down on mousepad
            var svg = document.getElementById("plot");
            var mousePos = handlers.getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
            plot.zoom(mousePos, vertical);
        } else {
            // shift plot left/right if user scrolls left/right on mousepad
            // TODO: should stop this from being called immediately after/during zoom actions, because it looks bad-ish if user accidentally scrolls horizontally when trying to zoom
            plot.drag({ x: horizontal, y: 0 });
        }

        handlers.callGUI();
    },

    onButtonClickZoomIn: function () {
        plot.zoom({ x: 512, y: 128 }, -5);
        var interval = setInterval(function () {
            try {
                if (!handlers.currentlyZoomingOutWithButton) {
                    if (plot.snapIn({ x: 512, y: 128 })) {
                        handlers.currentlyZoomingInWithButton = false;
                        clearInterval(interval);
                    } else {
                        handlers.currentlyZoomingInWithButton = true;
                        handlers.callGUI();
                    }
                } else {
                    clearInterval(interval);
                }
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
                if (!handlers.currentlyZoomingInWithButton) {
                    if (plot.snapOut({ x: 512, y: 128 })) {
                        handlers.currentlyZoomingOutWithButton = false;
                        clearInterval(interval);
                    } else {
                        handlers.currentlyZoomingOutWithButton = true;
                        handlers.callGUI();
                    }
                } else {
                    clearInterval(interval);
                }
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    },
};

module.exports.handlers = handlers;
},{"../model/plot.js":2,"../ui/gui.js":3}],5:[function(require,module,exports){
var typecheck = require('../utils/typecheck.js').typecheck;
var position = require("../utils/position.js").position;
var plot = require('../model/plot.js').plot;

/* Hover data.

Display metadata when mouse hovers over point by fetching the metadata from json files.*/
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
        textbox.setAttribute('overflow', 'visible');
        //hoverArea.appendChild(textbox);
        document.getElementById('widget').appendChild(textbox);
    
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

        // offset of plot svg inside widget svg
        x = x+50;
        y = y+30;

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
        var res = _getFirstPlotLayerInfo();
        var topLeft = res[0], scale = res[1], width = res[2], height = res[3];
        
        var percentageCoordinates = position.topLeftToPercentage({x: x, y: y}, topLeft, scale, width, height);
        var pixelCoordinates = {x: percentageCoordinates.x * width, y: percentageCoordinates.y * height};
        
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
        for (var i = 0; i< points.length; i++) {
            var pixelPoint = {x: plot._mapValueOntoRange(points[i].gp, [x_axis_range[0], x_axis_range[1]], [0,width]), 
                y: plot._mapValueOntoRange(points[i].nlp, [y_axis_range[0], y_axis_range[1]], [height,0])};

            if (Math.abs(graphCoords.x - pixelPoint.x) < 2 && Math.abs(graphCoords.y - pixelPoint.y) < 2) {
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

            var url = plot.getPlotsByName()[plot.getPlotID()].url;
            var metadata_url = url + "/metadata.json";
            $.getJSON(metadata_url, function(data) {
                x_axis_range = data.x_axis_range;
                y_axis_range = data.y_axis_range;

                var res = _getFirstPlotLayerInfo();
                var topLeft = res[0], scale = res[1], width = res[2], height = res[3], zoomLevel = res[4], nCols = res[5];
                $.getJSON(url+"/"+zoomLevel+'/hover.json', function (data) {
                    var tilesWithHoverData = new Set(data);
                    var points = [];
                    var tilesInView = _getTilesInView(topLeft, scale, width, height, nCols);
                    for (var i = 0; i<tilesInView.length; i++) {
                        if (tilesWithHoverData.has(tilesInView[i])) {
                            $.getJSON(url+"/"+zoomLevel+'/'+tilesInView[i]+'.json', function (data) {
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
},{"../model/plot.js":2,"../utils/position.js":8,"../utils/typecheck.js":13}],6:[function(require,module,exports){
var plot = require('../model/plot.js').plot;
var gui = require('../ui/gui.js').gui;

/* 
Search bar for displaying results of query.

dependency: fuse.js
*/
var search = function (phenotypes) {

    var results = []; // result from search query
    var focus = 1; // n-th row of results table we're focused on

    // fuse.js options
    var options = {
        shouldSort: true,
        includeScore: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
            "title"
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
                        //switchPlots(query);
                        switchPlots(res[0].item.id);
                        return;
                    }
                }
                console.log("no match");
            }
        }
    }

    // change highlighted row in results table when up/down arrows are used
    function searchBarKeyDown(e) {
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

    function switchPlots(plotID) {
        // change visible plot
        var oldPlotID = plot.getPlotID(); // id number
        plot.switchPlots(plotID);
        gui.hide(plot.getPlotsByName()[oldPlotID].title);
        gui.render(plot.getInfoForGUI());
    }

    $('#searchbar').on('keyup', searchBarKeyUp);
    $('#searchbar').on('keypress', searchBarKeyPress);
    $('#searchbar').on('keydown', searchBarKeyDown);
};

module.exports.search = search;
},{"../model/plot.js":2,"../ui/gui.js":3}],7:[function(require,module,exports){
var tag = require('../utils/tag.js').tag;
var selectors = require('../utils/selectors.js').selectors;

/*Set up SVG DOM elements on page.

Plot consists of:

<svg id='widget'> widget element
    <rect> background for widget
    <svg id='plot'> plot element which is the viewing window for the images (size of this determines what is visible)
        <rect> background for plot
        <g> group for each plot (phenotype) (used to hide / show plots)
            <g> group for each zoom layer (all tiles will inherit properties on g, so it is used for scaling, positioning, fading)
                <svg> svg for each zoom layer (need a <svg> inside the <g> because <g> elements do not have a concept of size)
                    <image>
                    <image>
                    <image>
                    ...
    <svg id='textbox'> textbox element for displaying hover data
    
Notes:
    - textbox element should be inside widget, but not inside plot <svg>, so that the overflow shows when hovering over a point at the edge of the plot
*/

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

    /* place a zoom layer group <g><svg></svg></g> inside a plot's <g> */
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

    function addTile(plotName, level, column, url, imageWidth, imageHeight) {
        var tileURL = url + "/" + level + "/" + column + ".png";

        var x = column * imageWidth;
        var y = 0;
        var width = imageWidth;
        var height = imageHeight;

        var svg = new tag().select(selectors.ids.svgLayer(plotName, level));

        //create tile
        new tag()
            .createNS('image')
            .attribute('x', String(x))
            .attribute('y', String(y))
            .attribute('width', String(width))
            .attribute('height', String(height))
            .attribute('id', selectors.ids.tileID(plotName, level, column))
            .addHREF(tileURL)
            .place(svg);
    };

    function _addTiles(plotID, level, url, imageWidth, imageHeight) {
        var columns = Math.pow(2, level);
        var x = 0;
        for (var c = 0; c < columns; c++) {
            addTile(plotID, level, c, url, imageWidth, imageHeight);
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

            // this is used to add all images to page on setup, rather than adding images on demand
            //_addTiles(plotID, i, url, imageWidth, imageHeight);
        }
    }

    return {
        setUpWidget: setUpWidget,
        setUpPlot: setUpPlot,
        insertPlotImages: insertPlotImages,
        addTile: addTile,
    }
}());

module.exports.setup = setup;
},{"../utils/selectors.js":10,"../utils/tag.js":12}],8:[function(require,module,exports){

/*Helpers for converting a particular position within
the viewing window to a percentage coordinate within the actual plot. 

e.g. a plot of size 1024 * 256 and a mouse position of (512,128) would
give a % coordinate of (50%,50%) assuming that the plot is at position
(0,0) and scale(1,1). 

A plot of size 2048 * 256 with position (-512, 0) and scale(1,1), and mouse position 
(512, 128) would also give a % coordinate of (50%, 50%).

Plot layers (<g> elements) are positioned by their top left coordinate.
When zooming in and out, the plots need to be repositioned each time
they are re-scaled, so that the mouse position stays at approximately the same
coordinate in the plot. Before zooming, a percent position of the mouse is calculated.
After zooming, the percent position is re-converted to a topLeft coordinate
at the new zoom level of the plot. */
var position = {
    calculatePercent: function (positionA, positionB, lengthB, scaleB) {
        if (lengthB <= 0) throw new Error("Length must be positive.");
        return (positionA - positionB) / (lengthB * scaleB);
    },
    calculatePosition: function (positionA, percentB, lengthB, scaleB) {
        return positionA - ((lengthB * scaleB) * percentB);
    },
    /* focus: mouse position
    topLeft: top left coordinate of plot layer
    scale: scale of plot layer
    width: width of plot layer
    height: height of plot layer*/
    topLeftToPercentage: function (focus, topLeft, scale, width, height) {
        return {
            x: position.calculatePercent(focus.x, topLeft.x, width, scale.x),
            y: position.calculatePercent(focus.y, topLeft.y, height, scale.y),
        };
    },
    /* percentage: percentage coordinates of the current focus */
    percentageToTopLeft: function (focus, percentage, scale, width, height) {
        return {
            x: position.calculatePosition(focus.x, percentage.x, width, scale.x),
            y: position.calculatePosition(focus.y, percentage.y, height, scale.y),
        };
    }
};

module.exports.position = position;
},{}],9:[function(require,module,exports){
/*Check that schema/fields of an object literal
are the expected fields. */
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
/*Store constants for html selectors (classes and ids) */
var selectors = {
    ids: {
        widgetDiv: 'widget-div',
        widget: 'widget',
        plot: 'plot',
        group: function (plotID, level) {
            return plotID+"-group-layer"+level;
        },
        svgLayer: function (plotID, level) {
            return plotID+"-svg-layer"+level;
        },
        tileID: function(plotID, level, column) {
            return "tile-"+plotID+"-level"+level+"-column"+column;
        }
    },
};

module.exports.selectors = selectors;
},{}],11:[function(require,module,exports){
var selectors = require('./selectors.js').selectors;

/*Manipulate svg zoom levels.*/
var editSVG = function () {
    this.layer; // <g> element for a zoom level
    this.plot; // <svg id='plot> element (plot viewing window)
};

/* Initialize  */
editSVG.prototype.set = function (plotID, level) {
    // <g>
    this.layer = document.getElementById(selectors.ids.group(plotID, level));
    // svg viewing window for plots
    this.plot = document.getElementById(selectors.ids.plot);
    // <svg> inside the <g>
    this.innerContainer = document.getElementById(selectors.ids.svgLayer(plotID, level));
    return this;
};

editSVG.prototype.dimensions = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    if (!this.innerContainer) throw new Error('editSVG: innerContainer must be initialized');
    //return [this.innerContainer.getBBox().width, this.innerContainer.getBBox().height];
    return [this.innerContainer.width.baseVal.value, this.innerContainer.height.baseVal.value];
}

/*Get list of transformations for a <g> zoom level.

Transformations list should always contain 2 items only: a translate(x,y) and a scale(x,y).
When layers are manipulated (moved and scaled), these transforms should be edited in place.*/
editSVG.prototype.transformations = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    
    var transformations = this.layer.transform.baseVal;
    if (!transformations.length || transformations.length === 0) {
        // if transformations list is empty, create it
        var translate = this.plot.createSVGTransform();
        translate.setTranslate(0, 0);
        this.layer.transform.baseVal.insertItemBefore(translate, 0);

        var scale = this.plot.createSVGTransform();
        scale.setScale(1.0, 1.0);
        this.layer.transform.baseVal.insertItemBefore(scale, 1);
    } else {
        // if transforms is not empty, double check that there are only 2 transforms
        if (transformations.length !== 2) throw new Error("editSVG: expected transformations to be a list of length 2, not"+transformations.length);
        if (transformations.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw new Error("editSVG: first transform is not a Translate.");
        if (transformations.getItem(1).type !== SVGTransform.SVG_TRANSFORM_SCALE) throw new Error("editSVG: transform is not a Scale.");
    }
    return this.layer.transform.baseVal;
};

/*Edit the position of a <g> layer */
editSVG.prototype.translate = function (shiftX, shiftY) {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.")
    if ((!shiftX || !shiftY) && (shiftX != 0 && shiftY != 0)) throw new Error("editSVG: cannot translate SVG object with null, undefined, or empty shift values. shiftX: "+shiftX+" shiftY:"+shiftY);
    var translation = this.transformations().getItem(0);
    if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw new Error("editSVG: first transform is not a Translate.");
    translation.setTranslate(shiftX, shiftY);
    return this;
};

/* Edit the scale of a <g> layer */
editSVG.prototype.scale = function (scaleX, scaleY) {
    var scale = this.transformations().getItem(1);
    if (scale.type !== SVGTransform.SVG_TRANSFORM_SCALE) throw new Error("editSVG: second transform is not a Scale.");
    scale.setScale(scaleX, scaleY);
    return this;
};

/* Edit the opacity of a <g> layer */
editSVG.prototype.fade = function (opacity) {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("opacity", opacity);
    return this;
};

/* Hide layer */
editSVG.prototype.hide = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("visibility", "hidden");
    return this;
};

/* Show layer */
editSVG.prototype.show = function () {
    if (!this.layer || !this.plot) throw new Error("editSVG: layer and plot must be initialized.");
    this.layer.setAttribute("visibility", "visible");
    return this;
};

module.exports.editSVG = editSVG;
},{"./selectors.js":10}],12:[function(require,module,exports){
var typecheck = require('./typecheck.js').typecheck;

/*For manipulating DOM elements. Methods can be chained.

JQuery is made for the HTML DOM, so it isn't compatible with SVG DOM.
These are a few helper functions to replace some jquery functionality.
Could replace these with d3 if desired.*/
var tag = function () {
    this.element = null;
};

// initialize 
tag.prototype.set = function(element) {
    if (this.element != null) throw new Error("tag().set() cannot override non-null element with new element.");
    this.element = element;
    return this;
}

/* Create generic html dom element; don't use for svg */
tag.prototype.create = function (type) {
    if (typecheck.nullOrUndefined(type)) throw new Error("tag().create() must have a `type` argument.");
    this.element = document.createElement(type);
    return this;
};

/* SVG elements must be created with additional namespace. */
tag.prototype.createNS = function (type) {
    if (typecheck.nullOrUndefined(type)) throw new Error("tag().createNS() must have a `type` argument.");
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

// select element by id
tag.prototype.select = function (id) {
    if (typecheck.nullOrUndefined(id)) throw new Error("tag().select() must have an `id` argument.");
    this.element = document.getElementById(id);
    return this;
};

// set attribute of element to value
tag.prototype.attribute = function (attr, value) {
    if (typecheck.nullOrUndefined(attr) || typecheck.nullOrUndefined(value)) throw new Error("tag().attribute() must have `attr` and `value` arguments.");
    this.element.setAttribute(attr, value);
    return this;
};

/*Append child element to this element. */
tag.prototype.append = function (child) {
    if (typecheck.nullOrUndefined(child)) throw new Error("tag().append() must have a `child` argument.");
    this.element.appendChild(child.element);
    return this;
};

/* Append this element to parent element */
tag.prototype.place = function (parent) {
    if (typecheck.nullOrUndefined(parent)) throw new Error("tag().place() must have a `parent` argument.");
    parent.element.appendChild(this.element);
    return this;
};

// remove this element from parent element
tag.prototype.remove = function (parent) {
    if (typecheck.nullOrUndefined(parent)) throw new Error("tag().remove() must have a `parent` argument.");
    parent.element.removeChild(this.element);
};

/*image link for a svg image must be set with the setAttributeNS method, unlike html */
tag.prototype.addHREF = function (href) {
    if (typecheck.nullOrUndefined(href)) throw new Error("tag().addHREF() must have a `href` argument.");
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
};

module.exports.tag = tag;

},{"./typecheck.js":13}],13:[function(require,module,exports){
/*Util for typechecking if a value is null or undefined.*/
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvc3JjL21haW4uanMiLCJzY3JpcHRzL3NyYy9tb2RlbC9wbG90LmpzIiwic2NyaXB0cy9zcmMvdWkvZ3VpLmpzIiwic2NyaXB0cy9zcmMvdWkvaGFuZGxlcnMuanMiLCJzY3JpcHRzL3NyYy91aS9ob3Zlci5qcyIsInNjcmlwdHMvc3JjL3VpL3NlYXJjaC5qcyIsInNjcmlwdHMvc3JjL3VpL3NldHVwLmpzIiwic2NyaXB0cy9zcmMvdXRpbHMvcG9zaXRpb24uanMiLCJzY3JpcHRzL3NyYy91dGlscy9zY2hlbWEuanMiLCJzY3JpcHRzL3NyYy91dGlscy9zZWxlY3RvcnMuanMiLCJzY3JpcHRzL3NyYy91dGlscy9zdmcuanMiLCJzY3JpcHRzL3NyYy91dGlscy90YWcuanMiLCJzY3JpcHRzL3NyYy91dGlscy90eXBlY2hlY2suanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgc2VhcmNoID0gcmVxdWlyZSgnLi91aS9zZWFyY2guanMnKS5zZWFyY2g7XG52YXIgc2V0dXAgPSByZXF1aXJlKCcuL3VpL3NldHVwLmpzJykuc2V0dXA7XG52YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi91dGlscy9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4vbW9kZWwvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi91aS9ndWkuanMnKS5ndWk7XG52YXIgaGFuZGxlcnMgPSByZXF1aXJlKCcuL3VpL2hhbmRsZXJzLmpzJykuaGFuZGxlcnM7XG52YXIgaG92ZXIgPSByZXF1aXJlKCcuL3VpL2hvdmVyLmpzJykuaG92ZXI7XG5cbmZ1bmN0aW9uIGluaXQoanNvbkZpbGVQYXRoKSB7XG5cbiAgICAvLyBsb2FkIGluZm9ybWF0aW9uIGFib3V0IGVhY2ggcGxvdCAoaWQsIHRpdGxlLCB1cmwsIG1pbi9tYXggem9vbSwgc2l6ZSlcbiAgICBmdW5jdGlvbiBfbG9hZFBsb3REYXRhRnJvbUpTT04oZGF0YSkge1xuICAgICAgICB2YXIgcGxvdERhdGEgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaW5mbyA9IGRhdGFbaV07XG4gICAgICAgICAgICBwbG90RGF0YVtpbmZvLmlkXSA9IGluZm87XG4gICAgICAgICAgICBndWkucGxvdFVSTHNbaW5mby5pZF0gPSBpbmZvLnVybDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGxvdERhdGE7XG4gICAgfVxuXG4gICAgLy8gaW5pdGlhbGl6ZSBmdXNlLmpzIHNlYXJjaGJhciB3aXRoIGRhdGEgZnJvbSBwbG90c1xuICAgIGZ1bmN0aW9uIF9pbml0aWFsaXplRnVzZShwbG90RGF0YSkge1xuICAgICAgICBzZWFyY2goT2JqZWN0LnZhbHVlcyhwbG90RGF0YSkpO1xuICAgIH1cblxuICAgIC8vIGFkZCB3aWRnZXQgXG4gICAgZnVuY3Rpb24gX2FkZFdpZGdldCgpIHtcbiAgICAgICAgdmFyIHdpZGdldCA9IHNldHVwLnNldFVwV2lkZ2V0KHNlbGVjdG9ycy5pZHMud2lkZ2V0RGl2LCBzZWxlY3RvcnMuaWRzLndpZGdldCwgMTEyNCwgMzUwLCAnI2U4ZWJlZicpO1xuICAgICAgICBzZXR1cC5zZXRVcFBsb3Qod2lkZ2V0LCBzZWxlY3RvcnMuaWRzLnBsb3QsIDEwMjQsIDI1NiwgNTAsIDMwKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgaW1hZ2VzIGFuZCBzZXQgdXAgZWFjaCBwbG90XG4gICAgZnVuY3Rpb24gX2FkZFBsb3RzKHBsb3REYXRhKSB7XG4gICAgICAgIC8vIGFkZCBpbWFnZXMgYW5kIGluaXRpYWxpemUgZWFjaCBwbG90XG4gICAgICAgIE9iamVjdC5rZXlzKHBsb3REYXRhKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgc2V0dXAuaW5zZXJ0UGxvdEltYWdlcyhwbG90RGF0YVtrZXldLnRpdGxlLCBwbG90RGF0YVtrZXldLm1pblpvb20sXG4gICAgICAgICAgICAgICAgcGxvdERhdGFba2V5XS5tYXhab29tLCBwbG90RGF0YVtrZXldLnVybCwgcGxvdERhdGFba2V5XS50aWxlV2lkdGgsXG4gICAgICAgICAgICAgICAgcGxvdERhdGFba2V5XS50aWxlSGVpZ2h0KTtcbiAgICAgICAgICAgIHBsb3QuYWRkUGxvdEJ5TmFtZShrZXksIHBsb3REYXRhW2tleV0udGl0bGUsIHBsb3REYXRhW2tleV0ubWluWm9vbSxcbiAgICAgICAgICAgICAgICBwbG90RGF0YVtrZXldLm1heFpvb20sIHBsb3REYXRhW2tleV0udXJsKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IHVwIGRlZmF1bHQgcGxvdCBmb3IgbW9kZWxcbiAgICBmdW5jdGlvbiBfc2V0RGVmYXVsdFBsb3QoaWQpIHtcbiAgICAgICAgcGxvdC5zd2l0Y2hQbG90cyhpZCk7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9zZXRVcEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgICAvLyBzZXQgdXAgbGlzdGVuZXJzXG4gICAgICAgIGhhbmRsZXJzLmxpc3RlbkZvckRyYWcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5wbG90KSk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCkuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGhhbmRsZXJzLm9uV2hlZWwpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20taW4tYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbUluKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLW91dC1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZXJzLm9uQnV0dG9uQ2xpY2tab29tT3V0KTtcblxuICAgICAgICAvLyBob3ZlciBsaXN0ZW5lclxuICAgICAgICBob3Zlci5pbnNlcnRUZXh0Ym94KHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgICAgIC8vaG92ZXIuaW5zZXJ0VGV4dGJveCgnd2lkZ2V0Jyk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgaG92ZXIuaG92ZXJMaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgJC5nZXRKU09OKGpzb25GaWxlUGF0aCwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHBsb3REYXRhID0gX2xvYWRQbG90RGF0YUZyb21KU09OKGRhdGEpO1xuICAgICAgICBfaW5pdGlhbGl6ZUZ1c2UocGxvdERhdGEpO1xuICAgICAgICBfYWRkV2lkZ2V0KCk7XG4gICAgICAgIF9hZGRQbG90cyhwbG90RGF0YSk7XG4gICAgICAgIF9zZXREZWZhdWx0UGxvdCgyKTtcbiAgICAgICAgX3NldFVwRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB9KTtcbn1cblxuLy8gdGhpcyBmaWxlcGF0aCBpcyByZWxhdGl2ZSB0byBodG1sIHBhZ2VcbmluaXQoXCIuLi9zY3JpcHRzL3NyYy9zbGlwcHlwbG90Lmpzb25cIik7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuLi91dGlscy9wb3NpdGlvbi5qc1wiKS5wb3NpdGlvbjtcblxuLypTdG9yZXMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnRseSB2aXNpYmxlIHBsb3QuICovXG52YXIgcGxvdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBsb3RzQnlOYW1lID0ge1xuICAgICAgICAvLyBpZDoge2lkOiAsIHRpdGxlOiAsIG1pblpvb206ICwgbWF4Wm9vbX0sXG4gICAgfVxuXG4gICAgdmFyIHBsb3RJRCA9IG51bGwsIC8vIGlkIG51bWJlciBvZiBwbG90IChwaGVub3R5cGUpXG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGwsIC8vIG1pbmltdW0gem9vbSBsZXZlbCBhdmFpbGFibGUgZm9yIHRoaXMgcGxvdFxuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsLCAvLyBtYXggem9vbSBsZXZlbCBhdmFpbGFibGUgZm9yIHRoaXMgcGxvdFxuICAgICAgICBzY2FsZUZhY3RvciA9IDEwMDAwLCAvKiBtdWx0aXBsaWNhdGlvbiBmYWN0b3IgZm9yIHNjYWxlcywgZS5nLiBzY2FsZSBvZiAxLjUgaXMgY29udmVydGVkIHRvIDE1MDAwIHRvIGhlbHAgd2l0aCBmbG9hdGluZyBwb2ludCBlcnJvcnMgaW4gamF2YXNjcmlwdCAqL1xuICAgICAgICB6b29tSW5jcmVtZW50ID0gNSwgLyogYW1vdW50IHRvIGNoYW5nZSB6b29tIGJ5IGVhY2ggdGltZSB6b29tIGhhbmRsZXIgaXMgY2FsbGVkICovXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCA9IFs2MDAwLCA5MDAwXSwgLy8gem9vbSBsYXllciBvbiB0b3AgZmFkZXMgaW4gYmV0d2VlbiAuNiBhbmQgLjkgc2NhbGVcbiAgICAgICAgc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbMTIwMDAsIDE4MDAwXSwgLy8gem9vbSBsYXllciBvbiBib3R0b20gZmFkZXMgb3V0IGJldHdlZW4gMS4yIGFuZCAxLjggc2NhbGVcbiAgICAgICAgdmlzaWJsZXMgPSB7fSwgLy8gbGlzdCBvZiBjdXJyZW50bHkgdmlzaWJsZSBsYXllcnMgKG9ubHkgMiBhdCBhIHRpbWUpXG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKSwgLy8gc2V0IG9mIGN1cnJlbnRseSBoaWRkZW4gbGF5ZXJzXG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTsgLy8gcGl4ZWwgZGltZW5zaW9ucyBvZiBlYWNoIGxheWVyXG5cblxuICAgIGZ1bmN0aW9uIGdldFBsb3RJRCgpIHtcbiAgICAgICAgcmV0dXJuIHBsb3RJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQbG90c0J5TmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHBsb3RzQnlOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERpbWVuc2lvbnMoKSB7XG4gICAgICAgIHJldHVybiBkaW1lbnNpb25zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFZpc2libGVzKCkge1xuICAgICAgICByZXR1cm4gdmlzaWJsZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SGlkZGVucygpIHtcbiAgICAgICAgcmV0dXJuIGhpZGRlbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkUGxvdEJ5TmFtZShpZCwgdGl0bGUsIG1pblpvb20sIG1heFpvb20sIHVybCkge1xuICAgICAgICBwbG90c0J5TmFtZVtpZF0gPSB7IGlkOiBpZCwgdGl0bGU6IHRpdGxlLCBtaW5ab29tOiBtaW5ab29tLCBtYXhab29tOiBtYXhab29tLCB1cmw6IHVybH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHBsb3RJRCA9IG51bGw7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1pbk1heExldmVsKG1pbiwgbWF4KSB7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG1pbjtcbiAgICAgICAgbWF4aW11bUxldmVsID0gbWF4O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVWaXNpYmxlKGxldmVsLCBkaW1zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IG1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IG1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCB2aXNpYmxlIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogc2NhbGVGYWN0b3IsIHk6IDEgKiBzY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZUhpZGRlbihsZXZlbCwgZGltcykge1xuICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN3aXRjaFBsb3RzKGlkKSB7XG4gICAgICAgIHJlc2V0KCk7XG4gICAgICAgIHBsb3RJRCA9IGlkO1xuICAgICAgICB2YXIgbWluWm9vbSA9IHBsb3RzQnlOYW1lW2lkXS5taW5ab29tLFxuICAgICAgICAgICAgbWF4Wm9vbSA9IHBsb3RzQnlOYW1lW2lkXS5tYXhab29tO1xuICAgICAgICBzZXRNaW5NYXhMZXZlbChtaW5ab29tLCBtYXhab29tKTtcblxuICAgICAgICAvLyBUT0RPOiB3aWR0aCBhbmQgaGVpZ2h0IG9mIHBsb3Qgc2hvdWxkIGJlIGZsZXhpYmxlIGhlcmUgYnkgbWFraW5nIHRpbGUgc2l6ZSAyNTYqMjU2IGEgcGFyYW1ldGVyXG4gICAgICAgIHZhciBuQ29scyA9IGZ1bmN0aW9uICh6KSB7IHJldHVybiBNYXRoLnBvdygyLCB6KTsgfVxuICAgICAgICBpbml0aWFsaXplVmlzaWJsZShtaW5ab29tLCB7IHdpZHRoOiBuQ29scyhtaW5ab29tKSAqIDI1NiwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIGZvciAodmFyIGkgPSBtaW5ab29tICsgMTsgaSA8IG1heFpvb20gKyAxOyBpKyspIHtcbiAgICAgICAgICAgIGluaXRpYWxpemVIaWRkZW4oaSwgeyB3aWR0aDogbkNvbHMoaSkgKiAyNTYsIGhlaWdodDogMjU2IH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29udmVydCBzY2FsZSBwcm9wZXIgdW5pdHMgWzAsMV0gZm9yIHNldHRpbmcgc2NhbGUgb24gaHRtbCBwYWdlXG4gICAgZnVuY3Rpb24gdW5pdFNjYWxlKHNjYWxlKSB7XG4gICAgICAgIGlmICgoc2NhbGUueCA+IC41ICYmIHNjYWxlLnggPCAyKSB8fCAoc2NhbGUueSA+IC41ICYmIHNjYWxlLnkgPCAyKSkgdGhyb3cgbmV3IEVycm9yKCdzY2FsZSBhbHJlYWR5IGluIHVuaXQgc2NhbGUnKTtcbiAgICAgICAgcmV0dXJuIHsgeDogc2NhbGUueCAvIHNjYWxlRmFjdG9yLCB5OiBzY2FsZS55IC8gc2NhbGVGYWN0b3IgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93KGxldmVsLCB0b3BMZWZ0LCBzY2FsZSwgb3BhY2l0eSkge1xuICAgICAgICBpZiAoIWhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgbmV3IEVycm9yKFwiVHJpZWQgdG8gc2hvdyBhIGxldmVsIHRoYXQgd2FzIG5vdCBoaWRkZW4uXCIpO1xuICAgICAgICB2aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogdG9wTGVmdCwgc2NhbGU6IHNjYWxlLCBvcGFjaXR5OiBvcGFjaXR5IH07XG4gICAgICAgIGhpZGRlbnMuZGVsZXRlKGxldmVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoaWRlKGxldmVsKSB7XG4gICAgICAgIGlmICghdmlzaWJsZXNbbGV2ZWxdKSB0aHJvdyBuZXcgRXJyb3IoXCJUcmllZCB0byBoaWRlIGEgbGV2ZWwgdGhhdCBpcyBub3QgdmlzaWJsZVwiKTtcbiAgICAgICAgZGVsZXRlIHZpc2libGVzW2xldmVsXTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICB9XG5cbiAgICAvLyBvcGFjaXR5IG9mIHpvb20gbGF5ZXIgaXMgYmFzZWQgb24gaXRzIHNjYWxlXG4gICAgZnVuY3Rpb24gY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkge1xuICAgICAgICB2YXIgeFNjYWxlID0gc2NhbGUueDtcbiAgICAgICAgaWYgKHhTY2FsZSA8IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBoaWdoZXIgem9vbSBsZXZlbCAob24gdG9wIGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBtYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWy4yLCAxXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoeFNjYWxlID4gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggbG93ZXIgem9vbSBsZXZlbCAoYmVsb3cgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIG1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsxLCAuMl0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXBWYWx1ZU9udG9SYW5nZSh2YWx1ZSwgb2xkUmFuZ2UsIG5ld1JhbmdlKSB7XG4gICAgICAgIHZhciBvbGRTcGFuID0gb2xkUmFuZ2VbMV0gLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIG5ld1NwYW4gPSBuZXdSYW5nZVsxXSAtIG5ld1JhbmdlWzBdO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb1ZhbHVlID0gdmFsdWUgLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIHBlcmNlbnRTcGFuVG9WYWx1ZSA9IGRpc3RhbmNlVG9WYWx1ZSAvIG9sZFNwYW47XG4gICAgICAgIHZhciBkaXN0YW5jZVRvTmV3VmFsdWUgPSBwZXJjZW50U3BhblRvVmFsdWUgKiBuZXdTcGFuO1xuICAgICAgICB2YXIgbmV3VmFsdWUgPSBuZXdSYW5nZVswXSArIGRpc3RhbmNlVG9OZXdWYWx1ZTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9zaXRpb24obmV3VG9wTGVmdCkge1xuICAgICAgICBpZiAoKCFuZXdUb3BMZWZ0LnggJiYgbmV3VG9wTGVmdC54ICE9IDApIHx8ICghbmV3VG9wTGVmdC55ICYmIG5ld1RvcExlZnQueSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIG5ldyBUb3AgTGVmdDogW1wiICsgbmV3VG9wTGVmdC54ICsgXCIsIFwiICsgbmV3VG9wTGVmdC55ICsgXCJdXCIpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdCA9IG5ld1RvcExlZnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldE9wYWNpdGllcygpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLm9wYWNpdHkgPSBjYWxjdWxhdGVPcGFjaXR5KHZpc2libGVzW2tleV0uc2NhbGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0UGxvdElEKGlkKSB7XG4gICAgICAgIHBsb3RJRCA9IGlkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEluZm9Gb3JHVUkoKSB7XG4gICAgICAgIHZhciBsaXN0T2ZWaXNpYmxlcyA9IE9iamVjdC5rZXlzKHZpc2libGVzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgLy8gY29udmVydCBzY2FsZSBmb3IgcGFzc2luZyB0byBHVUk6IFxuICAgICAgICAgICAgdmFyIGd1aUxheWVyID0ge1xuICAgICAgICAgICAgICAgIGxldmVsOiB2aXNpYmxlc1trZXldLmxldmVsLFxuICAgICAgICAgICAgICAgIHRvcExlZnQ6IHZpc2libGVzW2tleV0udG9wTGVmdCxcbiAgICAgICAgICAgICAgICBzY2FsZTogdW5pdFNjYWxlKHZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IHZpc2libGVzW2tleV0ub3BhY2l0eSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZ3VpTGF5ZXI7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbGlzdE9mSGlkZGVucyA9IEFycmF5LmZyb20oaGlkZGVucyk7XG4gICAgICAgIC8vcmV0dXJuIFtsaXN0T2ZWaXNpYmxlcywgbGlzdE9mSGlkZGVuc107XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwbG90TmFtZTogcGxvdHNCeU5hbWVbcGxvdElEXS50aXRsZSxcbiAgICAgICAgICAgIHBsb3RJRDogcGxvdElELFxuICAgICAgICAgICAgdmlzaWJsZUxheWVyczogbGlzdE9mVmlzaWJsZXMsXG4gICAgICAgICAgICBoaWRkZW5MZXZlbHM6IGxpc3RPZkhpZGRlbnMsXG4gICAgICAgICAgICBkaW1lbnNpb25zOiBnZXREaW1lbnNpb25zKCksXG4gICAgICAgICAgICB0aWxlc0luVmlldzogZ2V0VGlsZXNJblZpZXdPZkFsbFZpc2libGVMZXZlbHMoT2JqZWN0LmtleXModmlzaWJsZXMpKSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyRm9yVGVzdGluZygpIHtcbiAgICAgICAgdmlzaWJsZXMgPSB7fTtcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pO1xuICAgICAgICBkaW1lbnNpb25zID0ge307XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5jcmVhc2VTY2FsZSgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDwgc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA+PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSAmJiBrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSArIDE7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPD0gbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdLCB5OiAxICogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVjcmVhc2VTY2FsZSgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgPT0gbWluaW11bUxldmVsICYmIHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZUZhY3RvcikpIHtcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdICYmIGtleSA+IG1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSAtIDE7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPj0gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qSW5jcmVtZW50YWwgem9vbS4gWm9vbSBpbi9vdXQgYnkgJ3ZlcnRpY2FsJyBhbW91bnQuICovXG4gICAgZnVuY3Rpb24gem9vbShmb2N1cywgdmVydGljYWwpIHtcbiAgICAgICAgdmFyIGZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgZmlyc3QgPSB2aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICB3aWR0aCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gZGltZW5zaW9uc1tmaXJzdEtleV0uaGVpZ2h0O1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSAlIGNvb3JkaW5hdGUgb2YgbW91c2UgcG9zaXRpb24gYmVmb3JlIHpvb21pbmcgaW5cbiAgICAgICAgdmFyIHBlcmNlbnRhZ2VDb29yZGluYXRlcyA9IHBvc2l0aW9uLnRvcExlZnRUb1BlcmNlbnRhZ2UoZm9jdXMsIGZpcnN0LnRvcExlZnQsIHVuaXRTY2FsZShmaXJzdC5zY2FsZSksIHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICAgIHZhciBob3dNdWNoID0gTWF0aC5mbG9vcihNYXRoLmFicyh2ZXJ0aWNhbCkgLyA1KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3dNdWNoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh2ZXJ0aWNhbCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmV3Rmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBuZXdGaXJzdCA9IHZpc2libGVzW25ld0ZpcnN0S2V5XSxcbiAgICAgICAgICAgIG5ld1dpZHRoID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBuZXdIZWlnaHQgPSBkaW1lbnNpb25zW25ld0ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgLy8gZ2V0IGEgbmV3IHRvcCBsZWZ0IHBvc2l0aW9uIHNvIHRoYXQgdGhlIG1vdXNlIGlzIHBvc2l0aW9uZWQgYXQgdGhlIHNhbWUgJSBjb29yZGluYXRlIGFzIGl0IHdhcyBiZWZvcmUgdGhlIHpvb21cbiAgICAgICAgdmFyIG5ld1RvcExlZnQgPSBwb3NpdGlvbi5wZXJjZW50YWdlVG9Ub3BMZWZ0KGZvY3VzLCBwZXJjZW50YWdlQ29vcmRpbmF0ZXMsIHVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICByZXBvc2l0aW9uKG5ld1RvcExlZnQpO1xuICAgICAgICByZXNldE9wYWNpdGllcygpO1xuICAgIH1cblxuICAgIC8qIHNuYXBzIHpvb20gYWxsIHRoZSB3YXkgdG8gdGhlIG5leHQgbGV2ZWwgd2hlcmUgc2NhbGU9MSAqL1xuICAgIGZ1bmN0aW9uIHNuYXBJbihmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBzbmFwcyB6b29tIGFsbCB0aGUgd2F5IHRvIHRoZSBwcmV2aW91cyBsZXZlbCB3aGVyZSBzY2FsZT0xICovXG4gICAgZnVuY3Rpb24gc25hcE91dChmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA0KSB7XG4gICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYWcoY2hhbmdlSW5Qb3NpdGlvbikge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdC54ICs9IGNoYW5nZUluUG9zaXRpb24ueDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRpbGVzSW5WaWV3KGxldmVsLCB0b3BMZWZ0LCBzY2FsZSwgd2lkdGgsIGhlaWdodCwgbkNvbHMpIHtcbiAgICAgICAgLy8gZ2V0IHBsb3QgY29vcmRpbmF0ZSBvZiB0b3AgbGVmdCBjb3JuZXIgb2Ygdmlld2luZyB3aW5kb3cgXG4gICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKHt4OjAseTowfSwgdG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB2YXIgdG9wTGVmdFBlcmNlbnQgPSBwZXJjZW50YWdlQ29vcmRpbmF0ZXMueDtcbiAgICAgICAgLy8gZ2V0IHZpc2libGUgdGlsZXNcbiAgICAgICAgdmFyIGZpcnN0VGlsZUluVmlldyA9IE1hdGguZmxvb3IodG9wTGVmdFBlcmNlbnQgKiBuQ29scyk7XG5cbiAgICAgICAgLy8gb25seSBuZWNlc3NhcnkgaWYgcGxvdCBpcyBhbGxvd2VkIHRvIHNjcm9sbCBvdXRzaWRlIHRoZSBsZWZ0L3JpZ2h0IGJvdW5kc1xuICAgICAgICBpZiAoZmlyc3RUaWxlSW5WaWV3IDwgMCkge1xuICAgICAgICAgICAgZmlyc3RUaWxlSW5WaWV3ID0gMDtcbiAgICAgICAgfSBlbHNlIGlmIChmaXJzdFRpbGVJblZpZXcgPiBuQ29scy0xKSB7XG4gICAgICAgICAgICBmaXJzdFRpbGVJblZpZXcgPSBuQ29scy0xO1xuICAgICAgICB9XG5cblxuICAgICAgICB2YXIgdGlsZXNJblZpZXcgPSBbXVxuICAgICAgICBpZiAoZmlyc3RUaWxlSW5WaWV3ID4gMSkge1xuICAgICAgICAgICAgLy8gYWRkIHRpbGVzIHRvIHRoZSBsZWZ0IGV2ZW4gaWYgbm90IHNob3dpbmdcbiAgICAgICAgICAgIHRpbGVzSW5WaWV3LnB1c2goZmlyc3RUaWxlSW5WaWV3LTIpO1xuICAgICAgICAgICAgdGlsZXNJblZpZXcucHVzaChmaXJzdFRpbGVJblZpZXctMSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlyc3RUaWxlSW5WaWV3ID4gMCkge1xuICAgICAgICAgICAgdGlsZXNJblZpZXcucHVzaChmaXJzdFRpbGVJblZpZXctMSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQgPSBmaXJzdFRpbGVJblZpZXc7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgNjsgaSsrKSB7IC8vIGFkZCBtb3JlIHRpbGVzIHRoYW4gd2lsbCBhY3R1YWxseSBiZSB2aXNpYmxlXG4gICAgICAgICAgICBpZiAodCA8IG5Db2xzKSB7XG4gICAgICAgICAgICAgICAgdGlsZXNJblZpZXcucHVzaCh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHQrKztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGlsZXNJblZpZXc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VGlsZXNJblZpZXdPZkFsbFZpc2libGVMZXZlbHMobGV2ZWxzKSB7XG4gICAgICAgIHZhciB0aWxlc0luVmlldyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxldmVscy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGxldmVsc1tpXTtcbiAgICAgICAgICAgIHZhciB0b3BMZWZ0ID0gdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgIHNjYWxlID0gdW5pdFNjYWxlKHZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1trZXldLndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodCA9IGRpbWVuc2lvbnNba2V5XS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgbkNvbHMgPSBNYXRoLnBvdygyLCBrZXkpO1xuICAgICAgICAgICAgdGlsZXNJblZpZXdba2V5XSA9IGdldFRpbGVzSW5WaWV3KGtleSwgdG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQsIG5Db2xzKTsgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRpbGVzSW5WaWV3O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNldFBsb3RJRDogc2V0UGxvdElELFxuICAgICAgICBnZXRJbmZvRm9yR1VJOiBnZXRJbmZvRm9yR1VJLFxuICAgICAgICBnZXRQbG90SUQ6IGdldFBsb3RJRCxcbiAgICAgICAgaW5pdGlhbGl6ZVZpc2libGU6IGluaXRpYWxpemVWaXNpYmxlLFxuICAgICAgICBpbml0aWFsaXplSGlkZGVuOiBpbml0aWFsaXplSGlkZGVuLFxuICAgICAgICBjbGVhckZvclRlc3Rpbmc6IGNsZWFyRm9yVGVzdGluZyxcbiAgICAgICAgZ2V0VmlzaWJsZXM6IGdldFZpc2libGVzLFxuICAgICAgICBnZXRIaWRkZW5zOiBnZXRIaWRkZW5zLFxuICAgICAgICBpbmNyZWFzZVNjYWxlOiBpbmNyZWFzZVNjYWxlLFxuICAgICAgICBkZWNyZWFzZVNjYWxlOiBkZWNyZWFzZVNjYWxlLFxuICAgICAgICB6b29tOiB6b29tLFxuICAgICAgICBzbmFwSW46IHNuYXBJbixcbiAgICAgICAgc25hcE91dDogc25hcE91dCxcbiAgICAgICAgZHJhZzogZHJhZyxcbiAgICAgICAgc2V0TWluTWF4TGV2ZWw6IHNldE1pbk1heExldmVsLFxuICAgICAgICByZXNldDogcmVzZXQsXG4gICAgICAgIGFkZFBsb3RCeU5hbWU6IGFkZFBsb3RCeU5hbWUsXG4gICAgICAgIHN3aXRjaFBsb3RzOiBzd2l0Y2hQbG90cyxcbiAgICAgICAgZ2V0RGltZW5zaW9uczogZ2V0RGltZW5zaW9ucyxcbiAgICAgICAgZ2V0UGxvdHNCeU5hbWU6IGdldFBsb3RzQnlOYW1lLFxuICAgICAgICBnZXRUaWxlc0luVmlld09mQWxsVmlzaWJsZUxldmVsczogZ2V0VGlsZXNJblZpZXdPZkFsbFZpc2libGVMZXZlbHMsXG4gICAgICAgIF9oaWRlOiBoaWRlLFxuICAgICAgICBfc2hvdzogc2hvdyxcbiAgICAgICAgX2NhbGN1bGF0ZU9wYWNpdHk6IGNhbGN1bGF0ZU9wYWNpdHksXG4gICAgICAgIF9tYXBWYWx1ZU9udG9SYW5nZTogbWFwVmFsdWVPbnRvUmFuZ2UsXG4gICAgfTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnBsb3QgPSBwbG90OyIsInZhciBlZGl0U1ZHID0gcmVxdWlyZSgnLi4vdXRpbHMvc3ZnLmpzJykuZWRpdFNWRztcbnZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG52YXIgdGFnID0gcmVxdWlyZSgnLi4vdXRpbHMvdGFnLmpzJykudGFnO1xudmFyIHNldHVwID0gcmVxdWlyZSgnLi4vdWkvc2V0dXAuanMnKS5zZXR1cDtcbnZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuLi91dGlscy9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbi8qUmVuZGVyIHBsb3QgaW1hZ2VzIG9uIHBhZ2UuKi9cblxudmFyIGd1aSA9IHtcbiAgICBwbG90VVJMczoge1xuICAgICAgICAvLyAwOiAnL3BhdGgvdG8vaW1hZ2VzJyxcbiAgICB9LFxuICAgIGhpZGU6IGZ1bmN0aW9uKHBsb3ROYW1lKSB7XG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdE5hbWUpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgfSxcbiAgICBhZGRUaWxlSWZOb3RFeGlzdHM6IGZ1bmN0aW9uKHBsb3ROYW1lLCBsZXZlbCwgY29sdW1uLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciB0aWxlSUQgPSBzZWxlY3RvcnMuaWRzLnRpbGVJRChwbG90TmFtZSwgbGV2ZWwsIGNvbHVtbilcbiAgICAgICAgdmFyIHRpbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aWxlSUQpO1xuICAgICAgICBpZiAodGlsZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgc2V0dXAuYWRkVGlsZShwbG90TmFtZSwgbGV2ZWwsIGNvbHVtbiwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgc2NoZW1hLmNoZWNrKGFyZ3MsIFsncGxvdE5hbWUnLCAndmlzaWJsZUxheWVycycsICdoaWRkZW5MZXZlbHMnLCAnZGltZW5zaW9ucycsICd0aWxlc0luVmlldyddKTtcbiAgICAgICAgdmFyIHBsb3ROYW1lID0gYXJncy5wbG90TmFtZSxcbiAgICAgICAgICAgIHBsb3RJRCA9IGFyZ3MucGxvdElELFxuICAgICAgICAgICAgdmlzaWJsZUxheWVycyA9IGFyZ3MudmlzaWJsZUxheWVycyxcbiAgICAgICAgICAgIGhpZGRlbkxldmVscyA9IGFyZ3MuaGlkZGVuTGV2ZWxzLFxuICAgICAgICAgICAgZGltcyA9IGFyZ3MuZGltZW5zaW9uc1xuICAgICAgICAgICAgdGlsZXNJblZpZXcgPSBhcmdzLnRpbGVzSW5WaWV3O1xuXG4gICAgICAgIC8vIGFkZCBpbWFnZXMgaW4gdmlldyB0byBwYWdlLCBpZiB0aGV5IG5lZWQgdG8gYmUgYWRkZWRcbiAgICAgICAgdmFyIGxldmVsc0luVmlldyA9IE9iamVjdC5rZXlzKHRpbGVzSW5WaWV3KTtcbiAgICAgICAgdmFyIHVybCA9IGd1aS5wbG90VVJMc1twbG90SURdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxldmVsc0luVmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNvbHVtbnNJblZpZXcgPSB0aWxlc0luVmlld1tsZXZlbHNJblZpZXdbaV1dO1xuICAgICAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBjb2x1bW5zSW5WaWV3Lmxlbmd0aDsgYysrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRUaWxlSWZOb3RFeGlzdHMocGxvdE5hbWUsIGxldmVsc0luVmlld1tpXSwgY29sdW1uc0luVmlld1tjXSwgdXJsLCAyNTYsIDI1Nik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3ROYW1lKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnaW5saW5lJyk7XG5cbiAgICAgICAgaWYgKCEodmlzaWJsZUxheWVycy5sZW5ndGggPiAwICYmIHZpc2libGVMYXllcnMubGVuZ3RoIDw9IDIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGhhdmUgMS0yIHZpc2libGUgbGF5ZXJzLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGhpZGRlbkluZGV4IGluIGhpZGRlbkxldmVscykge1xuICAgICAgICAgICAgdmFyIGxldmVsID0gaGlkZGVuTGV2ZWxzW2hpZGRlbkluZGV4XTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGV2ZWwpICE9ICdbb2JqZWN0IE51bWJlcl0nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJIEVSUk9SOiBleHBlY3RlZCBhIGxpc3Qgb2YgbnVtYmVycyBmb3IgaGlkZGVuTGF5ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KHBsb3ROYW1lLCBsZXZlbCkuaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgdmlzaWJsZUluZGV4IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZhciBsYXllciA9IHZpc2libGVMYXllcnNbdmlzaWJsZUluZGV4XTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmxheWVyKGxheWVyKSkgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBleHBlY3RlZCBsYXllciBzY2hlbWEuXCIpO1xuICAgICAgICAgICAgaWYgKGxheWVyLnNjYWxlLnggPiAyIHx8IGxheWVyLnNjYWxlLnggPCAuNSB8fCBsYXllci5zY2FsZS55ID4gMiB8fCBsYXllci5zY2FsZS55IDwgLjUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IHNjYWxlIG91dHNpZGUgWy41LDJdIHJhbmdlLiBTY2FsZSBzaG91bGQgYmUgY29udmVydGVkIHRvIFsuNSwyXSBiZWZvcmUgYmVpbmcgcGFzc2VkIHRvIEdVSS4gW1wiICsgbGF5ZXIuc2NhbGUueCArIFwiLCBcIiArIGxheWVyLnNjYWxlLnkgKyBcIl1cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdmdCdW5kbGUgPSBuZXcgZWRpdFNWRygpLnNldChwbG90TmFtZSwgbGF5ZXIubGV2ZWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGltc0Zyb21QYWdlID0gc3ZnQnVuZGxlLmRpbWVuc2lvbnMoKTtcbiAgICAgICAgICAgIGlmICgoZGltc0Zyb21QYWdlWzBdICE9IGRpbXNbbGF5ZXIubGV2ZWxdLndpZHRoKSB8fCAoZGltc0Zyb21QYWdlWzFdICE9IGRpbXNbbGF5ZXIubGV2ZWxdLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGRpbWVuc2lvbnMgb2YgcGxvdCBvbiBwYWdlIGRvbid0IG1hdGNoIGRpbWVuc2lvbnMgb2YgcGxvdCBmcm9tIG1vZGVsXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdmdCdW5kbGVcbiAgICAgICAgICAgICAgICAudHJhbnNsYXRlKGxheWVyLnRvcExlZnQueCwgbGF5ZXIudG9wTGVmdC55KVxuICAgICAgICAgICAgICAgIC5zY2FsZShsYXllci5zY2FsZS54LCBsYXllci5zY2FsZS55KVxuICAgICAgICAgICAgICAgIC5mYWRlKGxheWVyLm9wYWNpdHkpXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aXNpYmxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBzY2FsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgb3BhY2l0eVN0cmluZyA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5sZXZlbDtcbiAgICAgICAgICAgIHNjYWxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5zY2FsZS54O1xuICAgICAgICAgICAgb3BhY2l0eVN0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5vcGFjaXR5O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGhlc2UgYXJlIGp1c3QgZm9yIGRpc3BsYXlpbmcgd2hpY2ggem9vbSBsZXZlbCBpcyB2aXNpYmxlLCBhbmQgdGhlIGZyYWN0aW9uYWwgem9vbSBhbmQgb3BhY2l0eSBvZiB0aGUgdmlzaWJsZSBsYXllcnNcbiAgICAgICAgLy8gY2FuIGJlIGRlbGV0ZWRcbiAgICAgICAgJChcIiN6b29tLWRpdlwiKS50ZXh0KHZpc2libGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNmcmFjdGlvbmFsLXpvb20tZGl2XCIpLnRleHQoc2NhbGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNvcGFjaXR5LWRpdlwiKS50ZXh0KG9wYWNpdHlTdHJpbmcpO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5ndWkgPSBndWk7IiwidmFyIHBsb3QgPSByZXF1aXJlKCcuLi9tb2RlbC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuLi91aS9ndWkuanMnKS5ndWk7XG5cbi8qIEV2ZW50IGhhbmRsZXJzOlxuLSBkcmFnZ2luZyBwbG90IHdpdGggbW91c2Vcbi0gcHJlc3Npbmcgb24gdGhlIHpvb20gaW4vb3V0IGJ1dHRvbnNcbi0gem9vbWluZyBpbi9vdXQgd2l0aCBtb3VzZSB3aGVlbFxuKi9cbnZhciBoYW5kbGVycyA9IHtcbiAgICBjdXJyZW50bHlab29taW5nSW5XaXRoQnV0dG9uOiBmYWxzZSxcbiAgICBjdXJyZW50bHlab29taW5nT3V0V2l0aEJ1dHRvbjogZmFsc2UsXG5cbiAgICBjYWxsR1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgIH0sXG5cbiAgICBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0OiBmdW5jdGlvbiAobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBsaXN0ZW5Gb3JEcmFnOiBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibGlzdGVuRm9yRHJhZ1wiKTtcbiAgICAgICAgdmFyIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgLy92YXIgc3ZnID0gZXZ0LnRhcmdldDtcblxuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYmVnaW5EcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZywgZmFsc2UpO1xuXG4gICAgICAgIHZhciBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJzLmdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYmVnaW5EcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBtb3VzZVBvc2l0aW9uT25TdGFydERyYWcgPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgICAgICBpZiAoaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50TW91c2VQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICAgICAgeTogY3VycmVudE1vdXNlUG9zaXRpb24ueSAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLnksXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHBsb3QuZHJhZyhjaGFuZ2VJbk1vdXNlUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcblxuICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb25XaGVlbDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGhvcml6b250YWwgPSBldnQuZGVsdGFYO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBldnQuZGVsdGFZO1xuXG4gICAgICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgICAgIC8vIHpvb20gaW4vb3V0IGlmIHVzZXIgc2Nyb2xscyB1cC9kb3duIG9uIG1vdXNlcGFkXG4gICAgICAgICAgICB2YXIgc3ZnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpO1xuICAgICAgICAgICAgdmFyIG1vdXNlUG9zID0gaGFuZGxlcnMuZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgICAgICAgICBwbG90Lnpvb20obW91c2VQb3MsIHZlcnRpY2FsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNoaWZ0IHBsb3QgbGVmdC9yaWdodCBpZiB1c2VyIHNjcm9sbHMgbGVmdC9yaWdodCBvbiBtb3VzZXBhZFxuICAgICAgICAgICAgLy8gVE9ETzogc2hvdWxkIHN0b3AgdGhpcyBmcm9tIGJlaW5nIGNhbGxlZCBpbW1lZGlhdGVseSBhZnRlci9kdXJpbmcgem9vbSBhY3Rpb25zLCBiZWNhdXNlIGl0IGxvb2tzIGJhZC1pc2ggaWYgdXNlciBhY2NpZGVudGFsbHkgc2Nyb2xscyBob3Jpem9udGFsbHkgd2hlbiB0cnlpbmcgdG8gem9vbVxuICAgICAgICAgICAgcGxvdC5kcmFnKHsgeDogaG9yaXpvbnRhbCwgeTogMCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICB9LFxuXG4gICAgb25CdXR0b25DbGlja1pvb21JbjogZnVuY3Rpb24gKCkge1xuICAgICAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCAtNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoYW5kbGVycy5jdXJyZW50bHlab29taW5nT3V0V2l0aEJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGxvdC5zbmFwSW4oeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuY3VycmVudGx5Wm9vbWluZ0luV2l0aEJ1dHRvbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5jdXJyZW50bHlab29taW5nSW5XaXRoQnV0dG9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tT3V0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKCFoYW5kbGVycy5jdXJyZW50bHlab29taW5nSW5XaXRoQnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuY3VycmVudGx5Wm9vbWluZ091dFdpdGhCdXR0b24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuY3VycmVudGx5Wm9vbWluZ091dFdpdGhCdXR0b24gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuaGFuZGxlcnMgPSBoYW5kbGVyczsiLCJ2YXIgdHlwZWNoZWNrID0gcmVxdWlyZSgnLi4vdXRpbHMvdHlwZWNoZWNrLmpzJykudHlwZWNoZWNrO1xudmFyIHBvc2l0aW9uID0gcmVxdWlyZShcIi4uL3V0aWxzL3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9tb2RlbC9wbG90LmpzJykucGxvdDtcblxuLyogSG92ZXIgZGF0YS5cblxuRGlzcGxheSBtZXRhZGF0YSB3aGVuIG1vdXNlIGhvdmVycyBvdmVyIHBvaW50IGJ5IGZldGNoaW5nIHRoZSBtZXRhZGF0YSBmcm9tIGpzb24gZmlsZXMuKi9cbnZhciBob3ZlciA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgaG92ZXJBcmVhID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGluc2VydFRleHRib3gocGFyZW50SUQpIHtcbiAgICAgICAgaG92ZXJBcmVhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGFyZW50SUQpO1xuXG4gICAgICAgIC8vIG1ha2Ugc3ZnIHRvIGNvbnRhaW4gdGV4dGJveFxuICAgICAgICB2YXIgdGV4dGJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsICdzdmcnKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ2lkJywgXCJ0ZXh0Ym94XCIpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgneCcsIFwiMFwiKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3knLCBcIjBcIik7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd2aXNpYmlsaXR5JywgXCJoaWRkZW5cIik7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCdvdmVyZmxvdycsICd2aXNpYmxlJyk7XG4gICAgICAgIC8vaG92ZXJBcmVhLmFwcGVuZENoaWxkKHRleHRib3gpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2lkZ2V0JykuYXBwZW5kQ2hpbGQodGV4dGJveCk7XG4gICAgXG4gICAgICAgIC8vIGluc2VydCByZWN0IGJhY2tncm91bmQgd2l0aCBsaW5lIGludG8gZmlyc3Qgc3ZnIGVsZW1lbnRcbiAgICAgICAgdmFyIHJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAncmVjdCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaWQnLCAndGV4dGJveFJlY3QnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3gnLCAnMCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgneScsICcwJyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWxsJywgJ3doaXRlJyk7XG4gICAgICAgIHRleHRib3guYXBwZW5kQ2hpbGQocmVjdCk7XG4gICAgXG4gICAgICAgIC8vIG1ha2UgY29udGFpbmVyIGZvciB0ZXh0ICh3aXRoIG1hcmdpbnMpIGluc2lkZSB0ZXh0Ym94XG4gICAgICAgIHZhciBpbm5lclRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAnc3ZnJyk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3RleHRib3hJbm5lcicpO1xuICAgICAgICBpbm5lclRleHQuc2V0QXR0cmlidXRlKCd4JywgJzUnKTtcbiAgICAgICAgaW5uZXJUZXh0LnNldEF0dHJpYnV0ZSgneScsICc1Jyk7XG4gICAgICAgIHRleHRib3guYXBwZW5kQ2hpbGQoaW5uZXJUZXh0KTtcbiAgICBcbiAgICAgICAgdmFyIHRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAndGV4dCcpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnaWQnLCAndGV4dGJveFRleHQnKTtcbiAgICAgICAgdGV4dC5zZXRBdHRyaWJ1dGUoJ3knLCAnNScpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnZm9udC1zaXplJywgJzEwJyk7XG4gICAgICAgIHRleHQuc2V0QXR0cmlidXRlKCdkeScsICcwJyk7XG4gICAgXG4gICAgICAgIC8vIGluc2VydCB0ZXh0IGludG8gc2Vjb25kIHN2ZyBlbGVtZW50XG4gICAgICAgIGlubmVyVGV4dC5hcHBlbmRDaGlsZCh0ZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZGlzcGxheVRleHRCb3goeCwgeSwgbGluZXMpIHtcbiAgICAgICAgdmFyIHRleHRib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveCcpO1xuXG4gICAgICAgIC8vIG9mZnNldCBvZiBwbG90IHN2ZyBpbnNpZGUgd2lkZ2V0IHN2Z1xuICAgICAgICB4ID0geCs1MDtcbiAgICAgICAgeSA9IHkrMzA7XG5cbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCs1KSk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCBcInZpc2libGVcIik7XG4gICAgXG4gICAgICAgIC8vIGFkZCB0c3BhbnMgdG8gdGV4dCBlbGVtZW50IHdpdGggdHNwYW5zXG4gICAgICAgIHZhciBsaW5lQ291bnQgPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIHZhciB0c3BhbnMgPSAnPHRzcGFuIHg9XCIwXCIgZHk9XCIwLjZlbVwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+JyArIGxpbmVzWzBdICsgJzwvdHNwYW4+JztcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsaW5lQ291bnQ7IGkrKykge1xuICAgICAgICAgICAgdHNwYW5zICs9ICc8dHNwYW4geD1cIjBcIiBkeT1cIjEuMmVtXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj4nICsgbGluZXNbaV0gKyAnPC90c3Bhbj4nO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3hUZXh0Jyk7XG4gICAgICAgIHRleHQuaW5uZXJIVE1MID0gdHNwYW5zO1xuICAgIFxuICAgICAgICAvLyBnZXQgd2lkdGggYW5kIGhlaWdodCBvZiB0ZXh0IGVsZW1lbnRcbiAgICAgICAgdmFyIHdpZHRoID0gdGV4dC5nZXRCQm94KCkud2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0ZXh0LmdldEJCb3goKS5oZWlnaHQ7XG4gICAgXG4gICAgICAgIC8vIHNldCB3aWR0aC9oZWlnaHQgb2YgYmFja2dyb3VuZCByZWN0XG4gICAgICAgIHZhciByZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3hSZWN0Jyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoICsgMTUpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0ICsgMTUpO1xuICAgIFxuICAgICAgICAvLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIHdob2xlIHRleHRib3hcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGggKyAxNSk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQgKyAxNSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIHRleHQgY29udGFpbmVyXG4gICAgICAgIHZhciBpbm5lclRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveElubmVyJyk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGggKyAxMCk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCArIDEwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfaGlkZVRleHRCb3goKSB7XG4gICAgICAgIHZhciB0ZXh0Ym94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3gnKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCBcImhpZGRlblwiKTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gX2dldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfZ2V0Rmlyc3RQbG90TGF5ZXJJbmZvKCkge1xuICAgICAgICB2YXIgYXJncyA9IHBsb3QuZ2V0SW5mb0ZvckdVSSgpO1xuICAgICAgICB2YXIgdmlzaWJsZXMgPSBhcmdzLnZpc2libGVMYXllcnM7XG4gICAgICAgIHZhciBkaW1lbnNpb25zID0gYXJncy5kaW1lbnNpb25zO1xuXG4gICAgICAgIHZhciBmaXJzdCA9IHZpc2libGVzWzBdLFxuICAgICAgICAgICAgZmlyc3RLZXkgPSBmaXJzdC5sZXZlbCxcbiAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIG5Db2xzID0gTWF0aC5wb3coMiwgZmlyc3QubGV2ZWwpO1xuXG4gICAgICAgIHJldHVybiBbZmlyc3QudG9wTGVmdCwgZmlyc3Quc2NhbGUsIHdpZHRoLCBoZWlnaHQsIGZpcnN0LmxldmVsLCBuQ29sc107XG4gICAgfVxuXG4gICAgLy8gY29udmVydCB4LHkgaW4gdmlld2luZyB3aW5kb3cgY29vcmRpbmF0ZXMgdG8gZ3JhcGggY29vcmRpbmF0ZXNcbiAgICBmdW5jdGlvbiBfZ2V0Q29vcmRpbmF0ZXMoeCwgeSkge1xuICAgICAgICB2YXIgcmVzID0gX2dldEZpcnN0UGxvdExheWVySW5mbygpO1xuICAgICAgICB2YXIgdG9wTGVmdCA9IHJlc1swXSwgc2NhbGUgPSByZXNbMV0sIHdpZHRoID0gcmVzWzJdLCBoZWlnaHQgPSByZXNbM107XG4gICAgICAgIFxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZSh7eDogeCwgeTogeX0sIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdmFyIHBpeGVsQ29vcmRpbmF0ZXMgPSB7eDogcGVyY2VudGFnZUNvb3JkaW5hdGVzLnggKiB3aWR0aCwgeTogcGVyY2VudGFnZUNvb3JkaW5hdGVzLnkgKiBoZWlnaHR9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIFtwaXhlbENvb3JkaW5hdGVzLCB3aWR0aCwgaGVpZ2h0XTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0VGlsZXNJblZpZXcodG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQsIG5Db2xzKSB7XG4gICAgICAgIC8vIGdldCBwbG90IGNvb3JkaW5hdGUgb2YgdG9wIGxlZnQgY29ybmVyIG9mIHZpZXdpbmcgd2luZG93IFxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZSh7eDowLHk6MH0sIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdmFyIHRvcExlZnRQZXJjZW50ID0gcGVyY2VudGFnZUNvb3JkaW5hdGVzLng7XG4gICAgICAgIC8vIGdldCB2aXNpYmxlIHRpbGVzXG4gICAgICAgIHZhciBmaXJzdFRpbGVJblZpZXcgPSBNYXRoLmZsb29yKHRvcExlZnRQZXJjZW50ICogbkNvbHMpO1xuICAgICAgICB2YXIgdGlsZXNJblZpZXcgPSBbZmlyc3RUaWxlSW5WaWV3LCBmaXJzdFRpbGVJblZpZXcrMSwgZmlyc3RUaWxlSW5WaWV3KzIsIGZpcnN0VGlsZUluVmlldyszXTtcbiAgICAgICAgcmV0dXJuIHRpbGVzSW5WaWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9hZnRlckxvYWRpbmdQb2ludHMocG9pbnRzLCB4X2F4aXNfcmFuZ2UsIHlfYXhpc19yYW5nZSwgd2lkdGgsIGhlaWdodCwgZ3JhcGhDb29yZHMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBpeGVsUG9pbnQgPSB7eDogcGxvdC5fbWFwVmFsdWVPbnRvUmFuZ2UocG9pbnRzW2ldLmdwLCBbeF9heGlzX3JhbmdlWzBdLCB4X2F4aXNfcmFuZ2VbMV1dLCBbMCx3aWR0aF0pLCBcbiAgICAgICAgICAgICAgICB5OiBwbG90Ll9tYXBWYWx1ZU9udG9SYW5nZShwb2ludHNbaV0ubmxwLCBbeV9heGlzX3JhbmdlWzBdLCB5X2F4aXNfcmFuZ2VbMV1dLCBbaGVpZ2h0LDBdKX07XG5cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhncmFwaENvb3Jkcy54IC0gcGl4ZWxQb2ludC54KSA8IDIgJiYgTWF0aC5hYnMoZ3JhcGhDb29yZHMueSAtIHBpeGVsUG9pbnQueSkgPCAyKSB7XG4gICAgICAgICAgICAgICAgX2Rpc3BsYXlUZXh0Qm94KG1vdXNlcG9zLngsIG1vdXNlcG9zLnksIHBvaW50c1tpXS5sYWJlbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfaGlkZVRleHRCb3goKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGluc2VydFRleHRib3g6IGluc2VydFRleHRib3gsXG4gICAgICAgIGhvdmVyTGlzdGVuZXI6IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChob3ZlckFyZWEpKSB0aHJvdyBuZXcgRXJyb3IoXCJob3ZlcjogaG92ZXJBcmVhIG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgICAgICAgICAgbW91c2Vwb3MgPSBfZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChlLmNsaWVudFgsIGUuY2xpZW50WSwgaG92ZXJBcmVhKTtcblxuICAgICAgICAgICAgdmFyIHJlcyA9IF9nZXRDb29yZGluYXRlcyhtb3VzZXBvcy54LCBtb3VzZXBvcy55KTtcbiAgICAgICAgICAgIHZhciBncmFwaENvb3JkcyA9IHJlc1swXSwgd2lkdGggPSByZXNbMV0sIGhlaWdodCA9IHJlc1syXTtcblxuICAgICAgICAgICAgdmFyIHhfYXhpc19yYW5nZSA9IG51bGwsIHlfYXhpc19yYW5nZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHZhciB1cmwgPSBwbG90LmdldFBsb3RzQnlOYW1lKClbcGxvdC5nZXRQbG90SUQoKV0udXJsO1xuICAgICAgICAgICAgdmFyIG1ldGFkYXRhX3VybCA9IHVybCArIFwiL21ldGFkYXRhLmpzb25cIjtcbiAgICAgICAgICAgICQuZ2V0SlNPTihtZXRhZGF0YV91cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB4X2F4aXNfcmFuZ2UgPSBkYXRhLnhfYXhpc19yYW5nZTtcbiAgICAgICAgICAgICAgICB5X2F4aXNfcmFuZ2UgPSBkYXRhLnlfYXhpc19yYW5nZTtcblxuICAgICAgICAgICAgICAgIHZhciByZXMgPSBfZ2V0Rmlyc3RQbG90TGF5ZXJJbmZvKCk7XG4gICAgICAgICAgICAgICAgdmFyIHRvcExlZnQgPSByZXNbMF0sIHNjYWxlID0gcmVzWzFdLCB3aWR0aCA9IHJlc1syXSwgaGVpZ2h0ID0gcmVzWzNdLCB6b29tTGV2ZWwgPSByZXNbNF0sIG5Db2xzID0gcmVzWzVdO1xuICAgICAgICAgICAgICAgICQuZ2V0SlNPTih1cmwrXCIvXCIrem9vbUxldmVsKycvaG92ZXIuanNvbicsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aWxlc1dpdGhIb3ZlckRhdGEgPSBuZXcgU2V0KGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aWxlc0luVmlldyA9IF9nZXRUaWxlc0luVmlldyh0b3BMZWZ0LCBzY2FsZSwgd2lkdGgsIGhlaWdodCwgbkNvbHMpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaTx0aWxlc0luVmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRpbGVzV2l0aEhvdmVyRGF0YS5oYXModGlsZXNJblZpZXdbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRKU09OKHVybCtcIi9cIit6b29tTGV2ZWwrJy8nK3RpbGVzSW5WaWV3W2ldKycuanNvbicsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoLmFwcGx5KHBvaW50cyxkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2FmdGVyTG9hZGluZ1BvaW50cyhwb2ludHMsIHhfYXhpc19yYW5nZSwgeV9heGlzX3JhbmdlLCB3aWR0aCwgaGVpZ2h0LCBncmFwaENvb3Jkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0gIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuaG92ZXIgPSBob3ZlcjsiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL21vZGVsL3Bsb3QuanMnKS5wbG90O1xudmFyIGd1aSA9IHJlcXVpcmUoJy4uL3VpL2d1aS5qcycpLmd1aTtcblxuLyogXG5TZWFyY2ggYmFyIGZvciBkaXNwbGF5aW5nIHJlc3VsdHMgb2YgcXVlcnkuXG5cbmRlcGVuZGVuY3k6IGZ1c2UuanNcbiovXG52YXIgc2VhcmNoID0gZnVuY3Rpb24gKHBoZW5vdHlwZXMpIHtcblxuICAgIHZhciByZXN1bHRzID0gW107IC8vIHJlc3VsdCBmcm9tIHNlYXJjaCBxdWVyeVxuICAgIHZhciBmb2N1cyA9IDE7IC8vIG4tdGggcm93IG9mIHJlc3VsdHMgdGFibGUgd2UncmUgZm9jdXNlZCBvblxuXG4gICAgLy8gZnVzZS5qcyBvcHRpb25zXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIHNob3VsZFNvcnQ6IHRydWUsXG4gICAgICAgIGluY2x1ZGVTY29yZTogdHJ1ZSxcbiAgICAgICAgdGhyZXNob2xkOiAwLjYsXG4gICAgICAgIGxvY2F0aW9uOiAwLFxuICAgICAgICBkaXN0YW5jZTogMTAwLFxuICAgICAgICBtYXhQYXR0ZXJuTGVuZ3RoOiAzMixcbiAgICAgICAgbWluTWF0Y2hDaGFyTGVuZ3RoOiAxLFxuICAgICAgICBrZXlzOiBbXG4gICAgICAgICAgICBcInRpdGxlXCJcbiAgICAgICAgXVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBtYWtlVGFibGUoKSB7XG4gICAgICAgICQoJzx0YWJsZSBpZD1cInNlYXJjaF90YWJsZVwiPjx0ciBpZD1cInNlYXJjaF90aXRsZXNcIj48L3RyPjwvdGFibGU+JykuYXBwZW5kVG8oJyNzZWFyY2hiYXJfdGFyZ2V0Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCIyMHB4XCI+aWQ8L3RoPicpO1xuICAgICAgICAkKCcjc2VhcmNoX3RpdGxlcycpLmFwcGVuZCgnPHRoIHdpZHRoPVwiMTAwcHhcIj5waGVub3R5cGU8L3RoPicpO1xuICAgICAgICAkKCcjc2VhcmNoX3RpdGxlcycpLmFwcGVuZCgnPHRoIHdpZHRoPVwiNDAwcHhcIj5kZXNjcmlwdGlvbjwvdGg+Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJUYWJsZUNvbnRlbnRzKCkge1xuICAgICAgICAkKCcucm93JykucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlzcGxheVJlc3VsdHMoY29udGVudHMsIGtleXNUb0Rpc3BsYXkpIHtcbiAgICAgICAgY2xlYXJUYWJsZUNvbnRlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udGVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByb3cgPSAnPHRyIGNsYXNzPVwicm93XCI+JztcbiAgICAgICAgICAgIHZhciBpdGVtID0gY29udGVudHNbaV0uaXRlbTtcbiAgICAgICAgICAgIC8vdmFyIGtleXMgPSBPYmplY3Qua2V5cyhpdGVtKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5c1RvRGlzcGxheS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBjZWxsID0gJzx0ZD4nICsgaXRlbVtrZXlzVG9EaXNwbGF5W2pdXSArICc8L3RkPic7XG4gICAgICAgICAgICAgICAgcm93ICs9IGNlbGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvdHI+JztcbiAgICAgICAgICAgICQoJyNzZWFyY2hfdGFibGUnKS5hcHBlbmQocm93KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBmdXNlID0gbmV3IEZ1c2UocGhlbm90eXBlcywgb3B0aW9ucyk7XG4gICAgbWFrZVRhYmxlKCk7XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlVcChlKSB7XG4gICAgICAgIC8vIGlmIGtleSB3YXMgbm90IHRoZSB1cCBvciBkb3duIGFycm93IGtleSwgZGlzcGxheSByZXN1bHRzXG4gICAgICAgIGlmIChlLmtleUNvZGUgIT0gNDAgJiYgZS5rZXlDb2RlICE9IDM4KSB7XG4gICAgICAgICAgICB2YXIgY29udGVudHMgPSAkKCcjc2VhcmNoYmFyJykudmFsKCk7XG4gICAgICAgICAgICByZXN1bHRzID0gZnVzZS5zZWFyY2goY29udGVudHMpO1xuICAgICAgICAgICAgZGlzcGxheVJlc3VsdHMocmVzdWx0cywgWydpZCcsICd0aXRsZScsICdkZXNjJ10pO1xuICAgICAgICAgICAgZm9jdXMgPSAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VhcmNoQmFyS2V5UHJlc3MoZSkge1xuICAgICAgICAvLyBpZiBlbnRlciBrZXkgd2FzIHByZXNzZWRcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKGZvY3VzICE9IDEpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkKFwiLnJvdzpudGgtb2YtdHlwZShcIiArIGZvY3VzICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgIHZhciBwaGVub3R5cGUgPSBzZWxlY3RlZC5jaGlsZHJlbigpLmVxKDEpLmh0bWwoKTtcbiAgICAgICAgICAgICAgICAkKCcjc2VhcmNoYmFyJykudmFsKHBoZW5vdHlwZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9ICQoJyNzZWFyY2hiYXInKS52YWwoKTtcbiAgICAgICAgICAgICAgICByZXMgPSBmdXNlLnNlYXJjaChxdWVyeSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNbMF0uc2NvcmUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BlcmZlY3QgbWF0Y2gnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc3dpdGNoUGxvdHMocXVlcnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoUGxvdHMocmVzWzBdLml0ZW0uaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gbWF0Y2hcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjaGFuZ2UgaGlnaGxpZ2h0ZWQgcm93IGluIHJlc3VsdHMgdGFibGUgd2hlbiB1cC9kb3duIGFycm93cyBhcmUgdXNlZFxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleURvd24oZSkge1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDQwKSB7IC8vIGRvd24gYXJyb3dcbiAgICAgICAgICAgIGlmIChmb2N1cyA8IHJlc3VsdHMubGVuZ3RoICsgMSkge1xuICAgICAgICAgICAgICAgIGZvY3VzICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZS5rZXlDb2RlID09IDM4KSB7IC8vIHVwIGFycm93XG4gICAgICAgICAgICBpZiAoZm9jdXMgPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9jdXMgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkKFwiLnJvd1wiKS5jaGlsZHJlbigndGQnKS5jc3MoJ2JvcmRlcicsICcxcHggc29saWQgI2RkZGRkZCcpO1xuICAgICAgICAkKFwiLnJvdzpudGgtb2YtdHlwZShcIiArIGZvY3VzICsgXCIpXCIpLmNoaWxkcmVuKCd0ZCcpLmNzcygnYm9yZGVyJywgJzFweCBzb2xpZCAjMDAwMDAwJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3dpdGNoUGxvdHMocGxvdElEKSB7XG4gICAgICAgIC8vIGNoYW5nZSB2aXNpYmxlIHBsb3RcbiAgICAgICAgdmFyIG9sZFBsb3RJRCA9IHBsb3QuZ2V0UGxvdElEKCk7IC8vIGlkIG51bWJlclxuICAgICAgICBwbG90LnN3aXRjaFBsb3RzKHBsb3RJRCk7XG4gICAgICAgIGd1aS5oaWRlKHBsb3QuZ2V0UGxvdHNCeU5hbWUoKVtvbGRQbG90SURdLnRpdGxlKTtcbiAgICAgICAgZ3VpLnJlbmRlcihwbG90LmdldEluZm9Gb3JHVUkoKSk7XG4gICAgfVxuXG4gICAgJCgnI3NlYXJjaGJhcicpLm9uKCdrZXl1cCcsIHNlYXJjaEJhcktleVVwKTtcbiAgICAkKCcjc2VhcmNoYmFyJykub24oJ2tleXByZXNzJywgc2VhcmNoQmFyS2V5UHJlc3MpO1xuICAgICQoJyNzZWFyY2hiYXInKS5vbigna2V5ZG93bicsIHNlYXJjaEJhcktleURvd24pO1xufTtcblxubW9kdWxlLmV4cG9ydHMuc2VhcmNoID0gc2VhcmNoOyIsInZhciB0YWcgPSByZXF1aXJlKCcuLi91dGlscy90YWcuanMnKS50YWc7XG52YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi4vdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG4vKlNldCB1cCBTVkcgRE9NIGVsZW1lbnRzIG9uIHBhZ2UuXG5cblBsb3QgY29uc2lzdHMgb2Y6XG5cbjxzdmcgaWQ9J3dpZGdldCc+IHdpZGdldCBlbGVtZW50XG4gICAgPHJlY3Q+IGJhY2tncm91bmQgZm9yIHdpZGdldFxuICAgIDxzdmcgaWQ9J3Bsb3QnPiBwbG90IGVsZW1lbnQgd2hpY2ggaXMgdGhlIHZpZXdpbmcgd2luZG93IGZvciB0aGUgaW1hZ2VzIChzaXplIG9mIHRoaXMgZGV0ZXJtaW5lcyB3aGF0IGlzIHZpc2libGUpXG4gICAgICAgIDxyZWN0PiBiYWNrZ3JvdW5kIGZvciBwbG90XG4gICAgICAgIDxnPiBncm91cCBmb3IgZWFjaCBwbG90IChwaGVub3R5cGUpICh1c2VkIHRvIGhpZGUgLyBzaG93IHBsb3RzKVxuICAgICAgICAgICAgPGc+IGdyb3VwIGZvciBlYWNoIHpvb20gbGF5ZXIgKGFsbCB0aWxlcyB3aWxsIGluaGVyaXQgcHJvcGVydGllcyBvbiBnLCBzbyBpdCBpcyB1c2VkIGZvciBzY2FsaW5nLCBwb3NpdGlvbmluZywgZmFkaW5nKVxuICAgICAgICAgICAgICAgIDxzdmc+IHN2ZyBmb3IgZWFjaCB6b29tIGxheWVyIChuZWVkIGEgPHN2Zz4gaW5zaWRlIHRoZSA8Zz4gYmVjYXVzZSA8Zz4gZWxlbWVudHMgZG8gbm90IGhhdmUgYSBjb25jZXB0IG9mIHNpemUpXG4gICAgICAgICAgICAgICAgICAgIDxpbWFnZT5cbiAgICAgICAgICAgICAgICAgICAgPGltYWdlPlxuICAgICAgICAgICAgICAgICAgICA8aW1hZ2U+XG4gICAgICAgICAgICAgICAgICAgIC4uLlxuICAgIDxzdmcgaWQ9J3RleHRib3gnPiB0ZXh0Ym94IGVsZW1lbnQgZm9yIGRpc3BsYXlpbmcgaG92ZXIgZGF0YVxuICAgIFxuTm90ZXM6XG4gICAgLSB0ZXh0Ym94IGVsZW1lbnQgc2hvdWxkIGJlIGluc2lkZSB3aWRnZXQsIGJ1dCBub3QgaW5zaWRlIHBsb3QgPHN2Zz4sIHNvIHRoYXQgdGhlIG92ZXJmbG93IHNob3dzIHdoZW4gaG92ZXJpbmcgb3ZlciBhIHBvaW50IGF0IHRoZSBlZGdlIG9mIHRoZSBwbG90XG4qL1xuXG52YXIgc2V0dXAgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVdpZGdldCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgLy8gY3JlYXRlIHdpZGdldCBhbmQgYXBwZW5kIGl0IHRvIHRoZSB0YXJnZXRcbiAgICAgICAgdmFyIHdpZGdldCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCB3aWRnZXRJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGJhY2tncm91bmQgZm9yIHBsb3Qgd2lkZ2V0XG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsIGJhY2tncm91bmRDb2xvcilcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3N0cm9rZScsICcjZTNlN2VkJylcbiAgICAgICAgICAgIC5wbGFjZSh3aWRnZXQpO1xuXG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVBsb3RXaW5kb3codGFyZ2V0LCBwbG90SUQsIHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgY29udGFpbmVyICh3aWR0aCBhbmQgaGVpZ2h0IGRpY3RhdGUgdGhlIHNpemUgb2YgdGhlIHZpZXdpbmcgd2luZG93KVxuICAgICAgICB2YXIgd2luZG93ID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHBsb3RJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd4JywgeClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3knLCB5KVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgYmFja2dyb3VuZFxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygncmVjdCcpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsICcjZThlYmVmJylcbiAgICAgICAgICAgIC5wbGFjZSh3aW5kb3cpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkQnV0dG9ucyh0YXJnZXQpIHtcblxuICAgICAgICBmdW5jdGlvbiBhZGRCdXR0b24oaWQsIF9jbGFzcywgdHlwZSwgbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0YWcoKVxuICAgICAgICAgICAgICAgIC5jcmVhdGUoJ2lucHV0JylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2NsYXNzJywgX2NsYXNzKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3R5cGUnLCB0eXBlKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ25hbWUnLCBuYW1lKVxuICAgICAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgICAgICB9O1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20taW4tYnV0dG9uJywgJ3pvb20tYnV0dG9uJywgJ2J1dHRvbicsICdpbmNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnKycpO1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20tb3V0LWJ1dHRvbicsICd6b29tLWJ1dHRvbicsICdidXR0b24nLCdkZWNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnLScpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkUGxvdFRvUGFnZSh0YXJnZXQsIHBsb3RJRCkge1xuICAgICAgICAvLyBhZGQgZyBmb3IgYSBzaW5nbGUgcGxvdCAocGhlbm90eXBlKSwgaGlkZGVuIHdpdGggZGlzcGxheT1ub25lXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgIH07XG5cbiAgICAvKiBwbGFjZSBhIHpvb20gbGF5ZXIgZ3JvdXAgPGc+PHN2Zz48L3N2Zz48L2c+IGluc2lkZSBhIHBsb3QncyA8Zz4gKi9cbiAgICBmdW5jdGlvbiBfYWRkR3JvdXAocGxvdElELCBsZXZlbCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgcGxvdCA9IG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKTtcblxuICAgICAgICB2YXIgZ3JvdXAgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsc2VsZWN0b3JzLmlkcy5ncm91cChwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJylcbiAgICAgICAgICAgIC5wbGFjZShwbG90KTtcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLnBsYWNlKGdyb3VwKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gYWRkVGlsZShwbG90TmFtZSwgbGV2ZWwsIGNvbHVtbiwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCkge1xuICAgICAgICB2YXIgdGlsZVVSTCA9IHVybCArIFwiL1wiICsgbGV2ZWwgKyBcIi9cIiArIGNvbHVtbiArIFwiLnBuZ1wiO1xuXG4gICAgICAgIHZhciB4ID0gY29sdW1uICogaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIHkgPSAwO1xuICAgICAgICB2YXIgd2lkdGggPSBpbWFnZVdpZHRoO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0YWcoKS5zZWxlY3Qoc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90TmFtZSwgbGV2ZWwpKTtcblxuICAgICAgICAvL2NyZWF0ZSB0aWxlXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdpbWFnZScpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd4JywgU3RyaW5nKHgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBzZWxlY3RvcnMuaWRzLnRpbGVJRChwbG90TmFtZSwgbGV2ZWwsIGNvbHVtbikpXG4gICAgICAgICAgICAuYWRkSFJFRih0aWxlVVJMKVxuICAgICAgICAgICAgLnBsYWNlKHN2Zyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9hZGRUaWxlcyhwbG90SUQsIGxldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgbGV2ZWwpO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgICAgICBhZGRUaWxlKHBsb3RJRCwgbGV2ZWwsIGMsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICAgICAgeCA9IHggKyAyNTY7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0VXBXaWRnZXQodGFyZ2V0SUQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyB0YWcoKS5zZWxlY3QodGFyZ2V0SUQpO1xuICAgICAgICBfYWRkQnV0dG9ucyh0YXJnZXQpO1xuICAgICAgICB2YXIgd2lkZ2V0ID0gX2NyZWF0ZVdpZGdldCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpO1xuICAgICAgICByZXR1cm4gd2lkZ2V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFVwUGxvdCh3aWRnZXQsICBwbG90SUQsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQsIHdpbmRvd1gsIHdpbmRvd1kpIHtcbiAgICAgICAgX2NyZWF0ZVBsb3RXaW5kb3cod2lkZ2V0LCBwbG90SUQsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQsIHdpbmRvd1gsIHdpbmRvd1kpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydFBsb3RJbWFnZXMocGxvdElELCBtaW5MZXZlbCwgbWF4TGV2ZWwsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIHBsb3RDb250YWluZXIgPSBuZXcgdGFnKCkuc2VsZWN0KCdwbG90Jyk7XG4gICAgICAgIF9hZGRQbG90VG9QYWdlKHBsb3RDb250YWluZXIsIHBsb3RJRCk7XG4gICAgICAgIGZvciAodmFyIGkgPSBtaW5MZXZlbDsgaTxtYXhMZXZlbCsxOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgaSk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW5zICogaW1hZ2VXaWR0aDtcbiAgICAgICAgICAgIHZhciBoZWlnaHQgPSBpbWFnZUhlaWdodDtcbiAgICAgICAgICAgIF9hZGRHcm91cChwbG90SUQsIGksIHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICAgICAgICAvLyB0aGlzIGlzIHVzZWQgdG8gYWRkIGFsbCBpbWFnZXMgdG8gcGFnZSBvbiBzZXR1cCwgcmF0aGVyIHRoYW4gYWRkaW5nIGltYWdlcyBvbiBkZW1hbmRcbiAgICAgICAgICAgIC8vX2FkZFRpbGVzKHBsb3RJRCwgaSwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZXRVcFdpZGdldDogc2V0VXBXaWRnZXQsXG4gICAgICAgIHNldFVwUGxvdDogc2V0VXBQbG90LFxuICAgICAgICBpbnNlcnRQbG90SW1hZ2VzOiBpbnNlcnRQbG90SW1hZ2VzLFxuICAgICAgICBhZGRUaWxlOiBhZGRUaWxlLFxuICAgIH1cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnNldHVwID0gc2V0dXA7IiwiXG4vKkhlbHBlcnMgZm9yIGNvbnZlcnRpbmcgYSBwYXJ0aWN1bGFyIHBvc2l0aW9uIHdpdGhpblxudGhlIHZpZXdpbmcgd2luZG93IHRvIGEgcGVyY2VudGFnZSBjb29yZGluYXRlIHdpdGhpbiB0aGUgYWN0dWFsIHBsb3QuIFxuXG5lLmcuIGEgcGxvdCBvZiBzaXplIDEwMjQgKiAyNTYgYW5kIGEgbW91c2UgcG9zaXRpb24gb2YgKDUxMiwxMjgpIHdvdWxkXG5naXZlIGEgJSBjb29yZGluYXRlIG9mICg1MCUsNTAlKSBhc3N1bWluZyB0aGF0IHRoZSBwbG90IGlzIGF0IHBvc2l0aW9uXG4oMCwwKSBhbmQgc2NhbGUoMSwxKS4gXG5cbkEgcGxvdCBvZiBzaXplIDIwNDggKiAyNTYgd2l0aCBwb3NpdGlvbiAoLTUxMiwgMCkgYW5kIHNjYWxlKDEsMSksIGFuZCBtb3VzZSBwb3NpdGlvbiBcbig1MTIsIDEyOCkgd291bGQgYWxzbyBnaXZlIGEgJSBjb29yZGluYXRlIG9mICg1MCUsIDUwJSkuXG5cblBsb3QgbGF5ZXJzICg8Zz4gZWxlbWVudHMpIGFyZSBwb3NpdGlvbmVkIGJ5IHRoZWlyIHRvcCBsZWZ0IGNvb3JkaW5hdGUuXG5XaGVuIHpvb21pbmcgaW4gYW5kIG91dCwgdGhlIHBsb3RzIG5lZWQgdG8gYmUgcmVwb3NpdGlvbmVkIGVhY2ggdGltZVxudGhleSBhcmUgcmUtc2NhbGVkLCBzbyB0aGF0IHRoZSBtb3VzZSBwb3NpdGlvbiBzdGF5cyBhdCBhcHByb3hpbWF0ZWx5IHRoZSBzYW1lXG5jb29yZGluYXRlIGluIHRoZSBwbG90LiBCZWZvcmUgem9vbWluZywgYSBwZXJjZW50IHBvc2l0aW9uIG9mIHRoZSBtb3VzZSBpcyBjYWxjdWxhdGVkLlxuQWZ0ZXIgem9vbWluZywgdGhlIHBlcmNlbnQgcG9zaXRpb24gaXMgcmUtY29udmVydGVkIHRvIGEgdG9wTGVmdCBjb29yZGluYXRlXG5hdCB0aGUgbmV3IHpvb20gbGV2ZWwgb2YgdGhlIHBsb3QuICovXG52YXIgcG9zaXRpb24gPSB7XG4gICAgY2FsY3VsYXRlUGVyY2VudDogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcG9zaXRpb25CLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgaWYgKGxlbmd0aEIgPD0gMCkgdGhyb3cgbmV3IEVycm9yKFwiTGVuZ3RoIG11c3QgYmUgcG9zaXRpdmUuXCIpO1xuICAgICAgICByZXR1cm4gKHBvc2l0aW9uQSAtIHBvc2l0aW9uQikgLyAobGVuZ3RoQiAqIHNjYWxlQik7XG4gICAgfSxcbiAgICBjYWxjdWxhdGVQb3NpdGlvbjogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcGVyY2VudEIsIGxlbmd0aEIsIHNjYWxlQikge1xuICAgICAgICByZXR1cm4gcG9zaXRpb25BIC0gKChsZW5ndGhCICogc2NhbGVCKSAqIHBlcmNlbnRCKTtcbiAgICB9LFxuICAgIC8qIGZvY3VzOiBtb3VzZSBwb3NpdGlvblxuICAgIHRvcExlZnQ6IHRvcCBsZWZ0IGNvb3JkaW5hdGUgb2YgcGxvdCBsYXllclxuICAgIHNjYWxlOiBzY2FsZSBvZiBwbG90IGxheWVyXG4gICAgd2lkdGg6IHdpZHRoIG9mIHBsb3QgbGF5ZXJcbiAgICBoZWlnaHQ6IGhlaWdodCBvZiBwbG90IGxheWVyKi9cbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICAvKiBwZXJjZW50YWdlOiBwZXJjZW50YWdlIGNvb3JkaW5hdGVzIG9mIHRoZSBjdXJyZW50IGZvY3VzICovXG4gICAgcGVyY2VudGFnZVRvVG9wTGVmdDogZnVuY3Rpb24gKGZvY3VzLCBwZXJjZW50YWdlLCBzY2FsZSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcG9zaXRpb24uY2FsY3VsYXRlUG9zaXRpb24oZm9jdXMueCwgcGVyY2VudGFnZS54LCB3aWR0aCwgc2NhbGUueCksXG4gICAgICAgICAgICB5OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy55LCBwZXJjZW50YWdlLnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMucG9zaXRpb24gPSBwb3NpdGlvbjsiLCIvKkNoZWNrIHRoYXQgc2NoZW1hL2ZpZWxkcyBvZiBhbiBvYmplY3QgbGl0ZXJhbFxuYXJlIHRoZSBleHBlY3RlZCBmaWVsZHMuICovXG52YXIgc2NoZW1hID0ge1xuICAgIGNoZWNrOiBmdW5jdGlvbiAob2JqZWN0LCBrZXlzKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmplY3QpLmxlbmd0aCAhPSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNjaGVtYSA9IHNjaGVtYTsiLCIvKlN0b3JlIGNvbnN0YW50cyBmb3IgaHRtbCBzZWxlY3RvcnMgKGNsYXNzZXMgYW5kIGlkcykgKi9cbnZhciBzZWxlY3RvcnMgPSB7XG4gICAgaWRzOiB7XG4gICAgICAgIHdpZGdldERpdjogJ3dpZGdldC1kaXYnLFxuICAgICAgICB3aWRnZXQ6ICd3aWRnZXQnLFxuICAgICAgICBwbG90OiAncGxvdCcsXG4gICAgICAgIGdyb3VwOiBmdW5jdGlvbiAocGxvdElELCBsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHBsb3RJRCtcIi1ncm91cC1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgICAgICBzdmdMYXllcjogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItc3ZnLWxheWVyXCIrbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgICAgIHRpbGVJRDogZnVuY3Rpb24ocGxvdElELCBsZXZlbCwgY29sdW1uKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ0aWxlLVwiK3Bsb3RJRCtcIi1sZXZlbFwiK2xldmVsK1wiLWNvbHVtblwiK2NvbHVtbjtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG4vKk1hbmlwdWxhdGUgc3ZnIHpvb20gbGV2ZWxzLiovXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyOyAvLyA8Zz4gZWxlbWVudCBmb3IgYSB6b29tIGxldmVsXG4gICAgdGhpcy5wbG90OyAvLyA8c3ZnIGlkPSdwbG90PiBlbGVtZW50IChwbG90IHZpZXdpbmcgd2luZG93KVxufTtcblxuLyogSW5pdGlhbGl6ZSAgKi9cbmVkaXRTVkcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgLy8gPGc+XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpO1xuICAgIC8vIHN2ZyB2aWV3aW5nIHdpbmRvdyBmb3IgcGxvdHNcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIC8vIDxzdmc+IGluc2lkZSB0aGUgPGc+XG4gICAgdGhpcy5pbm5lckNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuZGltZW5zaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgaWYgKCF0aGlzLmlubmVyQ29udGFpbmVyKSB0aHJvdyBuZXcgRXJyb3IoJ2VkaXRTVkc6IGlubmVyQ29udGFpbmVyIG11c3QgYmUgaW5pdGlhbGl6ZWQnKTtcbiAgICAvL3JldHVybiBbdGhpcy5pbm5lckNvbnRhaW5lci5nZXRCQm94KCkud2lkdGgsIHRoaXMuaW5uZXJDb250YWluZXIuZ2V0QkJveCgpLmhlaWdodF07XG4gICAgcmV0dXJuIFt0aGlzLmlubmVyQ29udGFpbmVyLndpZHRoLmJhc2VWYWwudmFsdWUsIHRoaXMuaW5uZXJDb250YWluZXIuaGVpZ2h0LmJhc2VWYWwudmFsdWVdO1xufVxuXG4vKkdldCBsaXN0IG9mIHRyYW5zZm9ybWF0aW9ucyBmb3IgYSA8Zz4gem9vbSBsZXZlbC5cblxuVHJhbnNmb3JtYXRpb25zIGxpc3Qgc2hvdWxkIGFsd2F5cyBjb250YWluIDIgaXRlbXMgb25seTogYSB0cmFuc2xhdGUoeCx5KSBhbmQgYSBzY2FsZSh4LHkpLlxuV2hlbiBsYXllcnMgYXJlIG1hbmlwdWxhdGVkIChtb3ZlZCBhbmQgc2NhbGVkKSwgdGhlc2UgdHJhbnNmb3JtcyBzaG91bGQgYmUgZWRpdGVkIGluIHBsYWNlLiovXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIFxuICAgIHZhciB0cmFuc2Zvcm1hdGlvbnMgPSB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xuICAgIGlmICghdHJhbnNmb3JtYXRpb25zLmxlbmd0aCB8fCB0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIGlmIHRyYW5zZm9ybWF0aW9ucyBsaXN0IGlzIGVtcHR5LCBjcmVhdGUgaXRcbiAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgdHJhbnNsYXRlLnNldFRyYW5zbGF0ZSgwLCAwKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHRyYW5zbGF0ZSwgMCk7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICBzY2FsZS5zZXRTY2FsZSgxLjAsIDEuMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZShzY2FsZSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgdHJhbnNmb3JtcyBpcyBub3QgZW1wdHksIGRvdWJsZSBjaGVjayB0aGF0IHRoZXJlIGFyZSBvbmx5IDIgdHJhbnNmb3Jtc1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCAhPT0gMikgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogZXhwZWN0ZWQgdHJhbnNmb3JtYXRpb25zIHRvIGJlIGEgbGlzdCBvZiBsZW5ndGggMiwgbm90XCIrdHJhbnNmb3JtYXRpb25zLmxlbmd0aCk7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgwKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9UUkFOU0xBVEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCIpO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMSkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xufTtcblxuLypFZGl0IHRoZSBwb3NpdGlvbiBvZiBhIDxnPiBsYXllciAqL1xuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKHNoaWZ0WCwgc2hpZnRZKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpXG4gICAgaWYgKCghc2hpZnRYIHx8ICFzaGlmdFkpICYmIChzaGlmdFggIT0gMCAmJiBzaGlmdFkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGNhbm5vdCB0cmFuc2xhdGUgU1ZHIG9iamVjdCB3aXRoIG51bGwsIHVuZGVmaW5lZCwgb3IgZW1wdHkgc2hpZnQgdmFsdWVzLiBzaGlmdFg6IFwiK3NoaWZ0WCtcIiBzaGlmdFk6XCIrc2hpZnRZKTtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMCk7XG4gICAgaWYgKHRyYW5zbGF0aW9uLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIik7XG4gICAgdHJhbnNsYXRpb24uc2V0VHJhbnNsYXRlKHNoaWZ0WCwgc2hpZnRZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qIEVkaXQgdGhlIHNjYWxlIG9mIGEgPGc+IGxheWVyICovXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IHNlY29uZCB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCIpO1xuICAgIHNjYWxlLnNldFNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qIEVkaXQgdGhlIG9wYWNpdHkgb2YgYSA8Zz4gbGF5ZXIgKi9cbmVkaXRTVkcucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbiAob3BhY2l0eSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcIm9wYWNpdHlcIiwgb3BhY2l0eSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKiBIaWRlIGxheWVyICovXG5lZGl0U1ZHLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKiBTaG93IGxheWVyICovXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMuZWRpdFNWRyA9IGVkaXRTVkc7IiwidmFyIHR5cGVjaGVjayA9IHJlcXVpcmUoJy4vdHlwZWNoZWNrLmpzJykudHlwZWNoZWNrO1xuXG4vKkZvciBtYW5pcHVsYXRpbmcgRE9NIGVsZW1lbnRzLiBNZXRob2RzIGNhbiBiZSBjaGFpbmVkLlxuXG5KUXVlcnkgaXMgbWFkZSBmb3IgdGhlIEhUTUwgRE9NLCBzbyBpdCBpc24ndCBjb21wYXRpYmxlIHdpdGggU1ZHIERPTS5cblRoZXNlIGFyZSBhIGZldyBoZWxwZXIgZnVuY3Rpb25zIHRvIHJlcGxhY2Ugc29tZSBqcXVlcnkgZnVuY3Rpb25hbGl0eS5cbkNvdWxkIHJlcGxhY2UgdGhlc2Ugd2l0aCBkMyBpZiBkZXNpcmVkLiovXG52YXIgdGFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG4vLyBpbml0aWFsaXplIFxudGFnLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZXQoKSBjYW5ub3Qgb3ZlcnJpZGUgbm9uLW51bGwgZWxlbWVudCB3aXRoIG5ldyBlbGVtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHJldHVybiB0aGlzO1xufVxuXG4vKiBDcmVhdGUgZ2VuZXJpYyBodG1sIGRvbSBlbGVtZW50OyBkb24ndCB1c2UgZm9yIHN2ZyAqL1xudGFnLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGUoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKiBTVkcgZWxlbWVudHMgbXVzdCBiZSBjcmVhdGVkIHdpdGggYWRkaXRpb25hbCBuYW1lc3BhY2UuICovXG50YWcucHJvdG90eXBlLmNyZWF0ZU5TID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZCh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuY3JlYXRlTlMoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2VsZWN0IGVsZW1lbnQgYnkgaWRcbnRhZy5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZWxlY3QoKSBtdXN0IGhhdmUgYW4gYGlkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2V0IGF0dHJpYnV0ZSBvZiBlbGVtZW50IHRvIHZhbHVlXG50YWcucHJvdG90eXBlLmF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGF0dHIpIHx8IHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hdHRyaWJ1dGUoKSBtdXN0IGhhdmUgYGF0dHJgIGFuZCBgdmFsdWVgIGFyZ3VtZW50cy5cIik7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKkFwcGVuZCBjaGlsZCBlbGVtZW50IHRvIHRoaXMgZWxlbWVudC4gKi9cbnRhZy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoY2hpbGQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hcHBlbmQoKSBtdXN0IGhhdmUgYSBgY2hpbGRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKiBBcHBlbmQgdGhpcyBlbGVtZW50IHRvIHBhcmVudCBlbGVtZW50ICovXG50YWcucHJvdG90eXBlLnBsYWNlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnBsYWNlKCkgbXVzdCBoYXZlIGEgYHBhcmVudGAgYXJndW1lbnQuXCIpO1xuICAgIHBhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyByZW1vdmUgdGhpcyBlbGVtZW50IGZyb20gcGFyZW50IGVsZW1lbnRcbnRhZy5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnJlbW92ZSgpIG11c3QgaGF2ZSBhIGBwYXJlbnRgIGFyZ3VtZW50LlwiKTtcbiAgICBwYXJlbnQuZWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xufTtcblxuLyppbWFnZSBsaW5rIGZvciBhIHN2ZyBpbWFnZSBtdXN0IGJlIHNldCB3aXRoIHRoZSBzZXRBdHRyaWJ1dGVOUyBtZXRob2QsIHVubGlrZSBodG1sICovXG50YWcucHJvdG90eXBlLmFkZEhSRUYgPSBmdW5jdGlvbiAoaHJlZikge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGhyZWYpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hZGRIUkVGKCkgbXVzdCBoYXZlIGEgYGhyZWZgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnRhZyA9IHRhZztcbiIsIi8qVXRpbCBmb3IgdHlwZWNoZWNraW5nIGlmIGEgdmFsdWUgaXMgbnVsbCBvciB1bmRlZmluZWQuKi9cbnZhciB0eXBlY2hlY2sgPSB7XG4gICAgbnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnR5cGVjaGVjayA9IHR5cGVjaGVjazsiXX0=
