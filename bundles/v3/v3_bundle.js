(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

var handlers = {
    callGUI: function () {
        //var plotID = plot.getPlotID();
        //var visiblesAndHiddens = plot.getInfoForGUI();
        //gui.render(plotID, visiblesAndHiddens[0], visiblesAndHiddens[1]);
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

    searchPlots: function () {
        console.log("searchPlots");
        var searchText = $('#searchbar').val();
        var plotName = false;
        var plotsByName = plot.getPlotsByName();
        if (plotsByName[searchText]) {
            plotName = searchText;
        }
        if (plotName) {
            // change plot!
            console.log('changing plots');
            var oldPlotID = plot.getPlotID();
            plot.switchPlots(plotName);
            gui.hide(oldPlotID);
            handlers.callGUI();
        }
    },


    /*return {
        listenForDrag: listenForDrag,
        onWheel: onWheel,
        onButtonClickZoomIn: onButtonClickZoomIn,
        onButtonClickZoomOut: onButtonClickZoomOut,
    };*/
};

module.exports.handlers = handlers;
},{"../plot/plot.js":3,"../ui/gui.js":6}],2:[function(require,module,exports){
var setup = require('../ui/setup.js').setup;
var layers = require('../ui/layers.js').layers;
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;
var handlers = require('../handlers/handlers.js').handlers;
require('../searchbar/searchbar.js');

var main = (function () {

    function init(widgetID, plotID, currentPlot) {
        // setup page
        setup.init(widgetID, 1124, 350, 'white', plotID, 1024, 256, 50, 30);

        // setup image layers
        layers.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
        layers.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 256, 256);
        layers.showPlot(currentPlot);

        // setup model
        plot.addPlotByName('caffeine_consumption', '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 2, 7);
        plot.addPlotByName('standing_height', '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 2, 8);
        /*plot.setPlotID(currentPlot);
        plot.setMinMaxLevel(2, 7);
        plot.initializeVisible(2, { width: 1024, height: 256 });
        var width = 1024;
        for (var i = 3; i < 7 + 1; i++) {
            width = width * 2;
            plot.initializeHidden(i, { width: width, height: 256 });
        }*/
        plot.switchPlots(currentPlot);

        // intial rendering
        gui.render(plot.getInfoForGUI());

        // setup listeners
        console.log("setting up listeners");
        handlers.listenForDrag(document.getElementById('plot'));
        document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
        document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
        document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);
        // enter key inside searchbox
        $('.ui.search').on('keypress', function (e) {
            if (e.keyCode == 13) {
                e.preventDefault();
                console.log("keypress");
                handlers.searchPlots();
            }
        });

        // search icon click 
        $('.fa.fa-search.w3-large').click(function (e) {
            e.preventDefault();
            handlers.searchPlots();
        });

    };

    return {
        init: init
    };
}());

main.init('widget', 'plot', 'standing_height');
},{"../handlers/handlers.js":1,"../plot/plot.js":3,"../searchbar/searchbar.js":5,"../ui/gui.js":6,"../ui/layers.js":7,"../ui/setup.js":8}],3:[function(require,module,exports){
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
},{"../plot/position.js":4,"../utils/schema.js":12}],4:[function(require,module,exports){
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
var plotNames = [
    { title: 'caffeine_consumption', description: 'caffeine consumption' },
    { title: 'standing_height', description: 'height' }
];

// semantic ui interface
$('.ui.search').search({
    source: plotNames,
});




},{}],6:[function(require,module,exports){
var editSVG = require('./ui_utils/svg.js').editSVG;
var schema = require('../utils/schema.js').schema;
var tag = require('../ui/ui_utils/tag.js').tag;

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
},{"../ui/ui_utils/tag.js":11,"../utils/schema.js":12,"./ui_utils/svg.js":10}],7:[function(require,module,exports){
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
},{"./ui_utils/selectors.js":9,"./ui_utils/tag.js":11}],8:[function(require,module,exports){
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
       //addButton('searchbar', '', 'text', 'search').attribute('placeholder', 'Search for phenotypes...');
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
            .attribute('stroke','#e3e7ed')
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

    return {
        init: function (widgetID, width, height, backgroundColor, plotID, 
            plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY) {
            // target for where to insert elements (make sure they are before the <script>!!!)
            target = new tag().select('widget-div');

            addButtons(target);
            var widget = createWidgetAndBackground(target, widgetID, width, height, backgroundColor); //'#dee0e2'
            var plotWindow = createPlotContainer(widget, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY);
        },
    }
}());

module.exports.setup = setup;
},{"./ui_utils/tag.js":11}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    if (!this.innerContainer) throw ('editSVG: innerContainer must be initialized');
    return [this.innerContainer.getBBox().width, this.innerContainer.getBBox().height];
}

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
},{"./selectors.js":9}],11:[function(require,module,exports){
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

},{"../../utils/utils.js":13}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjMvc3JjL2hhbmRsZXJzL2hhbmRsZXJzLmpzIiwic2NyaXB0cy92My9zcmMvbWFpbi9tYWluLmpzIiwic2NyaXB0cy92My9zcmMvcGxvdC9wbG90LmpzIiwic2NyaXB0cy92My9zcmMvcGxvdC9wb3NpdGlvbi5qcyIsInNjcmlwdHMvdjMvc3JjL3NlYXJjaGJhci9zZWFyY2hiYXIuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9ndWkuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9sYXllcnMuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9zZXR1cC5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3NlbGVjdG9ycy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3N2Zy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3RhZy5qcyIsInNjcmlwdHMvdjMvc3JjL3V0aWxzL3NjaGVtYS5qcyIsInNjcmlwdHMvdjMvc3JjL3V0aWxzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsInZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuLi91aS9ndWkuanMnKS5ndWk7XG5cbnZhciBoYW5kbGVycyA9IHtcbiAgICBjYWxsR1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vdmFyIHBsb3RJRCA9IHBsb3QuZ2V0UGxvdElEKCk7XG4gICAgICAgIC8vdmFyIHZpc2libGVzQW5kSGlkZGVucyA9IHBsb3QuZ2V0SW5mb0ZvckdVSSgpO1xuICAgICAgICAvL2d1aS5yZW5kZXIocGxvdElELCB2aXNpYmxlc0FuZEhpZGRlbnNbMF0sIHZpc2libGVzQW5kSGlkZGVuc1sxXSk7XG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgIH0sXG5cbiAgICBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0OiBmdW5jdGlvbiAobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBsaXN0ZW5Gb3JEcmFnOiBmdW5jdGlvbiAoc3ZnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibGlzdGVuRm9yRHJhZ1wiKTtcbiAgICAgICAgdmFyIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgLy92YXIgc3ZnID0gZXZ0LnRhcmdldDtcblxuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYmVnaW5EcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnLCBmYWxzZSk7XG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZywgZmFsc2UpO1xuXG4gICAgICAgIHZhciBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJzLmdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYmVnaW5EcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImJlZ2luRHJhZ1wiKTtcbiAgICAgICAgICAgIGlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZyA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZHJhZyhldnQpIHtcbiAgICAgICAgICAgIGlmIChpc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RyYWdnaW5nJyk7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRNb3VzZVBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldnQpO1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VJbk1vdXNlUG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnggLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS54LFxuICAgICAgICAgICAgICAgICAgICB5OiBjdXJyZW50TW91c2VQb3NpdGlvbi55IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueSxcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcGxvdC5kcmFnKGNoYW5nZUluTW91c2VQb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuXG4gICAgICAgICAgICAgICAgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUgPSBjdXJyZW50TW91c2VQb3NpdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVuZERyYWcoZXZ0KSB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBvbldoZWVsOiBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgaG9yaXpvbnRhbCA9IGV2dC5kZWx0YVg7XG4gICAgICAgIHZhciB2ZXJ0aWNhbCA9IGV2dC5kZWx0YVk7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKHZlcnRpY2FsKSA+PSBNYXRoLmFicyhob3Jpem9udGFsKSkge1xuICAgICAgICAgICAgdmFyIHN2ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKTtcbiAgICAgICAgICAgIHZhciBtb3VzZVBvcyA9IGhhbmRsZXJzLmdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgICAgICAgICAgcGxvdC56b29tKG1vdXNlUG9zLCB2ZXJ0aWNhbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwbG90LmRyYWcoeyB4OiBob3Jpem9udGFsLCB5OiAwIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgIH0sXG5cbiAgICBvbkJ1dHRvbkNsaWNrWm9vbUluOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIC01KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAocGxvdC5zbmFwSW4oeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxuXG4gICAgb25CdXR0b25DbGlja1pvb21PdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzbmFwIHpvb20gb3V0XCIpO1xuXG4gICAgICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIDUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxuXG4gICAgc2VhcmNoUGxvdHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJzZWFyY2hQbG90c1wiKTtcbiAgICAgICAgdmFyIHNlYXJjaFRleHQgPSAkKCcjc2VhcmNoYmFyJykudmFsKCk7XG4gICAgICAgIHZhciBwbG90TmFtZSA9IGZhbHNlO1xuICAgICAgICB2YXIgcGxvdHNCeU5hbWUgPSBwbG90LmdldFBsb3RzQnlOYW1lKCk7XG4gICAgICAgIGlmIChwbG90c0J5TmFtZVtzZWFyY2hUZXh0XSkge1xuICAgICAgICAgICAgcGxvdE5hbWUgPSBzZWFyY2hUZXh0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChwbG90TmFtZSkge1xuICAgICAgICAgICAgLy8gY2hhbmdlIHBsb3QhXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY2hhbmdpbmcgcGxvdHMnKTtcbiAgICAgICAgICAgIHZhciBvbGRQbG90SUQgPSBwbG90LmdldFBsb3RJRCgpO1xuICAgICAgICAgICAgcGxvdC5zd2l0Y2hQbG90cyhwbG90TmFtZSk7XG4gICAgICAgICAgICBndWkuaGlkZShvbGRQbG90SUQpO1xuICAgICAgICAgICAgaGFuZGxlcnMuY2FsbEdVSSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuXG4gICAgLypyZXR1cm4ge1xuICAgICAgICBsaXN0ZW5Gb3JEcmFnOiBsaXN0ZW5Gb3JEcmFnLFxuICAgICAgICBvbldoZWVsOiBvbldoZWVsLFxuICAgICAgICBvbkJ1dHRvbkNsaWNrWm9vbUluOiBvbkJ1dHRvbkNsaWNrWm9vbUluLFxuICAgICAgICBvbkJ1dHRvbkNsaWNrWm9vbU91dDogb25CdXR0b25DbGlja1pvb21PdXQsXG4gICAgfTsqL1xufTtcblxubW9kdWxlLmV4cG9ydHMuaGFuZGxlcnMgPSBoYW5kbGVyczsiLCJ2YXIgc2V0dXAgPSByZXF1aXJlKCcuLi91aS9zZXR1cC5qcycpLnNldHVwO1xudmFyIGxheWVycyA9IHJlcXVpcmUoJy4uL3VpL2xheWVycy5qcycpLmxheWVycztcbnZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuLi91aS9ndWkuanMnKS5ndWk7XG52YXIgaGFuZGxlcnMgPSByZXF1aXJlKCcuLi9oYW5kbGVycy9oYW5kbGVycy5qcycpLmhhbmRsZXJzO1xucmVxdWlyZSgnLi4vc2VhcmNoYmFyL3NlYXJjaGJhci5qcycpO1xuXG52YXIgbWFpbiA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBpbml0KHdpZGdldElELCBwbG90SUQsIGN1cnJlbnRQbG90KSB7XG4gICAgICAgIC8vIHNldHVwIHBhZ2VcbiAgICAgICAgc2V0dXAuaW5pdCh3aWRnZXRJRCwgMTEyNCwgMzUwLCAnd2hpdGUnLCBwbG90SUQsIDEwMjQsIDI1NiwgNTAsIDMwKTtcblxuICAgICAgICAvLyBzZXR1cCBpbWFnZSBsYXllcnNcbiAgICAgICAgbGF5ZXJzLmluc2VydFBsb3RJbWFnZXMoJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMiwgNywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHMvY2FmZmVpbmVfY29uc3VtcHRpb24nLCAyNTYsIDI1Nik7XG4gICAgICAgIGxheWVycy5pbnNlcnRQbG90SW1hZ2VzKCdzdGFuZGluZ19oZWlnaHQnLCAyLCA4LCAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9zdGFuZGluZ19oZWlnaHRfcGxvdHMvc3RhbmRpbmdfaGVpZ2h0JywgMjU2LCAyNTYpO1xuICAgICAgICBsYXllcnMuc2hvd1Bsb3QoY3VycmVudFBsb3QpO1xuXG4gICAgICAgIC8vIHNldHVwIG1vZGVsXG4gICAgICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnY2FmZmVpbmVfY29uc3VtcHRpb24nLCAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDcpO1xuICAgICAgICBwbG90LmFkZFBsb3RCeU5hbWUoJ3N0YW5kaW5nX2hlaWdodCcsICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLCAyLCA4KTtcbiAgICAgICAgLypwbG90LnNldFBsb3RJRChjdXJyZW50UGxvdCk7XG4gICAgICAgIHBsb3Quc2V0TWluTWF4TGV2ZWwoMiwgNyk7XG4gICAgICAgIHBsb3QuaW5pdGlhbGl6ZVZpc2libGUoMiwgeyB3aWR0aDogMTAyNCwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIHZhciB3aWR0aCA9IDEwMjQ7XG4gICAgICAgIGZvciAodmFyIGkgPSAzOyBpIDwgNyArIDE7IGkrKykge1xuICAgICAgICAgICAgd2lkdGggPSB3aWR0aCAqIDI7XG4gICAgICAgICAgICBwbG90LmluaXRpYWxpemVIaWRkZW4oaSwgeyB3aWR0aDogd2lkdGgsIGhlaWdodDogMjU2IH0pO1xuICAgICAgICB9Ki9cbiAgICAgICAgcGxvdC5zd2l0Y2hQbG90cyhjdXJyZW50UGxvdCk7XG5cbiAgICAgICAgLy8gaW50aWFsIHJlbmRlcmluZ1xuICAgICAgICBndWkucmVuZGVyKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcblxuICAgICAgICAvLyBzZXR1cCBsaXN0ZW5lcnNcbiAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIHVwIGxpc3RlbmVyc1wiKTtcbiAgICAgICAgaGFuZGxlcnMubGlzdGVuRm9yRHJhZyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBoYW5kbGVycy5vbldoZWVsKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLWluLWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlcnMub25CdXR0b25DbGlja1pvb21Jbik7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1vdXQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbU91dCk7XG4gICAgICAgIC8vIGVudGVyIGtleSBpbnNpZGUgc2VhcmNoYm94XG4gICAgICAgICQoJy51aS5zZWFyY2gnKS5vbigna2V5cHJlc3MnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImtleXByZXNzXCIpO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJzLnNlYXJjaFBsb3RzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNlYXJjaCBpY29uIGNsaWNrIFxuICAgICAgICAkKCcuZmEuZmEtc2VhcmNoLnczLWxhcmdlJykuY2xpY2soZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGhhbmRsZXJzLnNlYXJjaFBsb3RzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGluaXQ6IGluaXRcbiAgICB9O1xufSgpKTtcblxubWFpbi5pbml0KCd3aWRnZXQnLCAncGxvdCcsICdzdGFuZGluZ19oZWlnaHQnKTsiLCJ2YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vdXRpbHMvc2NoZW1hLmpzJykuc2NoZW1hO1xudmFyIHBvc2l0aW9uID0gcmVxdWlyZShcIi4uL3Bsb3QvcG9zaXRpb24uanNcIikucG9zaXRpb247XG5cbnZhciBwbG90ID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGxvdHNCeU5hbWUgPSB7XG4gICAgICAgIC8vIFRPRE86IHNob3VsZCBjaGVjayBmb2xkZXJzIGV4aXN0IHdoZW4gaW5pdGlhbGl6aW5nXG4gICAgICAgIC8vJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJzoge3VybDogJy9wYXRoL2hlcmUvJywgbWluWm9vbTogMiwgbWF4Wm9vbTogN30sXG4gICAgICAgIC8vJ3N0YW5kaW5nX2hlaWdodCcgOiB7dXJsOiAnL3BhdGgvaGVyZS8nLCBtaW5ab29tOiAyLCBtYXhab29tOiA4fSxcbiAgICB9XG5cbiAgICB2YXIgcGxvdElEID0gbnVsbCxcbiAgICAgICAgbWluaW11bUxldmVsID0gbnVsbCxcbiAgICAgICAgbWF4aW11bUxldmVsID0gbnVsbCxcbiAgICAgICAgc2NhbGVGYWN0b3IgPSAxMDAwMCxcbiAgICAgICAgem9vbUluY3JlbWVudCA9IDUsXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCA9IFs2MDAwLCA5MDAwXSxcbiAgICAgICAgc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbMTIwMDAsIDE4MDAwXSxcbiAgICAgICAgdmlzaWJsZXMgPSB7fSxcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pLFxuICAgICAgICBkaW1lbnNpb25zID0ge307XG5cbiAgICBmdW5jdGlvbiBnZXRQbG90c0J5TmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHBsb3RzQnlOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVWaXNpYmxlKGxldmVsLCBkaW1zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IG1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IG1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCB2aXNpYmxlIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogc2NhbGVGYWN0b3IsIHk6IDEgKiBzY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZUhpZGRlbihsZXZlbCwgZGltcykge1xuICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFBsb3RCeU5hbWUobmFtZSwgdXJsLCBtaW5ab29tLCBtYXhab29tKSB7XG4gICAgICAgIHBsb3RzQnlOYW1lW25hbWVdID0geyB1cmw6IHVybCwgbWluWm9vbTogbWluWm9vbSwgbWF4Wm9vbTogbWF4Wm9vbSB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN3aXRjaFBsb3RzKG5hbWUpIHtcbiAgICAgICAgcmVzZXQoKTtcbiAgICAgICAgcGxvdElEID0gbmFtZTtcbiAgICAgICAgdmFyIG1pblpvb20gPSBwbG90c0J5TmFtZVtuYW1lXS5taW5ab29tLFxuICAgICAgICAgICAgbWF4Wm9vbSA9IHBsb3RzQnlOYW1lW25hbWVdLm1heFpvb207XG4gICAgICAgIHNldE1pbk1heExldmVsKG1pblpvb20sIG1heFpvb20pO1xuXG4gICAgICAgIC8vIHdpZHRoIGFuZCBoZWlnaHQgb2YgcGxvdHMgY3VycmVudGx5IG5vdCBmbGV4aWJsZSBoZXJlXG4gICAgICAgIHZhciBuQ29scyA9IGZ1bmN0aW9uICh6KSB7IHJldHVybiBNYXRoLnBvdygyLCB6KTsgfVxuICAgICAgICBpbml0aWFsaXplVmlzaWJsZShtaW5ab29tLCB7IHdpZHRoOiBuQ29scyhtaW5ab29tKSAqIDI1NiwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIC8vdmFyIHdpZHRoID0gMTAyNDtcbiAgICAgICAgZm9yICh2YXIgaSA9IG1pblpvb20gKyAxOyBpIDwgbWF4Wm9vbSArIDE7IGkrKykge1xuICAgICAgICAgICAgLy93aWR0aCA9IHdpZHRoICogMjtcbiAgICAgICAgICAgIGluaXRpYWxpemVIaWRkZW4oaSwgeyB3aWR0aDogbkNvbHMoaSkgKiAyNTYsIGhlaWdodDogMjU2IH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGltZW5zaW9ucygpIHtcbiAgICAgICAgcmV0dXJuIGRpbWVuc2lvbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHBsb3RJRCA9IG51bGw7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1pbk1heExldmVsKG1pbiwgbWF4KSB7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG1pbjtcbiAgICAgICAgbWF4aW11bUxldmVsID0gbWF4O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuaXRTY2FsZShzY2FsZSkge1xuICAgICAgICBpZiAoKHNjYWxlLnggPiAuNSAmJiBzY2FsZS54IDwgMikgfHwgKHNjYWxlLnkgPiAuNSAmJiBzY2FsZS55IDwgMikpIHRocm93IG5ldyBFcnJvcignc2NhbGUgYWxyZWFkeSBpbiB1bml0IHNjYWxlJyk7XG4gICAgICAgIHJldHVybiB7IHg6IHNjYWxlLnggLyBzY2FsZUZhY3RvciwgeTogc2NhbGUueSAvIHNjYWxlRmFjdG9yIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvdyhsZXZlbCwgdG9wTGVmdCwgc2NhbGUsIG9wYWNpdHkpIHtcbiAgICAgICAgaWYgKCFoaWRkZW5zLmhhcyhsZXZlbCkpIHRocm93IFwiVHJpZWQgdG8gc2hvdyBhIGxldmVsIHRoYXQgd2FzIG5vdCBoaWRkZW4uXCI7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB0b3BMZWZ0LCBzY2FsZTogc2NhbGUsIG9wYWNpdHk6IG9wYWNpdHkgfTtcbiAgICAgICAgaGlkZGVucy5kZWxldGUobGV2ZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhpZGUobGV2ZWwpIHtcbiAgICAgICAgaWYgKCF2aXNpYmxlc1tsZXZlbF0pIHRocm93IFwiVHJpZWQgdG8gaGlkZSBhIGxldmVsIHRoYXQgaXMgbm90IHZpc2libGVcIjtcbiAgICAgICAgZGVsZXRlIHZpc2libGVzW2xldmVsXTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBzY2FsZS54O1xuICAgICAgICBpZiAoeFNjYWxlIDwgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGhpZ2hlciB6b29tIGxldmVsIChvbiB0b3AgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIG1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMCwgMV0pO1xuICAgICAgICB9IC8qZWxzZSBpZiAoeFNjYWxlID4gcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBsb3dlciB6b29tIGxldmVsIChiZWxvdyBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gcGxvdC5tYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsxLCAwXSk7XG4gICAgICAgIH0qLyBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWFwVmFsdWVPbnRvUmFuZ2UodmFsdWUsIG9sZFJhbmdlLCBuZXdSYW5nZSkge1xuICAgICAgICB2YXIgb2xkU3BhbiA9IG9sZFJhbmdlWzFdIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBuZXdTcGFuID0gbmV3UmFuZ2VbMV0gLSBuZXdSYW5nZVswXTtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9WYWx1ZSA9IHZhbHVlIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBwZXJjZW50U3BhblRvVmFsdWUgPSBkaXN0YW5jZVRvVmFsdWUgLyBvbGRTcGFuO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb05ld1ZhbHVlID0gcGVyY2VudFNwYW5Ub1ZhbHVlICogbmV3U3BhbjtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmV3UmFuZ2VbMF0gKyBkaXN0YW5jZVRvTmV3VmFsdWU7XG4gICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvc2l0aW9uKG5ld1RvcExlZnQpIHtcbiAgICAgICAgaWYgKCghbmV3VG9wTGVmdC54ICYmIG5ld1RvcExlZnQueCAhPSAwKSB8fCAoIW5ld1RvcExlZnQueSAmJiBuZXdUb3BMZWZ0LnkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImJhZCBuZXcgVG9wIExlZnQ6IFtcIiArIG5ld1RvcExlZnQueCArIFwiLCBcIiArIG5ld1RvcExlZnQueSArIFwiXVwiKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQgPSBuZXdUb3BMZWZ0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXRPcGFjaXRpZXMoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5vcGFjaXR5ID0gY2FsY3VsYXRlT3BhY2l0eSh2aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHNldFBsb3RJRDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICBwbG90SUQgPSBpZDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SW5mb0ZvckdVSTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZlZpc2libGVzID0gT2JqZWN0LmtleXModmlzaWJsZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBzY2FsZSBmb3IgcGFzc2luZyB0byBHVUk6IFxuICAgICAgICAgICAgICAgIHZhciBndWlMYXllciA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IHZpc2libGVzW2tleV0ubGV2ZWwsXG4gICAgICAgICAgICAgICAgICAgIHRvcExlZnQ6IHZpc2libGVzW2tleV0udG9wTGVmdCxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHVuaXRTY2FsZSh2aXNpYmxlc1trZXldLnNjYWxlKSxcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogdmlzaWJsZXNba2V5XS5vcGFjaXR5LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGd1aUxheWVyO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbGlzdE9mSGlkZGVucyA9IEFycmF5LmZyb20oaGlkZGVucyk7XG4gICAgICAgICAgICAvL3JldHVybiBbbGlzdE9mVmlzaWJsZXMsIGxpc3RPZkhpZGRlbnNdO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwbG90SUQ6IHBsb3RJRCxcbiAgICAgICAgICAgICAgICB2aXNpYmxlTGF5ZXJzOiBsaXN0T2ZWaXNpYmxlcyxcbiAgICAgICAgICAgICAgICBoaWRkZW5MZXZlbHM6IGxpc3RPZkhpZGRlbnMsXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uczogZ2V0RGltZW5zaW9ucygpLFxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRQbG90SUQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQ7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlOiBpbml0aWFsaXplVmlzaWJsZSwgXG4gICAgICAgIGluaXRpYWxpemVIaWRkZW46IGluaXRpYWxpemVIaWRkZW4sXG4gICAgICAgIGNsZWFyRm9yVGVzdGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gVE9ETzogYmV0dGVyIHdheSB0byBjbGVhciBzaW5nbGV0b24gZm9yIHRlc3Rpbmc/XG4gICAgICAgICAgICB2aXNpYmxlcyA9IHt9O1xuICAgICAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pO1xuICAgICAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgICAgICB9LFxuICAgICAgICBnZXRWaXNpYmxlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZpc2libGVzO1xuICAgICAgICB9LFxuICAgICAgICBnZXRIaWRkZW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaGlkZGVucztcbiAgICAgICAgfSxcblxuICAgICAgICBpbmNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDwgc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID49IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpICsgMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPD0gbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSwgeTogMSAqIHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVjcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5ID09IG1pbmltdW1MZXZlbCAmJiB2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8PSBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0gJiYga2V5ID4gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPj0gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdLCB5OiBzY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHpvb206IGZ1bmN0aW9uIChmb2N1cywgdmVydGljYWwpIHtcblxuICAgICAgICAgICAgdmFyIGZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgICAgIGZpcnN0ID0gdmlzaWJsZXNbZmlyc3RLZXldLFxuICAgICAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0ID0gZGltZW5zaW9uc1tmaXJzdEtleV0uaGVpZ2h0O1xuXG4gICAgICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgdW5pdFNjYWxlKGZpcnN0LnNjYWxlKSwgd2lkdGgsIGhlaWdodCk7XG5cbiAgICAgICAgICAgIHZhciBob3dNdWNoID0gTWF0aC5mbG9vcihNYXRoLmFicyh2ZXJ0aWNhbCkgLyA1KTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG93TXVjaDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZlcnRpY2FsIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBuZXdGaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgICAgICBuZXdGaXJzdCA9IHZpc2libGVzW25ld0ZpcnN0S2V5XSxcbiAgICAgICAgICAgICAgICBuZXdXaWR0aCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgICAgIG5ld0hlaWdodCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICAgICAgdmFyIG5ld1RvcExlZnQgPSBwb3NpdGlvbi5wZXJjZW50YWdlVG9Ub3BMZWZ0KGZvY3VzLCBwZXJjZW50YWdlQ29vcmRpbmF0ZXMsIHVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICAgICAgcmVwb3NpdGlvbihuZXdUb3BMZWZ0KTtcbiAgICAgICAgICAgIHJlc2V0T3BhY2l0aWVzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNuYXBJbjogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNuYXBPdXQ6IGZ1bmN0aW9uIChmb2N1cykge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcyk7XG4gICAgICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRyYWc6IGZ1bmN0aW9uIChjaGFuZ2VJblBvc2l0aW9uKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldE1pbk1heExldmVsOiBzZXRNaW5NYXhMZXZlbCxcbiAgICAgICAgcmVzZXQ6IHJlc2V0LFxuICAgICAgICBhZGRQbG90QnlOYW1lOiBhZGRQbG90QnlOYW1lLFxuICAgICAgICBzd2l0Y2hQbG90czogc3dpdGNoUGxvdHMsXG4gICAgICAgIGdldERpbWVuc2lvbnM6IGdldERpbWVuc2lvbnMsXG4gICAgICAgIGdldFBsb3RzQnlOYW1lOiBnZXRQbG90c0J5TmFtZSxcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMucGxvdCA9IHBsb3Q7IiwidmFyIHBvc2l0aW9uID0ge1xuICAgIGNhbGN1bGF0ZVBlcmNlbnQ6IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBvc2l0aW9uQiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIGlmIChsZW5ndGhCIDw9IDApIHRocm93IG5ldyBFcnJvcihcIkxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlLlwiKTtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wb3NpdGlvbiA9IHBvc2l0aW9uOyIsInZhciBwbG90TmFtZXMgPSBbXG4gICAgeyB0aXRsZTogJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgZGVzY3JpcHRpb246ICdjYWZmZWluZSBjb25zdW1wdGlvbicgfSxcbiAgICB7IHRpdGxlOiAnc3RhbmRpbmdfaGVpZ2h0JywgZGVzY3JpcHRpb246ICdoZWlnaHQnIH1cbl07XG5cbi8vIHNlbWFudGljIHVpIGludGVyZmFjZVxuJCgnLnVpLnNlYXJjaCcpLnNlYXJjaCh7XG4gICAgc291cmNlOiBwbG90TmFtZXMsXG59KTtcblxuXG5cbiIsInZhciBlZGl0U1ZHID0gcmVxdWlyZSgnLi91aV91dGlscy9zdmcuanMnKS5lZGl0U1ZHO1xudmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciB0YWcgPSByZXF1aXJlKCcuLi91aS91aV91dGlscy90YWcuanMnKS50YWc7XG5cbnZhciBndWkgPSB7XG4gICAgaGlkZTogZnVuY3Rpb24ocGxvdElEKSB7XG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICBzY2hlbWEuY2hlY2soYXJncywgWydwbG90SUQnLCAndmlzaWJsZUxheWVycycsICdoaWRkZW5MZXZlbHMnLCAnZGltZW5zaW9ucyddKTtcbiAgICAgICAgdmFyIHBsb3RJRCA9IGFyZ3MucGxvdElELFxuICAgICAgICAgICAgdmlzaWJsZUxheWVycyA9IGFyZ3MudmlzaWJsZUxheWVycyxcbiAgICAgICAgICAgIGhpZGRlbkxldmVscyA9IGFyZ3MuaGlkZGVuTGV2ZWxzLFxuICAgICAgICAgICAgZGltcyA9IGFyZ3MuZGltZW5zaW9ucztcblxuICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuXG4gICAgICAgIGlmICghKHZpc2libGVMYXllcnMubGVuZ3RoID4gMCAmJiB2aXNpYmxlTGF5ZXJzLmxlbmd0aCA8PSAyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBoYXZlIDEtMiB2aXNpYmxlIGxheWVycy5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBoaWRkZW5JbmRleCBpbiBoaWRkZW5MZXZlbHMpIHtcbiAgICAgICAgICAgIHZhciBsZXZlbCA9IGhpZGRlbkxldmVsc1toaWRkZW5JbmRleF07XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGxldmVsKSAhPSAnW29iamVjdCBOdW1iZXJdJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSSBFUlJPUjogZXhwZWN0ZWQgYSBsaXN0IG9mIG51bWJlcnMgZm9yIGhpZGRlbkxheWVycy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXcgZWRpdFNWRygpLnNldChwbG90SUQsIGxldmVsKS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciB2aXNpYmxlSW5kZXggaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmFyIGxheWVyID0gdmlzaWJsZUxheWVyc1t2aXNpYmxlSW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEubGF5ZXIobGF5ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGV4cGVjdGVkIGxheWVyIHNjaGVtYS5cIik7XG4gICAgICAgICAgICBpZiAobGF5ZXIuc2NhbGUueCA+IDIgfHwgbGF5ZXIuc2NhbGUueCA8IC41IHx8IGxheWVyLnNjYWxlLnkgPiAyIHx8IGxheWVyLnNjYWxlLnkgPCAuNSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSTogc2NhbGUgb3V0c2lkZSBbLjUsMl0gcmFuZ2UuIFNjYWxlIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gWy41LDJdIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gR1VJLiBbXCIgKyBsYXllci5zY2FsZS54ICsgXCIsIFwiICsgbGF5ZXIuc2NhbGUueSArIFwiXVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN2Z0J1bmRsZSA9IG5ldyBlZGl0U1ZHKCkuc2V0KHBsb3RJRCwgbGF5ZXIubGV2ZWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgZGltc0Zyb21QYWdlID0gc3ZnQnVuZGxlLmRpbWVuc2lvbnMoKTtcbiAgICAgICAgICAgIGlmICgoZGltc0Zyb21QYWdlWzBdICE9IGRpbXNbbGF5ZXIubGV2ZWxdLndpZHRoKSB8fCAoZGltc0Zyb21QYWdlWzFdICE9IGRpbXNbbGF5ZXIubGV2ZWxdLmhlaWdodCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGRpbWVuc2lvbnMgb2YgcGxvdCBvbiBwYWdlIGRvbid0IG1hdGNoIGRpbWVuc2lvbnMgb2YgcGxvdCBmcm9tIG1vZGVsXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdmdCdW5kbGVcbiAgICAgICAgICAgICAgICAudHJhbnNsYXRlKGxheWVyLnRvcExlZnQueCwgbGF5ZXIudG9wTGVmdC55KVxuICAgICAgICAgICAgICAgIC5zY2FsZShsYXllci5zY2FsZS54LCBsYXllci5zY2FsZS55KVxuICAgICAgICAgICAgICAgIC5mYWRlKGxheWVyLm9wYWNpdHkpXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aXNpYmxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBzY2FsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgb3BhY2l0eVN0cmluZyA9IFwiXCI7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5sZXZlbDtcbiAgICAgICAgICAgIHNjYWxlc1N0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5zY2FsZS54O1xuICAgICAgICAgICAgb3BhY2l0eVN0cmluZyArPSBcIiBcIiArIHZpc2libGVMYXllcnNba2V5XS5vcGFjaXR5O1xuICAgICAgICB9XG4gICAgICAgICQoXCIjem9vbS1kaXZcIikudGV4dCh2aXNpYmxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjZnJhY3Rpb25hbC16b29tLWRpdlwiKS50ZXh0KHNjYWxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjb3BhY2l0eS1kaXZcIikudGV4dChvcGFjaXR5U3RyaW5nKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuZ3VpID0gZ3VpOyIsInZhciB0YWcgPSByZXF1aXJlKCcuL3VpX3V0aWxzL3RhZy5qcycpLnRhZztcbnZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuL3VpX3V0aWxzL3NlbGVjdG9ycy5qcycpLnNlbGVjdG9ycztcblxudmFyIGxheWVycyA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gYWRkUGxvdFRvUGFnZSh0YXJnZXQsIHBsb3RJRCkge1xuICAgICAgICAvLyBhZGQgZyBmb3IgYSBzaW5nbGUgcGxvdCAocGhlbm90eXBlKSwgaGlkZGVuIHdpdGggZGlzcGxheT1ub25lXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJylcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgIH07XG5cbiAgICAvKiBwbGFjZSBhIHpvb20gbGF5ZXIgZ3JvdXAgPGc+PHN2Zz48L3N2Zz48L2c+IGluc2lkZSBhIHBsb3QncyA8c3ZnPiAqL1xuICAgIGZ1bmN0aW9uIGFkZEdyb3VwKHBsb3RJRCwgbGV2ZWwsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIHBsb3QgPSBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCk7XG5cbiAgICAgICAgdmFyIGdyb3VwID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2cnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpXG4gICAgICAgICAgICAucGxhY2UocGxvdCk7XG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKHBsb3RJRCwgbGV2ZWwpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5wbGFjZShncm91cCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGFkZFRpbGUocGxvdElELCBsZXZlbCwgY29sdW1uLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciB0aWxlVVJMID0gdXJsICsgXCIvXCIgKyBsZXZlbCArIFwiL1wiICsgY29sdW1uICsgXCIucG5nXCI7XG5cbiAgICAgICAgdmFyIHggPSBjb2x1bW4gKiBpbWFnZVdpZHRoO1xuICAgICAgICB2YXIgeSA9IDA7XG4gICAgICAgIHZhciB3aWR0aCA9IGltYWdlV2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSBpbWFnZUhlaWdodDtcblxuICAgICAgICB2YXIgc3ZnID0gbmV3IHRhZygpLnNlbGVjdChzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKHBsb3RJRCwgbGV2ZWwpKTtcblxuICAgICAgICAvL2NyZWF0ZSB0aWxlXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdpbWFnZScpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd4JywgU3RyaW5nKHgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmFkZEhSRUYodGlsZVVSTClcbiAgICAgICAgICAgIC5wbGFjZShzdmcpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhZGRUaWxlcyhwbG90SUQsIGxldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgbGV2ZWwpO1xuICAgICAgICB2YXIgeCA9IDA7XG4gICAgICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgICAgICBhZGRUaWxlKHBsb3RJRCwgbGV2ZWwsIGMsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICAgICAgeCA9IHggKyAyNTY7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaW5zZXJ0UGxvdEltYWdlcyhwbG90SUQsIG1pbkxldmVsLCBtYXhMZXZlbCwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCkge1xuICAgICAgICAgICAgdmFyIHBsb3RDb250YWluZXIgPSBuZXcgdGFnKCkuc2VsZWN0KCdwbG90Jyk7XG4gICAgICAgICAgICBhZGRQbG90VG9QYWdlKHBsb3RDb250YWluZXIsIHBsb3RJRCk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbWluTGV2ZWw7IGk8bWF4TGV2ZWwrMTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBpKTtcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW5zICogaW1hZ2VXaWR0aDtcbiAgICAgICAgICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG4gICAgICAgICAgICAgICAgYWRkR3JvdXAocGxvdElELCBpLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBhZGRUaWxlcyhwbG90SUQsIGksIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzaG93UGxvdDogZnVuY3Rpb24gKHBsb3RJRCkge1xuICAgICAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdpbmxpbmUnKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGlkZVBsb3Q6ZnVuY3Rpb24gKHBsb3RJRCkge1xuICAgICAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgICAgIH1cbiAgICB9XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cy5sYXllcnMgPSBsYXllcnM7IiwiLyogSW5zZXJ0IEhUTUwgRE9NIGVsZW1lbnRzIGFuZCBTVkcgRE9NIGVsZW1lbnRzIGludG8gd2VicGFnZS5cblxuU3RydWN0dXJlXG5cbjxzdmc+IHdpZGdldCBzdmdcbiAgICA8cmVjdD4gYmFja2dyb3VuZCByZWN0YW5nbGUgZm9yIHdpZGdldCAoYW55IGNvbG9yKVxuICAgIDxzdmc+IHBsb3Qgc3ZnXG4gICAgICAgIDxyZWN0PiBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3IgcGxvdCAod2hpdGUpXG4gICAgICAgIDxzdmc+IHN2ZyBmb3IgcGhlbm90eXBlIDFcbiAgICAgICAgICAgIDxnPiBncm91cCBmb3IgZWFjaCB6b29tIGxheWVyXG4gICAgICAgICAgICAgICAgPHN2Zz4gc3ZnIHdpdGggd2lkdGggYW5kIGhlaWdodCBmb3IgdGhpcyBsYXllclxuICAgICAgICAgICAgICAgICAgICA8aW1hZ2U+IGltYWdlc1xuICAgICAgICAgICAgPGc+XG4gICAgICAgICAgICAgICAgLi4uXG4gICAgICAgIDxzdmc+IHN2ZyBmb3IgcGhlbm90eXBlIDJcbiAgICAgICAgICAgIC4uLlxuKi9cblxudmFyIHRhZyA9IHJlcXVpcmUoJy4vdWlfdXRpbHMvdGFnLmpzJykudGFnO1xuXG52YXIgc2V0dXAgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gYWRkQnV0dG9ucyh0YXJnZXQpIHtcblxuICAgICAgICBmdW5jdGlvbiBhZGRCdXR0b24oaWQsIF9jbGFzcywgdHlwZSwgbmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGFnKClcbiAgICAgICAgICAgICAgICAuY3JlYXRlKCdpbnB1dCcpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBpZClcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdjbGFzcycsIF9jbGFzcylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCd0eXBlJywgdHlwZSlcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCduYW1lJywgbmFtZSlcbiAgICAgICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcbiAgICAgICAgfTtcbiAgICAgICAvL2FkZEJ1dHRvbignc2VhcmNoYmFyJywgJycsICd0ZXh0JywgJ3NlYXJjaCcpLmF0dHJpYnV0ZSgncGxhY2Vob2xkZXInLCAnU2VhcmNoIGZvciBwaGVub3R5cGVzLi4uJyk7XG4gICAgICAgIGFkZEJ1dHRvbignem9vbS1pbi1idXR0b24nLCAnem9vbS1idXR0b24nLCAnYnV0dG9uJywgJ2luY3JlYXNlJykuYXR0cmlidXRlKCd2YWx1ZScsICcrJyk7XG4gICAgICAgIGFkZEJ1dHRvbignem9vbS1vdXQtYnV0dG9uJywgJ3pvb20tYnV0dG9uJywgJ2J1dHRvbicsJ2RlY3JlYXNlJykuYXR0cmlidXRlKCd2YWx1ZScsICctJyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVdpZGdldEFuZEJhY2tncm91bmQodGFyZ2V0LCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKSB7XG4gICAgICAgIC8vIGNyZWF0ZSB3aWRnZXQgYW5kIGFwcGVuZCBpdCB0byB0aGUgdGFyZ2V0XG4gICAgICAgIHZhciB3aWRnZXQgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgd2lkZ2V0SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBiYWNrZ3JvdW5kIGZvciBwbG90IHdpZGdldFxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygncmVjdCcpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2ZpbGwnLCBiYWNrZ3JvdW5kQ29sb3IpIC8vICcjZGVlMGUyJ1xuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnc3Ryb2tlJywnI2UzZTdlZCcpXG4gICAgICAgICAgICAucGxhY2Uod2lkZ2V0KTtcblxuICAgICAgICByZXR1cm4gd2lkZ2V0O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVQbG90Q29udGFpbmVyKHRhcmdldCwgcGxvdElELCB3aWR0aCwgaGVpZ2h0LCB4LCB5KSB7XG4gICAgICAgIC8vIGNyZWF0ZSBwbG90IGNvbnRhaW5lciAod2lkdGggYW5kIGhlaWdodCBkaWN0YXRlIHRoZSBzaXplIG9mIHRoZSB2aWV3aW5nIHdpbmRvdylcbiAgICAgICAgdmFyIHBsb3RXaW5kb3cgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCB4KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneScsIHkpXG4gICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcblxuICAgICAgICAvLyBjcmVhdGUgcGxvdCBiYWNrZ3JvdW5kXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdmaWxsJywgJ3doaXRlJylcbiAgICAgICAgICAgIC5wbGFjZShwbG90V2luZG93KTtcblxuICAgICAgICByZXR1cm4gcGxvdFdpbmRvdztcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IsIHBsb3RJRCwgXG4gICAgICAgICAgICBwbG90V2luZG93V2lkdGgsIHBsb3RXaW5kb3dIZWlnaHQsIHBsb3RXaW5kb3dYLCBwbG90V2luZG93WSkge1xuICAgICAgICAgICAgLy8gdGFyZ2V0IGZvciB3aGVyZSB0byBpbnNlcnQgZWxlbWVudHMgKG1ha2Ugc3VyZSB0aGV5IGFyZSBiZWZvcmUgdGhlIDxzY3JpcHQ+ISEhKVxuICAgICAgICAgICAgdGFyZ2V0ID0gbmV3IHRhZygpLnNlbGVjdCgnd2lkZ2V0LWRpdicpO1xuXG4gICAgICAgICAgICBhZGRCdXR0b25zKHRhcmdldCk7XG4gICAgICAgICAgICB2YXIgd2lkZ2V0ID0gY3JlYXRlV2lkZ2V0QW5kQmFja2dyb3VuZCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpOyAvLycjZGVlMGUyJ1xuICAgICAgICAgICAgdmFyIHBsb3RXaW5kb3cgPSBjcmVhdGVQbG90Q29udGFpbmVyKHdpZGdldCwgcGxvdElELCBwbG90V2luZG93V2lkdGgsIHBsb3RXaW5kb3dIZWlnaHQsIHBsb3RXaW5kb3dYLCBwbG90V2luZG93WSk7XG4gICAgICAgIH0sXG4gICAgfVxufSgpKTtcblxubW9kdWxlLmV4cG9ydHMuc2V0dXAgPSBzZXR1cDsiLCJ2YXIgc2VsZWN0b3JzID0ge1xuICAgIGlkczoge1xuICAgICAgICB3aWRnZXQ6ICd3aWRnZXQnLFxuICAgICAgICBwbG90OiAncGxvdCcsXG4gICAgICAgIGdyb3VwOiBmdW5jdGlvbiAocGxvdElELCBsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHBsb3RJRCtcIi1ncm91cC1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgICAgICBzdmdMYXllcjogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItc3ZnLWxheWVyXCIrbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNlbGVjdG9ycyA9IHNlbGVjdG9yczsiLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBlZGl0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubGF5ZXI7XG4gICAgdGhpcy5wbG90O1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICB0aGlzLmxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5ncm91cChwbG90SUQsIGxldmVsKSk7XG4gICAgdGhpcy5wbG90ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5wbG90KTtcbiAgICB0aGlzLmlubmVyQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5kaW1lbnNpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgaWYgKCF0aGlzLmlubmVyQ29udGFpbmVyKSB0aHJvdyAoJ2VkaXRTVkc6IGlubmVyQ29udGFpbmVyIG11c3QgYmUgaW5pdGlhbGl6ZWQnKTtcbiAgICByZXR1cm4gW3RoaXMuaW5uZXJDb250YWluZXIuZ2V0QkJveCgpLndpZHRoLCB0aGlzLmlubmVyQ29udGFpbmVyLmdldEJCb3goKS5oZWlnaHRdO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB2YXIgdHJhbnNmb3JtYXRpb25zID0gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbiAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgdHJhbnNsYXRlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICB0cmFuc2xhdGUuc2V0VHJhbnNsYXRlKDAsIDApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUodHJhbnNsYXRlLCAwKTtcblxuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHNjYWxlLnNldFNjYWxlKDEuMCwgMS4wKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHNjYWxlLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCAhPT0gMikgdGhyb3cgXCJlZGl0U1ZHOiBleHBlY3RlZCB0cmFuc2Zvcm1hdGlvbnMgdG8gYmUgYSBsaXN0IG9mIGxlbmd0aCAyLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMCkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgxKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgXCJlZGl0U1ZHOiB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCI7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNsYXRlID0gZnVuY3Rpb24gKHNoaWZ0WCwgc2hpZnRZKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICBpZiAoKCFzaGlmdFggfHwgIXNoaWZ0WSkgJiYgKHNoaWZ0WCAhPSAwICYmIHNoaWZ0WSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHRyYW5zbGF0ZSBTVkcgb2JqZWN0IHdpdGggbnVsbCwgdW5kZWZpbmVkLCBvciBlbXB0eSBzaGlmdCB2YWx1ZXMuIHNoaWZ0WDogXCIrc2hpZnRYK1wiIHNoaWZ0WTpcIitzaGlmdFkpO1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgwKTtcbiAgICBpZiAodHJhbnNsYXRpb24udHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSB0aHJvdyBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgdHJhbnNsYXRpb24uc2V0VHJhbnNsYXRlKHNoaWZ0WCwgc2hpZnRZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gKHNjYWxlWCwgc2NhbGVZKSB7XG4gICAgdmFyIHNjYWxlID0gdGhpcy50cmFuc2Zvcm1hdGlvbnMoKS5nZXRJdGVtKDEpO1xuICAgIGlmIChzY2FsZS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgdGhyb3cgXCJlZGl0U1ZHOiBzZWNvbmQgdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiO1xuICAgIHNjYWxlLnNldFNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbiAob3BhY2l0eSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIsIG9wYWNpdHkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuXG4vKlxuVGVzdFxuXG52YXIgbDIgPSBuZXcgZWRpdFNWRygpLnNldCgyKTtcblxudmFyIHggPSBsMi50cmFuc2Zvcm1hdGlvbnMoKTsgXG4vLyBjaGVjayB0cmFuc2xhdGVcbnguZ2V0SXRlbSgwKS5tYXRyaXguZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMFxueC5nZXRJdGVtKDApLm1hdHJpeC5mOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAwXG4vLyBjaGVjayBzY2FsZVxueC5nZXRJdGVtKDEpLm1hdHJpeC5hOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAxXG54LmdldEl0ZW0oMSkubWF0cml4LmQ7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDFcbi8vIGNoZWNrIGxlbmd0aFxueC5sZW5ndGggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAyXG5cbmwyLnRyYW5zbGF0ZSg1MCwgNTApO1xuXG5sMi5zY2FsZSguNSwgLjUpO1xuXG5sMi5mYWRlKC41KTtcblxubDIuaGlkZSgpO1xuXG5sMi5zaG93KCk7XG4qL1xuXG5tb2R1bGUuZXhwb3J0cy5lZGl0U1ZHID0gZWRpdFNWRzsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi91dGlscy91dGlscy5qcycpLnV0aWxzO1xuXG52YXIgdGFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG50YWcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50ICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnNldCgpIGNhbm5vdCBvdmVycmlkZSBub24tbnVsbCBlbGVtZW50IHdpdGggbmV3IGVsZW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbnRhZy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGUoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmNyZWF0ZU5TID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5jcmVhdGVOUygpIG11c3QgaGF2ZSBhIGB0eXBlYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZWxlY3QoKSBtdXN0IGhhdmUgYW4gYGlkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5hdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKGF0dHIpIHx8IHV0aWxzLm51bGxPclVuZGVmaW5lZCh2YWx1ZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmF0dHJpYnV0ZSgpIG11c3QgaGF2ZSBgYXR0cmAgYW5kIGB2YWx1ZWAgYXJndW1lbnRzLlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChjaGlsZCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmFwcGVuZCgpIG11c3QgaGF2ZSBhIGBjaGlsZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZC5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUucGxhY2UgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5wbGFjZSgpIG11c3QgaGF2ZSBhIGBwYXJlbnRgIGFyZ3VtZW50LlwiKTtcbiAgICBwYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5yZW1vdmUoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnRhZy5wcm90b3R5cGUuYWRkSFJFRiA9IGZ1bmN0aW9uIChocmVmKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChocmVmKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYWRkSFJFRigpIG11c3QgaGF2ZSBhIGBocmVmYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLCBcImhyZWZcIiwgaHJlZik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50YWcgPSB0YWc7XG4iLCJ2YXIgc2NoZW1hID0ge1xuICAgIGNoZWNrOiBmdW5jdGlvbiAob2JqZWN0LCBrZXlzKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmplY3QpLmxlbmd0aCAhPSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNjaGVtYSA9IHNjaGVtYTsiLCJ2YXIgdXRpbHMgPSB7XG4gICAgbnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnV0aWxzID0gdXRpbHM7Il19
