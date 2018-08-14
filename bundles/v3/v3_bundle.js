(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var setup = require('../ui/setup.js').setup;
var layers = require('../ui/layers.js').layers;
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

function callGUI(visiblesAndHiddens) {
    gui.render(visiblesAndHiddens[0], visiblesAndHiddens[1]);
}

// MAP : plot name => literal with url, minZoom, maxZoom
// 'standing_height' : { url: '/path/to/standing_height/plots', minZoom: 2, maxZoom: 8 },

function init() {
    var widgetID = 'widget',
        plotID = 'plot';

    // setup page
    setup.init(widgetID, 1300, 350, '#e3e7ed', plotID, 1024, 256, 60, 30,
        ['caffeine_consumption', 'standing_height']);

    // setup image layers
    layers.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);

    layers.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height_plots', 256, 256);

    // setup model
    plot.setMinMaxLevel(2, 7);
    plot.initializeVisible(2, { width: 1024, height: 256 });
    var width = 1024;
    for (var i = 3; i < 7 + 1; i++) {
        width = width * 2;
        plot.initializeHidden(i, { width: width, height: 256 });
    }

    // render
    callGUI(plot.getInfoForGUI());

    // setup listeners
    document.getElementById("plot").addEventListener("wheel", onWheel);

    document.getElementById("zoom-in-button").addEventListener("click", function () {
        plot.zoom({ x: 512, y: 128 }, -5);
        var interval = setInterval(function () {
            try {
                if (plot.snapIn({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                callGUI(plot.getInfoForGUI());
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    });

    document.getElementById("zoom-out-button").addEventListener("click", function () {
        console.log("snap zoom out");

        plot.zoom({ x: 512, y: 128 }, 5);
        var interval = setInterval(function () {
            try {
                if (plot.snapOut({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                callGUI(plot.getInfoForGUI());
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    });

    document.getElementById("plot").addEventListener("load", listenForDrag);
}

init();

},{"../plot/plot.js":2,"../ui/gui.js":4,"../ui/layers.js":5,"../ui/setup.js":6}],2:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("../plot/position.js").position;

var plot = (function () {
    var minimumLevel = null,
        maximumLevel = null,
        scaleFactor = 10000,
        zoomIncrement = 5,
        scaleRangeInWhichHigherZoomLayerIsTransparent = [6000, 9000],
        scaleRangeInWhichLowerZoomLayerIsTransparent = [12000, 18000],
        visibles = {},
        hiddens = new Set([]),
        dimensions = {};

    function reset() {
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
},{"../plot/position.js":3,"../utils/schema.js":10}],3:[function(require,module,exports){
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
var editSVG = require('./ui_utils/svg.js').editSVG;
var schema = require('../utils/schema.js').schema;

var gui = {
    render: function (visibleLayers, hiddenLevels) {

        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            throw new Error("Must have 1-2 visible layers.");
        }

        for (var hiddenIndex in hiddenLevels) {
            var level = hiddenLevels[hiddenIndex];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw new Error("GUI ERROR: expected a list of numbers for hiddenLayers.");
            }
            
            new editSVG().set(level).hide();
        }

        for (var visibleIndex in visibleLayers) {
            var layer = visibleLayers[visibleIndex];
            if (!schema.layer(layer)) throw new Error("GUI: expected layer schema.");
            if (layer.scale.x > 2 || layer.scale.x < .5 || layer.scale.y > 2 || layer.scale.y < .5) {
                throw new Error("GUI: scale outside [.5,2] range. Scale should be converted to [.5,2] before being passed to GUI. ["+layer.scale.x+", "+layer.scale.y+"]");
            }
            
            new editSVG()
                .set(layer.level)
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
},{"../utils/schema.js":10,"./ui_utils/svg.js":8}],5:[function(require,module,exports){
var tag = require('./ui_utils/tag.js').tag;
var selectors = require('./ui_utils/selectors.js').selectors;

var layers = (function () {
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
            .create('image')
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
            for (var i = minLevel; i<maxLevel+1; i++) {
                var columns = Math.pow(2, i);
                var width = columns * imageWidth;
                var height = imageHeight;
                addGroup(plotID, i, width, height);
                addTiles(plotID, i, url, imageWidth, imageHeight);
            }
        }
    }
}());

module.exports.layers = layers;
},{"./ui_utils/selectors.js":7,"./ui_utils/tag.js":9}],6:[function(require,module,exports){
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
        function addButton(id, name, value) {
            new tag()
                .create('input')
                .attribute('id', id)
                .attribute('class', 'zoom-button')
                .attribute('type', 'button')
                .attribute('name', name)
                .attribute('value', value)
                .place(target);
        };

        addButton('zoom-in-button', 'increase', '+');
        addButton('zoom-out-button', 'decrease', '-');
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

    function addPlotToPage(target, plotID) {
        // add svg for a single plot (phenotype), hidden with display=none
        new tag()
            .createNS('svg')
            .attribute('id', plotID)
            .attribute('display', 'none')
            .place(target);
    };

    function addMultiplePlotsToPage(target, plotIDs) {
        for (var i = 0; i < plotIDs.length; i++) {
            addPlotToPage(target, plotIDs[i]);
        }
    };

    function showPlot(plotID) {
        new tag().select(plotID).attribute('display', 'inline');
    };

    function hidePlot(plotID) {
        new tag().select(plotID).attribute('display', 'none');
    };

    return {
        init: function (widgetID, width, height, backgroundColor, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY, plotIDs) {
            // target for where to insert elements is <body>
            target = new tag().set(document.body);

            addButtons(target);
            var widget = createWidgetAndBackground(target, widgetID, width, height, backgroundColor); //'#dee0e2'
            var plotWindow = createPlotContainer(widget, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY);
            addMultiplePlotsToPage(plotWindow, plotIDs);
            // set first plotID to be visible
            showPlot(plotIDs[0]);
        },
        showPlot: showPlot,
        hidePlot: hidePlot,
    }
}());

module.exports.setup = setup;
},{"./ui_utils/tag.js":9}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
var selectors = require('./selectors.js').selectors;

var editSVG = function () {
    this.layer;
    this.plot;
};

editSVG.prototype.set = function (level) {
    this.layer = document.getElementById(selectors.ids.layer(level));
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
    this.layer.setAttribute("visibility", "visibile");
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
},{"./selectors.js":7}],9:[function(require,module,exports){
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

},{"../../utils/utils.js":11}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
var utils = {
    nullOrUndefined: function(obj) {
        if (typeof obj === "undefined" || obj === null) {
            return true;
        }
        return false;
    },
};

module.exports.utils = utils;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjMvc3JjL21haW4vbWFpbi5qcyIsInNjcmlwdHMvdjMvc3JjL3Bsb3QvcGxvdC5qcyIsInNjcmlwdHMvdjMvc3JjL3Bsb3QvcG9zaXRpb24uanMiLCJzY3JpcHRzL3YzL3NyYy91aS9ndWkuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9sYXllcnMuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9zZXR1cC5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3NlbGVjdG9ycy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3N2Zy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3RhZy5qcyIsInNjcmlwdHMvdjMvc3JjL3V0aWxzL3NjaGVtYS5qcyIsInNjcmlwdHMvdjMvc3JjL3V0aWxzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgc2V0dXAgPSByZXF1aXJlKCcuLi91aS9zZXR1cC5qcycpLnNldHVwO1xudmFyIGxheWVycyA9IHJlcXVpcmUoJy4uL3VpL2xheWVycy5qcycpLmxheWVycztcbnZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuLi91aS9ndWkuanMnKS5ndWk7XG5cbmZ1bmN0aW9uIGNhbGxHVUkodmlzaWJsZXNBbmRIaWRkZW5zKSB7XG4gICAgZ3VpLnJlbmRlcih2aXNpYmxlc0FuZEhpZGRlbnNbMF0sIHZpc2libGVzQW5kSGlkZGVuc1sxXSk7XG59XG5cbi8vIE1BUCA6IHBsb3QgbmFtZSA9PiBsaXRlcmFsIHdpdGggdXJsLCBtaW5ab29tLCBtYXhab29tXG4vLyAnc3RhbmRpbmdfaGVpZ2h0JyA6IHsgdXJsOiAnL3BhdGgvdG8vc3RhbmRpbmdfaGVpZ2h0L3Bsb3RzJywgbWluWm9vbTogMiwgbWF4Wm9vbTogOCB9LFxuXG5mdW5jdGlvbiBpbml0KCkge1xuICAgIHZhciB3aWRnZXRJRCA9ICd3aWRnZXQnLFxuICAgICAgICBwbG90SUQgPSAncGxvdCc7XG5cbiAgICAvLyBzZXR1cCBwYWdlXG4gICAgc2V0dXAuaW5pdCh3aWRnZXRJRCwgMTMwMCwgMzUwLCAnI2UzZTdlZCcsIHBsb3RJRCwgMTAyNCwgMjU2LCA2MCwgMzAsXG4gICAgICAgIFsnY2FmZmVpbmVfY29uc3VtcHRpb24nLCAnc3RhbmRpbmdfaGVpZ2h0J10pO1xuXG4gICAgLy8gc2V0dXAgaW1hZ2UgbGF5ZXJzXG4gICAgbGF5ZXJzLmluc2VydFBsb3RJbWFnZXMoJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMiwgNywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHMvY2FmZmVpbmVfY29uc3VtcHRpb24nLCAyNTYsIDI1Nik7XG5cbiAgICBsYXllcnMuaW5zZXJ0UGxvdEltYWdlcygnc3RhbmRpbmdfaGVpZ2h0JywgMiwgOCwgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvc3RhbmRpbmdfaGVpZ2h0X3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cycsIDI1NiwgMjU2KTtcblxuICAgIC8vIHNldHVwIG1vZGVsXG4gICAgcGxvdC5zZXRNaW5NYXhMZXZlbCgyLCA3KTtcbiAgICBwbG90LmluaXRpYWxpemVWaXNpYmxlKDIsIHsgd2lkdGg6IDEwMjQsIGhlaWdodDogMjU2IH0pO1xuICAgIHZhciB3aWR0aCA9IDEwMjQ7XG4gICAgZm9yICh2YXIgaSA9IDM7IGkgPCA3ICsgMTsgaSsrKSB7XG4gICAgICAgIHdpZHRoID0gd2lkdGggKiAyO1xuICAgICAgICBwbG90LmluaXRpYWxpemVIaWRkZW4oaSwgeyB3aWR0aDogd2lkdGgsIGhlaWdodDogMjU2IH0pO1xuICAgIH1cblxuICAgIC8vIHJlbmRlclxuICAgIGNhbGxHVUkocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuXG4gICAgLy8gc2V0dXAgbGlzdGVuZXJzXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBvbldoZWVsKTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgLTUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBJbih7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsR1VJKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20tb3V0LWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInNuYXAgem9vbSBvdXRcIik7XG5cbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3Quc25hcE91dCh7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsR1VJKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgbGlzdGVuRm9yRHJhZyk7XG59XG5cbmluaXQoKTtcbiIsInZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG52YXIgcG9zaXRpb24gPSByZXF1aXJlKFwiLi4vcGxvdC9wb3NpdGlvbi5qc1wiKS5wb3NpdGlvbjtcblxudmFyIHBsb3QgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBtaW5pbXVtTGV2ZWwgPSBudWxsLFxuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsLFxuICAgICAgICBzY2FsZUZhY3RvciA9IDEwMDAwLFxuICAgICAgICB6b29tSW5jcmVtZW50ID0gNSxcbiAgICAgICAgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzYwMDAsIDkwMDBdLFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCA9IFsxMjAwMCwgMTgwMDBdLFxuICAgICAgICB2aXNpYmxlcyA9IHt9LFxuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSksXG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsO1xuICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRNaW5NYXhMZXZlbChtaW4sIG1heCkge1xuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBtaW47XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG1heDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bml0U2NhbGUoc2NhbGUpIHtcbiAgICAgICAgaWYgKChzY2FsZS54ID4gLjUgJiYgc2NhbGUueCA8IDIpIHx8IChzY2FsZS55ID4gLjUgJiYgc2NhbGUueSA8IDIpKSB0aHJvdyBuZXcgRXJyb3IoJ3NjYWxlIGFscmVhZHkgaW4gdW5pdCBzY2FsZScpO1xuICAgICAgICByZXR1cm4geyB4OiBzY2FsZS54IC8gc2NhbGVGYWN0b3IsIHk6IHNjYWxlLnkgLyBzY2FsZUZhY3RvciB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3cgKGxldmVsLCB0b3BMZWZ0LCBzY2FsZSwgb3BhY2l0eSkge1xuICAgICAgICBpZiAoIWhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIjtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHRvcExlZnQsIHNjYWxlOiBzY2FsZSwgb3BhY2l0eTogb3BhY2l0eSB9O1xuICAgICAgICBoaWRkZW5zLmRlbGV0ZShsZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGlkZSAobGV2ZWwpIHtcbiAgICAgICAgaWYgKCF2aXNpYmxlc1tsZXZlbF0pIHRocm93IFwiVHJpZWQgdG8gaGlkZSBhIGxldmVsIHRoYXQgaXMgbm90IHZpc2libGVcIjtcbiAgICAgICAgZGVsZXRlIHZpc2libGVzW2xldmVsXTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVPcGFjaXR5IChzY2FsZSkge1xuICAgICAgICB2YXIgeFNjYWxlID0gc2NhbGUueDtcbiAgICAgICAgaWYgKHhTY2FsZSA8IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBoaWdoZXIgem9vbSBsZXZlbCAob24gdG9wIGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBtYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzAsIDFdKTtcbiAgICAgICAgfSAvKmVsc2UgaWYgKHhTY2FsZSA+IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggbG93ZXIgem9vbSBsZXZlbCAoYmVsb3cgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIHBsb3QubWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMSwgMF0pO1xuICAgICAgICB9Ki8gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcFZhbHVlT250b1JhbmdlICh2YWx1ZSwgb2xkUmFuZ2UsIG5ld1JhbmdlKSB7XG4gICAgICAgIHZhciBvbGRTcGFuID0gb2xkUmFuZ2VbMV0gLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIG5ld1NwYW4gPSBuZXdSYW5nZVsxXSAtIG5ld1JhbmdlWzBdO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb1ZhbHVlID0gdmFsdWUgLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIHBlcmNlbnRTcGFuVG9WYWx1ZSA9IGRpc3RhbmNlVG9WYWx1ZSAvIG9sZFNwYW47XG4gICAgICAgIHZhciBkaXN0YW5jZVRvTmV3VmFsdWUgPSBwZXJjZW50U3BhblRvVmFsdWUgKiBuZXdTcGFuO1xuICAgICAgICB2YXIgbmV3VmFsdWUgPSBuZXdSYW5nZVswXSArIGRpc3RhbmNlVG9OZXdWYWx1ZTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9zaXRpb24gKG5ld1RvcExlZnQpIHtcbiAgICAgICAgaWYgKCghbmV3VG9wTGVmdC54ICYmIG5ld1RvcExlZnQueCAhPSAwKSB8fCAoIW5ld1RvcExlZnQueSAmJiBuZXdUb3BMZWZ0LnkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImJhZCBuZXcgVG9wIExlZnQ6IFtcIiArIG5ld1RvcExlZnQueCArIFwiLCBcIiArIG5ld1RvcExlZnQueSArIFwiXVwiKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQgPSBuZXdUb3BMZWZ0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXRPcGFjaXRpZXMgKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0ub3BhY2l0eSA9IGNhbGN1bGF0ZU9wYWNpdHkodmlzaWJsZXNba2V5XS5zY2FsZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRJbmZvRm9yR1VJIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mVmlzaWJsZXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHNjYWxlIGZvciBwYXNzaW5nIHRvIEdVSTogXG4gICAgICAgICAgICAgICAgdmFyIGd1aUxheWVyID0ge1xuICAgICAgICAgICAgICAgICAgICBsZXZlbDogdmlzaWJsZXNba2V5XS5sZXZlbCxcbiAgICAgICAgICAgICAgICAgICAgdG9wTGVmdDogdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdW5pdFNjYWxlKHZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlc1trZXldLm9wYWNpdHksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ3VpTGF5ZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShoaWRkZW5zKTtcbiAgICAgICAgICAgIHJldHVybiBbbGlzdE9mVmlzaWJsZXMsIGxpc3RPZkhpZGRlbnNdO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhckZvclRlc3Rpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IGJldHRlciB3YXkgdG8gY2xlYXIgc2luZ2xldG9uIGZvciB0ZXN0aW5nP1xuICAgICAgICAgICAgdmlzaWJsZXMgPSB7fTtcbiAgICAgICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICAgICAgfSwgIFxuICAgICAgICBnZXRWaXNpYmxlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZpc2libGVzO1xuICAgICAgICB9LFxuICAgICAgICBnZXRIaWRkZW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaGlkZGVucztcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhbGl6ZVZpc2libGU6IGZ1bmN0aW9uKGxldmVsLCBkaW1zKSB7XG4gICAgICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmRpbWVuc2lvbnMoZGltcykpIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGRpbWVuc2lvbnMgc2NoZW1hXCIpO1xuICAgICAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogc2NhbGVGYWN0b3IsIHk6IDEgKiBzY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXRpYWxpemVIaWRkZW46ZnVuY3Rpb24gKGxldmVsLCBkaW1zKSB7XG4gICAgICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgICAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgICAgICB9LFxuICAgICAgICBpbmNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDwgc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID49IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpICsgMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPD0gbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSwgeTogMSAqIHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVjcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5ID09IG1pbmltdW1MZXZlbCAmJiB2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSAmJiBrZXkgPiBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaGlkZShrZXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA+PSBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgem9vbTogZnVuY3Rpb24gKGZvY3VzLCB2ZXJ0aWNhbCkge1xuXG4gICAgICAgICAgICB2YXIgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICAgICAgZmlyc3QgPSB2aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICAgICAgd2lkdGggPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG4gICAgXG4gICAgICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgdW5pdFNjYWxlKGZpcnN0LnNjYWxlKSwgd2lkdGgsIGhlaWdodCk7XG4gICAgXG4gICAgICAgICAgICB2YXIgaG93TXVjaCA9IE1hdGguZmxvb3IoTWF0aC5hYnModmVydGljYWwpIC8gNSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvd011Y2g7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICh2ZXJ0aWNhbCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgICAgIG5ld0ZpcnN0ID0gdmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICAgICAgbmV3SGVpZ2h0ID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0uaGVpZ2h0O1xuICAgIFxuICAgICAgICAgICAgdmFyIG5ld1RvcExlZnQgPSBwb3NpdGlvbi5wZXJjZW50YWdlVG9Ub3BMZWZ0KGZvY3VzLCBwZXJjZW50YWdlQ29vcmRpbmF0ZXMsIHVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICAgICAgcmVwb3NpdGlvbihuZXdUb3BMZWZ0KTtcbiAgICAgICAgICAgIHJlc2V0T3BhY2l0aWVzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNuYXBJbjogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcbiAgICBcbiAgICAgICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCAtNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzbmFwT3V0OiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuICAgIFxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZHJhZzogZnVuY3Rpb24gKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdC54ICs9IGNoYW5nZUluUG9zaXRpb24ueDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0TWluTWF4TGV2ZWw6IHNldE1pbk1heExldmVsLFxuICAgICAgICByZXNldDogcmVzZXQsXG4gICAgfTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnBsb3QgPSBwbG90OyIsInZhciBwb3NpdGlvbiA9IHtcbiAgICBjYWxjdWxhdGVQZXJjZW50OiBmdW5jdGlvbiAocG9zaXRpb25BLCBwb3NpdGlvbkIsIGxlbmd0aEIsIHNjYWxlQikge1xuICAgICAgICBpZiAobGVuZ3RoQiA8PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJMZW5ndGggbXVzdCBiZSBwb3NpdGl2ZS5cIik7XG4gICAgICAgIHJldHVybiAocG9zaXRpb25BIC0gcG9zaXRpb25CKSAvIChsZW5ndGhCICogc2NhbGVCKTtcbiAgICB9LFxuICAgIGNhbGN1bGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAocG9zaXRpb25BLCBwZXJjZW50QiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIHJldHVybiBwb3NpdGlvbkEgLSAoKGxlbmd0aEIgKiBzY2FsZUIpICogcGVyY2VudEIpO1xuICAgIH0sXG4gICAgdG9wTGVmdFRvUGVyY2VudGFnZTogZnVuY3Rpb24gKGZvY3VzLCB0b3BMZWZ0LCBzY2FsZSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy54LCB0b3BMZWZ0LngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBlcmNlbnQoZm9jdXMueSwgdG9wTGVmdC55LCBoZWlnaHQsIHNjYWxlLnkpLFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcGVyY2VudGFnZVRvVG9wTGVmdDogZnVuY3Rpb24gKGZvY3VzLCBwZXJjZW50YWdlLCBzY2FsZSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcG9zaXRpb24uY2FsY3VsYXRlUG9zaXRpb24oZm9jdXMueCwgcGVyY2VudGFnZS54LCB3aWR0aCwgc2NhbGUueCksXG4gICAgICAgICAgICB5OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy55LCBwZXJjZW50YWdlLnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMucG9zaXRpb24gPSBwb3NpdGlvbjsiLCJ2YXIgZWRpdFNWRyA9IHJlcXVpcmUoJy4vdWlfdXRpbHMvc3ZnLmpzJykuZWRpdFNWRztcbnZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG5cbnZhciBndWkgPSB7XG4gICAgcmVuZGVyOiBmdW5jdGlvbiAodmlzaWJsZUxheWVycywgaGlkZGVuTGV2ZWxzKSB7XG5cbiAgICAgICAgaWYgKCEodmlzaWJsZUxheWVycy5sZW5ndGggPiAwICYmIHZpc2libGVMYXllcnMubGVuZ3RoIDw9IDIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGhhdmUgMS0yIHZpc2libGUgbGF5ZXJzLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGhpZGRlbkluZGV4IGluIGhpZGRlbkxldmVscykge1xuICAgICAgICAgICAgdmFyIGxldmVsID0gaGlkZGVuTGV2ZWxzW2hpZGRlbkluZGV4XTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGV2ZWwpICE9ICdbb2JqZWN0IE51bWJlcl0nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJIEVSUk9SOiBleHBlY3RlZCBhIGxpc3Qgb2YgbnVtYmVycyBmb3IgaGlkZGVuTGF5ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKS5zZXQobGV2ZWwpLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIHZpc2libGVJbmRleCBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB2aXNpYmxlTGF5ZXJzW3Zpc2libGVJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5sYXllcihsYXllcikpIHRocm93IG5ldyBFcnJvcihcIkdVSTogZXhwZWN0ZWQgbGF5ZXIgc2NoZW1hLlwiKTtcbiAgICAgICAgICAgIGlmIChsYXllci5zY2FsZS54ID4gMiB8fCBsYXllci5zY2FsZS54IDwgLjUgfHwgbGF5ZXIuc2NhbGUueSA+IDIgfHwgbGF5ZXIuc2NhbGUueSA8IC41KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBzY2FsZSBvdXRzaWRlIFsuNSwyXSByYW5nZS4gU2NhbGUgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBbLjUsMl0gYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBHVUkuIFtcIitsYXllci5zY2FsZS54K1wiLCBcIitsYXllci5zY2FsZS55K1wiXVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKVxuICAgICAgICAgICAgICAgIC5zZXQobGF5ZXIubGV2ZWwpXG4gICAgICAgICAgICAgICAgLnRyYW5zbGF0ZShsYXllci50b3BMZWZ0LngsIGxheWVyLnRvcExlZnQueSlcbiAgICAgICAgICAgICAgICAuc2NhbGUobGF5ZXIuc2NhbGUueCwgbGF5ZXIuc2NhbGUueSlcbiAgICAgICAgICAgICAgICAuZmFkZShsYXllci5vcGFjaXR5KVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlzaWJsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgc2NhbGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIG9wYWNpdHlTdHJpbmcgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmlzaWJsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0ubGV2ZWw7XG4gICAgICAgICAgICBzY2FsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0uc2NhbGUueDtcbiAgICAgICAgICAgIG9wYWNpdHlTdHJpbmcgKz0gXCIgXCIrIHZpc2libGVMYXllcnNba2V5XS5vcGFjaXR5O1xuICAgICAgICB9XG4gICAgICAgICQoXCIjem9vbS1kaXZcIikudGV4dCh2aXNpYmxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjZnJhY3Rpb25hbC16b29tLWRpdlwiKS50ZXh0KHNjYWxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjb3BhY2l0eS1kaXZcIikudGV4dChvcGFjaXR5U3RyaW5nKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuZ3VpID0gZ3VpOyIsInZhciB0YWcgPSByZXF1aXJlKCcuL3VpX3V0aWxzL3RhZy5qcycpLnRhZztcbnZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuL3VpX3V0aWxzL3NlbGVjdG9ycy5qcycpLnNlbGVjdG9ycztcblxudmFyIGxheWVycyA9IChmdW5jdGlvbiAoKSB7XG4gICAgLyogcGxhY2UgYSB6b29tIGxheWVyIGdyb3VwIDxnPjxzdmc+PC9zdmc+PC9nPiBpbnNpZGUgYSBwbG90J3MgPHN2Zz4gKi9cbiAgICBmdW5jdGlvbiBhZGRHcm91cChwbG90SUQsIGxldmVsLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBwbG90ID0gbmV3IHRhZygpLnNlbGVjdChwbG90SUQpO1xuXG4gICAgICAgIHZhciBncm91cCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJyxzZWxlY3RvcnMuaWRzLmdyb3VwKHBsb3RJRCwgbGV2ZWwpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgndmlzaWJpbGl0eScsICdoaWRkZW4nKVxuICAgICAgICAgICAgLnBsYWNlKHBsb3QpO1xuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAucGxhY2UoZ3JvdXApO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhZGRUaWxlKHBsb3RJRCwgbGV2ZWwsIGNvbHVtbiwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCkge1xuICAgICAgICB2YXIgdGlsZVVSTCA9IHVybCArIFwiL1wiICsgbGV2ZWwgKyBcIi9cIiArIGNvbHVtbiArIFwiLnBuZ1wiO1xuXG4gICAgICAgIHZhciB4ID0gY29sdW1uICogaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIHkgPSAwO1xuICAgICAgICB2YXIgd2lkdGggPSBpbWFnZVdpZHRoO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0YWcoKS5zZWxlY3Qoc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSk7XG5cbiAgICAgICAgLy9jcmVhdGUgdGlsZVxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGUoJ2ltYWdlJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYWRkSFJFRih0aWxlVVJMKVxuICAgICAgICAgICAgLnBsYWNlKHN2Zyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGFkZFRpbGVzKHBsb3RJRCwgbGV2ZWwsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBjb2x1bW5zOyBjKyspIHtcbiAgICAgICAgICAgIGFkZFRpbGUocGxvdElELCBsZXZlbCwgYywgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgICAgICB4ID0geCArIDI1NjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpbnNlcnRQbG90SW1hZ2VzKHBsb3RJRCwgbWluTGV2ZWwsIG1heExldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbWluTGV2ZWw7IGk8bWF4TGV2ZWwrMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBpKTtcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW5zICogaW1hZ2VXaWR0aDtcbiAgICAgICAgICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG4gICAgICAgICAgICAgICAgYWRkR3JvdXAocGxvdElELCBpLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBhZGRUaWxlcyhwbG90SUQsIGksIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSgpKTtcblxubW9kdWxlLmV4cG9ydHMubGF5ZXJzID0gbGF5ZXJzOyIsIi8qIEluc2VydCBIVE1MIERPTSBlbGVtZW50cyBhbmQgU1ZHIERPTSBlbGVtZW50cyBpbnRvIHdlYnBhZ2UuXG5cblN0cnVjdHVyZVxuXG48c3ZnPiB3aWRnZXQgc3ZnXG4gICAgPHJlY3Q+IGJhY2tncm91bmQgcmVjdGFuZ2xlIGZvciB3aWRnZXQgKGFueSBjb2xvcilcbiAgICA8c3ZnPiBwbG90IHN2Z1xuICAgICAgICA8cmVjdD4gYmFja2dyb3VuZCByZWN0YW5nbGUgZm9yIHBsb3QgKHdoaXRlKVxuICAgICAgICA8c3ZnPiBzdmcgZm9yIHBoZW5vdHlwZSAxXG4gICAgICAgICAgICA8Zz4gZ3JvdXAgZm9yIGVhY2ggem9vbSBsYXllclxuICAgICAgICAgICAgICAgIDxzdmc+IHN2ZyB3aXRoIHdpZHRoIGFuZCBoZWlnaHQgZm9yIHRoaXMgbGF5ZXJcbiAgICAgICAgICAgICAgICAgICAgPGltYWdlPiBpbWFnZXNcbiAgICAgICAgICAgIDxnPlxuICAgICAgICAgICAgICAgIC4uLlxuICAgICAgICA8c3ZnPiBzdmcgZm9yIHBoZW5vdHlwZSAyXG4gICAgICAgICAgICAuLi5cbiovXG5cbnZhciB0YWcgPSByZXF1aXJlKCcuL3VpX3V0aWxzL3RhZy5qcycpLnRhZztcblxudmFyIHNldHVwID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIGZ1bmN0aW9uIGFkZEJ1dHRvbnModGFyZ2V0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGFkZEJ1dHRvbihpZCwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgICAgIC5jcmVhdGUoJ2lucHV0JylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2NsYXNzJywgJ3pvb20tYnV0dG9uJylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCd0eXBlJywgJ2J1dHRvbicpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgnbmFtZScsIG5hbWUpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgndmFsdWUnLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcbiAgICAgICAgfTtcblxuICAgICAgICBhZGRCdXR0b24oJ3pvb20taW4tYnV0dG9uJywgJ2luY3JlYXNlJywgJysnKTtcbiAgICAgICAgYWRkQnV0dG9uKCd6b29tLW91dC1idXR0b24nLCAnZGVjcmVhc2UnLCAnLScpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVXaWRnZXRBbmRCYWNrZ3JvdW5kKHRhcmdldCwgd2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAvLyBjcmVhdGUgd2lkZ2V0IGFuZCBhcHBlbmQgaXQgdG8gdGhlIHRhcmdldFxuICAgICAgICB2YXIgd2lkZ2V0ID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHdpZGdldElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcblxuICAgICAgICAvLyBjcmVhdGUgYmFja2dyb3VuZCBmb3IgcGxvdCB3aWRnZXRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdmaWxsJywgYmFja2dyb3VuZENvbG9yKSAvLyAnI2RlZTBlMidcbiAgICAgICAgICAgIC5wbGFjZSh3aWRnZXQpO1xuXG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBsb3RDb250YWluZXIodGFyZ2V0LCBwbG90SUQsIHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgY29udGFpbmVyICh3aWR0aCBhbmQgaGVpZ2h0IGRpY3RhdGUgdGhlIHNpemUgb2YgdGhlIHZpZXdpbmcgd2luZG93KVxuICAgICAgICB2YXIgcGxvdFdpbmRvdyA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneCcsIHgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgeSlcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBwbG90IGJhY2tncm91bmRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2ZpbGwnLCAnd2hpdGUnKVxuICAgICAgICAgICAgLnBsYWNlKHBsb3RXaW5kb3cpO1xuXG4gICAgICAgIHJldHVybiBwbG90V2luZG93O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhZGRQbG90VG9QYWdlKHRhcmdldCwgcGxvdElEKSB7XG4gICAgICAgIC8vIGFkZCBzdmcgZm9yIGEgc2luZ2xlIHBsb3QgKHBoZW5vdHlwZSksIGhpZGRlbiB3aXRoIGRpc3BsYXk9bm9uZVxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhZGRNdWx0aXBsZVBsb3RzVG9QYWdlKHRhcmdldCwgcGxvdElEcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsb3RJRHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFkZFBsb3RUb1BhZ2UodGFyZ2V0LCBwbG90SURzW2ldKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzaG93UGxvdChwbG90SUQpIHtcbiAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdpbmxpbmUnKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaGlkZVBsb3QocGxvdElEKSB7XG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpbml0OiBmdW5jdGlvbiAod2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvciwgcGxvdElELCBwbG90V2luZG93V2lkdGgsIHBsb3RXaW5kb3dIZWlnaHQsIHBsb3RXaW5kb3dYLCBwbG90V2luZG93WSwgcGxvdElEcykge1xuICAgICAgICAgICAgLy8gdGFyZ2V0IGZvciB3aGVyZSB0byBpbnNlcnQgZWxlbWVudHMgaXMgPGJvZHk+XG4gICAgICAgICAgICB0YXJnZXQgPSBuZXcgdGFnKCkuc2V0KGRvY3VtZW50LmJvZHkpO1xuXG4gICAgICAgICAgICBhZGRCdXR0b25zKHRhcmdldCk7XG4gICAgICAgICAgICB2YXIgd2lkZ2V0ID0gY3JlYXRlV2lkZ2V0QW5kQmFja2dyb3VuZCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpOyAvLycjZGVlMGUyJ1xuICAgICAgICAgICAgdmFyIHBsb3RXaW5kb3cgPSBjcmVhdGVQbG90Q29udGFpbmVyKHdpZGdldCwgcGxvdElELCBwbG90V2luZG93V2lkdGgsIHBsb3RXaW5kb3dIZWlnaHQsIHBsb3RXaW5kb3dYLCBwbG90V2luZG93WSk7XG4gICAgICAgICAgICBhZGRNdWx0aXBsZVBsb3RzVG9QYWdlKHBsb3RXaW5kb3csIHBsb3RJRHMpO1xuICAgICAgICAgICAgLy8gc2V0IGZpcnN0IHBsb3RJRCB0byBiZSB2aXNpYmxlXG4gICAgICAgICAgICBzaG93UGxvdChwbG90SURzWzBdKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2hvd1Bsb3Q6IHNob3dQbG90LFxuICAgICAgICBoaWRlUGxvdDogaGlkZVBsb3QsXG4gICAgfVxufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuc2V0dXAgPSBzZXR1cDsiLCJ2YXIgc2VsZWN0b3JzID0ge1xuICAgIGlkczoge1xuICAgICAgICB3aWRnZXQ6ICd3aWRnZXQnLFxuICAgICAgICBwbG90OiAncGxvdCcsXG4gICAgICAgIGdyb3VwOiBmdW5jdGlvbiAocGxvdElELCBsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHBsb3RJRCtcIi1ncm91cC1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgICAgICBzdmdMYXllcjogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItc3ZnLWxheWVyXCIrbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNlbGVjdG9ycyA9IHNlbGVjdG9yczsiLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBlZGl0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubGF5ZXI7XG4gICAgdGhpcy5wbG90O1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMubGF5ZXIobGV2ZWwpKTtcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNmb3JtYXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdmFyIHRyYW5zZm9ybWF0aW9ucyA9IHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG4gICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgdHJhbnNsYXRlLnNldFRyYW5zbGF0ZSgwLCAwKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHRyYW5zbGF0ZSwgMCk7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICBzY2FsZS5zZXRTY2FsZSgxLjAsIDEuMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZShzY2FsZSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggIT09IDIpIHRocm93IFwiZWRpdFNWRzogZXhwZWN0ZWQgdHJhbnNmb3JtYXRpb25zIHRvIGJlIGEgbGlzdCBvZiBsZW5ndGggMi5cIjtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDApLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMSkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIFwiZWRpdFNWRzogdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzaGlmdFgsIHNoaWZ0WSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgaWYgKCghc2hpZnRYIHx8ICFzaGlmdFkpICYmIChzaGlmdFggIT0gMCAmJiBzaGlmdFkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCB0cmFuc2xhdGUgU1ZHIG9iamVjdCB3aXRoIG51bGwsIHVuZGVmaW5lZCwgb3IgZW1wdHkgc2hpZnQgdmFsdWVzLiBzaGlmdFg6IFwiK3NoaWZ0WCtcIiBzaGlmdFk6XCIrc2hpZnRZKTtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMCk7XG4gICAgaWYgKHRyYW5zbGF0aW9uLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgIHRyYW5zbGF0aW9uLnNldFRyYW5zbGF0ZShzaGlmdFgsIHNoaWZ0WSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwib3BhY2l0eVwiLCBvcGFjaXR5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJpbGVcIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qXG5UZXN0XG5cbnZhciBsMiA9IG5ldyBlZGl0U1ZHKCkuc2V0KDIpO1xuXG52YXIgeCA9IGwyLnRyYW5zZm9ybWF0aW9ucygpOyBcbi8vIGNoZWNrIHRyYW5zbGF0ZVxueC5nZXRJdGVtKDApLm1hdHJpeC5lOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAwXG54LmdldEl0ZW0oMCkubWF0cml4LmY7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbi8vIGNoZWNrIHNjYWxlXG54LmdldEl0ZW0oMSkubWF0cml4LmE7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDFcbnguZ2V0SXRlbSgxKS5tYXRyaXguZDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxuLy8gY2hlY2sgbGVuZ3RoXG54Lmxlbmd0aCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDJcblxubDIudHJhbnNsYXRlKDUwLCA1MCk7XG5cbmwyLnNjYWxlKC41LCAuNSk7XG5cbmwyLmZhZGUoLjUpO1xuXG5sMi5oaWRlKCk7XG5cbmwyLnNob3coKTtcbiovXG5cbm1vZHVsZS5leHBvcnRzLmVkaXRTVkcgPSBlZGl0U1ZHOyIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uL3V0aWxzL3V0aWxzLmpzJykudXRpbHM7XG5cbnZhciB0YWcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbn07XG5cbnRhZy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgIGlmICh0aGlzLmVsZW1lbnQgIT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuc2V0KCkgY2Fubm90IG92ZXJyaWRlIG5vbi1udWxsIGVsZW1lbnQgd2l0aCBuZXcgZWxlbWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICByZXR1cm4gdGhpcztcbn1cblxudGFnLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmNyZWF0ZSgpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0eXBlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuY3JlYXRlTlMgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmNyZWF0ZU5TKCkgbXVzdCBoYXZlIGEgYHR5cGVgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCB0eXBlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChpZCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnNlbGVjdCgpIG11c3QgaGF2ZSBhbiBgaWRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoYXR0cikgfHwgdXRpbHMubnVsbE9yVW5kZWZpbmVkKHZhbHVlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYXR0cmlidXRlKCkgbXVzdCBoYXZlIGBhdHRyYCBhbmQgYHZhbHVlYCBhcmd1bWVudHMuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsdWUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKGNoaWxkKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYXBwZW5kKCkgbXVzdCBoYXZlIGEgYGNoaWxkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5wbGFjZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnBsYWNlKCkgbXVzdCBoYXZlIGEgYHBhcmVudGAgYXJndW1lbnQuXCIpO1xuICAgIHBhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnJlbW92ZSgpIG11c3QgaGF2ZSBhIGBwYXJlbnRgIGFyZ3VtZW50LlwiKTtcbiAgICBwYXJlbnQuZWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xufTtcblxudGFnLnByb3RvdHlwZS5hZGRIUkVGID0gZnVuY3Rpb24gKGhyZWYpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKGhyZWYpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hZGRIUkVGKCkgbXVzdCBoYXZlIGEgYGhyZWZgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnRhZyA9IHRhZztcbiIsInZhciBzY2hlbWEgPSB7XG4gICAgY2hlY2s6IGZ1bmN0aW9uIChvYmplY3QsIGtleXMpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iamVjdCkubGVuZ3RoICE9IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaW5kZXggaW4ga2V5cykge1xuICAgICAgICAgICAgaWYgKCEoa2V5c1tpbmRleF0gaW4gb2JqZWN0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIHh5OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3gnLCAneSddKTtcbiAgICB9LFxuICAgIGRpbWVuc2lvbnM6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsnd2lkdGgnLCAnaGVpZ2h0J10pO1xuICAgIH0sXG4gICAgcG9pbnQ6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS54eShvYmplY3QpO1xuICAgIH0sXG4gICAgc2NhbGU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS54eShvYmplY3QpO1xuICAgIH0sXG4gICAgbGF5ZXI6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsnbGV2ZWwnLCAndG9wTGVmdCcsICdzY2FsZScsICdvcGFjaXR5J10pXG4gICAgICAgICAgICAmJiBzY2hlbWEucG9pbnQob2JqZWN0Wyd0b3BMZWZ0J10pXG4gICAgICAgICAgICAmJiBzY2hlbWEuc2NhbGUob2JqZWN0WydzY2FsZSddKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuc2NoZW1hID0gc2NoZW1hOyIsInZhciB1dGlscyA9IHtcbiAgICBudWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJ1bmRlZmluZWRcIiB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMudXRpbHMgPSB1dGlsczsiXX0=
