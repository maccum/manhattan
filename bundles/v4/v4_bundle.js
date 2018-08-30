(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;
var plot = require('./plot/plot.js').plot;
var gui = require('./ui/gui.js').gui;
var handlers = require('./ui/handlers.js').handlers;
var hover = require('./ui/hover.js').hover;

function init() {
    var about = {
        0: {id: 0, title: 'caffeine_consumption', minZoom: 2, maxZoom: 7, url: '../plots/caffeine_plots/caffeine_consumption', tileWidth: 256, tileHeight: 256, x_axis_range: [804164,3035220653], y_axis_range: [-4.999996965150714,14.767494897838054], desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed'},
        1: {id: 1, title: 'standing_height', minZoom: 2, maxZoom: 8, url: '../plots/standing_height_plots/standing_height', tileWidth: 256, tileHeight: 256, x_axis_range: [693730, 2880965782], y_axis_range: [0, 670.175],desc: 'do eiusmod tempor incididunt ut labore et dolore magna aliqua.'},
        2: {id: 2, title: 'caffeine_consumption2', minZoom: 2, maxZoom: 8, url: '../plots/caffeine_plots_2/caffeine_consumption', tileWidth: 256, tileHeight: 256, x_axis_range: [-9095836,3045120653], y_axis_range: [-1.9999969651507141,11.767494897838054], desc: 'transparent background'},
        //id#: {id: , title: , minZoom: , maxZoom: , url: , tileWidth: , tileHeight: , x_axis_range: , y_axis_range},
    };

    search(Object.values(about));

    // add widget stuff to page
    var widget = setup.setUpWidget('widget-div', selectors.ids.widget, 1124, 350, '#e8ebef');
    setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);

    // add images and initialize each plot
    Object.keys(about).map(function (key) {
        setup.insertPlotImages(about[key].title, about[key].minZoom, 
            about[key].maxZoom, about[key].url, about[key].tileWidth, 
            about[key].tileHeight);
        plot.addPlotByName(key, about[key].title, about[key].minZoom, 
            about[key].maxZoom, about[key].url);
    });

    // set up default plot for model
    //plot.switchPlots('caffeine_consumption2');
    plot.switchPlots(2);

    // display default plot
    gui.render(plot.getInfoForGUI());

    // set up listeners
    handlers.listenForDrag(document.getElementById('plot'));
    document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
    document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
    document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);

    // hover listener
    hover.insertTextbox('plot');
    //hover.insertTextbox('widget');
    document.getElementById('plot').addEventListener('mousemove', hover.hoverListener);
}

init();
},{"./plot/plot.js":2,"./ui/gui.js":4,"./ui/handlers.js":5,"./ui/hover.js":6,"./ui/search.js":7,"./ui/setup.js":8,"./utils/selectors.js":10}],2:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("./position.js").position;

var plot = (function () {
    var plotsByName = {
        // id: {id: , title: , minZoom: , maxZoom},
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

    function addPlotByName(id, title, minZoom, maxZoom, url) {
        //plotsByName[name] = { url: url, minZoom: minZoom, maxZoom: maxZoom };
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
            plotID: plotsByName[plotID].title,
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
                    console.log(new Date().getTime());
                    console.log(tilesInView);
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
},{"../plot/plot.js":2,"../plot/position.js":3,"../utils/typecheck.js":13}],7:[function(require,module,exports){
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

/* 
Search bar for displaying results of query.

dependency: fuse 
*/
var search = function (phenotypes) {

    var results = []; // result from search query
    var focus = 1; // n-th row of results table we're focused on
/*
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
    ];*/

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
                        //switchPlots(query);
                        switchPlots(res[0].item.id);
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

    function switchPlots(plotID) {
        // change visible plot!
        console.log('changing plots: '+plotID);
        var oldPlotID = plot.getPlotID(); // id number
        plot.switchPlots(plotID);
        console.log('hiding: '+plot.getPlotsByName()[oldPlotID].title);
        gui.hide(plot.getPlotsByName()[oldPlotID].title);
        gui.render(plot.getInfoForGUI());
    }

    $('#searchbar').on('keyup', searchBarKeyUp);
    $('#searchbar').on('keypress', searchBarKeyPress);
    $('#searchbar').on('keydown', searchBarKeyDown);

};

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjQvc3JjL21haW4uanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bsb3QuanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bvc2l0aW9uLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvZ3VpLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvaGFuZGxlcnMuanMiLCJzY3JpcHRzL3Y0L3NyYy91aS9ob3Zlci5qcyIsInNjcmlwdHMvdjQvc3JjL3VpL3NlYXJjaC5qcyIsInNjcmlwdHMvdjQvc3JjL3VpL3NldHVwLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc2NoZW1hLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc2VsZWN0b3JzLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc3ZnLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvdGFnLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvdHlwZWNoZWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIHNlYXJjaCA9IHJlcXVpcmUoJy4vdWkvc2VhcmNoLmpzJykuc2VhcmNoO1xudmFyIHNldHVwID0gcmVxdWlyZSgnLi91aS9zZXR1cC5qcycpLnNldHVwO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi91aS9ndWkuanMnKS5ndWk7XG52YXIgaGFuZGxlcnMgPSByZXF1aXJlKCcuL3VpL2hhbmRsZXJzLmpzJykuaGFuZGxlcnM7XG52YXIgaG92ZXIgPSByZXF1aXJlKCcuL3VpL2hvdmVyLmpzJykuaG92ZXI7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdmFyIGFib3V0ID0ge1xuICAgICAgICAwOiB7aWQ6IDAsIHRpdGxlOiAnY2FmZmVpbmVfY29uc3VtcHRpb24nLCBtaW5ab29tOiAyLCBtYXhab29tOiA3LCB1cmw6ICcuLi9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsIHRpbGVXaWR0aDogMjU2LCB0aWxlSGVpZ2h0OiAyNTYsIHhfYXhpc19yYW5nZTogWzgwNDE2NCwzMDM1MjIwNjUzXSwgeV9heGlzX3JhbmdlOiBbLTQuOTk5OTk2OTY1MTUwNzE0LDE0Ljc2NzQ5NDg5NzgzODA1NF0sIGRlc2M6ICdMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LCBzZWQnfSxcbiAgICAgICAgMToge2lkOiAxLCB0aXRsZTogJ3N0YW5kaW5nX2hlaWdodCcsIG1pblpvb206IDIsIG1heFpvb206IDgsIHVybDogJy4uL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLCB0aWxlV2lkdGg6IDI1NiwgdGlsZUhlaWdodDogMjU2LCB4X2F4aXNfcmFuZ2U6IFs2OTM3MzAsIDI4ODA5NjU3ODJdLCB5X2F4aXNfcmFuZ2U6IFswLCA2NzAuMTc1XSxkZXNjOiAnZG8gZWl1c21vZCB0ZW1wb3IgaW5jaWRpZHVudCB1dCBsYWJvcmUgZXQgZG9sb3JlIG1hZ25hIGFsaXF1YS4nfSxcbiAgICAgICAgMjoge2lkOiAyLCB0aXRsZTogJ2NhZmZlaW5lX2NvbnN1bXB0aW9uMicsIG1pblpvb206IDIsIG1heFpvb206IDgsIHVybDogJy4uL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzXzIvY2FmZmVpbmVfY29uc3VtcHRpb24nLCB0aWxlV2lkdGg6IDI1NiwgdGlsZUhlaWdodDogMjU2LCB4X2F4aXNfcmFuZ2U6IFstOTA5NTgzNiwzMDQ1MTIwNjUzXSwgeV9heGlzX3JhbmdlOiBbLTEuOTk5OTk2OTY1MTUwNzE0MSwxMS43Njc0OTQ4OTc4MzgwNTRdLCBkZXNjOiAndHJhbnNwYXJlbnQgYmFja2dyb3VuZCd9LFxuICAgICAgICAvL2lkIzoge2lkOiAsIHRpdGxlOiAsIG1pblpvb206ICwgbWF4Wm9vbTogLCB1cmw6ICwgdGlsZVdpZHRoOiAsIHRpbGVIZWlnaHQ6ICwgeF9heGlzX3JhbmdlOiAsIHlfYXhpc19yYW5nZX0sXG4gICAgfTtcblxuICAgIHNlYXJjaChPYmplY3QudmFsdWVzKGFib3V0KSk7XG5cbiAgICAvLyBhZGQgd2lkZ2V0IHN0dWZmIHRvIHBhZ2VcbiAgICB2YXIgd2lkZ2V0ID0gc2V0dXAuc2V0VXBXaWRnZXQoJ3dpZGdldC1kaXYnLCBzZWxlY3RvcnMuaWRzLndpZGdldCwgMTEyNCwgMzUwLCAnI2U4ZWJlZicpO1xuICAgIHNldHVwLnNldFVwUGxvdCh3aWRnZXQsIHNlbGVjdG9ycy5pZHMucGxvdCwgMTAyNCwgMjU2LCA1MCwgMzApO1xuXG4gICAgLy8gYWRkIGltYWdlcyBhbmQgaW5pdGlhbGl6ZSBlYWNoIHBsb3RcbiAgICBPYmplY3Qua2V5cyhhYm91dCkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgc2V0dXAuaW5zZXJ0UGxvdEltYWdlcyhhYm91dFtrZXldLnRpdGxlLCBhYm91dFtrZXldLm1pblpvb20sIFxuICAgICAgICAgICAgYWJvdXRba2V5XS5tYXhab29tLCBhYm91dFtrZXldLnVybCwgYWJvdXRba2V5XS50aWxlV2lkdGgsIFxuICAgICAgICAgICAgYWJvdXRba2V5XS50aWxlSGVpZ2h0KTtcbiAgICAgICAgcGxvdC5hZGRQbG90QnlOYW1lKGtleSwgYWJvdXRba2V5XS50aXRsZSwgYWJvdXRba2V5XS5taW5ab29tLCBcbiAgICAgICAgICAgIGFib3V0W2tleV0ubWF4Wm9vbSwgYWJvdXRba2V5XS51cmwpO1xuICAgIH0pO1xuXG4gICAgLy8gc2V0IHVwIGRlZmF1bHQgcGxvdCBmb3IgbW9kZWxcbiAgICAvL3Bsb3Quc3dpdGNoUGxvdHMoJ2NhZmZlaW5lX2NvbnN1bXB0aW9uMicpO1xuICAgIHBsb3Quc3dpdGNoUGxvdHMoMik7XG5cbiAgICAvLyBkaXNwbGF5IGRlZmF1bHQgcGxvdFxuICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuXG4gICAgLy8gc2V0IHVwIGxpc3RlbmVyc1xuICAgIGhhbmRsZXJzLmxpc3RlbkZvckRyYWcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bsb3QnKSk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBoYW5kbGVycy5vbldoZWVsKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20taW4tYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbUluKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20tb3V0LWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlcnMub25CdXR0b25DbGlja1pvb21PdXQpO1xuXG4gICAgLy8gaG92ZXIgbGlzdGVuZXJcbiAgICBob3Zlci5pbnNlcnRUZXh0Ym94KCdwbG90Jyk7XG4gICAgLy9ob3Zlci5pbnNlcnRUZXh0Ym94KCd3aWRnZXQnKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGhvdmVyLmhvdmVyTGlzdGVuZXIpO1xufVxuXG5pbml0KCk7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuL3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuXG52YXIgcGxvdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBsb3RzQnlOYW1lID0ge1xuICAgICAgICAvLyBpZDoge2lkOiAsIHRpdGxlOiAsIG1pblpvb206ICwgbWF4Wm9vbX0sXG4gICAgfVxuXG4gICAgdmFyIHBsb3RJRCA9IG51bGwsXG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIHNjYWxlRmFjdG9yID0gMTAwMDAsXG4gICAgICAgIHpvb21JbmNyZW1lbnQgPSA1LFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbNjAwMCwgOTAwMF0sXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzEyMDAwLCAxODAwMF0sXG4gICAgICAgIHZpc2libGVzID0ge30sXG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKSxcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuXG5cbiAgICBmdW5jdGlvbiBnZXRQbG90SUQoKSB7XG4gICAgICAgIHJldHVybiBwbG90SUQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UGxvdHNCeU5hbWUoKSB7XG4gICAgICAgIHJldHVybiBwbG90c0J5TmFtZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREaW1lbnNpb25zKCkge1xuICAgICAgICByZXR1cm4gZGltZW5zaW9ucztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRWaXNpYmxlcygpIHtcbiAgICAgICAgcmV0dXJuIHZpc2libGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEhpZGRlbnMoKSB7XG4gICAgICAgIHJldHVybiBoaWRkZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFBsb3RCeU5hbWUoaWQsIHRpdGxlLCBtaW5ab29tLCBtYXhab29tLCB1cmwpIHtcbiAgICAgICAgLy9wbG90c0J5TmFtZVtuYW1lXSA9IHsgdXJsOiB1cmwsIG1pblpvb206IG1pblpvb20sIG1heFpvb206IG1heFpvb20gfTtcbiAgICAgICAgcGxvdHNCeU5hbWVbaWRdID0geyBpZDogaWQsIHRpdGxlOiB0aXRsZSwgbWluWm9vbTogbWluWm9vbSwgbWF4Wm9vbTogbWF4Wm9vbSwgdXJsOiB1cmx9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBwbG90SUQgPSBudWxsO1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNaW5NYXhMZXZlbChtaW4sIG1heCkge1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBtaW47XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG1heDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplVmlzaWJsZShsZXZlbCwgZGltcykge1xuICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB7IHg6IDAsIHk6IDAgfSwgc2NhbGU6IHsgeDogMSAqIHNjYWxlRmFjdG9yLCB5OiAxICogc2NhbGVGYWN0b3IgfSwgb3BhY2l0eTogMSB9O1xuICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVIaWRkZW4obGV2ZWwsIGRpbXMpIHtcbiAgICAgICAgaWYgKGxldmVsIDwgbWluaW11bUxldmVsIHx8IGxldmVsID4gbWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIGhpZGRlbiBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIGhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hQbG90cyhpZCkge1xuICAgICAgICByZXNldCgpO1xuICAgICAgICBwbG90SUQgPSBpZDtcbiAgICAgICAgdmFyIG1pblpvb20gPSBwbG90c0J5TmFtZVtpZF0ubWluWm9vbSxcbiAgICAgICAgICAgIG1heFpvb20gPSBwbG90c0J5TmFtZVtpZF0ubWF4Wm9vbTtcbiAgICAgICAgc2V0TWluTWF4TGV2ZWwobWluWm9vbSwgbWF4Wm9vbSk7XG5cbiAgICAgICAgLy8gVE9ETzogbWFrZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHBsb3RzIGZsZXhpYmxlXG4gICAgICAgIHZhciBuQ29scyA9IGZ1bmN0aW9uICh6KSB7IHJldHVybiBNYXRoLnBvdygyLCB6KTsgfVxuICAgICAgICBpbml0aWFsaXplVmlzaWJsZShtaW5ab29tLCB7IHdpZHRoOiBuQ29scyhtaW5ab29tKSAqIDI1NiwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIGZvciAodmFyIGkgPSBtaW5ab29tICsgMTsgaSA8IG1heFpvb20gKyAxOyBpKyspIHtcbiAgICAgICAgICAgIGluaXRpYWxpemVIaWRkZW4oaSwgeyB3aWR0aDogbkNvbHMoaSkgKiAyNTYsIGhlaWdodDogMjU2IH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5pdFNjYWxlKHNjYWxlKSB7XG4gICAgICAgIGlmICgoc2NhbGUueCA+IC41ICYmIHNjYWxlLnggPCAyKSB8fCAoc2NhbGUueSA+IC41ICYmIHNjYWxlLnkgPCAyKSkgdGhyb3cgbmV3IEVycm9yKCdzY2FsZSBhbHJlYWR5IGluIHVuaXQgc2NhbGUnKTtcbiAgICAgICAgcmV0dXJuIHsgeDogc2NhbGUueCAvIHNjYWxlRmFjdG9yLCB5OiBzY2FsZS55IC8gc2NhbGVGYWN0b3IgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93KGxldmVsLCB0b3BMZWZ0LCBzY2FsZSwgb3BhY2l0eSkge1xuICAgICAgICBpZiAoIWhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgbmV3IEVycm9yKFwiVHJpZWQgdG8gc2hvdyBhIGxldmVsIHRoYXQgd2FzIG5vdCBoaWRkZW4uXCIpO1xuICAgICAgICB2aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogdG9wTGVmdCwgc2NhbGU6IHNjYWxlLCBvcGFjaXR5OiBvcGFjaXR5IH07XG4gICAgICAgIGhpZGRlbnMuZGVsZXRlKGxldmVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoaWRlKGxldmVsKSB7XG4gICAgICAgIGlmICghdmlzaWJsZXNbbGV2ZWxdKSB0aHJvdyBuZXcgRXJyb3IoXCJUcmllZCB0byBoaWRlIGEgbGV2ZWwgdGhhdCBpcyBub3QgdmlzaWJsZVwiKTtcbiAgICAgICAgZGVsZXRlIHZpc2libGVzW2xldmVsXTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBzY2FsZS54O1xuICAgICAgICBpZiAoeFNjYWxlIDwgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGhpZ2hlciB6b29tIGxldmVsIChvbiB0b3AgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIG1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbLjIsIDFdKTtcbiAgICAgICAgfSBlbHNlIGlmICh4U2NhbGUgPiBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBsb3dlciB6b29tIGxldmVsIChiZWxvdyBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gbWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzEsIC4yXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcFZhbHVlT250b1JhbmdlKHZhbHVlLCBvbGRSYW5nZSwgbmV3UmFuZ2UpIHtcbiAgICAgICAgdmFyIG9sZFNwYW4gPSBvbGRSYW5nZVsxXSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgbmV3U3BhbiA9IG5ld1JhbmdlWzFdIC0gbmV3UmFuZ2VbMF07XG4gICAgICAgIHZhciBkaXN0YW5jZVRvVmFsdWUgPSB2YWx1ZSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgcGVyY2VudFNwYW5Ub1ZhbHVlID0gZGlzdGFuY2VUb1ZhbHVlIC8gb2xkU3BhbjtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9OZXdWYWx1ZSA9IHBlcmNlbnRTcGFuVG9WYWx1ZSAqIG5ld1NwYW47XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IG5ld1JhbmdlWzBdICsgZGlzdGFuY2VUb05ld1ZhbHVlO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwb3NpdGlvbihuZXdUb3BMZWZ0KSB7XG4gICAgICAgIGlmICgoIW5ld1RvcExlZnQueCAmJiBuZXdUb3BMZWZ0LnggIT0gMCkgfHwgKCFuZXdUb3BMZWZ0LnkgJiYgbmV3VG9wTGVmdC55ICE9IDApKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbmV3IFRvcCBMZWZ0OiBbXCIgKyBuZXdUb3BMZWZ0LnggKyBcIiwgXCIgKyBuZXdUb3BMZWZ0LnkgKyBcIl1cIik7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS50b3BMZWZ0ID0gbmV3VG9wTGVmdDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0T3BhY2l0aWVzKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0ub3BhY2l0eSA9IGNhbGN1bGF0ZU9wYWNpdHkodmlzaWJsZXNba2V5XS5zY2FsZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRQbG90SUQoaWQpIHtcbiAgICAgICAgcGxvdElEID0gaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SW5mb0ZvckdVSSgpIHtcbiAgICAgICAgdmFyIGxpc3RPZlZpc2libGVzID0gT2JqZWN0LmtleXModmlzaWJsZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAvLyBjb252ZXJ0IHNjYWxlIGZvciBwYXNzaW5nIHRvIEdVSTogXG4gICAgICAgICAgICB2YXIgZ3VpTGF5ZXIgPSB7XG4gICAgICAgICAgICAgICAgbGV2ZWw6IHZpc2libGVzW2tleV0ubGV2ZWwsXG4gICAgICAgICAgICAgICAgdG9wTGVmdDogdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgIHNjYWxlOiB1bml0U2NhbGUodmlzaWJsZXNba2V5XS5zY2FsZSksXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogdmlzaWJsZXNba2V5XS5vcGFjaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBndWlMYXllcjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShoaWRkZW5zKTtcbiAgICAgICAgLy9yZXR1cm4gW2xpc3RPZlZpc2libGVzLCBsaXN0T2ZIaWRkZW5zXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBsb3RJRDogcGxvdHNCeU5hbWVbcGxvdElEXS50aXRsZSxcbiAgICAgICAgICAgIHZpc2libGVMYXllcnM6IGxpc3RPZlZpc2libGVzLFxuICAgICAgICAgICAgaGlkZGVuTGV2ZWxzOiBsaXN0T2ZIaWRkZW5zLFxuICAgICAgICAgICAgZGltZW5zaW9uczogZ2V0RGltZW5zaW9ucygpLFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJGb3JUZXN0aW5nKCkge1xuICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbmNyZWFzZVNjYWxlKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPCBzY2FsZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCArPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID49IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpICsgMTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA8PSBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjYWxlID0geyB4OiBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0sIHk6IDEgKiBzY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWNyZWFzZVNjYWxlKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSA9PSBtaW5pbXVtTGV2ZWwgJiYgdmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlRmFjdG9yKSkge1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8PSBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0gJiYga2V5ID4gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgaGlkZShrZXkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpIC0gMTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA+PSBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjYWxlID0geyB4OiBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSwgeTogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gem9vbShmb2N1cywgdmVydGljYWwpIHtcbiAgICAgICAgdmFyIGZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgZmlyc3QgPSB2aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICB3aWR0aCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gZGltZW5zaW9uc1tmaXJzdEtleV0uaGVpZ2h0O1xuXG4gICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKGZvY3VzLCBmaXJzdC50b3BMZWZ0LCB1bml0U2NhbGUoZmlyc3Quc2NhbGUpLCB3aWR0aCwgaGVpZ2h0KTtcblxuICAgICAgICB2YXIgaG93TXVjaCA9IE1hdGguZmxvb3IoTWF0aC5hYnModmVydGljYWwpIC8gNSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG93TXVjaDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodmVydGljYWwgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbmNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVjcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgbmV3Rmlyc3QgPSB2aXNpYmxlc1tuZXdGaXJzdEtleV0sXG4gICAgICAgICAgICBuZXdXaWR0aCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgbmV3SGVpZ2h0ID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0uaGVpZ2h0O1xuXG4gICAgICAgIHZhciBuZXdUb3BMZWZ0ID0gcG9zaXRpb24ucGVyY2VudGFnZVRvVG9wTGVmdChmb2N1cywgcGVyY2VudGFnZUNvb3JkaW5hdGVzLCB1bml0U2NhbGUobmV3Rmlyc3Quc2NhbGUpLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KTtcbiAgICAgICAgcmVwb3NpdGlvbihuZXdUb3BMZWZ0KTtcbiAgICAgICAgcmVzZXRPcGFjaXRpZXMoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzbmFwSW4oZm9jdXMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcyk7XG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSB2aXNpYmxlc1tPYmplY3Qua2V5cyh2aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNSkge1xuICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCAtNSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc25hcE91dChmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA0KSB7XG4gICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYWcoY2hhbmdlSW5Qb3NpdGlvbikge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdC54ICs9IGNoYW5nZUluUG9zaXRpb24ueDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNldFBsb3RJRDogc2V0UGxvdElELFxuICAgICAgICBnZXRJbmZvRm9yR1VJOiBnZXRJbmZvRm9yR1VJLFxuICAgICAgICBnZXRQbG90SUQ6IGdldFBsb3RJRCxcbiAgICAgICAgaW5pdGlhbGl6ZVZpc2libGU6IGluaXRpYWxpemVWaXNpYmxlLFxuICAgICAgICBpbml0aWFsaXplSGlkZGVuOiBpbml0aWFsaXplSGlkZGVuLFxuICAgICAgICBjbGVhckZvclRlc3Rpbmc6IGNsZWFyRm9yVGVzdGluZyxcbiAgICAgICAgZ2V0VmlzaWJsZXM6IGdldFZpc2libGVzLFxuICAgICAgICBnZXRIaWRkZW5zOiBnZXRIaWRkZW5zLFxuICAgICAgICBpbmNyZWFzZVNjYWxlOiBpbmNyZWFzZVNjYWxlLFxuICAgICAgICBkZWNyZWFzZVNjYWxlOiBkZWNyZWFzZVNjYWxlLFxuICAgICAgICB6b29tOiB6b29tLFxuICAgICAgICBzbmFwSW46IHNuYXBJbixcbiAgICAgICAgc25hcE91dDogc25hcE91dCxcbiAgICAgICAgZHJhZzogZHJhZyxcbiAgICAgICAgc2V0TWluTWF4TGV2ZWw6IHNldE1pbk1heExldmVsLFxuICAgICAgICByZXNldDogcmVzZXQsXG4gICAgICAgIGFkZFBsb3RCeU5hbWU6IGFkZFBsb3RCeU5hbWUsXG4gICAgICAgIHN3aXRjaFBsb3RzOiBzd2l0Y2hQbG90cyxcbiAgICAgICAgZ2V0RGltZW5zaW9uczogZ2V0RGltZW5zaW9ucyxcbiAgICAgICAgZ2V0UGxvdHNCeU5hbWU6IGdldFBsb3RzQnlOYW1lLFxuICAgICAgICBfaGlkZTogaGlkZSxcbiAgICAgICAgX3Nob3c6IHNob3csXG4gICAgICAgIF9jYWxjdWxhdGVPcGFjaXR5OiBjYWxjdWxhdGVPcGFjaXR5LFxuICAgICAgICBfbWFwVmFsdWVPbnRvUmFuZ2U6IG1hcFZhbHVlT250b1JhbmdlLFxuICAgIH07XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cy5wbG90ID0gcGxvdDsiLCJ2YXIgcG9zaXRpb24gPSB7XG4gICAgY2FsY3VsYXRlUGVyY2VudDogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcG9zaXRpb25CLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgaWYgKGxlbmd0aEIgPD0gMCkgdGhyb3cgbmV3IEVycm9yKFwiTGVuZ3RoIG11c3QgYmUgcG9zaXRpdmUuXCIpO1xuICAgICAgICByZXR1cm4gKHBvc2l0aW9uQSAtIHBvc2l0aW9uQikgLyAobGVuZ3RoQiAqIHNjYWxlQik7XG4gICAgfSxcbiAgICBjYWxjdWxhdGVQb3NpdGlvbjogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcGVyY2VudEIsIGxlbmd0aEIsIHNjYWxlQikge1xuICAgICAgICByZXR1cm4gcG9zaXRpb25BIC0gKChsZW5ndGhCICogc2NhbGVCKSAqIHBlcmNlbnRCKTtcbiAgICB9LFxuICAgIHRvcExlZnRUb1BlcmNlbnRhZ2U6IGZ1bmN0aW9uIChmb2N1cywgdG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHBvc2l0aW9uLmNhbGN1bGF0ZVBlcmNlbnQoZm9jdXMueCwgdG9wTGVmdC54LCB3aWR0aCwgc2NhbGUueCksXG4gICAgICAgICAgICB5OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLnksIHRvcExlZnQueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHBlcmNlbnRhZ2VUb1RvcExlZnQ6IGZ1bmN0aW9uIChmb2N1cywgcGVyY2VudGFnZSwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLngsIHBlcmNlbnRhZ2UueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUG9zaXRpb24oZm9jdXMueSwgcGVyY2VudGFnZS55LCBoZWlnaHQsIHNjYWxlLnkpLFxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLnBvc2l0aW9uID0gcG9zaXRpb247IiwidmFyIGVkaXRTVkcgPSByZXF1aXJlKCcuLi91dGlscy9zdmcuanMnKS5lZGl0U1ZHO1xudmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciB0YWcgPSByZXF1aXJlKCcuLi91dGlscy90YWcuanMnKS50YWc7XG5cbnZhciBndWkgPSB7XG4gICAgaGlkZTogZnVuY3Rpb24ocGxvdElEKSB7XG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICBzY2hlbWEuY2hlY2soYXJncywgWydwbG90SUQnLCAndmlzaWJsZUxheWVycycsICdoaWRkZW5MZXZlbHMnLCAnZGltZW5zaW9ucyddKTtcbiAgICAgICAgdmFyIHBsb3RJRCA9IGFyZ3MucGxvdElELFxuICAgICAgICAgICAgdmlzaWJsZUxheWVycyA9IGFyZ3MudmlzaWJsZUxheWVycyxcbiAgICAgICAgICAgIGhpZGRlbkxldmVscyA9IGFyZ3MuaGlkZGVuTGV2ZWxzLFxuICAgICAgICAgICAgZGltcyA9IGFyZ3MuZGltZW5zaW9ucztcblxuICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuXG4gICAgICAgIGlmICghKHZpc2libGVMYXllcnMubGVuZ3RoID4gMCAmJiB2aXNpYmxlTGF5ZXJzLmxlbmd0aCA8PSAyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBoYXZlIDEtMiB2aXNpYmxlIGxheWVycy5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBoaWRkZW5JbmRleCBpbiBoaWRkZW5MZXZlbHMpIHtcbiAgICAgICAgICAgIHZhciBsZXZlbCA9IGhpZGRlbkxldmVsc1toaWRkZW5JbmRleF07XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGxldmVsKSAhPSAnW29iamVjdCBOdW1iZXJdJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSSBFUlJPUjogZXhwZWN0ZWQgYSBsaXN0IG9mIG51bWJlcnMgZm9yIGhpZGRlbkxheWVycy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXcgZWRpdFNWRygpLnNldChwbG90SUQsIGxldmVsKS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciB2aXNpYmxlSW5kZXggaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmFyIGxheWVyID0gdmlzaWJsZUxheWVyc1t2aXNpYmxlSW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEubGF5ZXIobGF5ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGV4cGVjdGVkIGxheWVyIHNjaGVtYS5cIik7XG4gICAgICAgICAgICBpZiAobGF5ZXIuc2NhbGUueCA+IDIgfHwgbGF5ZXIuc2NhbGUueCA8IC41IHx8IGxheWVyLnNjYWxlLnkgPiAyIHx8IGxheWVyLnNjYWxlLnkgPCAuNSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSTogc2NhbGUgb3V0c2lkZSBbLjUsMl0gcmFuZ2UuIFNjYWxlIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gWy41LDJdIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gR1VJLiBbXCIgKyBsYXllci5zY2FsZS54ICsgXCIsIFwiICsgbGF5ZXIuc2NhbGUueSArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN2Z0J1bmRsZSA9IG5ldyBlZGl0U1ZHKCkuc2V0KHBsb3RJRCwgbGF5ZXIubGV2ZWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGltc0Zyb21QYWdlID0gc3ZnQnVuZGxlLmRpbWVuc2lvbnMoKTtcbiAgICAgICAgICAgIGlmICgoZGltc0Zyb21QYWdlWzBdICE9IGRpbXNbbGF5ZXIubGV2ZWxdLndpZHRoKSB8fCAoZGltc0Zyb21QYWdlWzFdICE9IGRpbXNbbGF5ZXIubGV2ZWxdLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGRpbWVuc2lvbnMgb2YgcGxvdCBvbiBwYWdlIGRvbid0IG1hdGNoIGRpbWVuc2lvbnMgb2YgcGxvdCBmcm9tIG1vZGVsXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdmdCdW5kbGVcbiAgICAgICAgICAgICAgICAudHJhbnNsYXRlKGxheWVyLnRvcExlZnQueCwgbGF5ZXIudG9wTGVmdC55KVxuICAgICAgICAgICAgICAgIC5zY2FsZShsYXllci5zY2FsZS54LCBsYXllci5zY2FsZS55KVxuICAgICAgICAgICAgICAgIC5mYWRlKGxheWVyLm9wYWNpdHkpXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aXNpYmxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBzY2FsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgb3BhY2l0eVN0cmluZyA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5sZXZlbDtcbiAgICAgICAgICAgIHNjYWxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5zY2FsZS54O1xuICAgICAgICAgICAgb3BhY2l0eVN0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5vcGFjaXR5O1xuICAgICAgICB9XG4gICAgICAgICQoXCIjem9vbS1kaXZcIikudGV4dCh2aXNpYmxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjZnJhY3Rpb25hbC16b29tLWRpdlwiKS50ZXh0KHNjYWxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjb3BhY2l0eS1kaXZcIikudGV4dChvcGFjaXR5U3RyaW5nKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuZ3VpID0gZ3VpOyIsInZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuLi91aS9ndWkuanMnKS5ndWk7XG5cbnZhciBoYW5kbGVycyA9IHtcbiAgICBjYWxsR1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgIH0sXG5cbiAgICBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0OiBmdW5jdGlvbiAobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBsaXN0ZW5Gb3JEcmFnOiBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibGlzdGVuRm9yRHJhZ1wiKTtcbiAgICAgICAgdmFyIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgLy92YXIgc3ZnID0gZXZ0LnRhcmdldDtcblxuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYmVnaW5EcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZywgZmFsc2UpO1xuXG4gICAgICAgIHZhciBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJzLmdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYmVnaW5EcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBtb3VzZVBvc2l0aW9uT25TdGFydERyYWcgPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgICAgICBpZiAoaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50TW91c2VQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICAgICAgeTogY3VycmVudE1vdXNlUG9zaXRpb24ueSAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLnksXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHBsb3QuZHJhZyhjaGFuZ2VJbk1vdXNlUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcblxuICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb25XaGVlbDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGhvcml6b250YWwgPSBldnQuZGVsdGFYO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBldnQuZGVsdGFZO1xuXG4gICAgICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIik7XG4gICAgICAgICAgICB2YXIgbW91c2VQb3MgPSBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgICAgIHBsb3Quem9vbShtb3VzZVBvcywgdmVydGljYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxvdC5kcmFnKHsgeDogaG9yaXpvbnRhbCwgeTogMCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICB9LFxuXG4gICAgb25CdXR0b25DbGlja1pvb21JbjogZnVuY3Rpb24gKCkge1xuICAgICAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCAtNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3Quc25hcEluKHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tT3V0OiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3Quc25hcE91dCh7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5oYW5kbGVycyA9IGhhbmRsZXJzOyIsInZhciB0eXBlY2hlY2sgPSByZXF1aXJlKCcuLi91dGlscy90eXBlY2hlY2suanMnKS50eXBlY2hlY2s7XG52YXIgcG9zaXRpb24gPSByZXF1aXJlKFwiLi4vcGxvdC9wb3NpdGlvbi5qc1wiKS5wb3NpdGlvbjtcbnZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbi8qIEhvdmVyIGRhdGEuXG5cbkRpc3BsYXkgbWV0YWRhdGEgd2hlbiBtb3VzZSBob3ZlcnMgb3ZlciBwb2ludC4gKi9cbnZhciBob3ZlciA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgaG92ZXJBcmVhID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGluc2VydFRleHRib3gocGFyZW50SUQpIHtcbiAgICAgICAgaG92ZXJBcmVhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocGFyZW50SUQpO1xuXG4gICAgICAgIC8vIG1ha2Ugc3ZnIHRvIGNvbnRhaW4gdGV4dGJveFxuICAgICAgICB2YXIgdGV4dGJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsICdzdmcnKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ2lkJywgXCJ0ZXh0Ym94XCIpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgneCcsIFwiMFwiKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3knLCBcIjBcIik7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd2aXNpYmlsaXR5JywgXCJoaWRkZW5cIik7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCdvdmVyZmxvdycsICd2aXNpYmxlJyk7XG4gICAgICAgIC8vaG92ZXJBcmVhLmFwcGVuZENoaWxkKHRleHRib3gpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2lkZ2V0JykuYXBwZW5kQ2hpbGQodGV4dGJveCk7XG4gICAgXG4gICAgICAgIC8vIGluc2VydCByZWN0IGJhY2tncm91bmQgd2l0aCBsaW5lIGludG8gZmlyc3Qgc3ZnIGVsZW1lbnRcbiAgICAgICAgdmFyIHJlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAncmVjdCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaWQnLCAndGV4dGJveFJlY3QnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3gnLCAnMCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgneScsICcwJyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWxsJywgJ3doaXRlJyk7XG4gICAgICAgIHRleHRib3guYXBwZW5kQ2hpbGQocmVjdCk7XG4gICAgXG4gICAgICAgIC8vIG1ha2UgY29udGFpbmVyIGZvciB0ZXh0ICh3aXRoIG1hcmdpbnMpIGluc2lkZSB0ZXh0Ym94XG4gICAgICAgIHZhciBpbm5lclRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAnc3ZnJyk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3RleHRib3hJbm5lcicpO1xuICAgICAgICBpbm5lclRleHQuc2V0QXR0cmlidXRlKCd4JywgJzUnKTtcbiAgICAgICAgaW5uZXJUZXh0LnNldEF0dHJpYnV0ZSgneScsICc1Jyk7XG4gICAgICAgIHRleHRib3guYXBwZW5kQ2hpbGQoaW5uZXJUZXh0KTtcbiAgICBcbiAgICAgICAgdmFyIHRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCAndGV4dCcpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnaWQnLCAndGV4dGJveFRleHQnKTtcbiAgICAgICAgdGV4dC5zZXRBdHRyaWJ1dGUoJ3knLCAnNScpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnZm9udC1zaXplJywgJzEwJyk7XG4gICAgICAgIHRleHQuc2V0QXR0cmlidXRlKCdkeScsICcwJyk7XG4gICAgXG4gICAgICAgIC8vIGluc2VydCB0ZXh0IGludG8gc2Vjb25kIHN2ZyBlbGVtZW50XG4gICAgICAgIGlubmVyVGV4dC5hcHBlbmRDaGlsZCh0ZXh0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZGlzcGxheVRleHRCb3goeCwgeSwgbGluZXMpIHtcbiAgICAgICAgdmFyIHRleHRib3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveCcpO1xuXG4gICAgICAgIC8vIG9mZnNldCBvZiBwbG90IHN2ZyBpbnNpZGUgd2lkZ2V0IHN2Z1xuICAgICAgICB4ID0geCs1MDtcbiAgICAgICAgeSA9IHkrMzA7XG5cbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCs1KSk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCBcInZpc2libGVcIik7XG4gICAgXG4gICAgICAgIC8vIGFkZCB0c3BhbnMgdG8gdGV4dCBlbGVtZW50IHdpdGggdHNwYW5zXG4gICAgICAgIHZhciBsaW5lQ291bnQgPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIHZhciB0c3BhbnMgPSAnPHRzcGFuIHg9XCIwXCIgZHk9XCIwLjZlbVwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+JyArIGxpbmVzWzBdICsgJzwvdHNwYW4+JztcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsaW5lQ291bnQ7IGkrKykge1xuICAgICAgICAgICAgdHNwYW5zICs9ICc8dHNwYW4geD1cIjBcIiBkeT1cIjEuMmVtXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj4nICsgbGluZXNbaV0gKyAnPC90c3Bhbj4nO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3hUZXh0Jyk7XG4gICAgICAgIHRleHQuaW5uZXJIVE1MID0gdHNwYW5zO1xuICAgIFxuICAgICAgICAvLyBnZXQgd2lkdGggYW5kIGhlaWdodCBvZiB0ZXh0IGVsZW1lbnRcbiAgICAgICAgdmFyIHdpZHRoID0gdGV4dC5nZXRCQm94KCkud2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSB0ZXh0LmdldEJCb3goKS5oZWlnaHQ7XG4gICAgXG4gICAgICAgIC8vIHNldCB3aWR0aC9oZWlnaHQgb2YgYmFja2dyb3VuZCByZWN0XG4gICAgICAgIHZhciByZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3hSZWN0Jyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoICsgMTUpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0ICsgMTUpO1xuICAgIFxuICAgICAgICAvLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIHdob2xlIHRleHRib3hcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGggKyAxNSk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQgKyAxNSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIHRleHQgY29udGFpbmVyXG4gICAgICAgIHZhciBpbm5lclRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGV4dGJveElubmVyJyk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGggKyAxMCk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCArIDEwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfaGlkZVRleHRCb3goKSB7XG4gICAgICAgIHZhciB0ZXh0Ym94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3gnKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCBcImhpZGRlblwiKTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gX2dldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfZ2V0Rmlyc3RQbG90TGF5ZXJJbmZvKCkge1xuICAgICAgICB2YXIgYXJncyA9IHBsb3QuZ2V0SW5mb0ZvckdVSSgpO1xuICAgICAgICB2YXIgdmlzaWJsZXMgPSBhcmdzLnZpc2libGVMYXllcnM7XG4gICAgICAgIHZhciBkaW1lbnNpb25zID0gYXJncy5kaW1lbnNpb25zO1xuXG4gICAgICAgIHZhciBmaXJzdCA9IHZpc2libGVzWzBdLFxuICAgICAgICAgICAgZmlyc3RLZXkgPSBmaXJzdC5sZXZlbCxcbiAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIG5Db2xzID0gTWF0aC5wb3coMiwgZmlyc3QubGV2ZWwpO1xuXG4gICAgICAgIHJldHVybiBbZmlyc3QudG9wTGVmdCwgZmlyc3Quc2NhbGUsIHdpZHRoLCBoZWlnaHQsIGZpcnN0LmxldmVsLCBuQ29sc107XG4gICAgfVxuXG4gICAgLy8gY29udmVydCB4LHkgaW4gdmlld2luZyB3aW5kb3cgY29vcmRpbmF0ZXMgdG8gZ3JhcGggY29vcmRpbmF0ZXNcbiAgICBmdW5jdGlvbiBfZ2V0Q29vcmRpbmF0ZXMoeCwgeSkge1xuICAgICAgICB2YXIgcmVzID0gX2dldEZpcnN0UGxvdExheWVySW5mbygpO1xuICAgICAgICB2YXIgdG9wTGVmdCA9IHJlc1swXSwgc2NhbGUgPSByZXNbMV0sIHdpZHRoID0gcmVzWzJdLCBoZWlnaHQgPSByZXNbM107XG4gICAgICAgIFxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZSh7eDogeCwgeTogeX0sIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdmFyIHBpeGVsQ29vcmRpbmF0ZXMgPSB7eDogcGVyY2VudGFnZUNvb3JkaW5hdGVzLnggKiB3aWR0aCwgeTogcGVyY2VudGFnZUNvb3JkaW5hdGVzLnkgKiBoZWlnaHR9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIFtwaXhlbENvb3JkaW5hdGVzLCB3aWR0aCwgaGVpZ2h0XTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0VGlsZXNJblZpZXcodG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQsIG5Db2xzKSB7XG4gICAgICAgIC8vIGdldCBwbG90IGNvb3JkaW5hdGUgb2YgdG9wIGxlZnQgY29ybmVyIG9mIHZpZXdpbmcgd2luZG93IFxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZSh7eDowLHk6MH0sIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdmFyIHRvcExlZnRQZXJjZW50ID0gcGVyY2VudGFnZUNvb3JkaW5hdGVzLng7XG4gICAgICAgIC8vIGdldCB2aXNpYmxlIHRpbGVzXG4gICAgICAgIHZhciBmaXJzdFRpbGVJblZpZXcgPSBNYXRoLmZsb29yKHRvcExlZnRQZXJjZW50ICogbkNvbHMpO1xuICAgICAgICB2YXIgdGlsZXNJblZpZXcgPSBbZmlyc3RUaWxlSW5WaWV3LCBmaXJzdFRpbGVJblZpZXcrMSwgZmlyc3RUaWxlSW5WaWV3KzIsIGZpcnN0VGlsZUluVmlldyszXTtcbiAgICAgICAgcmV0dXJuIHRpbGVzSW5WaWV3O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9hZnRlckxvYWRpbmdQb2ludHMocG9pbnRzLCB4X2F4aXNfcmFuZ2UsIHlfYXhpc19yYW5nZSwgd2lkdGgsIGhlaWdodCwgZ3JhcGhDb29yZHMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBpeGVsUG9pbnQgPSB7eDogcGxvdC5fbWFwVmFsdWVPbnRvUmFuZ2UocG9pbnRzW2ldLmdwLCBbeF9heGlzX3JhbmdlWzBdLCB4X2F4aXNfcmFuZ2VbMV1dLCBbMCx3aWR0aF0pLCBcbiAgICAgICAgICAgICAgICB5OiBwbG90Ll9tYXBWYWx1ZU9udG9SYW5nZShwb2ludHNbaV0ubmxwLCBbeV9heGlzX3JhbmdlWzBdLCB5X2F4aXNfcmFuZ2VbMV1dLCBbaGVpZ2h0LDBdKX07XG5cbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhncmFwaENvb3Jkcy54IC0gcGl4ZWxQb2ludC54KSA8IDIgJiYgTWF0aC5hYnMoZ3JhcGhDb29yZHMueSAtIHBpeGVsUG9pbnQueSkgPCAyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2Rpc3BsYXkgdGV4dCBib3gnKTtcbiAgICAgICAgICAgICAgICBfZGlzcGxheVRleHRCb3gobW91c2Vwb3MueCwgbW91c2Vwb3MueSwgcG9pbnRzW2ldLmxhYmVsKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIF9oaWRlVGV4dEJveCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaW5zZXJ0VGV4dGJveDogaW5zZXJ0VGV4dGJveCxcbiAgICAgICAgaG92ZXJMaXN0ZW5lcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGhvdmVyQXJlYSkpIHRocm93IG5ldyBFcnJvcihcImhvdmVyOiBob3ZlckFyZWEgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgICAgICAgICBtb3VzZXBvcyA9IF9nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGUuY2xpZW50WCwgZS5jbGllbnRZLCBob3ZlckFyZWEpO1xuXG4gICAgICAgICAgICB2YXIgcmVzID0gX2dldENvb3JkaW5hdGVzKG1vdXNlcG9zLngsIG1vdXNlcG9zLnkpO1xuICAgICAgICAgICAgdmFyIGdyYXBoQ29vcmRzID0gcmVzWzBdLCB3aWR0aCA9IHJlc1sxXSwgaGVpZ2h0ID0gcmVzWzJdO1xuXG4gICAgICAgICAgICB2YXIgeF9heGlzX3JhbmdlID0gbnVsbCwgeV9heGlzX3JhbmdlID0gbnVsbDtcblxuICAgICAgICAgICAgdmFyIHVybCA9IHBsb3QuZ2V0UGxvdHNCeU5hbWUoKVtwbG90LmdldFBsb3RJRCgpXS51cmw7XG4gICAgICAgICAgICB2YXIgbWV0YWRhdGFfdXJsID0gdXJsICsgXCIvbWV0YWRhdGEuanNvblwiO1xuICAgICAgICAgICAgJC5nZXRKU09OKG1ldGFkYXRhX3VybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHhfYXhpc19yYW5nZSA9IGRhdGEueF9heGlzX3JhbmdlO1xuICAgICAgICAgICAgICAgIHlfYXhpc19yYW5nZSA9IGRhdGEueV9heGlzX3JhbmdlO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IF9nZXRGaXJzdFBsb3RMYXllckluZm8oKTtcbiAgICAgICAgICAgICAgICB2YXIgdG9wTGVmdCA9IHJlc1swXSwgc2NhbGUgPSByZXNbMV0sIHdpZHRoID0gcmVzWzJdLCBoZWlnaHQgPSByZXNbM10sIHpvb21MZXZlbCA9IHJlc1s0XSwgbkNvbHMgPSByZXNbNV07XG4gICAgICAgICAgICAgICAgJC5nZXRKU09OKHVybCtcIi9cIit6b29tTGV2ZWwrJy9ob3Zlci5qc29uJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbGVzV2l0aEhvdmVyRGF0YSA9IG5ldyBTZXQoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb2ludHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRpbGVzSW5WaWV3ID0gX2dldFRpbGVzSW5WaWV3KHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0LCBuQ29scyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGlsZXNJblZpZXcpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaTx0aWxlc0luVmlldy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRpbGVzV2l0aEhvdmVyRGF0YS5oYXModGlsZXNJblZpZXdbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5nZXRKU09OKHVybCtcIi9cIit6b29tTGV2ZWwrJy8nK3RpbGVzSW5WaWV3W2ldKycuanNvbicsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoLmFwcGx5KHBvaW50cyxkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2FmdGVyTG9hZGluZ1BvaW50cyhwb2ludHMsIHhfYXhpc19yYW5nZSwgeV9heGlzX3JhbmdlLCB3aWR0aCwgaGVpZ2h0LCBncmFwaENvb3Jkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIH0gIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuaG92ZXIgPSBob3ZlcjsiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xuXG4vKiBcblNlYXJjaCBiYXIgZm9yIGRpc3BsYXlpbmcgcmVzdWx0cyBvZiBxdWVyeS5cblxuZGVwZW5kZW5jeTogZnVzZSBcbiovXG52YXIgc2VhcmNoID0gZnVuY3Rpb24gKHBoZW5vdHlwZXMpIHtcblxuICAgIHZhciByZXN1bHRzID0gW107IC8vIHJlc3VsdCBmcm9tIHNlYXJjaCBxdWVyeVxuICAgIHZhciBmb2N1cyA9IDE7IC8vIG4tdGggcm93IG9mIHJlc3VsdHMgdGFibGUgd2UncmUgZm9jdXNlZCBvblxuLypcbiAgICB2YXIgcGhlbm90eXBlcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgaWQ6IDAsXG4gICAgICAgICAgICB0aXRsZTogXCJzdGFuZGluZ19oZWlnaHRcIixcbiAgICAgICAgICAgIHVybDogJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvc3RhbmRpbmdfaGVpZ2h0X3Bsb3RzL3N0YW5kaW5nX2hlaWdodCcsXG4gICAgICAgICAgICBkZXNjOiAnTG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZWxpdCwgc2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaWQ6IDEsXG4gICAgICAgICAgICB0aXRsZTogXCJjYWZmZWluZV9jb25zdW1wdGlvblwiLFxuICAgICAgICAgICAgdXJsOiAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsXG4gICAgICAgICAgICBkZXNjOiAnZG8gZWl1c21vZCB0ZW1wb3IgaW5jaWRpZHVudCB1dCBsYWJvcmUgZXQgZG9sb3JlIG1hZ25hIGFsaXF1YS4nLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBpZDogMixcbiAgICAgICAgICAgIHRpdGxlOiBcImNhZmZlaW5lX2NvbnN1bXB0aW9uMlwiLFxuICAgICAgICAgICAgdXJsOiAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90czIvY2FmZmVpbmVfY29uc3VtcHRpb24nLFxuICAgICAgICAgICAgZGVzYzogJ3RyYW5zcGFyZW50IGJhY2tncm91bmQnLFxuICAgICAgICB9XG4gICAgXTsqL1xuXG4gICAgLy8gZnVzZSBvcHRpb25zXG4gICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIHNob3VsZFNvcnQ6IHRydWUsXG4gICAgICAgIGluY2x1ZGVTY29yZTogdHJ1ZSxcbiAgICAgICAgdGhyZXNob2xkOiAwLjYsXG4gICAgICAgIGxvY2F0aW9uOiAwLFxuICAgICAgICBkaXN0YW5jZTogMTAwLFxuICAgICAgICBtYXhQYXR0ZXJuTGVuZ3RoOiAzMixcbiAgICAgICAgbWluTWF0Y2hDaGFyTGVuZ3RoOiAxLFxuICAgICAgICBrZXlzOiBbXG4gICAgICAgICAgICBcInRpdGxlXCIsXG4gICAgICAgICAgICBcImF1dGhvci5maXJzdE5hbWVcIlxuICAgICAgICBdXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG1ha2VUYWJsZSgpIHtcbiAgICAgICAgJCgnPHRhYmxlIGlkPVwic2VhcmNoX3RhYmxlXCI+PHRyIGlkPVwic2VhcmNoX3RpdGxlc1wiPjwvdHI+PC90YWJsZT4nKS5hcHBlbmRUbygnI3NlYXJjaGJhcl90YXJnZXQnKTtcbiAgICAgICAgJCgnI3NlYXJjaF90aXRsZXMnKS5hcHBlbmQoJzx0aCB3aWR0aD1cIjIwcHhcIj5pZDwvdGg+Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCIxMDBweFwiPnBoZW5vdHlwZTwvdGg+Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCI0MDBweFwiPmRlc2NyaXB0aW9uPC90aD4nKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhclRhYmxlQ29udGVudHMoKSB7XG4gICAgICAgICQoJy5yb3cnKS5yZW1vdmUoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXNwbGF5UmVzdWx0cyhjb250ZW50cywga2V5c1RvRGlzcGxheSkge1xuICAgICAgICBjbGVhclRhYmxlQ29udGVudHMoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250ZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJvdyA9ICc8dHIgY2xhc3M9XCJyb3dcIj4nO1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBjb250ZW50c1tpXS5pdGVtO1xuICAgICAgICAgICAgLy92YXIga2V5cyA9IE9iamVjdC5rZXlzKGl0ZW0pO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzVG9EaXNwbGF5Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNlbGwgPSAnPHRkPicgKyBpdGVtW2tleXNUb0Rpc3BsYXlbal1dICsgJzwvdGQ+JztcbiAgICAgICAgICAgICAgICByb3cgKz0gY2VsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJvdyArPSAnPC90cj4nO1xuICAgICAgICAgICAgJCgnI3NlYXJjaF90YWJsZScpLmFwcGVuZChyb3cpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGZ1c2UgPSBuZXcgRnVzZShwaGVub3R5cGVzLCBvcHRpb25zKTtcbiAgICBtYWtlVGFibGUoKTtcblxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleVVwKGUpIHtcbiAgICAgICAgLy8gaWYga2V5IHdhcyBub3QgdGhlIHVwIG9yIGRvd24gYXJyb3cga2V5LCBkaXNwbGF5IHJlc3VsdHNcbiAgICAgICAgaWYgKGUua2V5Q29kZSAhPSA0MCAmJiBlLmtleUNvZGUgIT0gMzgpIHtcbiAgICAgICAgICAgIHZhciBjb250ZW50cyA9ICQoJyNzZWFyY2hiYXInKS52YWwoKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBmdXNlLnNlYXJjaChjb250ZW50cyk7XG4gICAgICAgICAgICBkaXNwbGF5UmVzdWx0cyhyZXN1bHRzLCBbJ2lkJywgJ3RpdGxlJywgJ2Rlc2MnXSk7XG4gICAgICAgICAgICBmb2N1cyA9IDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlQcmVzcyhlKSB7XG4gICAgICAgIC8vIGlmIGVudGVyIGtleSB3YXMgcHJlc3NlZFxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoZm9jdXMgIT0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9ICQoXCIucm93Om50aC1vZi10eXBlKFwiICsgZm9jdXMgKyBcIilcIik7XG4gICAgICAgICAgICAgICAgdmFyIHBoZW5vdHlwZSA9IHNlbGVjdGVkLmNoaWxkcmVuKCkuZXEoMSkuaHRtbCgpO1xuICAgICAgICAgICAgICAgICQoJyNzZWFyY2hiYXInKS52YWwocGhlbm90eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gJCgnI3NlYXJjaGJhcicpLnZhbCgpO1xuICAgICAgICAgICAgICAgIHJlcyA9IGZ1c2Uuc2VhcmNoKHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc1swXS5zY29yZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygncGVyZmVjdCBtYXRjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9zd2l0Y2hQbG90cyhxdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hQbG90cyhyZXNbMF0uaXRlbS5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyBtYXRjaFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleURvd24oZSkge1xuICAgICAgICAvLyBjaGFuZ2UgaGlnaGxpZ2h0ZWQgcm93IGluIHJlc3VsdHMgdGFibGVcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA0MCkgeyAvLyBkb3duIGFycm93XG4gICAgICAgICAgICBpZiAoZm9jdXMgPCByZXN1bHRzLmxlbmd0aCArIDEpIHtcbiAgICAgICAgICAgICAgICBmb2N1cyArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSAzOCkgeyAvLyB1cCBhcnJvd1xuICAgICAgICAgICAgaWYgKGZvY3VzID4gMSkge1xuICAgICAgICAgICAgICAgIGZvY3VzIC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJChcIi5yb3dcIikuY2hpbGRyZW4oJ3RkJykuY3NzKCdib3JkZXInLCAnMXB4IHNvbGlkICNkZGRkZGQnKTtcbiAgICAgICAgJChcIi5yb3c6bnRoLW9mLXR5cGUoXCIgKyBmb2N1cyArIFwiKVwiKS5jaGlsZHJlbigndGQnKS5jc3MoJ2JvcmRlcicsICcxcHggc29saWQgIzAwMDAwMCcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN3aXRjaFBsb3RzKHBsb3RJRCkge1xuICAgICAgICAvLyBjaGFuZ2UgdmlzaWJsZSBwbG90IVxuICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgcGxvdHM6ICcrcGxvdElEKTtcbiAgICAgICAgdmFyIG9sZFBsb3RJRCA9IHBsb3QuZ2V0UGxvdElEKCk7IC8vIGlkIG51bWJlclxuICAgICAgICBwbG90LnN3aXRjaFBsb3RzKHBsb3RJRCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdoaWRpbmc6ICcrcGxvdC5nZXRQbG90c0J5TmFtZSgpW29sZFBsb3RJRF0udGl0bGUpO1xuICAgICAgICBndWkuaGlkZShwbG90LmdldFBsb3RzQnlOYW1lKClbb2xkUGxvdElEXS50aXRsZSk7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgIH1cblxuICAgICQoJyNzZWFyY2hiYXInKS5vbigna2V5dXAnLCBzZWFyY2hCYXJLZXlVcCk7XG4gICAgJCgnI3NlYXJjaGJhcicpLm9uKCdrZXlwcmVzcycsIHNlYXJjaEJhcktleVByZXNzKTtcbiAgICAkKCcjc2VhcmNoYmFyJykub24oJ2tleWRvd24nLCBzZWFyY2hCYXJLZXlEb3duKTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMuc2VhcmNoID0gc2VhcmNoOyIsInZhciB0YWcgPSByZXF1aXJlKCcuLi91dGlscy90YWcuanMnKS50YWc7XG52YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi4vdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgc2V0dXAgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVdpZGdldCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgLy8gY3JlYXRlIHdpZGdldCBhbmQgYXBwZW5kIGl0IHRvIHRoZSB0YXJnZXRcbiAgICAgICAgdmFyIHdpZGdldCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCB3aWRnZXRJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGJhY2tncm91bmQgZm9yIHBsb3Qgd2lkZ2V0XG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsIGJhY2tncm91bmRDb2xvcilcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3N0cm9rZScsICcjZTNlN2VkJylcbiAgICAgICAgICAgIC5wbGFjZSh3aWRnZXQpO1xuXG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVBsb3RXaW5kb3codGFyZ2V0LCBwbG90SUQsIHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgY29udGFpbmVyICh3aWR0aCBhbmQgaGVpZ2h0IGRpY3RhdGUgdGhlIHNpemUgb2YgdGhlIHZpZXdpbmcgd2luZG93KVxuICAgICAgICB2YXIgd2luZG93ID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHBsb3RJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd4JywgeClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3knLCB5KVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgYmFja2dyb3VuZFxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygncmVjdCcpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsICcjZThlYmVmJylcbiAgICAgICAgICAgIC5wbGFjZSh3aW5kb3cpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkQnV0dG9ucyh0YXJnZXQpIHtcblxuICAgICAgICBmdW5jdGlvbiBhZGRCdXR0b24oaWQsIF9jbGFzcywgdHlwZSwgbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0YWcoKVxuICAgICAgICAgICAgICAgIC5jcmVhdGUoJ2lucHV0JylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2NsYXNzJywgX2NsYXNzKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3R5cGUnLCB0eXBlKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ25hbWUnLCBuYW1lKVxuICAgICAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgICAgICB9O1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20taW4tYnV0dG9uJywgJ3pvb20tYnV0dG9uJywgJ2J1dHRvbicsICdpbmNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnKycpO1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20tb3V0LWJ1dHRvbicsICd6b29tLWJ1dHRvbicsICdidXR0b24nLCdkZWNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnLScpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkUGxvdFRvUGFnZSh0YXJnZXQsIHBsb3RJRCkge1xuICAgICAgICAvLyBhZGQgZyBmb3IgYSBzaW5nbGUgcGxvdCAocGhlbm90eXBlKSwgaGlkZGVuIHdpdGggZGlzcGxheT1ub25lXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgIH07XG5cbiAgICAvKiBwbGFjZSBhIHpvb20gbGF5ZXIgZ3JvdXAgPGc+PHN2Zz48L3N2Zz48L2c+IGluc2lkZSBhIHBsb3QncyA8c3ZnPiAqL1xuICAgIGZ1bmN0aW9uIF9hZGRHcm91cChwbG90SUQsIGxldmVsLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBwbG90ID0gbmV3IHRhZygpLnNlbGVjdChwbG90SUQpO1xuXG4gICAgICAgIHZhciBncm91cCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJyxzZWxlY3RvcnMuaWRzLmdyb3VwKHBsb3RJRCwgbGV2ZWwpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgndmlzaWJpbGl0eScsICdoaWRkZW4nKVxuICAgICAgICAgICAgLnBsYWNlKHBsb3QpO1xuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAucGxhY2UoZ3JvdXApO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkVGlsZShwbG90SUQsIGxldmVsLCBjb2x1bW4sIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIHRpbGVVUkwgPSB1cmwgKyBcIi9cIiArIGxldmVsICsgXCIvXCIgKyBjb2x1bW4gKyBcIi5wbmdcIjtcblxuICAgICAgICB2YXIgeCA9IGNvbHVtbiAqIGltYWdlV2lkdGg7XG4gICAgICAgIHZhciB5ID0gMDtcbiAgICAgICAgdmFyIHdpZHRoID0gaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IGltYWdlSGVpZ2h0O1xuXG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGFnKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuXG4gICAgICAgIC8vY3JlYXRlIHRpbGVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2ltYWdlJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYWRkSFJFRih0aWxlVVJMKVxuICAgICAgICAgICAgLnBsYWNlKHN2Zyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9hZGRUaWxlcyhwbG90SUQsIGxldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgbGV2ZWwpO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgICAgICBfYWRkVGlsZShwbG90SUQsIGxldmVsLCBjLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KTtcbiAgICAgICAgICAgIHggPSB4ICsgMjU2O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFVwV2lkZ2V0KHRhcmdldElELCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgdGFnKCkuc2VsZWN0KHRhcmdldElEKTtcbiAgICAgICAgX2FkZEJ1dHRvbnModGFyZ2V0KTtcbiAgICAgICAgdmFyIHdpZGdldCA9IF9jcmVhdGVXaWRnZXQodGFyZ2V0LCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKTtcbiAgICAgICAgcmV0dXJuIHdpZGdldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRVcFBsb3Qod2lkZ2V0LCAgcGxvdElELCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0LCB3aW5kb3dYLCB3aW5kb3dZKSB7XG4gICAgICAgIF9jcmVhdGVQbG90V2luZG93KHdpZGdldCwgcGxvdElELCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0LCB3aW5kb3dYLCB3aW5kb3dZKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRQbG90SW1hZ2VzKHBsb3RJRCwgbWluTGV2ZWwsIG1heExldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBwbG90Q29udGFpbmVyID0gbmV3IHRhZygpLnNlbGVjdCgncGxvdCcpO1xuICAgICAgICBfYWRkUGxvdFRvUGFnZShwbG90Q29udGFpbmVyLCBwbG90SUQpO1xuICAgICAgICBmb3IgKHZhciBpID0gbWluTGV2ZWw7IGk8bWF4TGV2ZWwrMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1ucyAqIGltYWdlV2lkdGg7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG4gICAgICAgICAgICBfYWRkR3JvdXAocGxvdElELCBpLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICAgIF9hZGRUaWxlcyhwbG90SUQsIGksIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0VXBXaWRnZXQ6IHNldFVwV2lkZ2V0LFxuICAgICAgICBzZXRVcFBsb3Q6IHNldFVwUGxvdCxcbiAgICAgICAgaW5zZXJ0UGxvdEltYWdlczogaW5zZXJ0UGxvdEltYWdlcyxcbiAgICB9XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cy5zZXR1cCA9IHNldHVwOyIsIi8qQ2hlY2sgc2NoZW1hIG9mIGFuIG9iamVjdCBsaXRlcmFsLiAqL1xudmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpbmRleCBpbiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXlzW2luZGV4XSBpbiBvYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgeHk6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsneCcsICd5J10pO1xuICAgIH0sXG4gICAgZGltZW5zaW9uczogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd3aWR0aCcsICdoZWlnaHQnXSk7XG4gICAgfSxcbiAgICBwb2ludDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBzY2FsZTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBsYXllcjogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWydsZXZlbCcsICd0b3BMZWZ0JywgJ3NjYWxlJywgJ29wYWNpdHknXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5wb2ludChvYmplY3RbJ3RvcExlZnQnXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5zY2FsZShvYmplY3RbJ3NjYWxlJ10pO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zY2hlbWEgPSBzY2hlbWE7IiwidmFyIHNlbGVjdG9ycyA9IHtcbiAgICBpZHM6IHtcbiAgICAgICAgd2lkZ2V0OiAnd2lkZ2V0JyxcbiAgICAgICAgcGxvdDogJ3Bsb3QnLFxuICAgICAgICBncm91cDogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItZ3JvdXAtbGF5ZXJcIitsZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnTGF5ZXI6IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gcGxvdElEK1wiLXN2Zy1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyO1xuICAgIHRoaXMucGxvdDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpO1xuICAgIHRoaXMucGxvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgdGhpcy5pbm5lckNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuZGltZW5zaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgaWYgKCF0aGlzLmlubmVyQ29udGFpbmVyKSB0aHJvdyBuZXcgRXJyb3IoJ2VkaXRTVkc6IGlubmVyQ29udGFpbmVyIG11c3QgYmUgaW5pdGlhbGl6ZWQnKTtcbiAgICByZXR1cm4gW3RoaXMuaW5uZXJDb250YWluZXIuZ2V0QkJveCgpLndpZHRoLCB0aGlzLmlubmVyQ29udGFpbmVyLmdldEJCb3goKS5oZWlnaHRdO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIFxuICAgIHZhciB0cmFuc2Zvcm1hdGlvbnMgPSB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xuICAgIGlmICghdHJhbnNmb3JtYXRpb25zLmxlbmd0aCB8fCB0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHRyYW5zbGF0ZS5zZXRUcmFuc2xhdGUoMCwgMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZSh0cmFuc2xhdGUsIDApO1xuXG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgc2NhbGUuc2V0U2NhbGUoMS4wLCAxLjApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUoc2NhbGUsIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoICE9PSAyKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBleHBlY3RlZCB0cmFuc2Zvcm1hdGlvbnMgdG8gYmUgYSBsaXN0IG9mIGxlbmd0aCAyLCBub3RcIit0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoKTtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDApLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIik7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgxKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoc2hpZnRYLCBzaGlmdFkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIilcbiAgICBpZiAoKCFzaGlmdFggfHwgIXNoaWZ0WSkgJiYgKHNoaWZ0WCAhPSAwICYmIHNoaWZ0WSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogY2Fubm90IHRyYW5zbGF0ZSBTVkcgb2JqZWN0IHdpdGggbnVsbCwgdW5kZWZpbmVkLCBvciBlbXB0eSBzaGlmdCB2YWx1ZXMuIHNoaWZ0WDogXCIrc2hpZnRYK1wiIHNoaWZ0WTpcIitzaGlmdFkpO1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgwKTtcbiAgICBpZiAodHJhbnNsYXRpb24udHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiKTtcbiAgICB0cmFuc2xhdGlvbi5zZXRUcmFuc2xhdGUoc2hpZnRYLCBzaGlmdFkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAoc2NhbGVYLCBzY2FsZVkpIHtcbiAgICB2YXIgc2NhbGUgPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMSk7XG4gICAgaWYgKHNjYWxlLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1NDQUxFKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBzZWNvbmQgdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiKTtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIsIG9wYWNpdHkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLmVkaXRTVkcgPSBlZGl0U1ZHOyIsInZhciB0eXBlY2hlY2sgPSByZXF1aXJlKCcuL3R5cGVjaGVjay5qcycpLnR5cGVjaGVjaztcblxudmFyIHRhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xufTtcblxudGFnLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZXQoKSBjYW5ub3Qgb3ZlcnJpZGUgbm9uLW51bGwgZWxlbWVudCB3aXRoIG5ldyBlbGVtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHJldHVybiB0aGlzO1xufVxuXG50YWcucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmNyZWF0ZSgpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0eXBlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuY3JlYXRlTlMgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGVOUygpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGlkKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuc2VsZWN0KCkgbXVzdCBoYXZlIGFuIGBpZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoYXR0cikgfHwgdHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZCh2YWx1ZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmF0dHJpYnV0ZSgpIG11c3QgaGF2ZSBgYXR0cmAgYW5kIGB2YWx1ZWAgYXJndW1lbnRzLlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoY2hpbGQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hcHBlbmQoKSBtdXN0IGhhdmUgYSBgY2hpbGRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnBsYWNlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnBsYWNlKCkgbXVzdCBoYXZlIGEgYHBhcmVudGAgYXJndW1lbnQuXCIpO1xuICAgIHBhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5yZW1vdmUoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnRhZy5wcm90b3R5cGUuYWRkSFJFRiA9IGZ1bmN0aW9uIChocmVmKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoaHJlZikpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmFkZEhSRUYoKSBtdXN0IGhhdmUgYSBgaHJlZmAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIGhyZWYpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMudGFnID0gdGFnO1xuIiwiLypVdGlscyBmb3IgdHlwZWNoZWNraW5nLiovXG52YXIgdHlwZWNoZWNrID0ge1xuICAgIG51bGxPclVuZGVmaW5lZDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy50eXBlY2hlY2sgPSB0eXBlY2hlY2s7Il19
