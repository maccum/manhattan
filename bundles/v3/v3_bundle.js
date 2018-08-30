(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
        setup.init(widgetID, 1124, 350, '#e8ebef', plotID, 1024, 256, 50, 30);

        // setup image layers
        layers.insertPlotImages('caffeine_consumption', 2, 7, '../plots/caffeine_plots/caffeine_consumption', 256, 256);
        layers.insertPlotImages('standing_height', 2, 8, '../plots/standing_height_plots/standing_height', 256, 256);
        layers.insertPlotImages('caffeine_consumption2', 2, 3, '../plots/caffeine_plots_2/caffeine_consumption', 256, 256);
        layers.showPlot(currentPlot);

        // setup model
        plot.addPlotByName('caffeine_consumption', '../plots/caffeine_plots/caffeine_consumption', 2, 7);
        plot.addPlotByName('standing_height', '../plots/standing_height_plots/standing_height', 2, 8);
        plot.addPlotByName('caffeine_consumption2', '../plots/caffeine_plots_2/caffeine_consumption', 2, 3);
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
    { title: 'standing_height', description: 'height' },
    { title: 'caffeine_consumption2', description: 'caf 2' }
];

// semantic ui (live search bar)
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
            .attribute('fill', '#e8ebef')
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjMvc3JjL2hhbmRsZXJzL2hhbmRsZXJzLmpzIiwic2NyaXB0cy92My9zcmMvbWFpbi9tYWluLmpzIiwic2NyaXB0cy92My9zcmMvcGxvdC9wbG90LmpzIiwic2NyaXB0cy92My9zcmMvcGxvdC9wb3NpdGlvbi5qcyIsInNjcmlwdHMvdjMvc3JjL3NlYXJjaGJhci9zZWFyY2hiYXIuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9ndWkuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9sYXllcnMuanMiLCJzY3JpcHRzL3YzL3NyYy91aS9zZXR1cC5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3NlbGVjdG9ycy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3N2Zy5qcyIsInNjcmlwdHMvdjMvc3JjL3VpL3VpX3V0aWxzL3RhZy5qcyIsInNjcmlwdHMvdjMvc3JjL3V0aWxzL3NjaGVtYS5qcyIsInNjcmlwdHMvdjMvc3JjL3V0aWxzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xuXG52YXIgaGFuZGxlcnMgPSB7XG4gICAgY2FsbEdVSTogZnVuY3Rpb24gKCkge1xuICAgICAgICBndWkucmVuZGVyKHBsb3QuZ2V0SW5mb0ZvckdVSSgpKTtcbiAgICB9LFxuXG4gICAgZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdDogZnVuY3Rpb24gKG1vdXNlWCwgbW91c2VZLCBib3VuZGluZ09iamVjdCkge1xuICAgICAgICB2YXIgY3RtID0gYm91bmRpbmdPYmplY3QuZ2V0U2NyZWVuQ1RNKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiAobW91c2VYIC0gY3RtLmUpIC8gY3RtLmEsXG4gICAgICAgICAgICB5OiAobW91c2VZIC0gY3RtLmYpIC8gY3RtLmRcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgbGlzdGVuRm9yRHJhZzogZnVuY3Rpb24gKHN2Zykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImxpc3RlbkZvckRyYWdcIik7XG4gICAgICAgIHZhciBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIC8vdmFyIHN2ZyA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJlZ2luRHJhZywgZmFsc2UpO1xuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZywgZmFsc2UpO1xuICAgICAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGVuZERyYWcsIGZhbHNlKTtcblxuICAgICAgICB2YXIgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmU7XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGJlZ2luRHJhZyhldnQpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJiZWdpbkRyYWdcIik7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBtb3VzZVBvc2l0aW9uT25TdGFydERyYWcgPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgICAgICBpZiAoaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50TW91c2VQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICAgICAgeTogY3VycmVudE1vdXNlUG9zaXRpb24ueSAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLnksXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHBsb3QuZHJhZyhjaGFuZ2VJbk1vdXNlUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcblxuICAgICAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgb25XaGVlbDogZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGhvcml6b250YWwgPSBldnQuZGVsdGFYO1xuICAgICAgICB2YXIgdmVydGljYWwgPSBldnQuZGVsdGFZO1xuXG4gICAgICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIik7XG4gICAgICAgICAgICB2YXIgbW91c2VQb3MgPSBoYW5kbGVycy5nZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICAgICAgICAgIHBsb3Quem9vbShtb3VzZVBvcywgdmVydGljYWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGxvdC5kcmFnKHsgeDogaG9yaXpvbnRhbCwgeTogMCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICB9LFxuXG4gICAgb25CdXR0b25DbGlja1pvb21JbjogZnVuY3Rpb24gKCkge1xuICAgICAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCAtNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3Quc25hcEluKHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tT3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic25hcCB6b29tIG91dFwiKTtcblxuICAgICAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCA1KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAocGxvdC5zbmFwT3V0KHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAuMSk7XG4gICAgfSxcblxuICAgIHNlYXJjaFBsb3RzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic2VhcmNoUGxvdHNcIik7XG4gICAgICAgIHZhciBzZWFyY2hUZXh0ID0gJCgnI3NlYXJjaGJhcicpLnZhbCgpO1xuICAgICAgICB2YXIgcGxvdE5hbWUgPSBmYWxzZTtcbiAgICAgICAgdmFyIHBsb3RzQnlOYW1lID0gcGxvdC5nZXRQbG90c0J5TmFtZSgpO1xuICAgICAgICBpZiAocGxvdHNCeU5hbWVbc2VhcmNoVGV4dF0pIHtcbiAgICAgICAgICAgIHBsb3ROYW1lID0gc2VhcmNoVGV4dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGxvdE5hbWUpIHtcbiAgICAgICAgICAgIC8vIGNoYW5nZSBwbG90IVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoYW5naW5nIHBsb3RzJyk7XG4gICAgICAgICAgICB2YXIgb2xkUGxvdElEID0gcGxvdC5nZXRQbG90SUQoKTtcbiAgICAgICAgICAgIHBsb3Quc3dpdGNoUGxvdHMocGxvdE5hbWUpO1xuICAgICAgICAgICAgZ3VpLmhpZGUob2xkUGxvdElEKTtcbiAgICAgICAgICAgIGhhbmRsZXJzLmNhbGxHVUkoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qcmV0dXJuIHtcbiAgICAgICAgbGlzdGVuRm9yRHJhZzogbGlzdGVuRm9yRHJhZyxcbiAgICAgICAgb25XaGVlbDogb25XaGVlbCxcbiAgICAgICAgb25CdXR0b25DbGlja1pvb21Jbjogb25CdXR0b25DbGlja1pvb21JbixcbiAgICAgICAgb25CdXR0b25DbGlja1pvb21PdXQ6IG9uQnV0dG9uQ2xpY2tab29tT3V0LFxuICAgIH07Ki9cbn07XG5cbm1vZHVsZS5leHBvcnRzLmhhbmRsZXJzID0gaGFuZGxlcnM7IiwidmFyIHNldHVwID0gcmVxdWlyZSgnLi4vdWkvc2V0dXAuanMnKS5zZXR1cDtcbnZhciBsYXllcnMgPSByZXF1aXJlKCcuLi91aS9sYXllcnMuanMnKS5sYXllcnM7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgZ3VpID0gcmVxdWlyZSgnLi4vdWkvZ3VpLmpzJykuZ3VpO1xudmFyIGhhbmRsZXJzID0gcmVxdWlyZSgnLi4vaGFuZGxlcnMvaGFuZGxlcnMuanMnKS5oYW5kbGVycztcbnJlcXVpcmUoJy4uL3NlYXJjaGJhci9zZWFyY2hiYXIuanMnKTtcblxudmFyIG1haW4gPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gaW5pdCh3aWRnZXRJRCwgcGxvdElELCBjdXJyZW50UGxvdCkge1xuICAgICAgICAvLyBzZXR1cCBwYWdlXG4gICAgICAgIHNldHVwLmluaXQod2lkZ2V0SUQsIDExMjQsIDM1MCwgJyNlOGViZWYnLCBwbG90SUQsIDEwMjQsIDI1NiwgNTAsIDMwKTtcblxuICAgICAgICAvLyBzZXR1cCBpbWFnZSBsYXllcnNcbiAgICAgICAgbGF5ZXJzLmluc2VydFBsb3RJbWFnZXMoJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMiwgNywgJy4uL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzL2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMjU2LCAyNTYpO1xuICAgICAgICBsYXllcnMuaW5zZXJ0UGxvdEltYWdlcygnc3RhbmRpbmdfaGVpZ2h0JywgMiwgOCwgJy4uL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLCAyNTYsIDI1Nik7XG4gICAgICAgIGxheWVycy5pbnNlcnRQbG90SW1hZ2VzKCdjYWZmZWluZV9jb25zdW1wdGlvbjInLCAyLCAzLCAnLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDI1NiwgMjU2KTtcbiAgICAgICAgbGF5ZXJzLnNob3dQbG90KGN1cnJlbnRQbG90KTtcblxuICAgICAgICAvLyBzZXR1cCBtb2RlbFxuICAgICAgICBwbG90LmFkZFBsb3RCeU5hbWUoJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgJy4uL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzL2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMiwgNyk7XG4gICAgICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnc3RhbmRpbmdfaGVpZ2h0JywgJy4uL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLCAyLCA4KTtcbiAgICAgICAgcGxvdC5hZGRQbG90QnlOYW1lKCdjYWZmZWluZV9jb25zdW1wdGlvbjInLCAnLi4vcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDMpO1xuICAgICAgICAvKnBsb3Quc2V0UGxvdElEKGN1cnJlbnRQbG90KTtcbiAgICAgICAgcGxvdC5zZXRNaW5NYXhMZXZlbCgyLCA3KTtcbiAgICAgICAgcGxvdC5pbml0aWFsaXplVmlzaWJsZSgyLCB7IHdpZHRoOiAxMDI0LCBoZWlnaHQ6IDI1NiB9KTtcbiAgICAgICAgdmFyIHdpZHRoID0gMTAyNDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDM7IGkgPCA3ICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB3aWR0aCA9IHdpZHRoICogMjtcbiAgICAgICAgICAgIHBsb3QuaW5pdGlhbGl6ZUhpZGRlbihpLCB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIH0qL1xuICAgICAgICBwbG90LnN3aXRjaFBsb3RzKGN1cnJlbnRQbG90KTtcblxuICAgICAgICAvLyBpbnRpYWwgcmVuZGVyaW5nXG4gICAgICAgIGd1aS5yZW5kZXIocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuXG4gICAgICAgIC8vIHNldHVwIGxpc3RlbmVyc1xuICAgICAgICBjb25zb2xlLmxvZyhcInNldHRpbmcgdXAgbGlzdGVuZXJzXCIpO1xuICAgICAgICBoYW5kbGVycy5saXN0ZW5Gb3JEcmFnKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbG90JykpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGhhbmRsZXJzLm9uV2hlZWwpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20taW4tYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbUluKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLW91dC1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZXJzLm9uQnV0dG9uQ2xpY2tab29tT3V0KTtcbiAgICAgICAgLy8gZW50ZXIga2V5IGluc2lkZSBzZWFyY2hib3hcbiAgICAgICAgJCgnLnVpLnNlYXJjaCcpLm9uKCdrZXlwcmVzcycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwia2V5cHJlc3NcIik7XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuc2VhcmNoUGxvdHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2VhcmNoIGljb24gY2xpY2sgXG4gICAgICAgICQoJy5mYS5mYS1zZWFyY2gudzMtbGFyZ2UnKS5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaGFuZGxlcnMuc2VhcmNoUGxvdHMoKTtcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgaW5pdDogaW5pdFxuICAgIH07XG59KCkpO1xuXG5tYWluLmluaXQoJ3dpZGdldCcsICdwbG90JywgJ3N0YW5kaW5nX2hlaWdodCcpOyIsInZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG52YXIgcG9zaXRpb24gPSByZXF1aXJlKFwiLi4vcGxvdC9wb3NpdGlvbi5qc1wiKS5wb3NpdGlvbjtcblxudmFyIHBsb3QgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBwbG90c0J5TmFtZSA9IHtcbiAgICAgICAgLy8gVE9ETzogc2hvdWxkIGNoZWNrIGZvbGRlcnMgZXhpc3Qgd2hlbiBpbml0aWFsaXppbmdcbiAgICAgICAgLy8nY2FmZmVpbmVfY29uc3VtcHRpb24nOiB7dXJsOiAnL3BhdGgvaGVyZS8nLCBtaW5ab29tOiAyLCBtYXhab29tOiA3fSxcbiAgICAgICAgLy8nc3RhbmRpbmdfaGVpZ2h0JyA6IHt1cmw6ICcvcGF0aC9oZXJlLycsIG1pblpvb206IDIsIG1heFpvb206IDh9LFxuICAgIH1cblxuICAgIHZhciBwbG90SUQgPSBudWxsLFxuICAgICAgICBtaW5pbXVtTGV2ZWwgPSBudWxsLFxuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBudWxsLFxuICAgICAgICBzY2FsZUZhY3RvciA9IDEwMDAwLFxuICAgICAgICB6b29tSW5jcmVtZW50ID0gNSxcbiAgICAgICAgc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzYwMDAsIDkwMDBdLFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCA9IFsxMjAwMCwgMTgwMDBdLFxuICAgICAgICB2aXNpYmxlcyA9IHt9LFxuICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSksXG4gICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIGdldFBsb3RzQnlOYW1lKCkge1xuICAgICAgICByZXR1cm4gcGxvdHNCeU5hbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZVZpc2libGUobGV2ZWwsIGRpbXMpIHtcbiAgICAgICAgaWYgKGxldmVsIDwgbWluaW11bUxldmVsIHx8IGxldmVsID4gbWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIHZpc2libGUgbGF5ZXIgb3V0c2lkZSBbbWluLG1heF0gem9vbS5cIik7XG4gICAgICAgIGlmICghc2NoZW1hLmRpbWVuc2lvbnMoZGltcykpIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGRpbWVuc2lvbnMgc2NoZW1hXCIpO1xuICAgICAgICB2aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogeyB4OiAwLCB5OiAwIH0sIHNjYWxlOiB7IHg6IDEgKiBzY2FsZUZhY3RvciwgeTogMSAqIHNjYWxlRmFjdG9yIH0sIG9wYWNpdHk6IDEgfTtcbiAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0aWFsaXplSGlkZGVuKGxldmVsLCBkaW1zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IG1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IG1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCBoaWRkZW4gbGF5ZXIgb3V0c2lkZSBbbWluLG1heF0gem9vbS5cIik7XG4gICAgICAgIGlmICghc2NoZW1hLmRpbWVuc2lvbnMoZGltcykpIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGRpbWVuc2lvbnMgc2NoZW1hXCIpO1xuICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkUGxvdEJ5TmFtZShuYW1lLCB1cmwsIG1pblpvb20sIG1heFpvb20pIHtcbiAgICAgICAgcGxvdHNCeU5hbWVbbmFtZV0gPSB7IHVybDogdXJsLCBtaW5ab29tOiBtaW5ab29tLCBtYXhab29tOiBtYXhab29tIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3dpdGNoUGxvdHMobmFtZSkge1xuICAgICAgICByZXNldCgpO1xuICAgICAgICBwbG90SUQgPSBuYW1lO1xuICAgICAgICB2YXIgbWluWm9vbSA9IHBsb3RzQnlOYW1lW25hbWVdLm1pblpvb20sXG4gICAgICAgICAgICBtYXhab29tID0gcGxvdHNCeU5hbWVbbmFtZV0ubWF4Wm9vbTtcbiAgICAgICAgc2V0TWluTWF4TGV2ZWwobWluWm9vbSwgbWF4Wm9vbSk7XG5cbiAgICAgICAgLy8gd2lkdGggYW5kIGhlaWdodCBvZiBwbG90cyBjdXJyZW50bHkgbm90IGZsZXhpYmxlIGhlcmVcbiAgICAgICAgdmFyIG5Db2xzID0gZnVuY3Rpb24gKHopIHsgcmV0dXJuIE1hdGgucG93KDIsIHopOyB9XG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlKG1pblpvb20sIHsgd2lkdGg6IG5Db2xzKG1pblpvb20pICogMjU2LCBoZWlnaHQ6IDI1NiB9KTtcbiAgICAgICAgLy92YXIgd2lkdGggPSAxMDI0O1xuICAgICAgICBmb3IgKHZhciBpID0gbWluWm9vbSArIDE7IGkgPCBtYXhab29tICsgMTsgaSsrKSB7XG4gICAgICAgICAgICAvL3dpZHRoID0gd2lkdGggKiAyO1xuICAgICAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbihpLCB7IHdpZHRoOiBuQ29scyhpKSAqIDI1NiwgaGVpZ2h0OiAyNTYgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREaW1lbnNpb25zKCkge1xuICAgICAgICByZXR1cm4gZGltZW5zaW9ucztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgcGxvdElEID0gbnVsbDtcbiAgICAgICAgbWluaW11bUxldmVsID0gbnVsbDtcbiAgICAgICAgbWF4aW11bUxldmVsID0gbnVsbDtcbiAgICAgICAgdmlzaWJsZXMgPSB7fTtcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pO1xuICAgICAgICBkaW1lbnNpb25zID0ge307XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0TWluTWF4TGV2ZWwobWluLCBtYXgpIHtcbiAgICAgICAgbWluaW11bUxldmVsID0gbWluO1xuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBtYXg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5pdFNjYWxlKHNjYWxlKSB7XG4gICAgICAgIGlmICgoc2NhbGUueCA+IC41ICYmIHNjYWxlLnggPCAyKSB8fCAoc2NhbGUueSA+IC41ICYmIHNjYWxlLnkgPCAyKSkgdGhyb3cgbmV3IEVycm9yKCdzY2FsZSBhbHJlYWR5IGluIHVuaXQgc2NhbGUnKTtcbiAgICAgICAgcmV0dXJuIHsgeDogc2NhbGUueCAvIHNjYWxlRmFjdG9yLCB5OiBzY2FsZS55IC8gc2NhbGVGYWN0b3IgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93KGxldmVsLCB0b3BMZWZ0LCBzY2FsZSwgb3BhY2l0eSkge1xuICAgICAgICBpZiAoIWhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIjtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHRvcExlZnQsIHNjYWxlOiBzY2FsZSwgb3BhY2l0eTogb3BhY2l0eSB9O1xuICAgICAgICBoaWRkZW5zLmRlbGV0ZShsZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGlkZShsZXZlbCkge1xuICAgICAgICBpZiAoIXZpc2libGVzW2xldmVsXSkgdGhyb3cgXCJUcmllZCB0byBoaWRlIGEgbGV2ZWwgdGhhdCBpcyBub3QgdmlzaWJsZVwiO1xuICAgICAgICBkZWxldGUgdmlzaWJsZXNbbGV2ZWxdO1xuICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IHNjYWxlLng7XG4gICAgICAgIGlmICh4U2NhbGUgPCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggaGlnaGVyIHpvb20gbGV2ZWwgKG9uIHRvcCBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gbWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFswLCAxXSk7XG4gICAgICAgIH0gLyplbHNlIGlmICh4U2NhbGUgPiBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGxvd2VyIHpvb20gbGV2ZWwgKGJlbG93IGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBwbG90Lm1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzEsIDBdKTtcbiAgICAgICAgfSovIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXBWYWx1ZU9udG9SYW5nZSh2YWx1ZSwgb2xkUmFuZ2UsIG5ld1JhbmdlKSB7XG4gICAgICAgIHZhciBvbGRTcGFuID0gb2xkUmFuZ2VbMV0gLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIG5ld1NwYW4gPSBuZXdSYW5nZVsxXSAtIG5ld1JhbmdlWzBdO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb1ZhbHVlID0gdmFsdWUgLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIHBlcmNlbnRTcGFuVG9WYWx1ZSA9IGRpc3RhbmNlVG9WYWx1ZSAvIG9sZFNwYW47XG4gICAgICAgIHZhciBkaXN0YW5jZVRvTmV3VmFsdWUgPSBwZXJjZW50U3BhblRvVmFsdWUgKiBuZXdTcGFuO1xuICAgICAgICB2YXIgbmV3VmFsdWUgPSBuZXdSYW5nZVswXSArIGRpc3RhbmNlVG9OZXdWYWx1ZTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9zaXRpb24obmV3VG9wTGVmdCkge1xuICAgICAgICBpZiAoKCFuZXdUb3BMZWZ0LnggJiYgbmV3VG9wTGVmdC54ICE9IDApIHx8ICghbmV3VG9wTGVmdC55ICYmIG5ld1RvcExlZnQueSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIG5ldyBUb3AgTGVmdDogW1wiICsgbmV3VG9wTGVmdC54ICsgXCIsIFwiICsgbmV3VG9wTGVmdC55ICsgXCJdXCIpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdCA9IG5ld1RvcExlZnQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldE9wYWNpdGllcygpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLm9wYWNpdHkgPSBjYWxjdWxhdGVPcGFjaXR5KHZpc2libGVzW2tleV0uc2NhbGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0UGxvdElEOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgICAgIHBsb3RJRCA9IGlkO1xuICAgICAgICB9LFxuICAgICAgICBnZXRJbmZvRm9yR1VJOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mVmlzaWJsZXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHNjYWxlIGZvciBwYXNzaW5nIHRvIEdVSTogXG4gICAgICAgICAgICAgICAgdmFyIGd1aUxheWVyID0ge1xuICAgICAgICAgICAgICAgICAgICBsZXZlbDogdmlzaWJsZXNba2V5XS5sZXZlbCxcbiAgICAgICAgICAgICAgICAgICAgdG9wTGVmdDogdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdW5pdFNjYWxlKHZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlc1trZXldLm9wYWNpdHksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ3VpTGF5ZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShoaWRkZW5zKTtcbiAgICAgICAgICAgIC8vcmV0dXJuIFtsaXN0T2ZWaXNpYmxlcywgbGlzdE9mSGlkZGVuc107XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHBsb3RJRDogcGxvdElELFxuICAgICAgICAgICAgICAgIHZpc2libGVMYXllcnM6IGxpc3RPZlZpc2libGVzLFxuICAgICAgICAgICAgICAgIGhpZGRlbkxldmVsczogbGlzdE9mSGlkZGVucyxcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zOiBnZXREaW1lbnNpb25zKCksXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFBsb3RJRDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHBsb3RJRDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhbGl6ZVZpc2libGU6IGluaXRpYWxpemVWaXNpYmxlLCBcbiAgICAgICAgaW5pdGlhbGl6ZUhpZGRlbjogaW5pdGlhbGl6ZUhpZGRlbixcbiAgICAgICAgY2xlYXJGb3JUZXN0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBiZXR0ZXIgd2F5IHRvIGNsZWFyIHNpbmdsZXRvbiBmb3IgdGVzdGluZz9cbiAgICAgICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgICAgICBkaW1lbnNpb25zID0ge307XG4gICAgICAgIH0sXG4gICAgICAgIGdldFZpc2libGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmlzaWJsZXM7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEhpZGRlbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBoaWRkZW5zO1xuICAgICAgICB9LFxuXG4gICAgICAgIGluY3JlYXNlU2NhbGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPCBzY2FsZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggKz0gem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPj0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0gJiYga2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgKyAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA8PSBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdLCB5OiAxICogc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZWNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShrZXkgPT0gbWluaW11bUxldmVsICYmIHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZUZhY3RvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8PSBzY2FsZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggLT0gem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSAmJiBrZXkgPiBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaGlkZShrZXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA+PSBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgem9vbTogZnVuY3Rpb24gKGZvY3VzLCB2ZXJ0aWNhbCkge1xuXG4gICAgICAgICAgICB2YXIgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICAgICAgZmlyc3QgPSB2aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICAgICAgd2lkdGggPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKGZvY3VzLCBmaXJzdC50b3BMZWZ0LCB1bml0U2NhbGUoZmlyc3Quc2NhbGUpLCB3aWR0aCwgaGVpZ2h0KTtcblxuICAgICAgICAgICAgdmFyIGhvd011Y2ggPSBNYXRoLmZsb29yKE1hdGguYWJzKHZlcnRpY2FsKSAvIDUpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3dNdWNoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodmVydGljYWwgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5jcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVjcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgICAgIG5ld0ZpcnN0ID0gdmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICAgICAgbmV3SGVpZ2h0ID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0uaGVpZ2h0O1xuXG4gICAgICAgICAgICB2YXIgbmV3VG9wTGVmdCA9IHBvc2l0aW9uLnBlcmNlbnRhZ2VUb1RvcExlZnQoZm9jdXMsIHBlcmNlbnRhZ2VDb29yZGluYXRlcywgdW5pdFNjYWxlKG5ld0ZpcnN0LnNjYWxlKSwgbmV3V2lkdGgsIG5ld0hlaWdodCk7XG4gICAgICAgICAgICByZXBvc2l0aW9uKG5ld1RvcExlZnQpO1xuICAgICAgICAgICAgcmVzZXRPcGFjaXRpZXMoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc25hcEluOiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSB2aXNpYmxlc1tPYmplY3Qua2V5cyh2aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNSkge1xuICAgICAgICAgICAgICAgIHRoaXMuem9vbShmb2N1cywgLTUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc25hcE91dDogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZHJhZzogZnVuY3Rpb24gKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdC54ICs9IGNoYW5nZUluUG9zaXRpb24ueDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2V0TWluTWF4TGV2ZWw6IHNldE1pbk1heExldmVsLFxuICAgICAgICByZXNldDogcmVzZXQsXG4gICAgICAgIGFkZFBsb3RCeU5hbWU6IGFkZFBsb3RCeU5hbWUsXG4gICAgICAgIHN3aXRjaFBsb3RzOiBzd2l0Y2hQbG90cyxcbiAgICAgICAgZ2V0RGltZW5zaW9uczogZ2V0RGltZW5zaW9ucyxcbiAgICAgICAgZ2V0UGxvdHNCeU5hbWU6IGdldFBsb3RzQnlOYW1lLFxuICAgIH07XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cy5wbG90ID0gcGxvdDsiLCJ2YXIgcG9zaXRpb24gPSB7XG4gICAgY2FsY3VsYXRlUGVyY2VudDogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcG9zaXRpb25CLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgaWYgKGxlbmd0aEIgPD0gMCkgdGhyb3cgbmV3IEVycm9yKFwiTGVuZ3RoIG11c3QgYmUgcG9zaXRpdmUuXCIpO1xuICAgICAgICByZXR1cm4gKHBvc2l0aW9uQSAtIHBvc2l0aW9uQikgLyAobGVuZ3RoQiAqIHNjYWxlQik7XG4gICAgfSxcbiAgICBjYWxjdWxhdGVQb3NpdGlvbjogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcGVyY2VudEIsIGxlbmd0aEIsIHNjYWxlQikge1xuICAgICAgICByZXR1cm4gcG9zaXRpb25BIC0gKChsZW5ndGhCICogc2NhbGVCKSAqIHBlcmNlbnRCKTtcbiAgICB9LFxuICAgIHRvcExlZnRUb1BlcmNlbnRhZ2U6IGZ1bmN0aW9uIChmb2N1cywgdG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHBvc2l0aW9uLmNhbGN1bGF0ZVBlcmNlbnQoZm9jdXMueCwgdG9wTGVmdC54LCB3aWR0aCwgc2NhbGUueCksXG4gICAgICAgICAgICB5OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLnksIHRvcExlZnQueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHBlcmNlbnRhZ2VUb1RvcExlZnQ6IGZ1bmN0aW9uIChmb2N1cywgcGVyY2VudGFnZSwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLngsIHBlcmNlbnRhZ2UueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUG9zaXRpb24oZm9jdXMueSwgcGVyY2VudGFnZS55LCBoZWlnaHQsIHNjYWxlLnkpLFxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLnBvc2l0aW9uID0gcG9zaXRpb247IiwidmFyIHBsb3ROYW1lcyA9IFtcbiAgICB7IHRpdGxlOiAnY2FmZmVpbmVfY29uc3VtcHRpb24nLCBkZXNjcmlwdGlvbjogJ2NhZmZlaW5lIGNvbnN1bXB0aW9uJyB9LFxuICAgIHsgdGl0bGU6ICdzdGFuZGluZ19oZWlnaHQnLCBkZXNjcmlwdGlvbjogJ2hlaWdodCcgfSxcbiAgICB7IHRpdGxlOiAnY2FmZmVpbmVfY29uc3VtcHRpb24yJywgZGVzY3JpcHRpb246ICdjYWYgMicgfVxuXTtcblxuLy8gc2VtYW50aWMgdWkgKGxpdmUgc2VhcmNoIGJhcilcbiQoJy51aS5zZWFyY2gnKS5zZWFyY2goe1xuICAgIHNvdXJjZTogcGxvdE5hbWVzLFxufSk7XG5cblxuIiwidmFyIGVkaXRTVkcgPSByZXF1aXJlKCcuL3VpX3V0aWxzL3N2Zy5qcycpLmVkaXRTVkc7XG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vdXRpbHMvc2NoZW1hLmpzJykuc2NoZW1hO1xudmFyIHRhZyA9IHJlcXVpcmUoJy4uL3VpL3VpX3V0aWxzL3RhZy5qcycpLnRhZztcblxudmFyIGd1aSA9IHtcbiAgICBoaWRlOiBmdW5jdGlvbihwbG90SUQpIHtcbiAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgfSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgIHNjaGVtYS5jaGVjayhhcmdzLCBbJ3Bsb3RJRCcsICd2aXNpYmxlTGF5ZXJzJywgJ2hpZGRlbkxldmVscycsICdkaW1lbnNpb25zJ10pO1xuICAgICAgICB2YXIgcGxvdElEID0gYXJncy5wbG90SUQsXG4gICAgICAgICAgICB2aXNpYmxlTGF5ZXJzID0gYXJncy52aXNpYmxlTGF5ZXJzLFxuICAgICAgICAgICAgaGlkZGVuTGV2ZWxzID0gYXJncy5oaWRkZW5MZXZlbHMsXG4gICAgICAgICAgICBkaW1zID0gYXJncy5kaW1lbnNpb25zO1xuXG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnaW5saW5lJyk7XG5cbiAgICAgICAgaWYgKCEodmlzaWJsZUxheWVycy5sZW5ndGggPiAwICYmIHZpc2libGVMYXllcnMubGVuZ3RoIDw9IDIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGhhdmUgMS0yIHZpc2libGUgbGF5ZXJzLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGhpZGRlbkluZGV4IGluIGhpZGRlbkxldmVscykge1xuICAgICAgICAgICAgdmFyIGxldmVsID0gaGlkZGVuTGV2ZWxzW2hpZGRlbkluZGV4XTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGV2ZWwpICE9ICdbb2JqZWN0IE51bWJlcl0nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJIEVSUk9SOiBleHBlY3RlZCBhIGxpc3Qgb2YgbnVtYmVycyBmb3IgaGlkZGVuTGF5ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KHBsb3RJRCwgbGV2ZWwpLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIHZpc2libGVJbmRleCBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB2aXNpYmxlTGF5ZXJzW3Zpc2libGVJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5sYXllcihsYXllcikpIHRocm93IG5ldyBFcnJvcihcIkdVSTogZXhwZWN0ZWQgbGF5ZXIgc2NoZW1hLlwiKTtcbiAgICAgICAgICAgIGlmIChsYXllci5zY2FsZS54ID4gMiB8fCBsYXllci5zY2FsZS54IDwgLjUgfHwgbGF5ZXIuc2NhbGUueSA+IDIgfHwgbGF5ZXIuc2NhbGUueSA8IC41KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBzY2FsZSBvdXRzaWRlIFsuNSwyXSByYW5nZS4gU2NhbGUgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBbLjUsMl0gYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBHVUkuIFtcIiArIGxheWVyLnNjYWxlLnggKyBcIiwgXCIgKyBsYXllci5zY2FsZS55ICsgXCJdXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ZnQnVuZGxlID0gbmV3IGVkaXRTVkcoKS5zZXQocGxvdElELCBsYXllci5sZXZlbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkaW1zRnJvbVBhZ2UgPSBzdmdCdW5kbGUuZGltZW5zaW9ucygpO1xuICAgICAgICAgICAgaWYgKChkaW1zRnJvbVBhZ2VbMF0gIT0gZGltc1tsYXllci5sZXZlbF0ud2lkdGgpIHx8IChkaW1zRnJvbVBhZ2VbMV0gIT0gZGltc1tsYXllci5sZXZlbF0uaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSTogZGltZW5zaW9ucyBvZiBwbG90IG9uIHBhZ2UgZG9uJ3QgbWF0Y2ggZGltZW5zaW9ucyBvZiBwbG90IGZyb20gbW9kZWxcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN2Z0J1bmRsZVxuICAgICAgICAgICAgICAgIC50cmFuc2xhdGUobGF5ZXIudG9wTGVmdC54LCBsYXllci50b3BMZWZ0LnkpXG4gICAgICAgICAgICAgICAgLnNjYWxlKGxheWVyLnNjYWxlLngsIGxheWVyLnNjYWxlLnkpXG4gICAgICAgICAgICAgICAgLmZhZGUobGF5ZXIub3BhY2l0eSlcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpc2libGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIHNjYWxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBvcGFjaXR5U3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZpc2libGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLmxldmVsO1xuICAgICAgICAgICAgc2NhbGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLnNjYWxlLng7XG4gICAgICAgICAgICBvcGFjaXR5U3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLm9wYWNpdHk7XG4gICAgICAgIH1cbiAgICAgICAgJChcIiN6b29tLWRpdlwiKS50ZXh0KHZpc2libGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNmcmFjdGlvbmFsLXpvb20tZGl2XCIpLnRleHQoc2NhbGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNvcGFjaXR5LWRpdlwiKS50ZXh0KG9wYWNpdHlTdHJpbmcpO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5ndWkgPSBndWk7IiwidmFyIHRhZyA9IHJlcXVpcmUoJy4vdWlfdXRpbHMvdGFnLmpzJykudGFnO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vdWlfdXRpbHMvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgbGF5ZXJzID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBhZGRQbG90VG9QYWdlKHRhcmdldCwgcGxvdElEKSB7XG4gICAgICAgIC8vIGFkZCBnIGZvciBhIHNpbmdsZSBwbG90IChwaGVub3R5cGUpLCBoaWRkZW4gd2l0aCBkaXNwbGF5PW5vbmVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2cnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG4gICAgfTtcblxuICAgIC8qIHBsYWNlIGEgem9vbSBsYXllciBncm91cCA8Zz48c3ZnPjwvc3ZnPjwvZz4gaW5zaWRlIGEgcGxvdCdzIDxzdmc+ICovXG4gICAgZnVuY3Rpb24gYWRkR3JvdXAocGxvdElELCBsZXZlbCwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgcGxvdCA9IG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKTtcblxuICAgICAgICB2YXIgZ3JvdXAgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsc2VsZWN0b3JzLmlkcy5ncm91cChwbG90SUQsIGxldmVsKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJylcbiAgICAgICAgICAgIC5wbGFjZShwbG90KTtcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLnBsYWNlKGdyb3VwKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gYWRkVGlsZShwbG90SUQsIGxldmVsLCBjb2x1bW4sIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIHRpbGVVUkwgPSB1cmwgKyBcIi9cIiArIGxldmVsICsgXCIvXCIgKyBjb2x1bW4gKyBcIi5wbmdcIjtcblxuICAgICAgICB2YXIgeCA9IGNvbHVtbiAqIGltYWdlV2lkdGg7XG4gICAgICAgIHZhciB5ID0gMDtcbiAgICAgICAgdmFyIHdpZHRoID0gaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IGltYWdlSGVpZ2h0O1xuXG4gICAgICAgIHZhciBzdmcgPSBuZXcgdGFnKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuXG4gICAgICAgIC8vY3JlYXRlIHRpbGVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2ltYWdlJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYWRkSFJFRih0aWxlVVJMKVxuICAgICAgICAgICAgLnBsYWNlKHN2Zyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGFkZFRpbGVzKHBsb3RJRCwgbGV2ZWwsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBjb2x1bW5zOyBjKyspIHtcbiAgICAgICAgICAgIGFkZFRpbGUocGxvdElELCBsZXZlbCwgYywgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgICAgICB4ID0geCArIDI1NjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpbnNlcnRQbG90SW1hZ2VzKHBsb3RJRCwgbWluTGV2ZWwsIG1heExldmVsLCB1cmwsIGltYWdlV2lkdGgsIGltYWdlSGVpZ2h0KSB7XG4gICAgICAgICAgICB2YXIgcGxvdENvbnRhaW5lciA9IG5ldyB0YWcoKS5zZWxlY3QoJ3Bsb3QnKTtcbiAgICAgICAgICAgIGFkZFBsb3RUb1BhZ2UocGxvdENvbnRhaW5lciwgcGxvdElEKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSBtaW5MZXZlbDsgaTxtYXhMZXZlbCsxOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGkpO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbHVtbnMgKiBpbWFnZVdpZHRoO1xuICAgICAgICAgICAgICAgIHZhciBoZWlnaHQgPSBpbWFnZUhlaWdodDtcbiAgICAgICAgICAgICAgICBhZGRHcm91cChwbG90SUQsIGksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgICAgIGFkZFRpbGVzKHBsb3RJRCwgaSwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNob3dQbG90OiBmdW5jdGlvbiAocGxvdElEKSB7XG4gICAgICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ2lubGluZScpO1xuICAgICAgICB9LFxuICAgICAgICBoaWRlUGxvdDpmdW5jdGlvbiAocGxvdElEKSB7XG4gICAgICAgICAgICBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCkuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKTtcbiAgICAgICAgfVxuICAgIH1cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLmxheWVycyA9IGxheWVyczsiLCIvKiBJbnNlcnQgSFRNTCBET00gZWxlbWVudHMgYW5kIFNWRyBET00gZWxlbWVudHMgaW50byB3ZWJwYWdlLlxuXG5TdHJ1Y3R1cmVcblxuPHN2Zz4gd2lkZ2V0IHN2Z1xuICAgIDxyZWN0PiBiYWNrZ3JvdW5kIHJlY3RhbmdsZSBmb3Igd2lkZ2V0IChhbnkgY29sb3IpXG4gICAgPHN2Zz4gcGxvdCBzdmdcbiAgICAgICAgPHJlY3Q+IGJhY2tncm91bmQgcmVjdGFuZ2xlIGZvciBwbG90ICh3aGl0ZSlcbiAgICAgICAgPHN2Zz4gc3ZnIGZvciBwaGVub3R5cGUgMVxuICAgICAgICAgICAgPGc+IGdyb3VwIGZvciBlYWNoIHpvb20gbGF5ZXJcbiAgICAgICAgICAgICAgICA8c3ZnPiBzdmcgd2l0aCB3aWR0aCBhbmQgaGVpZ2h0IGZvciB0aGlzIGxheWVyXG4gICAgICAgICAgICAgICAgICAgIDxpbWFnZT4gaW1hZ2VzXG4gICAgICAgICAgICA8Zz5cbiAgICAgICAgICAgICAgICAuLi5cbiAgICAgICAgPHN2Zz4gc3ZnIGZvciBwaGVub3R5cGUgMlxuICAgICAgICAgICAgLi4uXG4qL1xuXG52YXIgdGFnID0gcmVxdWlyZSgnLi91aV91dGlscy90YWcuanMnKS50YWc7XG5cbnZhciBzZXR1cCA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBhZGRCdXR0b25zKHRhcmdldCkge1xuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEJ1dHRvbihpZCwgX2NsYXNzLCB0eXBlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0YWcoKVxuICAgICAgICAgICAgICAgIC5jcmVhdGUoJ2lucHV0JylcbiAgICAgICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIGlkKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2NsYXNzJywgX2NsYXNzKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3R5cGUnLCB0eXBlKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ25hbWUnLCBuYW1lKVxuICAgICAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuICAgICAgICB9O1xuICAgICAgIC8vYWRkQnV0dG9uKCdzZWFyY2hiYXInLCAnJywgJ3RleHQnLCAnc2VhcmNoJykuYXR0cmlidXRlKCdwbGFjZWhvbGRlcicsICdTZWFyY2ggZm9yIHBoZW5vdHlwZXMuLi4nKTtcbiAgICAgICAgYWRkQnV0dG9uKCd6b29tLWluLWJ1dHRvbicsICd6b29tLWJ1dHRvbicsICdidXR0b24nLCAnaW5jcmVhc2UnKS5hdHRyaWJ1dGUoJ3ZhbHVlJywgJysnKTtcbiAgICAgICAgYWRkQnV0dG9uKCd6b29tLW91dC1idXR0b24nLCAnem9vbS1idXR0b24nLCAnYnV0dG9uJywnZGVjcmVhc2UnKS5hdHRyaWJ1dGUoJ3ZhbHVlJywgJy0nKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlV2lkZ2V0QW5kQmFja2dyb3VuZCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgLy8gY3JlYXRlIHdpZGdldCBhbmQgYXBwZW5kIGl0IHRvIHRoZSB0YXJnZXRcbiAgICAgICAgdmFyIHdpZGdldCA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCB3aWRnZXRJRClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGJhY2tncm91bmQgZm9yIHBsb3Qgd2lkZ2V0XG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnZmlsbCcsIGJhY2tncm91bmRDb2xvcikgLy8gJyNkZWUwZTInXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdzdHJva2UnLCcjZTNlN2VkJylcbiAgICAgICAgICAgIC5wbGFjZSh3aWRnZXQpO1xuXG4gICAgICAgIHJldHVybiB3aWRnZXQ7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVBsb3RDb250YWluZXIodGFyZ2V0LCBwbG90SUQsIHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgLy8gY3JlYXRlIHBsb3QgY29udGFpbmVyICh3aWR0aCBhbmQgaGVpZ2h0IGRpY3RhdGUgdGhlIHNpemUgb2YgdGhlIHZpZXdpbmcgd2luZG93KVxuICAgICAgICB2YXIgcGxvdFdpbmRvdyA9IG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneCcsIHgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd5JywgeSlcbiAgICAgICAgICAgIC5wbGFjZSh0YXJnZXQpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBwbG90IGJhY2tncm91bmRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2ZpbGwnLCAnI2U4ZWJlZicpXG4gICAgICAgICAgICAucGxhY2UocGxvdFdpbmRvdyk7XG5cbiAgICAgICAgcmV0dXJuIHBsb3RXaW5kb3c7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICh3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yLCBwbG90SUQsIFxuICAgICAgICAgICAgcGxvdFdpbmRvd1dpZHRoLCBwbG90V2luZG93SGVpZ2h0LCBwbG90V2luZG93WCwgcGxvdFdpbmRvd1kpIHtcbiAgICAgICAgICAgIC8vIHRhcmdldCBmb3Igd2hlcmUgdG8gaW5zZXJ0IGVsZW1lbnRzIChtYWtlIHN1cmUgdGhleSBhcmUgYmVmb3JlIHRoZSA8c2NyaXB0PiEhISlcbiAgICAgICAgICAgIHRhcmdldCA9IG5ldyB0YWcoKS5zZWxlY3QoJ3dpZGdldC1kaXYnKTtcblxuICAgICAgICAgICAgYWRkQnV0dG9ucyh0YXJnZXQpO1xuICAgICAgICAgICAgdmFyIHdpZGdldCA9IGNyZWF0ZVdpZGdldEFuZEJhY2tncm91bmQodGFyZ2V0LCB3aWRnZXRJRCwgd2lkdGgsIGhlaWdodCwgYmFja2dyb3VuZENvbG9yKTsgLy8nI2RlZTBlMidcbiAgICAgICAgICAgIHZhciBwbG90V2luZG93ID0gY3JlYXRlUGxvdENvbnRhaW5lcih3aWRnZXQsIHBsb3RJRCwgcGxvdFdpbmRvd1dpZHRoLCBwbG90V2luZG93SGVpZ2h0LCBwbG90V2luZG93WCwgcGxvdFdpbmRvd1kpO1xuICAgICAgICB9LFxuICAgIH1cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnNldHVwID0gc2V0dXA7IiwidmFyIHNlbGVjdG9ycyA9IHtcbiAgICBpZHM6IHtcbiAgICAgICAgd2lkZ2V0OiAnd2lkZ2V0JyxcbiAgICAgICAgcGxvdDogJ3Bsb3QnLFxuICAgICAgICBncm91cDogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItZ3JvdXAtbGF5ZXJcIitsZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnTGF5ZXI6IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gcGxvdElEK1wiLXN2Zy1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyO1xuICAgIHRoaXMucGxvdDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChwbG90SUQsIGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpO1xuICAgIHRoaXMucGxvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgdGhpcy5pbm5lckNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIocGxvdElELCBsZXZlbCkpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuZGltZW5zaW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIGlmICghdGhpcy5pbm5lckNvbnRhaW5lcikgdGhyb3cgKCdlZGl0U1ZHOiBpbm5lckNvbnRhaW5lciBtdXN0IGJlIGluaXRpYWxpemVkJyk7XG4gICAgcmV0dXJuIFt0aGlzLmlubmVyQ29udGFpbmVyLmdldEJCb3goKS53aWR0aCwgdGhpcy5pbm5lckNvbnRhaW5lci5nZXRCQm94KCkuaGVpZ2h0XTtcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNmb3JtYXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdmFyIHRyYW5zZm9ybWF0aW9ucyA9IHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG4gICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgdHJhbnNsYXRlLnNldFRyYW5zbGF0ZSgwLCAwKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHRyYW5zbGF0ZSwgMCk7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICBzY2FsZS5zZXRTY2FsZSgxLjAsIDEuMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZShzY2FsZSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggIT09IDIpIHRocm93IFwiZWRpdFNWRzogZXhwZWN0ZWQgdHJhbnNmb3JtYXRpb25zIHRvIGJlIGEgbGlzdCBvZiBsZW5ndGggMi5cIjtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDApLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMSkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIFwiZWRpdFNWRzogdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzaGlmdFgsIHNoaWZ0WSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgaWYgKCghc2hpZnRYIHx8ICFzaGlmdFkpICYmIChzaGlmdFggIT0gMCAmJiBzaGlmdFkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCB0cmFuc2xhdGUgU1ZHIG9iamVjdCB3aXRoIG51bGwsIHVuZGVmaW5lZCwgb3IgZW1wdHkgc2hpZnQgdmFsdWVzLiBzaGlmdFg6IFwiK3NoaWZ0WCtcIiBzaGlmdFk6XCIrc2hpZnRZKTtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMCk7XG4gICAgaWYgKHRyYW5zbGF0aW9uLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgIHRyYW5zbGF0aW9uLnNldFRyYW5zbGF0ZShzaGlmdFgsIHNoaWZ0WSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwib3BhY2l0eVwiLCBvcGFjaXR5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLypcblRlc3RcblxudmFyIGwyID0gbmV3IGVkaXRTVkcoKS5zZXQoMik7XG5cbnZhciB4ID0gbDIudHJhbnNmb3JtYXRpb25zKCk7IFxuLy8gY2hlY2sgdHJhbnNsYXRlXG54LmdldEl0ZW0oMCkubWF0cml4LmU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbnguZ2V0SXRlbSgwKS5tYXRyaXguZjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMFxuLy8gY2hlY2sgc2NhbGVcbnguZ2V0SXRlbSgxKS5tYXRyaXguYTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxueC5nZXRJdGVtKDEpLm1hdHJpeC5kOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAxXG4vLyBjaGVjayBsZW5ndGhcbngubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMlxuXG5sMi50cmFuc2xhdGUoNTAsIDUwKTtcblxubDIuc2NhbGUoLjUsIC41KTtcblxubDIuZmFkZSguNSk7XG5cbmwyLmhpZGUoKTtcblxubDIuc2hvdygpO1xuKi9cblxubW9kdWxlLmV4cG9ydHMuZWRpdFNWRyA9IGVkaXRTVkc7IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMvdXRpbHMuanMnKS51dGlscztcblxudmFyIHRhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xufTtcblxudGFnLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKHRoaXMuZWxlbWVudCAhPSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZXQoKSBjYW5ub3Qgb3ZlcnJpZGUgbm9uLW51bGwgZWxlbWVudCB3aXRoIG5ldyBlbGVtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHJldHVybiB0aGlzO1xufVxuXG50YWcucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZCh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuY3JlYXRlKCkgbXVzdCBoYXZlIGEgYHR5cGVgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5jcmVhdGVOUyA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZCh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuY3JlYXRlTlMoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKGlkKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuc2VsZWN0KCkgbXVzdCBoYXZlIGFuIGBpZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuYXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChhdHRyKSB8fCB1dGlscy5udWxsT3JVbmRlZmluZWQodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hdHRyaWJ1dGUoKSBtdXN0IGhhdmUgYGF0dHJgIGFuZCBgdmFsdWVgIGFyZ3VtZW50cy5cIik7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoY2hpbGQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5hcHBlbmQoKSBtdXN0IGhhdmUgYSBgY2hpbGRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG50YWcucHJvdG90eXBlLnBsYWNlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQocGFyZW50KSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkucGxhY2UoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQocGFyZW50KSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkucmVtb3ZlKCkgbXVzdCBoYXZlIGEgYHBhcmVudGAgYXJndW1lbnQuXCIpO1xuICAgIHBhcmVudC5lbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG59O1xuXG50YWcucHJvdG90eXBlLmFkZEhSRUYgPSBmdW5jdGlvbiAoaHJlZikge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoaHJlZikpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmFkZEhSRUYoKSBtdXN0IGhhdmUgYSBgaHJlZmAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIGhyZWYpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMudGFnID0gdGFnO1xuIiwidmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpbmRleCBpbiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXlzW2luZGV4XSBpbiBvYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgeHk6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsneCcsICd5J10pO1xuICAgIH0sXG4gICAgZGltZW5zaW9uczogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd3aWR0aCcsICdoZWlnaHQnXSk7XG4gICAgfSxcbiAgICBwb2ludDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBzY2FsZTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBsYXllcjogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWydsZXZlbCcsICd0b3BMZWZ0JywgJ3NjYWxlJywgJ29wYWNpdHknXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5wb2ludChvYmplY3RbJ3RvcExlZnQnXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5zY2FsZShvYmplY3RbJ3NjYWxlJ10pO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zY2hlbWEgPSBzY2hlbWE7IiwidmFyIHV0aWxzID0ge1xuICAgIG51bGxPclVuZGVmaW5lZDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy51dGlscyA9IHV0aWxzOyJdfQ==
