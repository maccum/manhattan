(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

var handlers = {
    callGUI: function () {
        var plotID = plot.getPlotID();
        var visiblesAndHiddens = plot.getInfoForGUI();
        gui.render(plotID, visiblesAndHiddens[0], visiblesAndHiddens[1]);
    },

    getMousePositionWithinObject: function(mouseX, mouseY, boundingObject) {
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

    onWheel: function(evt) {
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

    onButtonClickZoomOut: function  () {
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


    /*return {
        listenForDrag: listenForDrag,
        onWheel: onWheel,
        onButtonClickZoomIn: onButtonClickZoomIn,
        onButtonClickZoomOut: onButtonClickZoomOut,
    };*/
};

module.exports.handlers = handlers;
},{"../plot/plot.js":3,"../ui/gui.js":5}],2:[function(require,module,exports){
var setup = require('../ui/setup.js').setup;
var layers = require('../ui/layers.js').layers;
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;
var handlers = require('../handlers/handlers.js').handlers;

// MAP : plot name => literal with url, minZoom, maxZoom
// 'standing_height' : { url: '/path/to/standing_height/plots', minZoom: 2, maxZoom: 8 },

var main = (function () {

    function init(widgetID, plotID, currentPlot) {
        //set up page
        //set up image layers
        // set up model
        // render
        // set up listeners

        // setup page
        setup.init(widgetID, 1300, 350, '#e3e7ed', plotID, 1024, 256, 60, 30,
            ['caffeine_consumption', 'standing_height']);

        // setup image layers
        layers.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
        layers.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 256, 256);
        layers.showPlot(currentPlot);

        // setup model
        plot.setPlotID(currentPlot);
        plot.setMinMaxLevel(2, 7);
        plot.initializeVisible(2, { width: 1024, height: 256 });
        var width = 1024;
        for (var i = 3; i < 7 + 1; i++) {
            width = width * 2;
            plot.initializeHidden(i, { width: width, height: 256 });
        }

        // intial rendering
        var plotID = plot.getPlotID();
        var visiblesAndHiddens = plot.getInfoForGUI();
        gui.render(plotID, visiblesAndHiddens[0], visiblesAndHiddens[1]);

        // setup listeners
        console.log("setting up listeners");
        handlers.listenForDrag(document.getElementById('plot'));
        document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
        document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
        document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);
    };

    return {
        init: init
    };
}());

main.init('widget', 'plot', 'standing_height');
},{"../handlers/handlers.js":1,"../plot/plot.js":3,"../ui/gui.js":5,"../ui/layers.js":6,"../ui/setup.js":7}],3:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("../plot/position.js").position;

var plot = (function () {
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

    function show (level, topLeft, scale, opacity) {
        if (!hiddens.has(level)) throw "Tried to show a level that was not hidden.";
        visibles[level] = { level: level, topLeft: topLeft, scale: scale, opacity: opacity };
        hiddens.delete(level);
    }

    function hide (level) {
        if (!visibles[level]) throw "Tried to hide a level that is not visible";
        delete visibles[level];
        hiddens.add(parseInt(level));
    }

    function calculateOpacity (scale) {
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

    function mapValueOntoRange (value, oldRange, newRange) {
        var oldSpan = oldRange[1] - oldRange[0];
        var newSpan = newRange[1] - newRange[0];
        var distanceToValue = value - oldRange[0];
        var percentSpanToValue = distanceToValue / oldSpan;
        var distanceToNewValue = percentSpanToValue * newSpan;
        var newValue = newRange[0] + distanceToNewValue;
        return newValue;
    }

    function reposition (newTopLeft) {
        if ((!newTopLeft.x && newTopLeft.x != 0) || (!newTopLeft.y && newTopLeft.y != 0)) throw new Error("bad new Top Left: [" + newTopLeft.x + ", " + newTopLeft.y + "]");
        for (var key in visibles) {
            visibles[key].topLeft = newTopLeft;
        }
    }

    function resetOpacities () {
        for (var key in visibles) {
            visibles[key].opacity = calculateOpacity(visibles[key].scale);
        }
    }

    return {
        setPlotID: function(id) {
            plotID = id;
        },
        getInfoForGUI : function() {
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
            return [listOfVisibles, listOfHiddens];
        },
        getPlotID: function () {
            return plotID;
        },
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
        initializeVisible: function(level, dims) {
            if (level < minimumLevel || level > maximumLevel) throw new Error("Cannot add visible layer outside [min,max] zoom.");
            if (!schema.dimensions(dims)) throw new Error("Expected dimensions schema");
            visibles[level] = { level: level, topLeft: { x: 0, y: 0 }, scale: { x: 1 * scaleFactor, y: 1 * scaleFactor }, opacity: 1 };
            dimensions[level] = dims;
        },
        initializeHidden:function (level, dims) {
            if (level < minimumLevel || level > maximumLevel) throw new Error("Cannot add hidden layer outside [min,max] zoom.");
            if (!schema.dimensions(dims)) throw new Error("Expected dimensions schema");
            hiddens.add(parseInt(level));
            dimensions[level] = dims;
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
    };
}());

module.exports.plot = plot;
},{"../plot/position.js":4,"../utils/schema.js":11}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
var editSVG = require('./ui_utils/svg.js').editSVG;
var schema = require('../utils/schema.js').schema;

var gui = {
    render: function (plotID, visibleLayers, hiddenLevels) {

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
                throw new Error("GUI: scale outside [.5,2] range. Scale should be converted to [.5,2] before being passed to GUI. ["+layer.scale.x+", "+layer.scale.y+"]");
            }
            
            new editSVG()
                .set(plotID, layer.level)
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
            opacityString += " "+ visibleLayers[key].opacity;
        }
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
        $("#opacity-div").text(opacityString);
    },
};

module.exports.gui = gui;
},{"../utils/schema.js":11,"./ui_utils/svg.js":9}],6:[function(require,module,exports){
var tag = require('./ui_utils/tag.js').tag;
var selectors = require('./ui_utils/selectors.js').selectors;

var layers = (function () {
    function addPlotToPage(target, plotID) {
        // add g for a single plot (phenotype), hidden with display=none
        new tag()
            .createNS('g')
            .attribute('id', plotID)
            .attribute('display', 'none')
            .place(target);
    };

    /* place a zoom layer group <g><svg></svg></g> inside a plot's <svg> */
    function addGroup(plotID, level, width, height) {
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

    function addTile(plotID, level, column, url, imageWidth, imageHeight) {
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

    function addTiles(plotID, level, url, imageWidth, imageHeight) {
        var columns = Math.pow(2, level);
        var x = 0;
        for (var c = 0; c < columns; c++) {
            addTile(plotID, level, c, url, imageWidth, imageHeight);
            x = x + 256;
        }
    };

    return {
        insertPlotImages(plotID, minLevel, maxLevel, url, imageWidth, imageHeight) {
            var plotContainer = new tag().select('plot');
            addPlotToPage(plotContainer, plotID);
            for (var i = minLevel; i<maxLevel+1; i++) {
                var columns = Math.pow(2, i);
                var width = columns * imageWidth;
                var height = imageHeight;
                addGroup(plotID, i, width, height);
                addTiles(plotID, i, url, imageWidth, imageHeight);
            }
        },
        showPlot: function (plotID) {
            new tag().select(plotID).attribute('display', 'inline');
        },
        hidePlot:function (plotID) {
            new tag().select(plotID).attribute('display', 'none');
        }
    }
}());

module.exports.layers = layers;
},{"./ui_utils/selectors.js":8,"./ui_utils/tag.js":10}],7:[function(require,module,exports){
/* Insert HTML DOM elements and SVG DOM elements into webpage.

Structure

<svg> widget svg
    <rect> background rectangle for widget (any color)
    <svg> plot svg
        <rect> background rectangle for plot (white)
        <svg> svg for phenotype 1
            <g> group for each zoom layer
                <svg> svg with width and height for this layer
                    <image> images
            <g>
                ...
        <svg> svg for phenotype 2
            ...
*/

var tag = require('./ui_utils/tag.js').tag;

var setup = (function () {

    function addButtons(target) {

        function addButton(id, _class, type, name, value) {
            return new tag()
                .create('input')
                .attribute('id', id)
                .attribute('class', _class)
                .attribute('type', type)
                .attribute('name', name)
                .place(target);
        };
        addButton('searchbar', '', 'text', 'search').attribute('placeholder', 'Search for phenotypes...');
        addButton('zoom-in-button', 'zoom-button', 'button', 'increase').attribute('value', '+');
        addButton('zoom-out-button', 'zoom-button', 'button','decrease').attribute('value', '-');
    };

    function createWidgetAndBackground(target, widgetID, width, height, backgroundColor) {
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
            .attribute('fill', backgroundColor) // '#dee0e2'
            .place(widget);

        return widget;
    };

    function createPlotContainer(target, plotID, width, height, x, y) {
        // create plot container (width and height dictate the size of the viewing window)
        var plotWindow = new tag()
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
            .attribute('fill', 'white')
            .place(plotWindow);

        return plotWindow;
    };

    /*function addPlotToPage(target, plotID) {
        // add g for a single plot (phenotype), hidden with display=none
        new tag()
            .createNS('g')
            .attribute('id', plotID)
            //.attribute('display', 'none')
            .place(target);
    };

    function addMultiplePlotsToPage(target, plotIDs) {
        for (var i = 0; i < plotIDs.length; i++) {
            addPlotToPage(target, plotIDs[i]);
        }
    };*/

    /*function showPlot(plotID) {
        //new tag().select(plotID).attribute('display', 'inline');
    };

    function hidePlot(plotID) {
        new tag().select(plotID).attribute('display', 'none');
    };*/

    return {
        init: function (widgetID, width, height, backgroundColor, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY, plotIDs) {
            // target for where to insert elements (make sure they are before the <script>!!!)
            target = new tag().select('widget-div');

            addButtons(target);
            var widget = createWidgetAndBackground(target, widgetID, width, height, backgroundColor); //'#dee0e2'
            console.log('plotID: '+plotID);
            var plotWindow = createPlotContainer(widget, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY);
            //addMultiplePlotsToPage(plotWindow, plotIDs);
            // set first plotID to be visible
            //showPlot(plotIDs[0]);
        },
        //showPlot: showPlot,
        //hidePlot: hidePlot,
    }
}());

module.exports.setup = setup;
},{"./ui_utils/tag.js":10}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
var selectors = require('./selectors.js').selectors;

var editSVG = function () {
    this.layer;
    this.plot;
};

editSVG.prototype.set = function (plotID, level) {
    this.layer = document.getElementById(selectors.ids.group(plotID, level));
    this.plot = document.getElementById(selectors.ids.plot);
    return this;
};

editSVG.prototype.transformations = function () {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    var transformations = this.layer.transform.baseVal;
    if (transformations.length === 0) {
        var translate = this.plot.createSVGTransform();
        translate.setTranslate(0, 0);
        this.layer.transform.baseVal.insertItemBefore(translate, 0);

        var scale = this.plot.createSVGTransform();
        scale.setScale(1.0, 1.0);
        this.layer.transform.baseVal.insertItemBefore(scale, 1);
    } else {
        if (transformations.length !== 2) throw "editSVG: expected transformations to be a list of length 2.";
        if (transformations.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) "editSVG: first transform is not a Translate.";
        if (transformations.getItem(1).type !== SVGTransform.SVG_TRANSFORM_SCALE) "editSVG: transform is not a Scale.";
    }
    return this.layer.transform.baseVal;
};

editSVG.prototype.translate = function (shiftX, shiftY) {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    if ((!shiftX || !shiftY) && (shiftX != 0 && shiftY != 0)) throw new Error("Cannot translate SVG object with null, undefined, or empty shift values. shiftX: "+shiftX+" shiftY:"+shiftY);
    var translation = this.transformations().getItem(0);
    if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw "editSVG: first transform is not a Translate.";
    translation.setTranslate(shiftX, shiftY);
    return this;
};

editSVG.prototype.scale = function (scaleX, scaleY) {
    var scale = this.transformations().getItem(1);
    if (scale.type !== SVGTransform.SVG_TRANSFORM_SCALE) throw "editSVG: second transform is not a Scale.";
    scale.setScale(scaleX, scaleY);
    return this;
};

editSVG.prototype.fade = function (opacity) {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    this.layer.setAttribute("opacity", opacity);
    return this;
};

editSVG.prototype.hide = function () {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    this.layer.setAttribute("visibility", "hidden");
    return this;
};

editSVG.prototype.show = function () {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    this.layer.setAttribute("visibility", "visible");
    return this;
};


/*
Test

var l2 = new editSVG().set(2);

var x = l2.transformations(); 
// check translate
x.getItem(0).matrix.e;                              --> 0
x.getItem(0).matrix.f;                              --> 0
// check scale
x.getItem(1).matrix.a;                              --> 1
x.getItem(1).matrix.d;                              --> 1
// check length
x.length                                            --> 2

l2.translate(50, 50);

l2.scale(.5, .5);

l2.fade(.5);

l2.hide();

l2.show();
*/

module.exports.editSVG = editSVG;
},{"./selectors.js":8}],10:[function(require,module,exports){
var utils = require('../../utils/utils.js').utils;

var tag = function () {
    this.element = null;
};

tag.prototype.set = function(element) {
    if (this.element != null) throw new Error("tag().set() cannot override non-null element with new element.");
    this.element = element;
    return this;
}

tag.prototype.create = function (type) {
    if (utils.nullOrUndefined(type)) throw new Error("tag().create() must have a `type` argument.");
    this.element = document.createElement(type);
    return this;
};

tag.prototype.createNS = function (type) {
    if (utils.nullOrUndefined(type)) throw new Error("tag().createNS() must have a `type` argument.");
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

tag.prototype.select = function (id) {
    if (utils.nullOrUndefined(id)) throw new Error("tag().select() must have an `id` argument.");
    this.element = document.getElementById(id);
    return this;
};

tag.prototype.attribute = function (attr, value) {
    if (utils.nullOrUndefined(attr) || utils.nullOrUndefined(value)) throw new Error("tag().attribute() must have `attr` and `value` arguments.");
    this.element.setAttribute(attr, value);
    return this;
};

tag.prototype.append = function (child) {
    if (utils.nullOrUndefined(child)) throw new Error("tag().append() must have a `child` argument.");
    this.element.appendChild(child.element);
    return this;
};

tag.prototype.place = function (parent) {
    if (utils.nullOrUndefined(parent)) throw new Error("tag().place() must have a `parent` argument.");
    parent.element.appendChild(this.element);
    return this;
};

tag.prototype.remove = function (parent) {
    if (utils.nullOrUndefined(parent)) throw new Error("tag().remove() must have a `parent` argument.");
    parent.element.removeChild(this.element);
};

tag.prototype.addHREF = function (href) {
    if (utils.nullOrUndefined(href)) throw new Error("tag().addHREF() must have a `href` argument.");
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
};

module.exports.tag = tag;

},{"../../utils/utils.js":12}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
var utils = {
    nullOrUndefined: function(obj) {
        if (typeof obj === "undefined" || obj === null) {
            return true;
        }
        return false;
    },
};

module.exports.utils = utils;
},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjMvc3JjL2hhbmRsZXJzL2hhbmRsZXJzLmpzIiwic2NyaXB0cy92My9zcmMvbWFpbi9tYWluLmpzIiwic2NyaXB0cy92My9zcmMvcGxvdC9wbG90LmpzIiwic2NyaXB0cy92My9zcmMvcGxvdC9wb3NpdGlvbi5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL2d1aS5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL2xheWVycy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3NldHVwLmpzIiwic2NyaXB0cy92My9zcmMvdWkvdWlfdXRpbHMvc2VsZWN0b3JzLmpzIiwic2NyaXB0cy92My9zcmMvdWkvdWlfdXRpbHMvc3ZnLmpzIiwic2NyaXB0cy92My9zcmMvdWkvdWlfdXRpbHMvdGFnLmpzIiwic2NyaXB0cy92My9zcmMvdXRpbHMvc2NoZW1hLmpzIiwic2NyaXB0cy92My9zcmMvdXRpbHMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xuXG52YXIgaGFuZGxlcnMgPSB7XG4gICAgY2FsbEdVSTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGxvdElEID0gcGxvdC5nZXRQbG90SUQoKTtcbiAgICAgICAgdmFyIHZpc2libGVzQW5kSGlkZGVucyA9IHBsb3QuZ2V0SW5mb0ZvckdVSSgpO1xuICAgICAgICBndWkucmVuZGVyKHBsb3RJRCwgdmlzaWJsZXNBbmRIaWRkZW5zWzBdLCB2aXNpYmxlc0FuZEhpZGRlbnNbMV0pO1xuICAgIH0sXG5cbiAgICBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0OiBmdW5jdGlvbihtb3VzZVgsIG1vdXNlWSwgYm91bmRpbmdPYmplY3QpIHtcbiAgICAgICAgdmFyIGN0bSA9IGJvdW5kaW5nT2JqZWN0LmdldFNjcmVlbkNUTSgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogKG1vdXNlWCAtIGN0bS5lKSAvIGN0bS5hLFxuICAgICAgICAgICAgeTogKG1vdXNlWSAtIGN0bS5mKSAvIGN0bS5kXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGxpc3RlbkZvckRyYWc6IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsaXN0ZW5Gb3JEcmFnXCIpO1xuICAgICAgICB2YXIgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAvL3ZhciBzdmcgPSBldnQudGFyZ2V0O1xuICAgIFxuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYmVnaW5EcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZywgZmFsc2UpO1xuICAgIFxuICAgICAgICB2YXIgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmU7XG4gICAgXG4gICAgICAgIGZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZXZ0KSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcnMuZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgZnVuY3Rpb24gYmVnaW5EcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImJlZ2luRHJhZ1wiKTtcbiAgICAgICAgICAgIGlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZyA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnO1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgICAgICBpZiAoaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50TW91c2VQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICAgICAgeTogY3VycmVudE1vdXNlUG9zaXRpb24ueSAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLnksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwbG90LmRyYWcoY2hhbmdlSW5Nb3VzZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgXG4gICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUgPSBjdXJyZW50TW91c2VQb3NpdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIFxuICAgICAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb25XaGVlbDogZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbCA9IGV2dC5kZWx0YVg7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGV2dC5kZWx0YVk7XG4gICAgXG4gICAgICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIik7XG4gICAgICAgICAgICB2YXIgbW91c2VQb3MgPSBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgICAgIHBsb3Quem9vbShtb3VzZVBvcywgdmVydGljYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxvdC5kcmFnKHsgeDogaG9yaXpvbnRhbCwgeTogMCB9KTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tSW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgLTUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBJbih7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG5cbiAgICBvbkJ1dHRvbkNsaWNrWm9vbU91dDogZnVuY3Rpb24gICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzbmFwIHpvb20gb3V0XCIpO1xuXG4gICAgICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIDUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxuXG5cbiAgICAvKnJldHVybiB7XG4gICAgICAgIGxpc3RlbkZvckRyYWc6IGxpc3RlbkZvckRyYWcsXG4gICAgICAgIG9uV2hlZWw6IG9uV2hlZWwsXG4gICAgICAgIG9uQnV0dG9uQ2xpY2tab29tSW46IG9uQnV0dG9uQ2xpY2tab29tSW4sXG4gICAgICAgIG9uQnV0dG9uQ2xpY2tab29tT3V0OiBvbkJ1dHRvbkNsaWNrWm9vbU91dCxcbiAgICB9OyovXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5oYW5kbGVycyA9IGhhbmRsZXJzOyIsInZhciBzZXR1cCA9IHJlcXVpcmUoJy4uL3VpL3NldHVwLmpzJykuc2V0dXA7XG52YXIgbGF5ZXJzID0gcmVxdWlyZSgnLi4vdWkvbGF5ZXJzLmpzJykubGF5ZXJzO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xudmFyIGd1aSA9IHJlcXVpcmUoJy4uL3VpL2d1aS5qcycpLmd1aTtcbnZhciBoYW5kbGVycyA9IHJlcXVpcmUoJy4uL2hhbmRsZXJzL2hhbmRsZXJzLmpzJykuaGFuZGxlcnM7XG5cbi8vIE1BUCA6IHBsb3QgbmFtZSA9PiBsaXRlcmFsIHdpdGggdXJsLCBtaW5ab29tLCBtYXhab29tXG4vLyAnc3RhbmRpbmdfaGVpZ2h0JyA6IHsgdXJsOiAnL3BhdGgvdG8vc3RhbmRpbmdfaGVpZ2h0L3Bsb3RzJywgbWluWm9vbTogMiwgbWF4Wm9vbTogOCB9LFxuXG52YXIgbWFpbiA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBpbml0KHdpZGdldElELCBwbG90SUQsIGN1cnJlbnRQbG90KSB7XG4gICAgICAgIC8vc2V0IHVwIHBhZ2VcbiAgICAgICAgLy9zZXQgdXAgaW1hZ2UgbGF5ZXJzXG4gICAgICAgIC8vIHNldCB1cCBtb2RlbFxuICAgICAgICAvLyByZW5kZXJcbiAgICAgICAgLy8gc2V0IHVwIGxpc3RlbmVyc1xuXG4gICAgICAgIC8vIHNldHVwIHBhZ2VcbiAgICAgICAgc2V0dXAuaW5pdCh3aWRnZXRJRCwgMTMwMCwgMzUwLCAnI2UzZTdlZCcsIHBsb3RJRCwgMTAyNCwgMjU2LCA2MCwgMzAsXG4gICAgICAgICAgICBbJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgJ3N0YW5kaW5nX2hlaWdodCddKTtcblxuICAgICAgICAvLyBzZXR1cCBpbWFnZSBsYXllcnNcbiAgICAgICAgbGF5ZXJzLmluc2VydFBsb3RJbWFnZXMoJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMiwgNywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHMvY2FmZmVpbmVfY29uc3VtcHRpb24nLCAyNTYsIDI1Nik7XG4gICAgICAgIGxheWVycy5pbnNlcnRQbG90SW1hZ2VzKCdzdGFuZGluZ19oZWlnaHQnLCAyLCA4LCAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9zdGFuZGluZ19oZWlnaHRfcGxvdHMvc3RhbmRpbmdfaGVpZ2h0JywgMjU2LCAyNTYpO1xuICAgICAgICBsYXllcnMuc2hvd1Bsb3QoY3VycmVudFBsb3QpO1xuXG4gICAgICAgIC8vIHNldHVwIG1vZGVsXG4gICAgICAgIHBsb3Quc2V0UGxvdElEKGN1cnJlbnRQbG90KTtcbiAgICAgICAgcGxvdC5zZXRNaW5NYXhMZXZlbCgyLCA3KTtcbiAgICAgICAgcGxvdC5pbml0aWFsaXplVmlzaWJsZSgyLCB7IHdpZHRoOiAxMDI0LCBoZWlnaHQ6IDI1NiB9KTtcbiAgICAgICAgdmFyIHdpZHRoID0gMTAyNDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDM7IGkgPCA3ICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB3aWR0aCA9IHdpZHRoICogMjtcbiAgICAgICAgICAgIHBsb3QuaW5pdGlhbGl6ZUhpZGRlbihpLCB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpbnRpYWwgcmVuZGVyaW5nXG4gICAgICAgIHZhciBwbG90SUQgPSBwbG90LmdldFBsb3RJRCgpO1xuICAgICAgICB2YXIgdmlzaWJsZXNBbmRIaWRkZW5zID0gcGxvdC5nZXRJbmZvRm9yR1VJKCk7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdElELCB2aXNpYmxlc0FuZEhpZGRlbnNbMF0sIHZpc2libGVzQW5kSGlkZGVuc1sxXSk7XG5cbiAgICAgICAgLy8gc2V0dXAgbGlzdGVuZXJzXG4gICAgICAgIGNvbnNvbGUubG9nKFwic2V0dGluZyB1cCBsaXN0ZW5lcnNcIik7XG4gICAgICAgIGhhbmRsZXJzLmxpc3RlbkZvckRyYWcoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Bsb3QnKSk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKS5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgaGFuZGxlcnMub25XaGVlbCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZXJzLm9uQnV0dG9uQ2xpY2tab29tSW4pO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20tb3V0LWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlcnMub25CdXR0b25DbGlja1pvb21PdXQpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpbml0OiBpbml0XG4gICAgfTtcbn0oKSk7XG5cbm1haW4uaW5pdCgnd2lkZ2V0JywgJ3Bsb3QnLCAnc3RhbmRpbmdfaGVpZ2h0Jyk7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuLi9wbG90L3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuXG52YXIgcGxvdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBsb3RJRCA9IG51bGwsXG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGwsXG4gICAgICAgIHNjYWxlRmFjdG9yID0gMTAwMDAsXG4gICAgICAgIHpvb21JbmNyZW1lbnQgPSA1LFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbNjAwMCwgOTAwMF0sXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzEyMDAwLCAxODAwMF0sXG4gICAgICAgIHZpc2libGVzID0ge30sXG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKSxcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHBsb3RJRCA9IG51bGw7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1pbk1heExldmVsKG1pbiwgbWF4KSB7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG1pbjtcbiAgICAgICAgbWF4aW11bUxldmVsID0gbWF4O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuaXRTY2FsZShzY2FsZSkge1xuICAgICAgICBpZiAoKHNjYWxlLnggPiAuNSAmJiBzY2FsZS54IDwgMikgfHwgKHNjYWxlLnkgPiAuNSAmJiBzY2FsZS55IDwgMikpIHRocm93IG5ldyBFcnJvcignc2NhbGUgYWxyZWFkeSBpbiB1bml0IHNjYWxlJyk7XG4gICAgICAgIHJldHVybiB7IHg6IHNjYWxlLnggLyBzY2FsZUZhY3RvciwgeTogc2NhbGUueSAvIHNjYWxlRmFjdG9yIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvdyAobGV2ZWwsIHRvcExlZnQsIHNjYWxlLCBvcGFjaXR5KSB7XG4gICAgICAgIGlmICghaGlkZGVucy5oYXMobGV2ZWwpKSB0aHJvdyBcIlRyaWVkIHRvIHNob3cgYSBsZXZlbCB0aGF0IHdhcyBub3QgaGlkZGVuLlwiO1xuICAgICAgICB2aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogdG9wTGVmdCwgc2NhbGU6IHNjYWxlLCBvcGFjaXR5OiBvcGFjaXR5IH07XG4gICAgICAgIGhpZGRlbnMuZGVsZXRlKGxldmVsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoaWRlIChsZXZlbCkge1xuICAgICAgICBpZiAoIXZpc2libGVzW2xldmVsXSkgdGhyb3cgXCJUcmllZCB0byBoaWRlIGEgbGV2ZWwgdGhhdCBpcyBub3QgdmlzaWJsZVwiO1xuICAgICAgICBkZWxldGUgdmlzaWJsZXNbbGV2ZWxdO1xuICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZU9wYWNpdHkgKHNjYWxlKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBzY2FsZS54O1xuICAgICAgICBpZiAoeFNjYWxlIDwgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGhpZ2hlciB6b29tIGxldmVsIChvbiB0b3AgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIG1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMCwgMV0pO1xuICAgICAgICB9IC8qZWxzZSBpZiAoeFNjYWxlID4gcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBsb3dlciB6b29tIGxldmVsIChiZWxvdyBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gcGxvdC5tYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsxLCAwXSk7XG4gICAgICAgIH0qLyBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFwVmFsdWVPbnRvUmFuZ2UgKHZhbHVlLCBvbGRSYW5nZSwgbmV3UmFuZ2UpIHtcbiAgICAgICAgdmFyIG9sZFNwYW4gPSBvbGRSYW5nZVsxXSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgbmV3U3BhbiA9IG5ld1JhbmdlWzFdIC0gbmV3UmFuZ2VbMF07XG4gICAgICAgIHZhciBkaXN0YW5jZVRvVmFsdWUgPSB2YWx1ZSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgcGVyY2VudFNwYW5Ub1ZhbHVlID0gZGlzdGFuY2VUb1ZhbHVlIC8gb2xkU3BhbjtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9OZXdWYWx1ZSA9IHBlcmNlbnRTcGFuVG9WYWx1ZSAqIG5ld1NwYW47XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IG5ld1JhbmdlWzBdICsgZGlzdGFuY2VUb05ld1ZhbHVlO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwb3NpdGlvbiAobmV3VG9wTGVmdCkge1xuICAgICAgICBpZiAoKCFuZXdUb3BMZWZ0LnggJiYgbmV3VG9wTGVmdC54ICE9IDApIHx8ICghbmV3VG9wTGVmdC55ICYmIG5ld1RvcExlZnQueSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIG5ldyBUb3AgTGVmdDogW1wiICsgbmV3VG9wTGVmdC54ICsgXCIsIFwiICsgbmV3VG9wTGVmdC55ICsgXCJdXCIpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdCA9IG5ld1RvcExlZnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldE9wYWNpdGllcyAoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5vcGFjaXR5ID0gY2FsY3VsYXRlT3BhY2l0eSh2aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNldFBsb3RJRDogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgICAgIHBsb3RJRCA9IGlkO1xuICAgICAgICB9LFxuICAgICAgICBnZXRJbmZvRm9yR1VJIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mVmlzaWJsZXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHNjYWxlIGZvciBwYXNzaW5nIHRvIEdVSTogXG4gICAgICAgICAgICAgICAgdmFyIGd1aUxheWVyID0ge1xuICAgICAgICAgICAgICAgICAgICBsZXZlbDogdmlzaWJsZXNba2V5XS5sZXZlbCxcbiAgICAgICAgICAgICAgICAgICAgdG9wTGVmdDogdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdW5pdFNjYWxlKHZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlc1trZXldLm9wYWNpdHksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ3VpTGF5ZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShoaWRkZW5zKTtcbiAgICAgICAgICAgIHJldHVybiBbbGlzdE9mVmlzaWJsZXMsIGxpc3RPZkhpZGRlbnNdO1xuICAgICAgICB9LFxuICAgICAgICBnZXRQbG90SUQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQ7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyRm9yVGVzdGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gVE9ETzogYmV0dGVyIHdheSB0byBjbGVhciBzaW5nbGV0b24gZm9yIHRlc3Rpbmc/XG4gICAgICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pO1xuICAgICAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgICAgICB9LCAgXG4gICAgICAgIGdldFZpc2libGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmlzaWJsZXM7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEhpZGRlbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBoaWRkZW5zO1xuICAgICAgICB9LFxuICAgICAgICBpbml0aWFsaXplVmlzaWJsZTogZnVuY3Rpb24obGV2ZWwsIGRpbXMpIHtcbiAgICAgICAgICAgIGlmIChsZXZlbCA8IG1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IG1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCB2aXNpYmxlIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgICAgICB2aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogeyB4OiAwLCB5OiAwIH0sIHNjYWxlOiB7IHg6IDEgKiBzY2FsZUZhY3RvciwgeTogMSAqIHNjYWxlRmFjdG9yIH0sIG9wYWNpdHk6IDEgfTtcbiAgICAgICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbjpmdW5jdGlvbiAobGV2ZWwsIGRpbXMpIHtcbiAgICAgICAgICAgIGlmIChsZXZlbCA8IG1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IG1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCBoaWRkZW4gbGF5ZXIgb3V0c2lkZSBbbWluLG1heF0gem9vbS5cIik7XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgICAgIGhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgICAgIH0sXG4gICAgICAgIGluY3JlYXNlU2NhbGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPCBzY2FsZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPj0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0gJiYga2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgKyAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA8PSBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdLCB5OiAxICogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZWNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgPT0gbWluaW11bUxldmVsICYmIHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZUZhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8PSBzY2FsZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggLT0gem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdICYmIGtleSA+IG1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSAtIDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsID49IG1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjYWxlID0geyB4OiBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSwgeTogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB6b29tOiBmdW5jdGlvbiAoZm9jdXMsIHZlcnRpY2FsKSB7XG5cbiAgICAgICAgICAgIHZhciBmaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgICAgICBmaXJzdCA9IHZpc2libGVzW2ZpcnN0S2V5XSxcbiAgICAgICAgICAgICAgICB3aWR0aCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodCA9IGRpbWVuc2lvbnNbZmlyc3RLZXldLmhlaWdodDtcbiAgICBcbiAgICAgICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKGZvY3VzLCBmaXJzdC50b3BMZWZ0LCB1bml0U2NhbGUoZmlyc3Quc2NhbGUpLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICBcbiAgICAgICAgICAgIHZhciBob3dNdWNoID0gTWF0aC5mbG9vcihNYXRoLmFicyh2ZXJ0aWNhbCkgLyA1KTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG93TXVjaDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZlcnRpY2FsIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgXG4gICAgICAgICAgICB2YXIgbmV3Rmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICAgICAgbmV3Rmlyc3QgPSB2aXNpYmxlc1tuZXdGaXJzdEtleV0sXG4gICAgICAgICAgICAgICAgbmV3V2lkdGggPSBkaW1lbnNpb25zW25ld0ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgICAgICBuZXdIZWlnaHQgPSBkaW1lbnNpb25zW25ld0ZpcnN0S2V5XS5oZWlnaHQ7XG4gICAgXG4gICAgICAgICAgICB2YXIgbmV3VG9wTGVmdCA9IHBvc2l0aW9uLnBlcmNlbnRhZ2VUb1RvcExlZnQoZm9jdXMsIHBlcmNlbnRhZ2VDb29yZGluYXRlcywgdW5pdFNjYWxlKG5ld0ZpcnN0LnNjYWxlKSwgbmV3V2lkdGgsIG5ld0hlaWdodCk7XG4gICAgICAgICAgICByZXBvc2l0aW9uKG5ld1RvcExlZnQpO1xuICAgICAgICAgICAgcmVzZXRPcGFjaXRpZXMoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc25hcEluOiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuICAgIFxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNuYXBPdXQ6IGZ1bmN0aW9uIChmb2N1cykge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcyk7XG4gICAgICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG4gICAgXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSB2aXNpYmxlc1tPYmplY3Qua2V5cyh2aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNCkge1xuICAgICAgICAgICAgICAgIHRoaXMuem9vbShmb2N1cywgNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkcmFnOiBmdW5jdGlvbiAoY2hhbmdlSW5Qb3NpdGlvbikge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS50b3BMZWZ0LnggKz0gY2hhbmdlSW5Qb3NpdGlvbi54O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXRNaW5NYXhMZXZlbDogc2V0TWluTWF4TGV2ZWwsXG4gICAgICAgIHJlc2V0OiByZXNldCxcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMucGxvdCA9IHBsb3Q7IiwidmFyIHBvc2l0aW9uID0ge1xuICAgIGNhbGN1bGF0ZVBlcmNlbnQ6IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBvc2l0aW9uQiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIGlmIChsZW5ndGhCIDw9IDApIHRocm93IG5ldyBFcnJvcihcIkxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlLlwiKTtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wb3NpdGlvbiA9IHBvc2l0aW9uOyIsInZhciBlZGl0U1ZHID0gcmVxdWlyZSgnLi91aV91dGlscy9zdmcuanMnKS5lZGl0U1ZHO1xudmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcblxudmFyIGd1aSA9IHtcbiAgICByZW5kZXI6IGZ1bmN0aW9uIChwbG90SUQsIHZpc2libGVMYXllcnMsIGhpZGRlbkxldmVscykge1xuXG4gICAgICAgIGlmICghKHZpc2libGVMYXllcnMubGVuZ3RoID4gMCAmJiB2aXNpYmxlTGF5ZXJzLmxlbmd0aCA8PSAyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBoYXZlIDEtMiB2aXNpYmxlIGxheWVycy5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBoaWRkZW5JbmRleCBpbiBoaWRkZW5MZXZlbHMpIHtcbiAgICAgICAgICAgIHZhciBsZXZlbCA9IGhpZGRlbkxldmVsc1toaWRkZW5JbmRleF07XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGxldmVsKSAhPSAnW29iamVjdCBOdW1iZXJdJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSSBFUlJPUjogZXhwZWN0ZWQgYSBsaXN0IG9mIG51bWJlcnMgZm9yIGhpZGRlbkxheWVycy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KHBsb3RJRCwgbGV2ZWwpLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIHZpc2libGVJbmRleCBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB2aXNpYmxlTGF5ZXJzW3Zpc2libGVJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5sYXllcihsYXllcikpIHRocm93IG5ldyBFcnJvcihcIkdVSTogZXhwZWN0ZWQgbGF5ZXIgc2NoZW1hLlwiKTtcbiAgICAgICAgICAgIGlmIChsYXllci5zY2FsZS54ID4gMiB8fCBsYXllci5zY2FsZS54IDwgLjUgfHwgbGF5ZXIuc2NhbGUueSA+IDIgfHwgbGF5ZXIuc2NhbGUueSA8IC41KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBzY2FsZSBvdXRzaWRlIFsuNSwyXSByYW5nZS4gU2NhbGUgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBbLjUsMl0gYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBHVUkuIFtcIitsYXllci5zY2FsZS54K1wiLCBcIitsYXllci5zY2FsZS55K1wiXVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKVxuICAgICAgICAgICAgICAgIC5zZXQocGxvdElELCBsYXllci5sZXZlbClcbiAgICAgICAgICAgICAgICAudHJhbnNsYXRlKGxheWVyLnRvcExlZnQueCwgbGF5ZXIudG9wTGVmdC55KVxuICAgICAgICAgICAgICAgIC5zY2FsZShsYXllci5zY2FsZS54LCBsYXllci5zY2FsZS55KVxuICAgICAgICAgICAgICAgIC5mYWRlKGxheWVyLm9wYWNpdHkpXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aXNpYmxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBzY2FsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgb3BhY2l0eVN0cmluZyA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5sZXZlbDtcbiAgICAgICAgICAgIHNjYWxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5zY2FsZS54O1xuICAgICAgICAgICAgb3BhY2l0eVN0cmluZyArPSBcIiBcIisgdmlzaWJsZUxheWVyc1trZXldLm9wYWNpdHk7XG4gICAgICAgIH1cbiAgICAgICAgJChcIiN6b29tLWRpdlwiKS50ZXh0KHZpc2libGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNmcmFjdGlvbmFsLXpvb20tZGl2XCIpLnRleHQoc2NhbGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNvcGFjaXR5LWRpdlwiKS50ZXh0KG9wYWNpdHlTdHJpbmcpO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5ndWkgPSBndWk7IiwidmFyIHRhZyA9IHJlcXVpcmUoJy4vdWlfdXRpbHMvdGFnLmpzJykudGFnO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vdWlfdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgbGF5ZXJzID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBhZGRQbG90VG9QYWdlKHRhcmdldCwgcGxvdElEKSB7XG4gICAgICAgIC8vIGFkZCBnIGZvciBhIHNpbmdsZSBwbG90IChwaGVub3R5cGUpLCBoaWRkZW4gd2l0aCBkaXNwbGF5PW5vbmVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2cnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG4gICAgfTtcblxuICAgIC8qIHBsYWNlIGEgem9vbSBsYXllciBncm91cCA8Zz48c3ZnPjwvc3ZnPjwvZz4gaW5zaWRlIGEgcGxvdCdzIDxzdmc+ICovXG4gICAgZnVuY3Rpb24gYWRkR3JvdXAocGxvdElELCBsZXZlbCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgcGxvdCA9IG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKTtcblxuICAgICAgICB2YXIgZ3JvdXAgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsc2VsZWN0b3JzLmlkcy5ncm91cChwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJylcbiAgICAgICAgICAgIC5wbGFjZShwbG90KTtcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLnBsYWNlKGdyb3VwKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gYWRkVGlsZShwbG90SUQsIGxldmVsLCBjb2x1bW4sIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIHRpbGVVUkwgPSB1cmwgKyBcIi9cIiArIGxldmVsICsgXCIvXCIgKyBjb2x1bW4gKyBcIi5wbmdcIjtcblxuICAgICAgICB2YXIgeCA9IGNvbHVtbiAqIGltYWdlV2lkdGg7XG4gICAgICAgIHZhciB5ID0gMDtcbiAgICAgICAgdmFyIHdpZHRoID0gaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IGltYWdlSGVpZ2h0O1xuXG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGFnKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuXG4gICAgICAgIC8vY3JlYXRlIHRpbGVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2ltYWdlJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYWRkSFJFRih0aWxlVVJMKVxuICAgICAgICAgICAgLnBsYWNlKHN2Zyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGFkZFRpbGVzKHBsb3RJRCwgbGV2ZWwsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBjb2x1bW5zOyBjKyspIHtcbiAgICAgICAgICAgIGFkZFRpbGUocGxvdElELCBsZXZlbCwgYywgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgICAgICB4ID0geCArIDI1NjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpbnNlcnRQbG90SW1hZ2VzKHBsb3RJRCwgbWluTGV2ZWwsIG1heExldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgICAgICB2YXIgcGxvdENvbnRhaW5lciA9IG5ldyB0YWcoKS5zZWxlY3QoJ3Bsb3QnKTtcbiAgICAgICAgICAgIGFkZFBsb3RUb1BhZ2UocGxvdENvbnRhaW5lciwgcGxvdElEKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBtaW5MZXZlbDsgaTxtYXhMZXZlbCsxOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbHVtbnMgKiBpbWFnZVdpZHRoO1xuICAgICAgICAgICAgICAgIHZhciBoZWlnaHQgPSBpbWFnZUhlaWdodDtcbiAgICAgICAgICAgICAgICBhZGRHcm91cChwbG90SUQsIGksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgICAgIGFkZFRpbGVzKHBsb3RJRCwgaSwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNob3dQbG90OiBmdW5jdGlvbiAocGxvdElEKSB7XG4gICAgICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuICAgICAgICB9LFxuICAgICAgICBoaWRlUGxvdDpmdW5jdGlvbiAocGxvdElEKSB7XG4gICAgICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgIH1cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLmxheWVycyA9IGxheWVyczsiLCIvKiBJbnNlcnQgSFRNTCBET00gZWxlbWVudHMgYW5kIFNWRyBET00gZWxlbWVudHMgaW50byB3ZWJwYWdlLlxuXG5TdHJ1Y3R1cmVcblxuPHN2Zz4gd2lkZ2V0IHN2Z1xuICAgIDxyZWN0PiBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3Igd2lkZ2V0IChhbnkgY29sb3IpXG4gICAgPHN2Zz4gcGxvdCBzdmdcbiAgICAgICAgPHJlY3Q+IGJhY2tncm91bmQgcmVjdGFuZ2xlIGZvciBwbG90ICh3aGl0ZSlcbiAgICAgICAgPHN2Zz4gc3ZnIGZvciBwaGVub3R5cGUgMVxuICAgICAgICAgICAgPGc+IGdyb3VwIGZvciBlYWNoIHpvb20gbGF5ZXJcbiAgICAgICAgICAgICAgICA8c3ZnPiBzdmcgd2l0aCB3aWR0aCBhbmQgaGVpZ2h0IGZvciB0aGlzIGxheWVyXG4gICAgICAgICAgICAgICAgICAgIDxpbWFnZT4gaW1hZ2VzXG4gICAgICAgICAgICA8Zz5cbiAgICAgICAgICAgICAgICAuLi5cbiAgICAgICAgPHN2Zz4gc3ZnIGZvciBwaGVub3R5cGUgMlxuICAgICAgICAgICAgLi4uXG4qL1xuXG52YXIgdGFnID0gcmVxdWlyZSgnLi91aV91dGlscy90YWcuanMnKS50YWc7XG5cbnZhciBzZXR1cCA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBhZGRCdXR0b25zKHRhcmdldCkge1xuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEJ1dHRvbihpZCwgX2NsYXNzLCB0eXBlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0YWcoKVxuICAgICAgICAgICAgICAgIC5jcmVhdGUoJ2lucHV0JylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2NsYXNzJywgX2NsYXNzKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3R5cGUnLCB0eXBlKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ25hbWUnLCBuYW1lKVxuICAgICAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgICAgICB9O1xuICAgICAgICBhZGRCdXR0b24oJ3NlYXJjaGJhcicsICcnLCAndGV4dCcsICdzZWFyY2gnKS5hdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgJ1NlYXJjaCBmb3IgcGhlbm90eXBlcy4uLicpO1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20taW4tYnV0dG9uJywgJ3pvb20tYnV0dG9uJywgJ2J1dHRvbicsICdpbmNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnKycpO1xuICAgICAgICBhZGRCdXR0b24oJ3pvb20tb3V0LWJ1dHRvbicsICd6b29tLWJ1dHRvbicsICdidXR0b24nLCdkZWNyZWFzZScpLmF0dHJpYnV0ZSgndmFsdWUnLCAnLScpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVXaWRnZXRBbmRCYWNrZ3JvdW5kKHRhcmdldCwgd2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAvLyBjcmVhdGUgd2lkZ2V0IGFuZCBhcHBlbmQgaXQgdG8gdGhlIHRhcmdldFxuICAgICAgICB2YXIgd2lkZ2V0ID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHdpZGdldElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcblxuICAgICAgICAvLyBjcmVhdGUgYmFja2dyb3VuZCBmb3IgcGxvdCB3aWRnZXRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdmaWxsJywgYmFja2dyb3VuZENvbG9yKSAvLyAnI2RlZTBlMidcbiAgICAgICAgICAgIC5wbGFjZSh3aWRnZXQpO1xuXG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBsb3RDb250YWluZXIodGFyZ2V0LCBwbG90SUQsIHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgY29udGFpbmVyICh3aWR0aCBhbmQgaGVpZ2h0IGRpY3RhdGUgdGhlIHNpemUgb2YgdGhlIHZpZXdpbmcgd2luZG93KVxuICAgICAgICB2YXIgcGxvdFdpbmRvdyA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneCcsIHgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgeSlcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBwbG90IGJhY2tncm91bmRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2ZpbGwnLCAnd2hpdGUnKVxuICAgICAgICAgICAgLnBsYWNlKHBsb3RXaW5kb3cpO1xuXG4gICAgICAgIHJldHVybiBwbG90V2luZG93O1xuICAgIH07XG5cbiAgICAvKmZ1bmN0aW9uIGFkZFBsb3RUb1BhZ2UodGFyZ2V0LCBwbG90SUQpIHtcbiAgICAgICAgLy8gYWRkIGcgZm9yIGEgc2luZ2xlIHBsb3QgKHBoZW5vdHlwZSksIGhpZGRlbiB3aXRoIGRpc3BsYXk9bm9uZVxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHBsb3RJRClcbiAgICAgICAgICAgIC8vLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhZGRNdWx0aXBsZVBsb3RzVG9QYWdlKHRhcmdldCwgcGxvdElEcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsb3RJRHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFkZFBsb3RUb1BhZ2UodGFyZ2V0LCBwbG90SURzW2ldKTtcbiAgICAgICAgfVxuICAgIH07Ki9cblxuICAgIC8qZnVuY3Rpb24gc2hvd1Bsb3QocGxvdElEKSB7XG4gICAgICAgIC8vbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdpbmxpbmUnKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGlkZVBsb3QocGxvdElEKSB7XG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIH07Ki9cblxuICAgIHJldHVybiB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICh3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yLCBwbG90SUQsIHBsb3RXaW5kb3dXaWR0aCwgcGxvdFdpbmRvd0hlaWdodCwgcGxvdFdpbmRvd1gsIHBsb3RXaW5kb3dZLCBwbG90SURzKSB7XG4gICAgICAgICAgICAvLyB0YXJnZXQgZm9yIHdoZXJlIHRvIGluc2VydCBlbGVtZW50cyAobWFrZSBzdXJlIHRoZXkgYXJlIGJlZm9yZSB0aGUgPHNjcmlwdD4hISEpXG4gICAgICAgICAgICB0YXJnZXQgPSBuZXcgdGFnKCkuc2VsZWN0KCd3aWRnZXQtZGl2Jyk7XG5cbiAgICAgICAgICAgIGFkZEJ1dHRvbnModGFyZ2V0KTtcbiAgICAgICAgICAgIHZhciB3aWRnZXQgPSBjcmVhdGVXaWRnZXRBbmRCYWNrZ3JvdW5kKHRhcmdldCwgd2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvcik7IC8vJyNkZWUwZTInXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncGxvdElEOiAnK3Bsb3RJRCk7XG4gICAgICAgICAgICB2YXIgcGxvdFdpbmRvdyA9IGNyZWF0ZVBsb3RDb250YWluZXIod2lkZ2V0LCBwbG90SUQsIHBsb3RXaW5kb3dXaWR0aCwgcGxvdFdpbmRvd0hlaWdodCwgcGxvdFdpbmRvd1gsIHBsb3RXaW5kb3dZKTtcbiAgICAgICAgICAgIC8vYWRkTXVsdGlwbGVQbG90c1RvUGFnZShwbG90V2luZG93LCBwbG90SURzKTtcbiAgICAgICAgICAgIC8vIHNldCBmaXJzdCBwbG90SUQgdG8gYmUgdmlzaWJsZVxuICAgICAgICAgICAgLy9zaG93UGxvdChwbG90SURzWzBdKTtcbiAgICAgICAgfSxcbiAgICAgICAgLy9zaG93UGxvdDogc2hvd1Bsb3QsXG4gICAgICAgIC8vaGlkZVBsb3Q6IGhpZGVQbG90LFxuICAgIH1cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnNldHVwID0gc2V0dXA7IiwidmFyIHNlbGVjdG9ycyA9IHtcbiAgICBpZHM6IHtcbiAgICAgICAgd2lkZ2V0OiAnd2lkZ2V0JyxcbiAgICAgICAgcGxvdDogJ3Bsb3QnLFxuICAgICAgICBncm91cDogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItZ3JvdXAtbGF5ZXJcIitsZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnTGF5ZXI6IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gcGxvdElEK1wiLXN2Zy1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyO1xuICAgIHRoaXMucGxvdDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpO1xuICAgIHRoaXMucGxvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB2YXIgdHJhbnNmb3JtYXRpb25zID0gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbiAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgdHJhbnNsYXRlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICB0cmFuc2xhdGUuc2V0VHJhbnNsYXRlKDAsIDApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUodHJhbnNsYXRlLCAwKTtcblxuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHNjYWxlLnNldFNjYWxlKDEuMCwgMS4wKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHNjYWxlLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCAhPT0gMikgdGhyb3cgXCJlZGl0U1ZHOiBleHBlY3RlZCB0cmFuc2Zvcm1hdGlvbnMgdG8gYmUgYSBsaXN0IG9mIGxlbmd0aCAyLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMCkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgxKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgXCJlZGl0U1ZHOiB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCI7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKHNoaWZ0WCwgc2hpZnRZKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICBpZiAoKCFzaGlmdFggfHwgIXNoaWZ0WSkgJiYgKHNoaWZ0WCAhPSAwICYmIHNoaWZ0WSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHRyYW5zbGF0ZSBTVkcgb2JqZWN0IHdpdGggbnVsbCwgdW5kZWZpbmVkLCBvciBlbXB0eSBzaGlmdCB2YWx1ZXMuIHNoaWZ0WDogXCIrc2hpZnRYK1wiIHNoaWZ0WTpcIitzaGlmdFkpO1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgwKTtcbiAgICBpZiAodHJhbnNsYXRpb24udHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSB0aHJvdyBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgdHJhbnNsYXRpb24uc2V0VHJhbnNsYXRlKHNoaWZ0WCwgc2hpZnRZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKHNjYWxlWCwgc2NhbGVZKSB7XG4gICAgdmFyIHNjYWxlID0gdGhpcy50cmFuc2Zvcm1hdGlvbnMoKS5nZXRJdGVtKDEpO1xuICAgIGlmIChzY2FsZS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgdGhyb3cgXCJlZGl0U1ZHOiBzZWNvbmQgdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiO1xuICAgIHNjYWxlLnNldFNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbiAob3BhY2l0eSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIsIG9wYWNpdHkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKlxuVGVzdFxuXG52YXIgbDIgPSBuZXcgZWRpdFNWRygpLnNldCgyKTtcblxudmFyIHggPSBsMi50cmFuc2Zvcm1hdGlvbnMoKTsgXG4vLyBjaGVjayB0cmFuc2xhdGVcbnguZ2V0SXRlbSgwKS5tYXRyaXguZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMFxueC5nZXRJdGVtKDApLm1hdHJpeC5mOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAwXG4vLyBjaGVjayBzY2FsZVxueC5nZXRJdGVtKDEpLm1hdHJpeC5hOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAxXG54LmdldEl0ZW0oMSkubWF0cml4LmQ7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDFcbi8vIGNoZWNrIGxlbmd0aFxueC5sZW5ndGggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAyXG5cbmwyLnRyYW5zbGF0ZSg1MCwgNTApO1xuXG5sMi5zY2FsZSguNSwgLjUpO1xuXG5sMi5mYWRlKC41KTtcblxubDIuaGlkZSgpO1xuXG5sMi5zaG93KCk7XG4qL1xuXG5tb2R1bGUuZXhwb3J0cy5lZGl0U1ZHID0gZWRpdFNWRzsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi91dGlscy91dGlscy5qcycpLnV0aWxzO1xuXG52YXIgdGFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG50YWcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50ICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnNldCgpIGNhbm5vdCBvdmVycmlkZSBub24tbnVsbCBlbGVtZW50IHdpdGggbmV3IGVsZW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbnRhZy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGUoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmNyZWF0ZU5TID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGVOUygpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZWxlY3QoKSBtdXN0IGhhdmUgYW4gYGlkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5hdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKGF0dHIpIHx8IHV0aWxzLm51bGxPclVuZGVmaW5lZCh2YWx1ZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmF0dHJpYnV0ZSgpIG11c3QgaGF2ZSBgYXR0cmAgYW5kIGB2YWx1ZWAgYXJndW1lbnRzLlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChjaGlsZCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmFwcGVuZCgpIG11c3QgaGF2ZSBhIGBjaGlsZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZC5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUucGxhY2UgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5wbGFjZSgpIG11c3QgaGF2ZSBhIGBwYXJlbnRgIGFyZ3VtZW50LlwiKTtcbiAgICBwYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5yZW1vdmUoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnRhZy5wcm90b3R5cGUuYWRkSFJFRiA9IGZ1bmN0aW9uIChocmVmKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChocmVmKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYWRkSFJFRigpIG11c3QgaGF2ZSBhIGBocmVmYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLCBcImhyZWZcIiwgaHJlZik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50YWcgPSB0YWc7XG4iLCJ2YXIgc2NoZW1hID0ge1xuICAgIGNoZWNrOiBmdW5jdGlvbiAob2JqZWN0LCBrZXlzKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmplY3QpLmxlbmd0aCAhPSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNjaGVtYSA9IHNjaGVtYTsiLCJ2YXIgdXRpbHMgPSB7XG4gICAgbnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnV0aWxzID0gdXRpbHM7Il19
