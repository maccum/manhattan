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
    setup.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
    setup.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 256, 256);
    setup.insertPlotImages('caffeine_consumption2', 2, 8, '/Users/maccum/manhattan_data/plots/caffeine_plots_2/caffeine_consumption', 256, 256);

    // initialize info about each plot's name, url, min/max zoom level
    plot.addPlotByName('caffeine_consumption', '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 2, 7);
    plot.addPlotByName('standing_height', '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 2, 8);
    plot.addPlotByName('caffeine_consumption2', '/Users/maccum/manhattan_data/plots/caffeine_plots_2/caffeine_consumption', 2, 8);

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
            console.log("beginDrag");
            isDragging = true;
            var mousePositionOnStartDrag = getMousePosition(evt);
            mousePositionSinceLastMove = mousePositionOnStartDrag;
        }

        function drag(evt) {
            if (isDragging) {
                console.log('dragging');
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
        console.log("snap zoom out");

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
            console.log(tspans);
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

    // convert x,y in viewing window coordinates to graph coordinates
    function _getCoordinates(x, y) {
        var args = plot.getInfoForGUI();
        var visibles = args.visibleLayers;
        var dimensions = args.dimensions;

        var first = visibles[0],
            firstKey = first.level,
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;
        
        var percentageCoordinates = position.topLeftToPercentage({x: x, y: y}, first.topLeft, first.scale, width, height);
        var pixelCoordinates = {x: percentageCoordinates.x * width, y: percentageCoordinates.y * height};
        
        // map % coordinates to graph coordinates
        //var graphX = plot._mapValueOntoRange(percentageCoordinates.x, [0,1], [-9095836,3045120653]);
        //var graphY = plot._mapValueOntoRange(percentageCoordinates.y, [1,0], [-1.9999969651507141,11.767494897838054]);

        return [pixelCoordinates, width, height];
    }

    return {
        insertTextbox: insertTextbox,
        hoverListener: function (e) {
            if (typecheck.nullOrUndefined(hoverArea)) throw new Error("hover: hoverArea must be initialized.");
            mousepos = _getMousePositionWithinObject(e.clientX, e.clientY, hoverArea);
            //console.log('mouse pos: ' + mousepos.x + " " + mousepos.y);

            var res = _getCoordinates(mousepos.x, mousepos.y);
            var graphCoords = res[0], width = res[1], height = res[2];
            console.log('pixel pos: ' + graphCoords.x + " " + graphCoords.y);

            var points = [
                {x: 504127070, y: 8.19918, chrPos: "3:11677077", alleles: '[C,T]', p: 2.74879},
                {x: 544549434, y: 9.76749, chrPos: "3:52099441", alleles: '[T,C]', p: 5.72837},
                {x: 2706668928, y: 8.41574, chrPos: "19:47224607", alleles: '[C,T]', p: 2.21356},
            ];
        
            // check if mouse is over 50,50 circle with radius 3
            for (var i = 0; i< points.length; i++) {
                var pixelPoint = {x: plot._mapValueOntoRange(points[i].x, [-9095836,3045120653], [0,width]), y: plot._mapValueOntoRange(points[i].y, [-1.9999969651507141,11.767494897838054], [height,0])};

                if (Math.abs(graphCoords.x - pixelPoint.x) < 2 && Math.abs(graphCoords.y - pixelPoint.y) < 2) {
                    //makeTextBox(['1:200,000,000', 'alleles: T/C', 'rsid: rs142134', 'gene: foo gene', '5.3e-61'], 50, 50, document.getElementById('root'));
                    console.log('match!');
                    _displayTextBox(mousepos.x, mousepos.y, [points[i].chrPos, points[i].alleles, 'rs0', 'gene label...', points[i].p]);
                    return;
                } else {
                    _hideTextBox();
                }
            }
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
    if (transformations.length === 0) {
        var translate = this.plot.createSVGTransform();
        translate.setTranslate(0, 0);
        this.layer.transform.baseVal.insertItemBefore(translate, 0);

        var scale = this.plot.createSVGTransform();
        scale.setScale(1.0, 1.0);
        this.layer.transform.baseVal.insertItemBefore(scale, 1);
    } else {
        if (transformations.length !== 2) throw new Error("editSVG: expected transformations to be a list of length 2.");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjQvc3JjL21haW4uanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bsb3QuanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bvc2l0aW9uLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvZ3VpLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvaGFuZGxlcnMuanMiLCJzY3JpcHRzL3Y0L3NyYy91aS9ob3Zlci5qcyIsInNjcmlwdHMvdjQvc3JjL3VpL3NlYXJjaC5qcyIsInNjcmlwdHMvdjQvc3JjL3VpL3NldHVwLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc2NoZW1hLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc2VsZWN0b3JzLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvc3ZnLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvdGFnLmpzIiwic2NyaXB0cy92NC9zcmMvdXRpbHMvdHlwZWNoZWNrLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIHNlYXJjaCA9IHJlcXVpcmUoJy4vdWkvc2VhcmNoLmpzJykuc2VhcmNoO1xudmFyIHNldHVwID0gcmVxdWlyZSgnLi91aS9zZXR1cC5qcycpLnNldHVwO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgcGxvdCA9IHJlcXVpcmUoJy4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuL3VpL2d1aS5qcycpLmd1aTtcblxudmFyIGhhbmRsZXJzID0gcmVxdWlyZSgnLi91aS9oYW5kbGVycy5qcycpLmhhbmRsZXJzO1xuXG52YXIgaG92ZXIgPSByZXF1aXJlKCcuL3VpL2hvdmVyLmpzJykuaG92ZXI7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gICAgLy8gYWRkIHdpZGdldCBzdHVmZiB0byBwYWdlXG4gICAgdmFyIHdpZGdldCA9IHNldHVwLnNldFVwV2lkZ2V0KCd3aWRnZXQtZGl2Jywgc2VsZWN0b3JzLmlkcy53aWRnZXQsIDExMjQsIDM1MCwgJyNlOGViZWYnKTtcbiAgICBzZXR1cC5zZXRVcFBsb3Qod2lkZ2V0LCBzZWxlY3RvcnMuaWRzLnBsb3QsIDEwMjQsIDI1NiwgNTAsIDMwKTtcblxuICAgIC8vIGFkZCBpbWFnZXNcbiAgICBzZXR1cC5pbnNlcnRQbG90SW1hZ2VzKCdjYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDcsICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzL2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMjU2LCAyNTYpO1xuICAgIHNldHVwLmluc2VydFBsb3RJbWFnZXMoJ3N0YW5kaW5nX2hlaWdodCcsIDIsIDgsICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLCAyNTYsIDI1Nik7XG4gICAgc2V0dXAuaW5zZXJ0UGxvdEltYWdlcygnY2FmZmVpbmVfY29uc3VtcHRpb24yJywgMiwgOCwgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDI1NiwgMjU2KTtcblxuICAgIC8vIGluaXRpYWxpemUgaW5mbyBhYm91dCBlYWNoIHBsb3QncyBuYW1lLCB1cmwsIG1pbi9tYXggem9vbSBsZXZlbFxuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnY2FmZmVpbmVfY29uc3VtcHRpb24nLCAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDcpO1xuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnc3RhbmRpbmdfaGVpZ2h0JywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvc3RhbmRpbmdfaGVpZ2h0X3Bsb3RzL3N0YW5kaW5nX2hlaWdodCcsIDIsIDgpO1xuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnY2FmZmVpbmVfY29uc3VtcHRpb24yJywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDgpO1xuXG4gICAgLy8gc2V0IHVwIGRlZmF1bHQgcGxvdCBmb3IgbW9kZWxcbiAgICBwbG90LnN3aXRjaFBsb3RzKCdjYWZmZWluZV9jb25zdW1wdGlvbjInKTtcblxuICAgIC8vIGRpc3BsYXkgZGVmYXVsdCBwbG90XG4gICAgZ3VpLnJlbmRlcihwbG90LmdldEluZm9Gb3JHVUkoKSk7XG5cbiAgICAvLyBzZXQgdXAgbGlzdGVuZXJzXG4gICAgaGFuZGxlcnMubGlzdGVuRm9yRHJhZyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGhhbmRsZXJzLm9uV2hlZWwpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZXJzLm9uQnV0dG9uQ2xpY2tab29tSW4pO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1vdXQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbU91dCk7XG5cbiAgICAvLyBob3ZlciBsaXN0ZW5lclxuICAgIGhvdmVyLmluc2VydFRleHRib3goJ3Bsb3QnKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGhvdmVyLmhvdmVyTGlzdGVuZXIpO1xufVxuXG5pbml0KCk7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuL3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuXG52YXIgcGxvdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBsb3RzQnlOYW1lID0ge1xuICAgICAgICAvLydjYWZmZWluZV9jb25zdW1wdGlvbic6IHt1cmw6ICcvcGF0aC9oZXJlLycsIG1pblpvb206IDIsIG1heFpvb206IDd9LFxuICAgICAgICAvLydzdGFuZGluZ19oZWlnaHQnIDoge3VybDogJy9wYXRoL2hlcmUvJywgbWluWm9vbTogMiwgbWF4Wm9vbTogOH0sXG4gICAgfVxuXG4gICAgdmFyIHBsb3RJRCA9IG51bGwsXG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIHNjYWxlRmFjdG9yID0gMTAwMDAsXG4gICAgICAgIHpvb21JbmNyZW1lbnQgPSA1LFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbNjAwMCwgOTAwMF0sXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzEyMDAwLCAxODAwMF0sXG4gICAgICAgIHZpc2libGVzID0ge30sXG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKSxcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuXG5cbiAgICBmdW5jdGlvbiBnZXRQbG90SUQoKSB7XG4gICAgICAgIHJldHVybiBwbG90SUQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0UGxvdHNCeU5hbWUoKSB7XG4gICAgICAgIHJldHVybiBwbG90c0J5TmFtZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREaW1lbnNpb25zKCkge1xuICAgICAgICByZXR1cm4gZGltZW5zaW9ucztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRWaXNpYmxlcygpIHtcbiAgICAgICAgcmV0dXJuIHZpc2libGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEhpZGRlbnMoKSB7XG4gICAgICAgIHJldHVybiBoaWRkZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFBsb3RCeU5hbWUobmFtZSwgdXJsLCBtaW5ab29tLCBtYXhab29tKSB7XG4gICAgICAgIHBsb3RzQnlOYW1lW25hbWVdID0geyB1cmw6IHVybCwgbWluWm9vbTogbWluWm9vbSwgbWF4Wm9vbTogbWF4Wm9vbSB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBwbG90SUQgPSBudWxsO1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNaW5NYXhMZXZlbChtaW4sIG1heCkge1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBtaW47XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG1heDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplVmlzaWJsZShsZXZlbCwgZGltcykge1xuICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB7IHg6IDAsIHk6IDAgfSwgc2NhbGU6IHsgeDogMSAqIHNjYWxlRmFjdG9yLCB5OiAxICogc2NhbGVGYWN0b3IgfSwgb3BhY2l0eTogMSB9O1xuICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVIaWRkZW4obGV2ZWwsIGRpbXMpIHtcbiAgICAgICAgaWYgKGxldmVsIDwgbWluaW11bUxldmVsIHx8IGxldmVsID4gbWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIGhpZGRlbiBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIGhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzd2l0Y2hQbG90cyhuYW1lKSB7XG4gICAgICAgIHJlc2V0KCk7XG4gICAgICAgIHBsb3RJRCA9IG5hbWU7XG4gICAgICAgIHZhciBtaW5ab29tID0gcGxvdHNCeU5hbWVbbmFtZV0ubWluWm9vbSxcbiAgICAgICAgICAgIG1heFpvb20gPSBwbG90c0J5TmFtZVtuYW1lXS5tYXhab29tO1xuICAgICAgICBzZXRNaW5NYXhMZXZlbChtaW5ab29tLCBtYXhab29tKTtcblxuICAgICAgICAvLyBUT0RPOiBtYWtlIHdpZHRoIGFuZCBoZWlnaHQgb2YgcGxvdHMgZmxleGlibGVcbiAgICAgICAgdmFyIG5Db2xzID0gZnVuY3Rpb24gKHopIHsgcmV0dXJuIE1hdGgucG93KDIsIHopOyB9XG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlKG1pblpvb20sIHsgd2lkdGg6IG5Db2xzKG1pblpvb20pICogMjU2LCBoZWlnaHQ6IDI1NiB9KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IG1pblpvb20gKyAxOyBpIDwgbWF4Wm9vbSArIDE7IGkrKykge1xuICAgICAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbihpLCB7IHdpZHRoOiBuQ29scyhpKSAqIDI1NiwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bml0U2NhbGUoc2NhbGUpIHtcbiAgICAgICAgaWYgKChzY2FsZS54ID4gLjUgJiYgc2NhbGUueCA8IDIpIHx8IChzY2FsZS55ID4gLjUgJiYgc2NhbGUueSA8IDIpKSB0aHJvdyBuZXcgRXJyb3IoJ3NjYWxlIGFscmVhZHkgaW4gdW5pdCBzY2FsZScpO1xuICAgICAgICByZXR1cm4geyB4OiBzY2FsZS54IC8gc2NhbGVGYWN0b3IsIHk6IHNjYWxlLnkgLyBzY2FsZUZhY3RvciB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3cobGV2ZWwsIHRvcExlZnQsIHNjYWxlLCBvcGFjaXR5KSB7XG4gICAgICAgIGlmICghaGlkZGVucy5oYXMobGV2ZWwpKSB0aHJvdyBuZXcgRXJyb3IoXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIik7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB0b3BMZWZ0LCBzY2FsZTogc2NhbGUsIG9wYWNpdHk6IG9wYWNpdHkgfTtcbiAgICAgICAgaGlkZGVucy5kZWxldGUobGV2ZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhpZGUobGV2ZWwpIHtcbiAgICAgICAgaWYgKCF2aXNpYmxlc1tsZXZlbF0pIHRocm93IG5ldyBFcnJvcihcIlRyaWVkIHRvIGhpZGUgYSBsZXZlbCB0aGF0IGlzIG5vdCB2aXNpYmxlXCIpO1xuICAgICAgICBkZWxldGUgdmlzaWJsZXNbbGV2ZWxdO1xuICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IHNjYWxlLng7XG4gICAgICAgIGlmICh4U2NhbGUgPCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggaGlnaGVyIHpvb20gbGV2ZWwgKG9uIHRvcCBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gbWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsuMiwgMV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHhTY2FsZSA+IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGxvd2VyIHpvb20gbGV2ZWwgKGJlbG93IGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBtYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMSwgLjJdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFwVmFsdWVPbnRvUmFuZ2UodmFsdWUsIG9sZFJhbmdlLCBuZXdSYW5nZSkge1xuICAgICAgICB2YXIgb2xkU3BhbiA9IG9sZFJhbmdlWzFdIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBuZXdTcGFuID0gbmV3UmFuZ2VbMV0gLSBuZXdSYW5nZVswXTtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9WYWx1ZSA9IHZhbHVlIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBwZXJjZW50U3BhblRvVmFsdWUgPSBkaXN0YW5jZVRvVmFsdWUgLyBvbGRTcGFuO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb05ld1ZhbHVlID0gcGVyY2VudFNwYW5Ub1ZhbHVlICogbmV3U3BhbjtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmV3UmFuZ2VbMF0gKyBkaXN0YW5jZVRvTmV3VmFsdWU7XG4gICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvc2l0aW9uKG5ld1RvcExlZnQpIHtcbiAgICAgICAgaWYgKCghbmV3VG9wTGVmdC54ICYmIG5ld1RvcExlZnQueCAhPSAwKSB8fCAoIW5ld1RvcExlZnQueSAmJiBuZXdUb3BMZWZ0LnkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImJhZCBuZXcgVG9wIExlZnQ6IFtcIiArIG5ld1RvcExlZnQueCArIFwiLCBcIiArIG5ld1RvcExlZnQueSArIFwiXVwiKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQgPSBuZXdUb3BMZWZ0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXRPcGFjaXRpZXMoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5vcGFjaXR5ID0gY2FsY3VsYXRlT3BhY2l0eSh2aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFBsb3RJRChpZCkge1xuICAgICAgICBwbG90SUQgPSBpZDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRJbmZvRm9yR1VJKCkge1xuICAgICAgICB2YXIgbGlzdE9mVmlzaWJsZXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgc2NhbGUgZm9yIHBhc3NpbmcgdG8gR1VJOiBcbiAgICAgICAgICAgIHZhciBndWlMYXllciA9IHtcbiAgICAgICAgICAgICAgICBsZXZlbDogdmlzaWJsZXNba2V5XS5sZXZlbCxcbiAgICAgICAgICAgICAgICB0b3BMZWZ0OiB2aXNpYmxlc1trZXldLnRvcExlZnQsXG4gICAgICAgICAgICAgICAgc2NhbGU6IHVuaXRTY2FsZSh2aXNpYmxlc1trZXldLnNjYWxlKSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlc1trZXldLm9wYWNpdHksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGd1aUxheWVyO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxpc3RPZkhpZGRlbnMgPSBBcnJheS5mcm9tKGhpZGRlbnMpO1xuICAgICAgICAvL3JldHVybiBbbGlzdE9mVmlzaWJsZXMsIGxpc3RPZkhpZGRlbnNdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGxvdElEOiBwbG90SUQsXG4gICAgICAgICAgICB2aXNpYmxlTGF5ZXJzOiBsaXN0T2ZWaXNpYmxlcyxcbiAgICAgICAgICAgIGhpZGRlbkxldmVsczogbGlzdE9mSGlkZGVucyxcbiAgICAgICAgICAgIGRpbWVuc2lvbnM6IGdldERpbWVuc2lvbnMoKSxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyRm9yVGVzdGluZygpIHtcbiAgICAgICAgdmlzaWJsZXMgPSB7fTtcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pO1xuICAgICAgICBkaW1lbnNpb25zID0ge307XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5jcmVhc2VTY2FsZSgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDwgc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA+PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSAmJiBrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSArIDE7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPD0gbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdLCB5OiAxICogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVjcmVhc2VTY2FsZSgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXkgPT0gbWluaW11bUxldmVsICYmIHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZUZhY3RvcikpIHtcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdICYmIGtleSA+IG1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSAtIDE7XG4gICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPj0gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHpvb20oZm9jdXMsIHZlcnRpY2FsKSB7XG4gICAgICAgIHZhciBmaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgIGZpcnN0ID0gdmlzaWJsZXNbZmlyc3RLZXldLFxuICAgICAgICAgICAgd2lkdGggPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgdW5pdFNjYWxlKGZpcnN0LnNjYWxlKSwgd2lkdGgsIGhlaWdodCk7XG5cbiAgICAgICAgdmFyIGhvd011Y2ggPSBNYXRoLmZsb29yKE1hdGguYWJzKHZlcnRpY2FsKSAvIDUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvd011Y2g7IGkrKykge1xuICAgICAgICAgICAgaWYgKHZlcnRpY2FsIDwgMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5jcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdGaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgIG5ld0ZpcnN0ID0gdmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgbmV3V2lkdGggPSBkaW1lbnNpb25zW25ld0ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgIG5ld0hlaWdodCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgbmV3VG9wTGVmdCA9IHBvc2l0aW9uLnBlcmNlbnRhZ2VUb1RvcExlZnQoZm9jdXMsIHBlcmNlbnRhZ2VDb29yZGluYXRlcywgdW5pdFNjYWxlKG5ld0ZpcnN0LnNjYWxlKSwgbmV3V2lkdGgsIG5ld0hlaWdodCk7XG4gICAgICAgIHJlcG9zaXRpb24obmV3VG9wTGVmdCk7XG4gICAgICAgIHJlc2V0T3BhY2l0aWVzKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc25hcEluKGZvY3VzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDUpIHtcbiAgICAgICAgICAgIHRoaXMuem9vbShmb2N1cywgLTUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNuYXBPdXQoZm9jdXMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcyk7XG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSB2aXNpYmxlc1tPYmplY3Qua2V5cyh2aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNCkge1xuICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmFnKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZXRQbG90SUQ6IHNldFBsb3RJRCxcbiAgICAgICAgZ2V0SW5mb0ZvckdVSTogZ2V0SW5mb0ZvckdVSSxcbiAgICAgICAgZ2V0UGxvdElEOiBnZXRQbG90SUQsXG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlOiBpbml0aWFsaXplVmlzaWJsZSxcbiAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbjogaW5pdGlhbGl6ZUhpZGRlbixcbiAgICAgICAgY2xlYXJGb3JUZXN0aW5nOiBjbGVhckZvclRlc3RpbmcsXG4gICAgICAgIGdldFZpc2libGVzOiBnZXRWaXNpYmxlcyxcbiAgICAgICAgZ2V0SGlkZGVuczogZ2V0SGlkZGVucyxcbiAgICAgICAgaW5jcmVhc2VTY2FsZTogaW5jcmVhc2VTY2FsZSxcbiAgICAgICAgZGVjcmVhc2VTY2FsZTogZGVjcmVhc2VTY2FsZSxcbiAgICAgICAgem9vbTogem9vbSxcbiAgICAgICAgc25hcEluOiBzbmFwSW4sXG4gICAgICAgIHNuYXBPdXQ6IHNuYXBPdXQsXG4gICAgICAgIGRyYWc6IGRyYWcsXG4gICAgICAgIHNldE1pbk1heExldmVsOiBzZXRNaW5NYXhMZXZlbCxcbiAgICAgICAgcmVzZXQ6IHJlc2V0LFxuICAgICAgICBhZGRQbG90QnlOYW1lOiBhZGRQbG90QnlOYW1lLFxuICAgICAgICBzd2l0Y2hQbG90czogc3dpdGNoUGxvdHMsXG4gICAgICAgIGdldERpbWVuc2lvbnM6IGdldERpbWVuc2lvbnMsXG4gICAgICAgIGdldFBsb3RzQnlOYW1lOiBnZXRQbG90c0J5TmFtZSxcbiAgICAgICAgX2hpZGU6IGhpZGUsXG4gICAgICAgIF9zaG93OiBzaG93LFxuICAgICAgICBfY2FsY3VsYXRlT3BhY2l0eTogY2FsY3VsYXRlT3BhY2l0eSxcbiAgICAgICAgX21hcFZhbHVlT250b1JhbmdlOiBtYXBWYWx1ZU9udG9SYW5nZSxcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMucGxvdCA9IHBsb3Q7IiwidmFyIHBvc2l0aW9uID0ge1xuICAgIGNhbGN1bGF0ZVBlcmNlbnQ6IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBvc2l0aW9uQiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIGlmIChsZW5ndGhCIDw9IDApIHRocm93IG5ldyBFcnJvcihcIkxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlLlwiKTtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wb3NpdGlvbiA9IHBvc2l0aW9uOyIsInZhciBlZGl0U1ZHID0gcmVxdWlyZSgnLi4vdXRpbHMvc3ZnLmpzJykuZWRpdFNWRztcbnZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG52YXIgdGFnID0gcmVxdWlyZSgnLi4vdXRpbHMvdGFnLmpzJykudGFnO1xuXG52YXIgZ3VpID0ge1xuICAgIGhpZGU6IGZ1bmN0aW9uKHBsb3RJRCkge1xuICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgc2NoZW1hLmNoZWNrKGFyZ3MsIFsncGxvdElEJywgJ3Zpc2libGVMYXllcnMnLCAnaGlkZGVuTGV2ZWxzJywgJ2RpbWVuc2lvbnMnXSk7XG4gICAgICAgIHZhciBwbG90SUQgPSBhcmdzLnBsb3RJRCxcbiAgICAgICAgICAgIHZpc2libGVMYXllcnMgPSBhcmdzLnZpc2libGVMYXllcnMsXG4gICAgICAgICAgICBoaWRkZW5MZXZlbHMgPSBhcmdzLmhpZGRlbkxldmVscyxcbiAgICAgICAgICAgIGRpbXMgPSBhcmdzLmRpbWVuc2lvbnM7XG5cbiAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdpbmxpbmUnKTtcblxuICAgICAgICBpZiAoISh2aXNpYmxlTGF5ZXJzLmxlbmd0aCA+IDAgJiYgdmlzaWJsZUxheWVycy5sZW5ndGggPD0gMikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgaGF2ZSAxLTIgdmlzaWJsZSBsYXllcnMuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaGlkZGVuSW5kZXggaW4gaGlkZGVuTGV2ZWxzKSB7XG4gICAgICAgICAgICB2YXIgbGV2ZWwgPSBoaWRkZW5MZXZlbHNbaGlkZGVuSW5kZXhdO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChsZXZlbCkgIT0gJ1tvYmplY3QgTnVtYmVyXScpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUkgRVJST1I6IGV4cGVjdGVkIGEgbGlzdCBvZiBudW1iZXJzIGZvciBoaWRkZW5MYXllcnMuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKS5zZXQocGxvdElELCBsZXZlbCkuaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgdmlzaWJsZUluZGV4IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZhciBsYXllciA9IHZpc2libGVMYXllcnNbdmlzaWJsZUluZGV4XTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmxheWVyKGxheWVyKSkgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBleHBlY3RlZCBsYXllciBzY2hlbWEuXCIpO1xuICAgICAgICAgICAgaWYgKGxheWVyLnNjYWxlLnggPiAyIHx8IGxheWVyLnNjYWxlLnggPCAuNSB8fCBsYXllci5zY2FsZS55ID4gMiB8fCBsYXllci5zY2FsZS55IDwgLjUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IHNjYWxlIG91dHNpZGUgWy41LDJdIHJhbmdlLiBTY2FsZSBzaG91bGQgYmUgY29udmVydGVkIHRvIFsuNSwyXSBiZWZvcmUgYmVpbmcgcGFzc2VkIHRvIEdVSS4gW1wiICsgbGF5ZXIuc2NhbGUueCArIFwiLCBcIiArIGxheWVyLnNjYWxlLnkgKyBcIl1cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdmdCdW5kbGUgPSBuZXcgZWRpdFNWRygpLnNldChwbG90SUQsIGxheWVyLmxldmVsKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGRpbXNGcm9tUGFnZSA9IHN2Z0J1bmRsZS5kaW1lbnNpb25zKCk7XG4gICAgICAgICAgICBpZiAoKGRpbXNGcm9tUGFnZVswXSAhPSBkaW1zW2xheWVyLmxldmVsXS53aWR0aCkgfHwgKGRpbXNGcm9tUGFnZVsxXSAhPSBkaW1zW2xheWVyLmxldmVsXS5oZWlnaHQpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBkaW1lbnNpb25zIG9mIHBsb3Qgb24gcGFnZSBkb24ndCBtYXRjaCBkaW1lbnNpb25zIG9mIHBsb3QgZnJvbSBtb2RlbFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3ZnQnVuZGxlXG4gICAgICAgICAgICAgICAgLnRyYW5zbGF0ZShsYXllci50b3BMZWZ0LngsIGxheWVyLnRvcExlZnQueSlcbiAgICAgICAgICAgICAgICAuc2NhbGUobGF5ZXIuc2NhbGUueCwgbGF5ZXIuc2NhbGUueSlcbiAgICAgICAgICAgICAgICAuZmFkZShsYXllci5vcGFjaXR5KVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlzaWJsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgc2NhbGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIG9wYWNpdHlTdHJpbmcgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmlzaWJsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0ubGV2ZWw7XG4gICAgICAgICAgICBzY2FsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0uc2NhbGUueDtcbiAgICAgICAgICAgIG9wYWNpdHlTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0ub3BhY2l0eTtcbiAgICAgICAgfVxuICAgICAgICAkKFwiI3pvb20tZGl2XCIpLnRleHQodmlzaWJsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI2ZyYWN0aW9uYWwtem9vbS1kaXZcIikudGV4dChzY2FsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI29wYWNpdHktZGl2XCIpLnRleHQob3BhY2l0eVN0cmluZyk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmd1aSA9IGd1aTsiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xuXG52YXIgaGFuZGxlcnMgPSB7XG4gICAgY2FsbEdVSTogZnVuY3Rpb24gKCkge1xuICAgICAgICBndWkucmVuZGVyKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcbiAgICB9LFxuXG4gICAgZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdDogZnVuY3Rpb24gKG1vdXNlWCwgbW91c2VZLCBib3VuZGluZ09iamVjdCkge1xuICAgICAgICB2YXIgY3RtID0gYm91bmRpbmdPYmplY3QuZ2V0U2NyZWVuQ1RNKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiAobW91c2VYIC0gY3RtLmUpIC8gY3RtLmEsXG4gICAgICAgICAgICB5OiAobW91c2VZIC0gY3RtLmYpIC8gY3RtLmRcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgbGlzdGVuRm9yRHJhZzogZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImxpc3RlbkZvckRyYWdcIik7XG4gICAgICAgIHZhciBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIC8vdmFyIHN2ZyA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJlZ2luRHJhZywgZmFsc2UpO1xuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZywgZmFsc2UpO1xuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGVuZERyYWcsIGZhbHNlKTtcblxuICAgICAgICB2YXIgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmU7XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGJlZ2luRHJhZyhldnQpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJiZWdpbkRyYWdcIik7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBtb3VzZVBvc2l0aW9uT25TdGFydERyYWcgPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgICAgICBpZiAoaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50TW91c2VQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICAgICAgeTogY3VycmVudE1vdXNlUG9zaXRpb24ueSAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLnksXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHBsb3QuZHJhZyhjaGFuZ2VJbk1vdXNlUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcblxuICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb25XaGVlbDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGhvcml6b250YWwgPSBldnQuZGVsdGFYO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBldnQuZGVsdGFZO1xuXG4gICAgICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIik7XG4gICAgICAgICAgICB2YXIgbW91c2VQb3MgPSBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgICAgIHBsb3Quem9vbShtb3VzZVBvcywgdmVydGljYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxvdC5kcmFnKHsgeDogaG9yaXpvbnRhbCwgeTogMCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICB9LFxuXG4gICAgb25CdXR0b25DbGlja1pvb21JbjogZnVuY3Rpb24gKCkge1xuICAgICAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCAtNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3Quc25hcEluKHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tT3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic25hcCB6b29tIG91dFwiKTtcblxuICAgICAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCA1KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAocGxvdC5zbmFwT3V0KHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmhhbmRsZXJzID0gaGFuZGxlcnM7IiwidmFyIHR5cGVjaGVjayA9IHJlcXVpcmUoJy4uL3V0aWxzL3R5cGVjaGVjay5qcycpLnR5cGVjaGVjaztcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuLi9wbG90L3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xuLyogSG92ZXIgZGF0YS5cblxuRGlzcGxheSBtZXRhZGF0YSB3aGVuIG1vdXNlIGhvdmVycyBvdmVyIHBvaW50LiAqL1xudmFyIGhvdmVyID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBob3ZlckFyZWEgPSBudWxsO1xuXG4gICAgZnVuY3Rpb24gaW5zZXJ0VGV4dGJveChwYXJlbnRJRCkge1xuICAgICAgICBob3ZlckFyZWEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChwYXJlbnRJRCk7XG5cbiAgICAgICAgLy8gbWFrZSBzdmcgdG8gY29udGFpbiB0ZXh0Ym94XG4gICAgICAgIHZhciB0ZXh0Ym94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgJ3N2ZycpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgnaWQnLCBcInRleHRib3hcIik7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd4JywgXCIwXCIpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgneScsIFwiMFwiKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCBcImhpZGRlblwiKTtcbiAgICAgICAgaG92ZXJBcmVhLmFwcGVuZENoaWxkKHRleHRib3gpO1xuICAgIFxuICAgICAgICAvLyBpbnNlcnQgcmVjdCBiYWNrZ3JvdW5kIHdpdGggbGluZSBpbnRvIGZpcnN0IHN2ZyBlbGVtZW50XG4gICAgICAgIHZhciByZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgJ3JlY3QnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3RleHRib3hSZWN0Jyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCd4JywgJzAnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3knLCAnMCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnZmlsbCcsICd3aGl0ZScpO1xuICAgICAgICB0ZXh0Ym94LmFwcGVuZENoaWxkKHJlY3QpO1xuICAgIFxuICAgICAgICAvLyBtYWtlIGNvbnRhaW5lciBmb3IgdGV4dCAod2l0aCBtYXJnaW5zKSBpbnNpZGUgdGV4dGJveFxuICAgICAgICB2YXIgaW5uZXJUZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgJ3N2ZycpO1xuICAgICAgICBpbm5lclRleHQuc2V0QXR0cmlidXRlKCdpZCcsICd0ZXh0Ym94SW5uZXInKTtcbiAgICAgICAgaW5uZXJUZXh0LnNldEF0dHJpYnV0ZSgneCcsICc1Jyk7XG4gICAgICAgIGlubmVyVGV4dC5zZXRBdHRyaWJ1dGUoJ3knLCAnNScpO1xuICAgICAgICB0ZXh0Ym94LmFwcGVuZENoaWxkKGlubmVyVGV4dCk7XG4gICAgXG4gICAgICAgIHZhciB0ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgJ3RleHQnKTtcbiAgICAgICAgdGV4dC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3RleHRib3hUZXh0Jyk7XG4gICAgICAgIHRleHQuc2V0QXR0cmlidXRlKCd5JywgJzUnKTtcbiAgICAgICAgdGV4dC5zZXRBdHRyaWJ1dGUoJ2ZvbnQtc2l6ZScsICcxMCcpO1xuICAgICAgICB0ZXh0LnNldEF0dHJpYnV0ZSgnZHknLCAnMCcpO1xuICAgIFxuICAgICAgICAvLyBpbnNlcnQgdGV4dCBpbnRvIHNlY29uZCBzdmcgZWxlbWVudFxuICAgICAgICBpbm5lclRleHQuYXBwZW5kQ2hpbGQodGV4dCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2Rpc3BsYXlUZXh0Qm94KHgsIHksIGxpbmVzKSB7XG4gICAgICAgIHZhciB0ZXh0Ym94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3gnKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCs1KSk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKTtcbiAgICAgICAgdGV4dGJveC5zZXRBdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCBcInZpc2libGVcIik7XG4gICAgXG4gICAgICAgIC8vIGFkZCB0c3BhbnMgdG8gdGV4dCBlbGVtZW50IHdpdGggdHNwYW5zXG4gICAgICAgIHZhciBsaW5lQ291bnQgPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIHZhciB0c3BhbnMgPSAnPHRzcGFuIHg9XCIwXCIgZHk9XCIwLjZlbVwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+JyArIGxpbmVzWzBdICsgJzwvdHNwYW4+JztcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsaW5lQ291bnQ7IGkrKykge1xuICAgICAgICAgICAgY29uc29sZS5sb2codHNwYW5zKTtcbiAgICAgICAgICAgIHRzcGFucyArPSAnPHRzcGFuIHg9XCIwXCIgZHk9XCIxLjJlbVwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+JyArIGxpbmVzW2ldICsgJzwvdHNwYW4+JztcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXh0Ym94VGV4dCcpO1xuICAgICAgICB0ZXh0LmlubmVySFRNTCA9IHRzcGFucztcbiAgICBcbiAgICAgICAgLy8gZ2V0IHdpZHRoIGFuZCBoZWlnaHQgb2YgdGV4dCBlbGVtZW50XG4gICAgICAgIHZhciB3aWR0aCA9IHRleHQuZ2V0QkJveCgpLndpZHRoO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGV4dC5nZXRCQm94KCkuaGVpZ2h0O1xuICAgIFxuICAgICAgICAvLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIGJhY2tncm91bmQgcmVjdFxuICAgICAgICB2YXIgcmVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXh0Ym94UmVjdCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aCArIDE1KTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodCArIDE1KTtcbiAgICBcbiAgICAgICAgLy8gc2V0IHdpZHRoL2hlaWdodCBvZiB3aG9sZSB0ZXh0Ym94XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoICsgMTUpO1xuICAgICAgICB0ZXh0Ym94LnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0ICsgMTUpO1xuICAgICAgICBcbiAgICAgICAgLy8gc2V0IHdpZHRoL2hlaWdodCBvZiB0ZXh0IGNvbnRhaW5lclxuICAgICAgICB2YXIgaW5uZXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RleHRib3hJbm5lcicpO1xuICAgICAgICBpbm5lclRleHQuc2V0QXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoICsgMTApO1xuICAgICAgICBpbm5lclRleHQuc2V0QXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQgKyAxMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2hpZGVUZXh0Qm94KCkge1xuICAgICAgICB2YXIgdGV4dGJveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXh0Ym94Jyk7XG4gICAgICAgIHRleHRib3guc2V0QXR0cmlidXRlKCd2aXNpYmlsaXR5JywgXCJoaWRkZW5cIik7XG4gICAgfVxuICAgIFxuICAgIGZ1bmN0aW9uIF9nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KG1vdXNlWCwgbW91c2VZLCBib3VuZGluZ09iamVjdCkge1xuICAgICAgICB2YXIgY3RtID0gYm91bmRpbmdPYmplY3QuZ2V0U2NyZWVuQ1RNKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiAobW91c2VYIC0gY3RtLmUpIC8gY3RtLmEsXG4gICAgICAgICAgICB5OiAobW91c2VZIC0gY3RtLmYpIC8gY3RtLmRcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gY29udmVydCB4LHkgaW4gdmlld2luZyB3aW5kb3cgY29vcmRpbmF0ZXMgdG8gZ3JhcGggY29vcmRpbmF0ZXNcbiAgICBmdW5jdGlvbiBfZ2V0Q29vcmRpbmF0ZXMoeCwgeSkge1xuICAgICAgICB2YXIgYXJncyA9IHBsb3QuZ2V0SW5mb0ZvckdVSSgpO1xuICAgICAgICB2YXIgdmlzaWJsZXMgPSBhcmdzLnZpc2libGVMYXllcnM7XG4gICAgICAgIHZhciBkaW1lbnNpb25zID0gYXJncy5kaW1lbnNpb25zO1xuXG4gICAgICAgIHZhciBmaXJzdCA9IHZpc2libGVzWzBdLFxuICAgICAgICAgICAgZmlyc3RLZXkgPSBmaXJzdC5sZXZlbCxcbiAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG4gICAgICAgIFxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZSh7eDogeCwgeTogeX0sIGZpcnN0LnRvcExlZnQsIGZpcnN0LnNjYWxlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgdmFyIHBpeGVsQ29vcmRpbmF0ZXMgPSB7eDogcGVyY2VudGFnZUNvb3JkaW5hdGVzLnggKiB3aWR0aCwgeTogcGVyY2VudGFnZUNvb3JkaW5hdGVzLnkgKiBoZWlnaHR9O1xuICAgICAgICBcbiAgICAgICAgLy8gbWFwICUgY29vcmRpbmF0ZXMgdG8gZ3JhcGggY29vcmRpbmF0ZXNcbiAgICAgICAgLy92YXIgZ3JhcGhYID0gcGxvdC5fbWFwVmFsdWVPbnRvUmFuZ2UocGVyY2VudGFnZUNvb3JkaW5hdGVzLngsIFswLDFdLCBbLTkwOTU4MzYsMzA0NTEyMDY1M10pO1xuICAgICAgICAvL3ZhciBncmFwaFkgPSBwbG90Ll9tYXBWYWx1ZU9udG9SYW5nZShwZXJjZW50YWdlQ29vcmRpbmF0ZXMueSwgWzEsMF0sIFstMS45OTk5OTY5NjUxNTA3MTQxLDExLjc2NzQ5NDg5NzgzODA1NF0pO1xuXG4gICAgICAgIHJldHVybiBbcGl4ZWxDb29yZGluYXRlcywgd2lkdGgsIGhlaWdodF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaW5zZXJ0VGV4dGJveDogaW5zZXJ0VGV4dGJveCxcbiAgICAgICAgaG92ZXJMaXN0ZW5lcjogZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGhvdmVyQXJlYSkpIHRocm93IG5ldyBFcnJvcihcImhvdmVyOiBob3ZlckFyZWEgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgICAgICAgICBtb3VzZXBvcyA9IF9nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGUuY2xpZW50WCwgZS5jbGllbnRZLCBob3ZlckFyZWEpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnbW91c2UgcG9zOiAnICsgbW91c2Vwb3MueCArIFwiIFwiICsgbW91c2Vwb3MueSk7XG5cbiAgICAgICAgICAgIHZhciByZXMgPSBfZ2V0Q29vcmRpbmF0ZXMobW91c2Vwb3MueCwgbW91c2Vwb3MueSk7XG4gICAgICAgICAgICB2YXIgZ3JhcGhDb29yZHMgPSByZXNbMF0sIHdpZHRoID0gcmVzWzFdLCBoZWlnaHQgPSByZXNbMl07XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncGl4ZWwgcG9zOiAnICsgZ3JhcGhDb29yZHMueCArIFwiIFwiICsgZ3JhcGhDb29yZHMueSk7XG5cbiAgICAgICAgICAgIHZhciBwb2ludHMgPSBbXG4gICAgICAgICAgICAgICAge3g6IDUwNDEyNzA3MCwgeTogOC4xOTkxOCwgY2hyUG9zOiBcIjM6MTE2NzcwNzdcIiwgYWxsZWxlczogJ1tDLFRdJywgcDogMi43NDg3OX0sXG4gICAgICAgICAgICAgICAge3g6IDU0NDU0OTQzNCwgeTogOS43Njc0OSwgY2hyUG9zOiBcIjM6NTIwOTk0NDFcIiwgYWxsZWxlczogJ1tULENdJywgcDogNS43MjgzN30sXG4gICAgICAgICAgICAgICAge3g6IDI3MDY2Njg5MjgsIHk6IDguNDE1NzQsIGNoclBvczogXCIxOTo0NzIyNDYwN1wiLCBhbGxlbGVzOiAnW0MsVF0nLCBwOiAyLjIxMzU2fSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gY2hlY2sgaWYgbW91c2UgaXMgb3ZlciA1MCw1MCBjaXJjbGUgd2l0aCByYWRpdXMgM1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwaXhlbFBvaW50ID0ge3g6IHBsb3QuX21hcFZhbHVlT250b1JhbmdlKHBvaW50c1tpXS54LCBbLTkwOTU4MzYsMzA0NTEyMDY1M10sIFswLHdpZHRoXSksIHk6IHBsb3QuX21hcFZhbHVlT250b1JhbmdlKHBvaW50c1tpXS55LCBbLTEuOTk5OTk2OTY1MTUwNzE0MSwxMS43Njc0OTQ4OTc4MzgwNTRdLCBbaGVpZ2h0LDBdKX07XG5cbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoZ3JhcGhDb29yZHMueCAtIHBpeGVsUG9pbnQueCkgPCAyICYmIE1hdGguYWJzKGdyYXBoQ29vcmRzLnkgLSBwaXhlbFBvaW50LnkpIDwgMikge1xuICAgICAgICAgICAgICAgICAgICAvL21ha2VUZXh0Qm94KFsnMToyMDAsMDAwLDAwMCcsICdhbGxlbGVzOiBUL0MnLCAncnNpZDogcnMxNDIxMzQnLCAnZ2VuZTogZm9vIGdlbmUnLCAnNS4zZS02MSddLCA1MCwgNTAsIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWF0Y2ghJyk7XG4gICAgICAgICAgICAgICAgICAgIF9kaXNwbGF5VGV4dEJveChtb3VzZXBvcy54LCBtb3VzZXBvcy55LCBbcG9pbnRzW2ldLmNoclBvcywgcG9pbnRzW2ldLmFsbGVsZXMsICdyczAnLCAnZ2VuZSBsYWJlbC4uLicsIHBvaW50c1tpXS5wXSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfaGlkZVRleHRCb3goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuaG92ZXIgPSBob3ZlcjsiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xuXG4vKiBcblNlYXJjaCBiYXIgZm9yIGRpc3BsYXlpbmcgcmVzdWx0cyBvZiBxdWVyeS5cblxuZGVwZW5kZW5jeTogZnVzZSBcbiovXG52YXIgc2VhcmNoID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciByZXN1bHRzID0gW107IC8vIHJlc3VsdCBmcm9tIHNlYXJjaCBxdWVyeVxuICAgIHZhciBmb2N1cyA9IDE7IC8vIG4tdGggcm93IG9mIHJlc3VsdHMgdGFibGUgd2UncmUgZm9jdXNlZCBvblxuXG4gICAgdmFyIHBoZW5vdHlwZXMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAwLFxuICAgICAgICAgICAgdGl0bGU6IFwic3RhbmRpbmdfaGVpZ2h0XCIsXG4gICAgICAgICAgICB1cmw6ICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLFxuICAgICAgICAgICAgZGVzYzogJ0xvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQsIHNlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAxLFxuICAgICAgICAgICAgdGl0bGU6IFwiY2FmZmVpbmVfY29uc3VtcHRpb25cIixcbiAgICAgICAgICAgIHVybDogJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHMvY2FmZmVpbmVfY29uc3VtcHRpb24nLFxuICAgICAgICAgICAgZGVzYzogJ2RvIGVpdXNtb2QgdGVtcG9yIGluY2lkaWR1bnQgdXQgbGFib3JlIGV0IGRvbG9yZSBtYWduYSBhbGlxdWEuJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaWQ6IDIsXG4gICAgICAgICAgICB0aXRsZTogXCJjYWZmZWluZV9jb25zdW1wdGlvbjJcIixcbiAgICAgICAgICAgIHVybDogJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHMyL2NhZmZlaW5lX2NvbnN1bXB0aW9uJyxcbiAgICAgICAgICAgIGRlc2M6ICd0cmFuc3BhcmVudCBiYWNrZ3JvdW5kJyxcbiAgICAgICAgfVxuICAgIF07XG5cbiAgICAvLyBmdXNlIG9wdGlvbnNcbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgc2hvdWxkU29ydDogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZVNjb3JlOiB0cnVlLFxuICAgICAgICB0aHJlc2hvbGQ6IDAuNixcbiAgICAgICAgbG9jYXRpb246IDAsXG4gICAgICAgIGRpc3RhbmNlOiAxMDAsXG4gICAgICAgIG1heFBhdHRlcm5MZW5ndGg6IDMyLFxuICAgICAgICBtaW5NYXRjaENoYXJMZW5ndGg6IDEsXG4gICAgICAgIGtleXM6IFtcbiAgICAgICAgICAgIFwidGl0bGVcIixcbiAgICAgICAgICAgIFwiYXV0aG9yLmZpcnN0TmFtZVwiXG4gICAgICAgIF1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbWFrZVRhYmxlKCkge1xuICAgICAgICAkKCc8dGFibGUgaWQ9XCJzZWFyY2hfdGFibGVcIj48dHIgaWQ9XCJzZWFyY2hfdGl0bGVzXCI+PC90cj48L3RhYmxlPicpLmFwcGVuZFRvKCcjc2VhcmNoYmFyX3RhcmdldCcpO1xuICAgICAgICAkKCcjc2VhcmNoX3RpdGxlcycpLmFwcGVuZCgnPHRoIHdpZHRoPVwiMjBweFwiPmlkPC90aD4nKTtcbiAgICAgICAgJCgnI3NlYXJjaF90aXRsZXMnKS5hcHBlbmQoJzx0aCB3aWR0aD1cIjEwMHB4XCI+cGhlbm90eXBlPC90aD4nKTtcbiAgICAgICAgJCgnI3NlYXJjaF90aXRsZXMnKS5hcHBlbmQoJzx0aCB3aWR0aD1cIjQwMHB4XCI+ZGVzY3JpcHRpb248L3RoPicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFyVGFibGVDb250ZW50cygpIHtcbiAgICAgICAgJCgnLnJvdycpLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpc3BsYXlSZXN1bHRzKGNvbnRlbnRzLCBrZXlzVG9EaXNwbGF5KSB7XG4gICAgICAgIGNsZWFyVGFibGVDb250ZW50cygpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnRlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcm93ID0gJzx0ciBjbGFzcz1cInJvd1wiPic7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IGNvbnRlbnRzW2ldLml0ZW07XG4gICAgICAgICAgICAvL3ZhciBrZXlzID0gT2JqZWN0LmtleXMoaXRlbSk7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXNUb0Rpc3BsYXkubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2VsbCA9ICc8dGQ+JyArIGl0ZW1ba2V5c1RvRGlzcGxheVtqXV0gKyAnPC90ZD4nO1xuICAgICAgICAgICAgICAgIHJvdyArPSBjZWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcm93ICs9ICc8L3RyPic7XG4gICAgICAgICAgICAkKCcjc2VhcmNoX3RhYmxlJykuYXBwZW5kKHJvdyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZnVzZSA9IG5ldyBGdXNlKHBoZW5vdHlwZXMsIG9wdGlvbnMpO1xuICAgIG1ha2VUYWJsZSgpO1xuXG4gICAgZnVuY3Rpb24gc2VhcmNoQmFyS2V5VXAoZSkge1xuICAgICAgICAvLyBpZiBrZXkgd2FzIG5vdCB0aGUgdXAgb3IgZG93biBhcnJvdyBrZXksIGRpc3BsYXkgcmVzdWx0c1xuICAgICAgICBpZiAoZS5rZXlDb2RlICE9IDQwICYmIGUua2V5Q29kZSAhPSAzOCkge1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRzID0gJCgnI3NlYXJjaGJhcicpLnZhbCgpO1xuICAgICAgICAgICAgcmVzdWx0cyA9IGZ1c2Uuc2VhcmNoKGNvbnRlbnRzKTtcbiAgICAgICAgICAgIGRpc3BsYXlSZXN1bHRzKHJlc3VsdHMsIFsnaWQnLCAndGl0bGUnLCAnZGVzYyddKTtcbiAgICAgICAgICAgIGZvY3VzID0gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleVByZXNzKGUpIHtcbiAgICAgICAgLy8gaWYgZW50ZXIga2V5IHdhcyBwcmVzc2VkXG4gICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChmb2N1cyAhPSAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gJChcIi5yb3c6bnRoLW9mLXR5cGUoXCIgKyBmb2N1cyArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICB2YXIgcGhlbm90eXBlID0gc2VsZWN0ZWQuY2hpbGRyZW4oKS5lcSgxKS5odG1sKCk7XG4gICAgICAgICAgICAgICAgJCgnI3NlYXJjaGJhcicpLnZhbChwaGVub3R5cGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgcXVlcnkgPSAkKCcjc2VhcmNoYmFyJykudmFsKCk7XG4gICAgICAgICAgICAgICAgcmVzID0gZnVzZS5zZWFyY2gocXVlcnkpO1xuICAgICAgICAgICAgICAgIGlmIChyZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzWzBdLnNjb3JlID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwZXJmZWN0IG1hdGNoJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hQbG90cyhxdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyBtYXRjaFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNlYXJjaEJhcktleURvd24oZSkge1xuICAgICAgICAvLyBjaGFuZ2UgaGlnaGxpZ2h0ZWQgcm93IGluIHJlc3VsdHMgdGFibGVcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA0MCkgeyAvLyBkb3duIGFycm93XG4gICAgICAgICAgICBpZiAoZm9jdXMgPCByZXN1bHRzLmxlbmd0aCArIDEpIHtcbiAgICAgICAgICAgICAgICBmb2N1cyArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGUua2V5Q29kZSA9PSAzOCkgeyAvLyB1cCBhcnJvd1xuICAgICAgICAgICAgaWYgKGZvY3VzID4gMSkge1xuICAgICAgICAgICAgICAgIGZvY3VzIC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJChcIi5yb3dcIikuY2hpbGRyZW4oJ3RkJykuY3NzKCdib3JkZXInLCAnMXB4IHNvbGlkICNkZGRkZGQnKTtcbiAgICAgICAgJChcIi5yb3c6bnRoLW9mLXR5cGUoXCIgKyBmb2N1cyArIFwiKVwiKS5jaGlsZHJlbigndGQnKS5jc3MoJ2JvcmRlcicsICcxcHggc29saWQgIzAwMDAwMCcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN3aXRjaFBsb3RzKHBsb3ROYW1lKSB7XG4gICAgICAgIC8vIGNoYW5nZSB2aXNpYmxlIHBsb3QhXG4gICAgICAgIGNvbnNvbGUubG9nKCdjaGFuZ2luZyBwbG90cycpO1xuICAgICAgICB2YXIgb2xkUGxvdElEID0gcGxvdC5nZXRQbG90SUQoKTtcbiAgICAgICAgcGxvdC5zd2l0Y2hQbG90cyhwbG90TmFtZSk7XG4gICAgICAgIGd1aS5oaWRlKG9sZFBsb3RJRCk7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgIH1cblxuICAgICQoJyNzZWFyY2hiYXInKS5vbigna2V5dXAnLCBzZWFyY2hCYXJLZXlVcCk7XG4gICAgJCgnI3NlYXJjaGJhcicpLm9uKCdrZXlwcmVzcycsIHNlYXJjaEJhcktleVByZXNzKTtcbiAgICAkKCcjc2VhcmNoYmFyJykub24oJ2tleWRvd24nLCBzZWFyY2hCYXJLZXlEb3duKTtcblxufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuc2VhcmNoID0gc2VhcmNoOyIsInZhciB0YWcgPSByZXF1aXJlKCcuLi91dGlscy90YWcuanMnKS50YWc7XG52YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi4vdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgc2V0dXAgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVdpZGdldCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgLy8gY3JlYXRlIHdpZGdldCBhbmQgYXBwZW5kIGl0IHRvIHRoZSB0YXJnZXRcbiAgICAgICAgdmFyIHdpZGdldCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCB3aWRnZXRJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGJhY2tncm91bmQgZm9yIHBsb3Qgd2lkZ2V0XG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsIGJhY2tncm91bmRDb2xvcilcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3N0cm9rZScsICcjZTNlN2VkJylcbiAgICAgICAgICAgIC5wbGFjZSh3aWRnZXQpO1xuXG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVBsb3RXaW5kb3codGFyZ2V0LCBwbG90SUQsIHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgY29udGFpbmVyICh3aWR0aCBhbmQgaGVpZ2h0IGRpY3RhdGUgdGhlIHNpemUgb2YgdGhlIHZpZXdpbmcgd2luZG93KVxuICAgICAgICB2YXIgd2luZG93ID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHBsb3RJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd4JywgeClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3knLCB5KVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgYmFja2dyb3VuZFxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygncmVjdCcpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsICcjZThlYmVmJylcbiAgICAgICAgICAgIC5wbGFjZSh3aW5kb3cpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkQnV0dG9ucyh0YXJnZXQpIHtcblxuICAgICAgICBmdW5jdGlvbiBhZGRCdXR0b24oaWQsIF9jbGFzcywgdHlwZSwgbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0YWcoKVxuICAgICAgICAgICAgICAgIC5jcmVhdGUoJ2lucHV0JylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2NsYXNzJywgX2NsYXNzKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3R5cGUnLCB0eXBlKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ25hbWUnLCBuYW1lKVxuICAgICAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgICAgICB9O1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20taW4tYnV0dG9uJywgJ3pvb20tYnV0dG9uJywgJ2J1dHRvbicsICdpbmNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnKycpO1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20tb3V0LWJ1dHRvbicsICd6b29tLWJ1dHRvbicsICdidXR0b24nLCdkZWNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnLScpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkUGxvdFRvUGFnZSh0YXJnZXQsIHBsb3RJRCkge1xuICAgICAgICAvLyBhZGQgZyBmb3IgYSBzaW5nbGUgcGxvdCAocGhlbm90eXBlKSwgaGlkZGVuIHdpdGggZGlzcGxheT1ub25lXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgIH07XG5cbiAgICAvKiBwbGFjZSBhIHpvb20gbGF5ZXIgZ3JvdXAgPGc+PHN2Zz48L3N2Zz48L2c+IGluc2lkZSBhIHBsb3QncyA8c3ZnPiAqL1xuICAgIGZ1bmN0aW9uIF9hZGRHcm91cChwbG90SUQsIGxldmVsLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBwbG90ID0gbmV3IHRhZygpLnNlbGVjdChwbG90SUQpO1xuXG4gICAgICAgIHZhciBncm91cCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJyxzZWxlY3RvcnMuaWRzLmdyb3VwKHBsb3RJRCwgbGV2ZWwpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgndmlzaWJpbGl0eScsICdoaWRkZW4nKVxuICAgICAgICAgICAgLnBsYWNlKHBsb3QpO1xuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAucGxhY2UoZ3JvdXApO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfYWRkVGlsZShwbG90SUQsIGxldmVsLCBjb2x1bW4sIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIHRpbGVVUkwgPSB1cmwgKyBcIi9cIiArIGxldmVsICsgXCIvXCIgKyBjb2x1bW4gKyBcIi5wbmdcIjtcblxuICAgICAgICB2YXIgeCA9IGNvbHVtbiAqIGltYWdlV2lkdGg7XG4gICAgICAgIHZhciB5ID0gMDtcbiAgICAgICAgdmFyIHdpZHRoID0gaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IGltYWdlSGVpZ2h0O1xuXG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGFnKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuXG4gICAgICAgIC8vY3JlYXRlIHRpbGVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2ltYWdlJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYWRkSFJFRih0aWxlVVJMKVxuICAgICAgICAgICAgLnBsYWNlKHN2Zyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9hZGRUaWxlcyhwbG90SUQsIGxldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgbGV2ZWwpO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgICAgICBfYWRkVGlsZShwbG90SUQsIGxldmVsLCBjLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KTtcbiAgICAgICAgICAgIHggPSB4ICsgMjU2O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNldFVwV2lkZ2V0KHRhcmdldElELCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBuZXcgdGFnKCkuc2VsZWN0KHRhcmdldElEKTtcbiAgICAgICAgX2FkZEJ1dHRvbnModGFyZ2V0KTtcbiAgICAgICAgdmFyIHdpZGdldCA9IF9jcmVhdGVXaWRnZXQodGFyZ2V0LCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKTtcbiAgICAgICAgcmV0dXJuIHdpZGdldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRVcFBsb3Qod2lkZ2V0LCAgcGxvdElELCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0LCB3aW5kb3dYLCB3aW5kb3dZKSB7XG4gICAgICAgIF9jcmVhdGVQbG90V2luZG93KHdpZGdldCwgcGxvdElELCB3aW5kb3dXaWR0aCwgd2luZG93SGVpZ2h0LCB3aW5kb3dYLCB3aW5kb3dZKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnNlcnRQbG90SW1hZ2VzKHBsb3RJRCwgbWluTGV2ZWwsIG1heExldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBwbG90Q29udGFpbmVyID0gbmV3IHRhZygpLnNlbGVjdCgncGxvdCcpO1xuICAgICAgICBfYWRkUGxvdFRvUGFnZShwbG90Q29udGFpbmVyLCBwbG90SUQpO1xuICAgICAgICBmb3IgKHZhciBpID0gbWluTGV2ZWw7IGk8bWF4TGV2ZWwrMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gY29sdW1ucyAqIGltYWdlV2lkdGg7XG4gICAgICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG4gICAgICAgICAgICBfYWRkR3JvdXAocGxvdElELCBpLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICAgIF9hZGRUaWxlcyhwbG90SUQsIGksIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0VXBXaWRnZXQ6IHNldFVwV2lkZ2V0LFxuICAgICAgICBzZXRVcFBsb3Q6IHNldFVwUGxvdCxcbiAgICAgICAgaW5zZXJ0UGxvdEltYWdlczogaW5zZXJ0UGxvdEltYWdlcyxcbiAgICB9XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cy5zZXR1cCA9IHNldHVwOyIsIi8qQ2hlY2sgc2NoZW1hIG9mIGFuIG9iamVjdCBsaXRlcmFsLiAqL1xudmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpbmRleCBpbiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXlzW2luZGV4XSBpbiBvYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgeHk6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsneCcsICd5J10pO1xuICAgIH0sXG4gICAgZGltZW5zaW9uczogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd3aWR0aCcsICdoZWlnaHQnXSk7XG4gICAgfSxcbiAgICBwb2ludDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBzY2FsZTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBsYXllcjogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWydsZXZlbCcsICd0b3BMZWZ0JywgJ3NjYWxlJywgJ29wYWNpdHknXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5wb2ludChvYmplY3RbJ3RvcExlZnQnXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5zY2FsZShvYmplY3RbJ3NjYWxlJ10pO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zY2hlbWEgPSBzY2hlbWE7IiwidmFyIHNlbGVjdG9ycyA9IHtcbiAgICBpZHM6IHtcbiAgICAgICAgd2lkZ2V0OiAnd2lkZ2V0JyxcbiAgICAgICAgcGxvdDogJ3Bsb3QnLFxuICAgICAgICBncm91cDogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItZ3JvdXAtbGF5ZXJcIitsZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnTGF5ZXI6IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gcGxvdElEK1wiLXN2Zy1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyO1xuICAgIHRoaXMucGxvdDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpO1xuICAgIHRoaXMucGxvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgdGhpcy5pbm5lckNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuZGltZW5zaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgaWYgKCF0aGlzLmlubmVyQ29udGFpbmVyKSB0aHJvdyBuZXcgRXJyb3IoJ2VkaXRTVkc6IGlubmVyQ29udGFpbmVyIG11c3QgYmUgaW5pdGlhbGl6ZWQnKTtcbiAgICByZXR1cm4gW3RoaXMuaW5uZXJDb250YWluZXIuZ2V0QkJveCgpLndpZHRoLCB0aGlzLmlubmVyQ29udGFpbmVyLmdldEJCb3goKS5oZWlnaHRdO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCIpO1xuICAgIHZhciB0cmFuc2Zvcm1hdGlvbnMgPSB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xuICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHRyYW5zbGF0ZS5zZXRUcmFuc2xhdGUoMCwgMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZSh0cmFuc2xhdGUsIDApO1xuXG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgc2NhbGUuc2V0U2NhbGUoMS4wLCAxLjApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUoc2NhbGUsIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoICE9PSAyKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBleHBlY3RlZCB0cmFuc2Zvcm1hdGlvbnMgdG8gYmUgYSBsaXN0IG9mIGxlbmd0aCAyLlwiKTtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDApLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIik7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgxKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoc2hpZnRYLCBzaGlmdFkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIilcbiAgICBpZiAoKCFzaGlmdFggfHwgIXNoaWZ0WSkgJiYgKHNoaWZ0WCAhPSAwICYmIHNoaWZ0WSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogY2Fubm90IHRyYW5zbGF0ZSBTVkcgb2JqZWN0IHdpdGggbnVsbCwgdW5kZWZpbmVkLCBvciBlbXB0eSBzaGlmdCB2YWx1ZXMuIHNoaWZ0WDogXCIrc2hpZnRYK1wiIHNoaWZ0WTpcIitzaGlmdFkpO1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgwKTtcbiAgICBpZiAodHJhbnNsYXRpb24udHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiKTtcbiAgICB0cmFuc2xhdGlvbi5zZXRUcmFuc2xhdGUoc2hpZnRYLCBzaGlmdFkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAoc2NhbGVYLCBzY2FsZVkpIHtcbiAgICB2YXIgc2NhbGUgPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMSk7XG4gICAgaWYgKHNjYWxlLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1NDQUxFKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBzZWNvbmQgdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiKTtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIsIG9wYWNpdHkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLmVkaXRTVkcgPSBlZGl0U1ZHOyIsInZhciB0eXBlY2hlY2sgPSByZXF1aXJlKCcuL3R5cGVjaGVjay5qcycpLnR5cGVjaGVjaztcblxudmFyIHRhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xufTtcblxudGFnLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZXQoKSBjYW5ub3Qgb3ZlcnJpZGUgbm9uLW51bGwgZWxlbWVudCB3aXRoIG5ldyBlbGVtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHJldHVybiB0aGlzO1xufVxuXG50YWcucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmNyZWF0ZSgpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0eXBlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuY3JlYXRlTlMgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGVOUygpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKGlkKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuc2VsZWN0KCkgbXVzdCBoYXZlIGFuIGBpZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoYXR0cikgfHwgdHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZCh2YWx1ZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmF0dHJpYnV0ZSgpIG11c3QgaGF2ZSBgYXR0cmAgYW5kIGB2YWx1ZWAgYXJndW1lbnRzLlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoY2hpbGQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hcHBlbmQoKSBtdXN0IGhhdmUgYSBgY2hpbGRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnBsYWNlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnBsYWNlKCkgbXVzdCBoYXZlIGEgYHBhcmVudGAgYXJndW1lbnQuXCIpO1xuICAgIHBhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5yZW1vdmUoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnRhZy5wcm90b3R5cGUuYWRkSFJFRiA9IGZ1bmN0aW9uIChocmVmKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoaHJlZikpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmFkZEhSRUYoKSBtdXN0IGhhdmUgYSBgaHJlZmAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIGhyZWYpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMudGFnID0gdGFnO1xuIiwiLypVdGlscyBmb3IgdHlwZWNoZWNraW5nLiovXG52YXIgdHlwZWNoZWNrID0ge1xuICAgIG51bGxPclVuZGVmaW5lZDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy50eXBlY2hlY2sgPSB0eXBlY2hlY2s7Il19
