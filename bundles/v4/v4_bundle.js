(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;

var plot = require('./plot/plot.js').plot;
var gui = require('./ui/gui.js').gui;

var handlers = require('./ui/handlers.js').handlers;

function init() {
    // add widget stuff to page
    var widget = setup.setUpWidget('widget-div', selectors.ids.widget, 1124, 350, '#e8ebef');
    setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);

    // add images
    setup.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
    setup.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 256, 256);
    setup.insertPlotImages('caffeine_consumption2', 2, 3, '/Users/maccum/manhattan_data/plots/caffeine_plots_2/caffeine_consumption', 256, 256);

    // initialize info about each plot's name, url, min/max zoom level
    plot.addPlotByName('caffeine_consumption', '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 2, 7);
    plot.addPlotByName('standing_height', '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 2, 8);
    plot.addPlotByName('caffeine_consumption2', '/Users/maccum/manhattan_data/plots/caffeine_plots_2/caffeine_consumption', 2, 3);

    // set up default plot for model
    plot.switchPlots('caffeine_consumption2');

    // display default plot
    gui.render(plot.getInfoForGUI());

    // set up listeners
    handlers.listenForDrag(document.getElementById('plot'));
    document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
    document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
    document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);
}

init();
},{"./plot/plot.js":2,"./ui/gui.js":4,"./ui/handlers.js":5,"./ui/search.js":6,"./ui/setup.js":7,"./utils/selectors.js":9}],2:[function(require,module,exports){
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
},{"../utils/schema.js":8,"./position.js":3}],3:[function(require,module,exports){
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
},{"../utils/schema.js":8,"../utils/svg.js":10,"../utils/tag.js":11}],5:[function(require,module,exports){
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
},{"../plot/plot.js":2,"../ui/gui.js":4}],7:[function(require,module,exports){
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
},{"../utils/selectors.js":9,"../utils/tag.js":11}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{"./selectors.js":9}],11:[function(require,module,exports){
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

},{"./typecheck.js":12}],12:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjQvc3JjL21haW4uanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bsb3QuanMiLCJzY3JpcHRzL3Y0L3NyYy9wbG90L3Bvc2l0aW9uLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvZ3VpLmpzIiwic2NyaXB0cy92NC9zcmMvdWkvaGFuZGxlcnMuanMiLCJzY3JpcHRzL3Y0L3NyYy91aS9zZWFyY2guanMiLCJzY3JpcHRzL3Y0L3NyYy91aS9zZXR1cC5qcyIsInNjcmlwdHMvdjQvc3JjL3V0aWxzL3NjaGVtYS5qcyIsInNjcmlwdHMvdjQvc3JjL3V0aWxzL3NlbGVjdG9ycy5qcyIsInNjcmlwdHMvdjQvc3JjL3V0aWxzL3N2Zy5qcyIsInNjcmlwdHMvdjQvc3JjL3V0aWxzL3RhZy5qcyIsInNjcmlwdHMvdjQvc3JjL3V0aWxzL3R5cGVjaGVjay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgc2VhcmNoID0gcmVxdWlyZSgnLi91aS9zZWFyY2guanMnKS5zZWFyY2g7XG52YXIgc2V0dXAgPSByZXF1aXJlKCcuL3VpL3NldHVwLmpzJykuc2V0dXA7XG52YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi91dGlscy9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBwbG90ID0gcmVxdWlyZSgnLi9wbG90L3Bsb3QuanMnKS5wbG90O1xudmFyIGd1aSA9IHJlcXVpcmUoJy4vdWkvZ3VpLmpzJykuZ3VpO1xuXG52YXIgaGFuZGxlcnMgPSByZXF1aXJlKCcuL3VpL2hhbmRsZXJzLmpzJykuaGFuZGxlcnM7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gICAgLy8gYWRkIHdpZGdldCBzdHVmZiB0byBwYWdlXG4gICAgdmFyIHdpZGdldCA9IHNldHVwLnNldFVwV2lkZ2V0KCd3aWRnZXQtZGl2Jywgc2VsZWN0b3JzLmlkcy53aWRnZXQsIDExMjQsIDM1MCwgJyNlOGViZWYnKTtcbiAgICBzZXR1cC5zZXRVcFBsb3Qod2lkZ2V0LCBzZWxlY3RvcnMuaWRzLnBsb3QsIDEwMjQsIDI1NiwgNTAsIDMwKTtcblxuICAgIC8vIGFkZCBpbWFnZXNcbiAgICBzZXR1cC5pbnNlcnRQbG90SW1hZ2VzKCdjYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDcsICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL2NhZmZlaW5lX3Bsb3RzL2NhZmZlaW5lX2NvbnN1bXB0aW9uJywgMjU2LCAyNTYpO1xuICAgIHNldHVwLmluc2VydFBsb3RJbWFnZXMoJ3N0YW5kaW5nX2hlaWdodCcsIDIsIDgsICcvVXNlcnMvbWFjY3VtL21hbmhhdHRhbl9kYXRhL3Bsb3RzL3N0YW5kaW5nX2hlaWdodF9wbG90cy9zdGFuZGluZ19oZWlnaHQnLCAyNTYsIDI1Nik7XG4gICAgc2V0dXAuaW5zZXJ0UGxvdEltYWdlcygnY2FmZmVpbmVfY29uc3VtcHRpb24yJywgMiwgMywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDI1NiwgMjU2KTtcblxuICAgIC8vIGluaXRpYWxpemUgaW5mbyBhYm91dCBlYWNoIHBsb3QncyBuYW1lLCB1cmwsIG1pbi9tYXggem9vbSBsZXZlbFxuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnY2FmZmVpbmVfY29uc3VtcHRpb24nLCAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDcpO1xuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnc3RhbmRpbmdfaGVpZ2h0JywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvc3RhbmRpbmdfaGVpZ2h0X3Bsb3RzL3N0YW5kaW5nX2hlaWdodCcsIDIsIDgpO1xuICAgIHBsb3QuYWRkUGxvdEJ5TmFtZSgnY2FmZmVpbmVfY29uc3VtcHRpb24yJywgJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvY2FmZmVpbmVfcGxvdHNfMi9jYWZmZWluZV9jb25zdW1wdGlvbicsIDIsIDMpO1xuXG4gICAgLy8gc2V0IHVwIGRlZmF1bHQgcGxvdCBmb3IgbW9kZWxcbiAgICBwbG90LnN3aXRjaFBsb3RzKCdjYWZmZWluZV9jb25zdW1wdGlvbjInKTtcblxuICAgIC8vIGRpc3BsYXkgZGVmYXVsdCBwbG90XG4gICAgZ3VpLnJlbmRlcihwbG90LmdldEluZm9Gb3JHVUkoKSk7XG5cbiAgICAvLyBzZXQgdXAgbGlzdGVuZXJzXG4gICAgaGFuZGxlcnMubGlzdGVuRm9yRHJhZyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxvdCcpKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIGhhbmRsZXJzLm9uV2hlZWwpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZXJzLm9uQnV0dG9uQ2xpY2tab29tSW4pO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1vdXQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVycy5vbkJ1dHRvbkNsaWNrWm9vbU91dCk7XG59XG5cbmluaXQoKTsiLCJ2YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vdXRpbHMvc2NoZW1hLmpzJykuc2NoZW1hO1xudmFyIHBvc2l0aW9uID0gcmVxdWlyZShcIi4vcG9zaXRpb24uanNcIikucG9zaXRpb247XG5cbnZhciBwbG90ID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGxvdHNCeU5hbWUgPSB7XG4gICAgICAgIC8vJ2NhZmZlaW5lX2NvbnN1bXB0aW9uJzoge3VybDogJy9wYXRoL2hlcmUvJywgbWluWm9vbTogMiwgbWF4Wm9vbTogN30sXG4gICAgICAgIC8vJ3N0YW5kaW5nX2hlaWdodCcgOiB7dXJsOiAnL3BhdGgvaGVyZS8nLCBtaW5ab29tOiAyLCBtYXhab29tOiA4fSxcbiAgICB9XG5cbiAgICB2YXIgcGxvdElEID0gbnVsbCxcbiAgICAgICAgbWluaW11bUxldmVsID0gbnVsbCxcbiAgICAgICAgbWF4aW11bUxldmVsID0gbnVsbCxcbiAgICAgICAgc2NhbGVGYWN0b3IgPSAxMDAwMCxcbiAgICAgICAgem9vbUluY3JlbWVudCA9IDUsXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCA9IFs2MDAwLCA5MDAwXSxcbiAgICAgICAgc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbMTIwMDAsIDE4MDAwXSxcbiAgICAgICAgdmlzaWJsZXMgPSB7fSxcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pLFxuICAgICAgICBkaW1lbnNpb25zID0ge307XG5cblxuICAgIGZ1bmN0aW9uIGdldFBsb3RJRCgpIHtcbiAgICAgICAgcmV0dXJuIHBsb3RJRDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQbG90c0J5TmFtZSgpIHtcbiAgICAgICAgcmV0dXJuIHBsb3RzQnlOYW1lO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldERpbWVuc2lvbnMoKSB7XG4gICAgICAgIHJldHVybiBkaW1lbnNpb25zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFZpc2libGVzKCkge1xuICAgICAgICByZXR1cm4gdmlzaWJsZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SGlkZGVucygpIHtcbiAgICAgICAgcmV0dXJuIGhpZGRlbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkUGxvdEJ5TmFtZShuYW1lLCB1cmwsIG1pblpvb20sIG1heFpvb20pIHtcbiAgICAgICAgcGxvdHNCeU5hbWVbbmFtZV0gPSB7IHVybDogdXJsLCBtaW5ab29tOiBtaW5ab29tLCBtYXhab29tOiBtYXhab29tIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHBsb3RJRCA9IG51bGw7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIG1heGltdW1MZXZlbCA9IG51bGw7XG4gICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldE1pbk1heExldmVsKG1pbiwgbWF4KSB7XG4gICAgICAgIG1pbmltdW1MZXZlbCA9IG1pbjtcbiAgICAgICAgbWF4aW11bUxldmVsID0gbWF4O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXRpYWxpemVWaXNpYmxlKGxldmVsLCBkaW1zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IG1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IG1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCB2aXNpYmxlIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogc2NhbGVGYWN0b3IsIHk6IDEgKiBzY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdGlhbGl6ZUhpZGRlbihsZXZlbCwgZGltcykge1xuICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN3aXRjaFBsb3RzKG5hbWUpIHtcbiAgICAgICAgcmVzZXQoKTtcbiAgICAgICAgcGxvdElEID0gbmFtZTtcbiAgICAgICAgdmFyIG1pblpvb20gPSBwbG90c0J5TmFtZVtuYW1lXS5taW5ab29tLFxuICAgICAgICAgICAgbWF4Wm9vbSA9IHBsb3RzQnlOYW1lW25hbWVdLm1heFpvb207XG4gICAgICAgIHNldE1pbk1heExldmVsKG1pblpvb20sIG1heFpvb20pO1xuXG4gICAgICAgIC8vIFRPRE86IG1ha2Ugd2lkdGggYW5kIGhlaWdodCBvZiBwbG90cyBmbGV4aWJsZVxuICAgICAgICB2YXIgbkNvbHMgPSBmdW5jdGlvbiAoeikgeyByZXR1cm4gTWF0aC5wb3coMiwgeik7IH1cbiAgICAgICAgaW5pdGlhbGl6ZVZpc2libGUobWluWm9vbSwgeyB3aWR0aDogbkNvbHMobWluWm9vbSkgKiAyNTYsIGhlaWdodDogMjU2IH0pO1xuICAgICAgICBmb3IgKHZhciBpID0gbWluWm9vbSArIDE7IGkgPCBtYXhab29tICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBpbml0aWFsaXplSGlkZGVuKGksIHsgd2lkdGg6IG5Db2xzKGkpICogMjU2LCBoZWlnaHQ6IDI1NiB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuaXRTY2FsZShzY2FsZSkge1xuICAgICAgICBpZiAoKHNjYWxlLnggPiAuNSAmJiBzY2FsZS54IDwgMikgfHwgKHNjYWxlLnkgPiAuNSAmJiBzY2FsZS55IDwgMikpIHRocm93IG5ldyBFcnJvcignc2NhbGUgYWxyZWFkeSBpbiB1bml0IHNjYWxlJyk7XG4gICAgICAgIHJldHVybiB7IHg6IHNjYWxlLnggLyBzY2FsZUZhY3RvciwgeTogc2NhbGUueSAvIHNjYWxlRmFjdG9yIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvdyhsZXZlbCwgdG9wTGVmdCwgc2NhbGUsIG9wYWNpdHkpIHtcbiAgICAgICAgaWYgKCFoaWRkZW5zLmhhcyhsZXZlbCkpIHRocm93IG5ldyBFcnJvcihcIlRyaWVkIHRvIHNob3cgYSBsZXZlbCB0aGF0IHdhcyBub3QgaGlkZGVuLlwiKTtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHRvcExlZnQsIHNjYWxlOiBzY2FsZSwgb3BhY2l0eTogb3BhY2l0eSB9O1xuICAgICAgICBoaWRkZW5zLmRlbGV0ZShsZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGlkZShsZXZlbCkge1xuICAgICAgICBpZiAoIXZpc2libGVzW2xldmVsXSkgdGhyb3cgbmV3IEVycm9yKFwiVHJpZWQgdG8gaGlkZSBhIGxldmVsIHRoYXQgaXMgbm90IHZpc2libGVcIik7XG4gICAgICAgIGRlbGV0ZSB2aXNpYmxlc1tsZXZlbF07XG4gICAgICAgIGhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkge1xuICAgICAgICB2YXIgeFNjYWxlID0gc2NhbGUueDtcbiAgICAgICAgaWYgKHhTY2FsZSA8IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBoaWdoZXIgem9vbSBsZXZlbCAob24gdG9wIGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBtYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzAsIDFdKTtcbiAgICAgICAgfSAvKmVsc2UgaWYgKHhTY2FsZSA+IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggbG93ZXIgem9vbSBsZXZlbCAoYmVsb3cgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIHBsb3QubWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMSwgMF0pO1xuICAgICAgICB9Ki8gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcFZhbHVlT250b1JhbmdlKHZhbHVlLCBvbGRSYW5nZSwgbmV3UmFuZ2UpIHtcbiAgICAgICAgdmFyIG9sZFNwYW4gPSBvbGRSYW5nZVsxXSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgbmV3U3BhbiA9IG5ld1JhbmdlWzFdIC0gbmV3UmFuZ2VbMF07XG4gICAgICAgIHZhciBkaXN0YW5jZVRvVmFsdWUgPSB2YWx1ZSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgcGVyY2VudFNwYW5Ub1ZhbHVlID0gZGlzdGFuY2VUb1ZhbHVlIC8gb2xkU3BhbjtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9OZXdWYWx1ZSA9IHBlcmNlbnRTcGFuVG9WYWx1ZSAqIG5ld1NwYW47XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IG5ld1JhbmdlWzBdICsgZGlzdGFuY2VUb05ld1ZhbHVlO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwb3NpdGlvbihuZXdUb3BMZWZ0KSB7XG4gICAgICAgIGlmICgoIW5ld1RvcExlZnQueCAmJiBuZXdUb3BMZWZ0LnggIT0gMCkgfHwgKCFuZXdUb3BMZWZ0LnkgJiYgbmV3VG9wTGVmdC55ICE9IDApKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbmV3IFRvcCBMZWZ0OiBbXCIgKyBuZXdUb3BMZWZ0LnggKyBcIiwgXCIgKyBuZXdUb3BMZWZ0LnkgKyBcIl1cIik7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS50b3BMZWZ0ID0gbmV3VG9wTGVmdDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0T3BhY2l0aWVzKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0ub3BhY2l0eSA9IGNhbGN1bGF0ZU9wYWNpdHkodmlzaWJsZXNba2V5XS5zY2FsZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRQbG90SUQoaWQpIHtcbiAgICAgICAgcGxvdElEID0gaWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SW5mb0ZvckdVSSgpIHtcbiAgICAgICAgdmFyIGxpc3RPZlZpc2libGVzID0gT2JqZWN0LmtleXModmlzaWJsZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAvLyBjb252ZXJ0IHNjYWxlIGZvciBwYXNzaW5nIHRvIEdVSTogXG4gICAgICAgICAgICB2YXIgZ3VpTGF5ZXIgPSB7XG4gICAgICAgICAgICAgICAgbGV2ZWw6IHZpc2libGVzW2tleV0ubGV2ZWwsXG4gICAgICAgICAgICAgICAgdG9wTGVmdDogdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgIHNjYWxlOiB1bml0U2NhbGUodmlzaWJsZXNba2V5XS5zY2FsZSksXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogdmlzaWJsZXNba2V5XS5vcGFjaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBndWlMYXllcjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShoaWRkZW5zKTtcbiAgICAgICAgLy9yZXR1cm4gW2xpc3RPZlZpc2libGVzLCBsaXN0T2ZIaWRkZW5zXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBsb3RJRDogcGxvdElELFxuICAgICAgICAgICAgdmlzaWJsZUxheWVyczogbGlzdE9mVmlzaWJsZXMsXG4gICAgICAgICAgICBoaWRkZW5MZXZlbHM6IGxpc3RPZkhpZGRlbnMsXG4gICAgICAgICAgICBkaW1lbnNpb25zOiBnZXREaW1lbnNpb25zKCksXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhckZvclRlc3RpbmcoKSB7XG4gICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluY3JlYXNlU2NhbGUoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8IHNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCArPSB6b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPj0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0gJiYga2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgaGlkZShrZXkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgKyAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsIDw9IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSwgeTogMSAqIHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHNob3cobGF5ZXJUb1JldmVhbCwgdmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlY3JlYXNlU2NhbGUoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgaWYgKCEoa2V5ID09IG1pbmltdW1MZXZlbCAmJiB2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8PSBzY2FsZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggLT0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggLT0gem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSAmJiBrZXkgPiBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsID49IG1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdLCB5OiBzY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB6b29tKGZvY3VzLCB2ZXJ0aWNhbCkge1xuICAgICAgICB2YXIgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBmaXJzdCA9IHZpc2libGVzW2ZpcnN0S2V5XSxcbiAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIHBlcmNlbnRhZ2VDb29yZGluYXRlcyA9IHBvc2l0aW9uLnRvcExlZnRUb1BlcmNlbnRhZ2UoZm9jdXMsIGZpcnN0LnRvcExlZnQsIHVuaXRTY2FsZShmaXJzdC5zY2FsZSksIHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICAgIHZhciBob3dNdWNoID0gTWF0aC5mbG9vcihNYXRoLmFicyh2ZXJ0aWNhbCkgLyA1KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3dNdWNoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh2ZXJ0aWNhbCA8IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmV3Rmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBuZXdGaXJzdCA9IHZpc2libGVzW25ld0ZpcnN0S2V5XSxcbiAgICAgICAgICAgIG5ld1dpZHRoID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBuZXdIZWlnaHQgPSBkaW1lbnNpb25zW25ld0ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIG5ld1RvcExlZnQgPSBwb3NpdGlvbi5wZXJjZW50YWdlVG9Ub3BMZWZ0KGZvY3VzLCBwZXJjZW50YWdlQ29vcmRpbmF0ZXMsIHVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICByZXBvc2l0aW9uKG5ld1RvcExlZnQpO1xuICAgICAgICByZXNldE9wYWNpdGllcygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNuYXBJbihmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzbmFwT3V0KGZvY3VzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgIHRoaXMuem9vbShmb2N1cywgNSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHJhZyhjaGFuZ2VJblBvc2l0aW9uKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS50b3BMZWZ0LnggKz0gY2hhbmdlSW5Qb3NpdGlvbi54O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0UGxvdElEOiBzZXRQbG90SUQsXG4gICAgICAgIGdldEluZm9Gb3JHVUk6IGdldEluZm9Gb3JHVUksXG4gICAgICAgIGdldFBsb3RJRDogZ2V0UGxvdElELFxuICAgICAgICBpbml0aWFsaXplVmlzaWJsZTogaW5pdGlhbGl6ZVZpc2libGUsXG4gICAgICAgIGluaXRpYWxpemVIaWRkZW46IGluaXRpYWxpemVIaWRkZW4sXG4gICAgICAgIGNsZWFyRm9yVGVzdGluZzogY2xlYXJGb3JUZXN0aW5nLFxuICAgICAgICBnZXRWaXNpYmxlczogZ2V0VmlzaWJsZXMsXG4gICAgICAgIGdldEhpZGRlbnM6IGdldEhpZGRlbnMsXG4gICAgICAgIGluY3JlYXNlU2NhbGU6IGluY3JlYXNlU2NhbGUsXG4gICAgICAgIGRlY3JlYXNlU2NhbGU6IGRlY3JlYXNlU2NhbGUsXG4gICAgICAgIHpvb206IHpvb20sXG4gICAgICAgIHNuYXBJbjogc25hcEluLFxuICAgICAgICBzbmFwT3V0OiBzbmFwT3V0LFxuICAgICAgICBkcmFnOiBkcmFnLFxuICAgICAgICBzZXRNaW5NYXhMZXZlbDogc2V0TWluTWF4TGV2ZWwsXG4gICAgICAgIHJlc2V0OiByZXNldCxcbiAgICAgICAgYWRkUGxvdEJ5TmFtZTogYWRkUGxvdEJ5TmFtZSxcbiAgICAgICAgc3dpdGNoUGxvdHM6IHN3aXRjaFBsb3RzLFxuICAgICAgICBnZXREaW1lbnNpb25zOiBnZXREaW1lbnNpb25zLFxuICAgICAgICBnZXRQbG90c0J5TmFtZTogZ2V0UGxvdHNCeU5hbWUsXG4gICAgICAgIF9oaWRlOiBoaWRlLFxuICAgICAgICBfc2hvdzogc2hvdyxcbiAgICAgICAgX2NhbGN1bGF0ZU9wYWNpdHk6IGNhbGN1bGF0ZU9wYWNpdHksXG4gICAgICAgIF9tYXBWYWx1ZU9udG9SYW5nZTogbWFwVmFsdWVPbnRvUmFuZ2UsXG4gICAgfTtcbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnBsb3QgPSBwbG90OyIsInZhciBwb3NpdGlvbiA9IHtcbiAgICBjYWxjdWxhdGVQZXJjZW50OiBmdW5jdGlvbiAocG9zaXRpb25BLCBwb3NpdGlvbkIsIGxlbmd0aEIsIHNjYWxlQikge1xuICAgICAgICBpZiAobGVuZ3RoQiA8PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJMZW5ndGggbXVzdCBiZSBwb3NpdGl2ZS5cIik7XG4gICAgICAgIHJldHVybiAocG9zaXRpb25BIC0gcG9zaXRpb25CKSAvIChsZW5ndGhCICogc2NhbGVCKTtcbiAgICB9LFxuICAgIGNhbGN1bGF0ZVBvc2l0aW9uOiBmdW5jdGlvbiAocG9zaXRpb25BLCBwZXJjZW50QiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIHJldHVybiBwb3NpdGlvbkEgLSAoKGxlbmd0aEIgKiBzY2FsZUIpICogcGVyY2VudEIpO1xuICAgIH0sXG4gICAgdG9wTGVmdFRvUGVyY2VudGFnZTogZnVuY3Rpb24gKGZvY3VzLCB0b3BMZWZ0LCBzY2FsZSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy54LCB0b3BMZWZ0LngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBlcmNlbnQoZm9jdXMueSwgdG9wTGVmdC55LCBoZWlnaHQsIHNjYWxlLnkpLFxuICAgICAgICB9O1xuICAgIH0sXG4gICAgcGVyY2VudGFnZVRvVG9wTGVmdDogZnVuY3Rpb24gKGZvY3VzLCBwZXJjZW50YWdlLCBzY2FsZSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogcG9zaXRpb24uY2FsY3VsYXRlUG9zaXRpb24oZm9jdXMueCwgcGVyY2VudGFnZS54LCB3aWR0aCwgc2NhbGUueCksXG4gICAgICAgICAgICB5OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy55LCBwZXJjZW50YWdlLnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMucG9zaXRpb24gPSBwb3NpdGlvbjsiLCJ2YXIgZWRpdFNWRyA9IHJlcXVpcmUoJy4uL3V0aWxzL3N2Zy5qcycpLmVkaXRTVkc7XG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vdXRpbHMvc2NoZW1hLmpzJykuc2NoZW1hO1xudmFyIHRhZyA9IHJlcXVpcmUoJy4uL3V0aWxzL3RhZy5qcycpLnRhZztcblxudmFyIGd1aSA9IHtcbiAgICBoaWRlOiBmdW5jdGlvbihwbG90SUQpIHtcbiAgICAgICAgbmV3IHRhZygpLnNlbGVjdChwbG90SUQpLmF0dHJpYnV0ZSgnZGlzcGxheScsICdub25lJyk7XG4gICAgfSxcbiAgICByZW5kZXI6IGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgIHNjaGVtYS5jaGVjayhhcmdzLCBbJ3Bsb3RJRCcsICd2aXNpYmxlTGF5ZXJzJywgJ2hpZGRlbkxldmVscycsICdkaW1lbnNpb25zJ10pO1xuICAgICAgICB2YXIgcGxvdElEID0gYXJncy5wbG90SUQsXG4gICAgICAgICAgICB2aXNpYmxlTGF5ZXJzID0gYXJncy52aXNpYmxlTGF5ZXJzLFxuICAgICAgICAgICAgaGlkZGVuTGV2ZWxzID0gYXJncy5oaWRkZW5MZXZlbHMsXG4gICAgICAgICAgICBkaW1zID0gYXJncy5kaW1lbnNpb25zO1xuXG4gICAgICAgIG5ldyB0YWcoKS5zZWxlY3QocGxvdElEKS5hdHRyaWJ1dGUoJ2Rpc3BsYXknLCAnaW5saW5lJyk7XG5cbiAgICAgICAgaWYgKCEodmlzaWJsZUxheWVycy5sZW5ndGggPiAwICYmIHZpc2libGVMYXllcnMubGVuZ3RoIDw9IDIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGhhdmUgMS0yIHZpc2libGUgbGF5ZXJzLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGhpZGRlbkluZGV4IGluIGhpZGRlbkxldmVscykge1xuICAgICAgICAgICAgdmFyIGxldmVsID0gaGlkZGVuTGV2ZWxzW2hpZGRlbkluZGV4XTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGV2ZWwpICE9ICdbb2JqZWN0IE51bWJlcl0nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJIEVSUk9SOiBleHBlY3RlZCBhIGxpc3Qgb2YgbnVtYmVycyBmb3IgaGlkZGVuTGF5ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KHBsb3RJRCwgbGV2ZWwpLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIHZpc2libGVJbmRleCBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB2aXNpYmxlTGF5ZXJzW3Zpc2libGVJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5sYXllcihsYXllcikpIHRocm93IG5ldyBFcnJvcihcIkdVSTogZXhwZWN0ZWQgbGF5ZXIgc2NoZW1hLlwiKTtcbiAgICAgICAgICAgIGlmIChsYXllci5zY2FsZS54ID4gMiB8fCBsYXllci5zY2FsZS54IDwgLjUgfHwgbGF5ZXIuc2NhbGUueSA+IDIgfHwgbGF5ZXIuc2NhbGUueSA8IC41KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBzY2FsZSBvdXRzaWRlIFsuNSwyXSByYW5nZS4gU2NhbGUgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBbLjUsMl0gYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBHVUkuIFtcIiArIGxheWVyLnNjYWxlLnggKyBcIiwgXCIgKyBsYXllci5zY2FsZS55ICsgXCJdXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ZnQnVuZGxlID0gbmV3IGVkaXRTVkcoKS5zZXQocGxvdElELCBsYXllci5sZXZlbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkaW1zRnJvbVBhZ2UgPSBzdmdCdW5kbGUuZGltZW5zaW9ucygpO1xuICAgICAgICAgICAgaWYgKChkaW1zRnJvbVBhZ2VbMF0gIT0gZGltc1tsYXllci5sZXZlbF0ud2lkdGgpIHx8IChkaW1zRnJvbVBhZ2VbMV0gIT0gZGltc1tsYXllci5sZXZlbF0uaGVpZ2h0KSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSTogZGltZW5zaW9ucyBvZiBwbG90IG9uIHBhZ2UgZG9uJ3QgbWF0Y2ggZGltZW5zaW9ucyBvZiBwbG90IGZyb20gbW9kZWxcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN2Z0J1bmRsZVxuICAgICAgICAgICAgICAgIC50cmFuc2xhdGUobGF5ZXIudG9wTGVmdC54LCBsYXllci50b3BMZWZ0LnkpXG4gICAgICAgICAgICAgICAgLnNjYWxlKGxheWVyLnNjYWxlLngsIGxheWVyLnNjYWxlLnkpXG4gICAgICAgICAgICAgICAgLmZhZGUobGF5ZXIub3BhY2l0eSlcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpc2libGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIHNjYWxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBvcGFjaXR5U3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZpc2libGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLmxldmVsO1xuICAgICAgICAgICAgc2NhbGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLnNjYWxlLng7XG4gICAgICAgICAgICBvcGFjaXR5U3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLm9wYWNpdHk7XG4gICAgICAgIH1cbiAgICAgICAgJChcIiN6b29tLWRpdlwiKS50ZXh0KHZpc2libGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNmcmFjdGlvbmFsLXpvb20tZGl2XCIpLnRleHQoc2NhbGVzU3RyaW5nKTtcbiAgICAgICAgJChcIiNvcGFjaXR5LWRpdlwiKS50ZXh0KG9wYWNpdHlTdHJpbmcpO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5ndWkgPSBndWk7IiwidmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xudmFyIGd1aSA9IHJlcXVpcmUoJy4uL3VpL2d1aS5qcycpLmd1aTtcblxudmFyIGhhbmRsZXJzID0ge1xuICAgIGNhbGxHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ3VpLnJlbmRlcihwbG90LmdldEluZm9Gb3JHVUkoKSk7XG4gICAgfSxcblxuICAgIGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3Q6IGZ1bmN0aW9uIChtb3VzZVgsIG1vdXNlWSwgYm91bmRpbmdPYmplY3QpIHtcbiAgICAgICAgdmFyIGN0bSA9IGJvdW5kaW5nT2JqZWN0LmdldFNjcmVlbkNUTSgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogKG1vdXNlWCAtIGN0bS5lKSAvIGN0bS5hLFxuICAgICAgICAgICAgeTogKG1vdXNlWSAtIGN0bS5mKSAvIGN0bS5kXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGxpc3RlbkZvckRyYWc6IGZ1bmN0aW9uIChzdmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJsaXN0ZW5Gb3JEcmFnXCIpO1xuICAgICAgICB2YXIgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAvL3ZhciBzdmcgPSBldnQudGFyZ2V0O1xuXG4gICAgICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBiZWdpbkRyYWcsIGZhbHNlKTtcbiAgICAgICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcsIGZhbHNlKTtcbiAgICAgICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBlbmREcmFnLCBmYWxzZSk7XG5cbiAgICAgICAgdmFyIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZXZ0KSB7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlcnMuZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBiZWdpbkRyYWcoZXZ0KSB7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYmVnaW5EcmFnXCIpO1xuICAgICAgICAgICAgaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgICAgICAgICB2YXIgbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnID0gZ2V0TW91c2VQb3NpdGlvbihldnQpO1xuICAgICAgICAgICAgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUgPSBtb3VzZVBvc2l0aW9uT25TdGFydERyYWc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBkcmFnKGV2dCkge1xuICAgICAgICAgICAgaWYgKGlzRHJhZ2dpbmcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudE1vdXNlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZUluTW91c2VQb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogY3VycmVudE1vdXNlUG9zaXRpb24ueCAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLngsXG4gICAgICAgICAgICAgICAgICAgIHk6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnkgLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS55LFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBwbG90LmRyYWcoY2hhbmdlSW5Nb3VzZVBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG5cbiAgICAgICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IGN1cnJlbnRNb3VzZVBvc2l0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZW5kRHJhZyhldnQpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG9uV2hlZWw6IGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBob3Jpem9udGFsID0gZXZ0LmRlbHRhWDtcbiAgICAgICAgdmFyIHZlcnRpY2FsID0gZXZ0LmRlbHRhWTtcblxuICAgICAgICBpZiAoTWF0aC5hYnModmVydGljYWwpID49IE1hdGguYWJzKGhvcml6b250YWwpKSB7XG4gICAgICAgICAgICB2YXIgc3ZnID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpO1xuICAgICAgICAgICAgdmFyIG1vdXNlUG9zID0gaGFuZGxlcnMuZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgICAgICAgICBwbG90Lnpvb20obW91c2VQb3MsIHZlcnRpY2FsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBsb3QuZHJhZyh7IHg6IGhvcml6b250YWwsIHk6IDAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgfSxcblxuICAgIG9uQnV0dG9uQ2xpY2tab29tSW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgLTUpO1xuICAgICAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnNuYXBJbih7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG5cbiAgICBvbkJ1dHRvbkNsaWNrWm9vbU91dDogZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInNuYXAgem9vbSBvdXRcIik7XG5cbiAgICAgICAgcGxvdC56b29tKHsgeDogNTEyLCB5OiAxMjggfSwgNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3Quc25hcE91dCh7IHg6IDUxMiwgeTogMTI4IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVycy5jYWxsR1VJKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLnN0YWNrKTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5oYW5kbGVycyA9IGhhbmRsZXJzOyIsInZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBndWkgPSByZXF1aXJlKCcuLi91aS9ndWkuanMnKS5ndWk7XG5cbi8qIFxuU2VhcmNoIGJhciBmb3IgZGlzcGxheWluZyByZXN1bHRzIG9mIHF1ZXJ5LlxuXG5kZXBlbmRlbmN5OiBmdXNlIFxuKi9cbnZhciBzZWFyY2ggPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIHJlc3VsdHMgPSBbXTsgLy8gcmVzdWx0IGZyb20gc2VhcmNoIHF1ZXJ5XG4gICAgdmFyIGZvY3VzID0gMTsgLy8gbi10aCByb3cgb2YgcmVzdWx0cyB0YWJsZSB3ZSdyZSBmb2N1c2VkIG9uXG5cbiAgICB2YXIgcGhlbm90eXBlcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgICAgaWQ6IDAsXG4gICAgICAgICAgICB0aXRsZTogXCJzdGFuZGluZ19oZWlnaHRcIixcbiAgICAgICAgICAgIHVybDogJy9Vc2Vycy9tYWNjdW0vbWFuaGF0dGFuX2RhdGEvcGxvdHMvc3RhbmRpbmdfaGVpZ2h0X3Bsb3RzL3N0YW5kaW5nX2hlaWdodCcsXG4gICAgICAgICAgICBkZXNjOiAnTG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZWxpdCwgc2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgaWQ6IDEsXG4gICAgICAgICAgICB0aXRsZTogXCJjYWZmZWluZV9jb25zdW1wdGlvblwiLFxuICAgICAgICAgICAgdXJsOiAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90cy9jYWZmZWluZV9jb25zdW1wdGlvbicsXG4gICAgICAgICAgICBkZXNjOiAnZG8gZWl1c21vZCB0ZW1wb3IgaW5jaWRpZHVudCB1dCBsYWJvcmUgZXQgZG9sb3JlIG1hZ25hIGFsaXF1YS4nLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBpZDogMixcbiAgICAgICAgICAgIHRpdGxlOiBcImNhZmZlaW5lX2NvbnN1bXB0aW9uMlwiLFxuICAgICAgICAgICAgdXJsOiAnL1VzZXJzL21hY2N1bS9tYW5oYXR0YW5fZGF0YS9wbG90cy9jYWZmZWluZV9wbG90czIvY2FmZmVpbmVfY29uc3VtcHRpb24nLFxuICAgICAgICAgICAgZGVzYzogJ3RyYW5zcGFyZW50IGJhY2tncm91bmQnLFxuICAgICAgICB9XG4gICAgXTtcblxuICAgIC8vIGZ1c2Ugb3B0aW9uc1xuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICBzaG91bGRTb3J0OiB0cnVlLFxuICAgICAgICBpbmNsdWRlU2NvcmU6IHRydWUsXG4gICAgICAgIHRocmVzaG9sZDogMC42LFxuICAgICAgICBsb2NhdGlvbjogMCxcbiAgICAgICAgZGlzdGFuY2U6IDEwMCxcbiAgICAgICAgbWF4UGF0dGVybkxlbmd0aDogMzIsXG4gICAgICAgIG1pbk1hdGNoQ2hhckxlbmd0aDogMSxcbiAgICAgICAga2V5czogW1xuICAgICAgICAgICAgXCJ0aXRsZVwiLFxuICAgICAgICAgICAgXCJhdXRob3IuZmlyc3ROYW1lXCJcbiAgICAgICAgXVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBtYWtlVGFibGUoKSB7XG4gICAgICAgICQoJzx0YWJsZSBpZD1cInNlYXJjaF90YWJsZVwiPjx0ciBpZD1cInNlYXJjaF90aXRsZXNcIj48L3RyPjwvdGFibGU+JykuYXBwZW5kVG8oJyNzZWFyY2hiYXJfdGFyZ2V0Jyk7XG4gICAgICAgICQoJyNzZWFyY2hfdGl0bGVzJykuYXBwZW5kKCc8dGggd2lkdGg9XCIyMHB4XCI+aWQ8L3RoPicpO1xuICAgICAgICAkKCcjc2VhcmNoX3RpdGxlcycpLmFwcGVuZCgnPHRoIHdpZHRoPVwiMTAwcHhcIj5waGVub3R5cGU8L3RoPicpO1xuICAgICAgICAkKCcjc2VhcmNoX3RpdGxlcycpLmFwcGVuZCgnPHRoIHdpZHRoPVwiNDAwcHhcIj5kZXNjcmlwdGlvbjwvdGg+Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXJUYWJsZUNvbnRlbnRzKCkge1xuICAgICAgICAkKCcucm93JykucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlzcGxheVJlc3VsdHMoY29udGVudHMsIGtleXNUb0Rpc3BsYXkpIHtcbiAgICAgICAgY2xlYXJUYWJsZUNvbnRlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udGVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByb3cgPSAnPHRyIGNsYXNzPVwicm93XCI+JztcbiAgICAgICAgICAgIHZhciBpdGVtID0gY29udGVudHNbaV0uaXRlbTtcbiAgICAgICAgICAgIC8vdmFyIGtleXMgPSBPYmplY3Qua2V5cyhpdGVtKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5c1RvRGlzcGxheS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBjZWxsID0gJzx0ZD4nICsgaXRlbVtrZXlzVG9EaXNwbGF5W2pdXSArICc8L3RkPic7XG4gICAgICAgICAgICAgICAgcm93ICs9IGNlbGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByb3cgKz0gJzwvdHI+JztcbiAgICAgICAgICAgICQoJyNzZWFyY2hfdGFibGUnKS5hcHBlbmQocm93KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBmdXNlID0gbmV3IEZ1c2UocGhlbm90eXBlcywgb3B0aW9ucyk7XG4gICAgbWFrZVRhYmxlKCk7XG5cbiAgICBmdW5jdGlvbiBzZWFyY2hCYXJLZXlVcChlKSB7XG4gICAgICAgIC8vIGlmIGtleSB3YXMgbm90IHRoZSB1cCBvciBkb3duIGFycm93IGtleSwgZGlzcGxheSByZXN1bHRzXG4gICAgICAgIGlmIChlLmtleUNvZGUgIT0gNDAgJiYgZS5rZXlDb2RlICE9IDM4KSB7XG4gICAgICAgICAgICB2YXIgY29udGVudHMgPSAkKCcjc2VhcmNoYmFyJykudmFsKCk7XG4gICAgICAgICAgICByZXN1bHRzID0gZnVzZS5zZWFyY2goY29udGVudHMpO1xuICAgICAgICAgICAgZGlzcGxheVJlc3VsdHMocmVzdWx0cywgWydpZCcsICd0aXRsZScsICdkZXNjJ10pO1xuICAgICAgICAgICAgZm9jdXMgPSAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VhcmNoQmFyS2V5UHJlc3MoZSkge1xuICAgICAgICAvLyBpZiBlbnRlciBrZXkgd2FzIHByZXNzZWRcbiAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKGZvY3VzICE9IDEpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSAkKFwiLnJvdzpudGgtb2YtdHlwZShcIiArIGZvY3VzICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgIHZhciBwaGVub3R5cGUgPSBzZWxlY3RlZC5jaGlsZHJlbigpLmVxKDEpLmh0bWwoKTtcbiAgICAgICAgICAgICAgICAkKCcjc2VhcmNoYmFyJykudmFsKHBoZW5vdHlwZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9ICQoJyNzZWFyY2hiYXInKS52YWwoKTtcbiAgICAgICAgICAgICAgICByZXMgPSBmdXNlLnNlYXJjaChxdWVyeSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNbMF0uc2NvcmUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BlcmZlY3QgbWF0Y2gnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFBsb3RzKHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm5vIG1hdGNoXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2VhcmNoQmFyS2V5RG93bihlKSB7XG4gICAgICAgIC8vIGNoYW5nZSBoaWdobGlnaHRlZCByb3cgaW4gcmVzdWx0cyB0YWJsZVxuICAgICAgICBpZiAoZS5rZXlDb2RlID09IDQwKSB7IC8vIGRvd24gYXJyb3dcbiAgICAgICAgICAgIGlmIChmb2N1cyA8IHJlc3VsdHMubGVuZ3RoICsgMSkge1xuICAgICAgICAgICAgICAgIGZvY3VzICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoZS5rZXlDb2RlID09IDM4KSB7IC8vIHVwIGFycm93XG4gICAgICAgICAgICBpZiAoZm9jdXMgPiAxKSB7XG4gICAgICAgICAgICAgICAgZm9jdXMgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkKFwiLnJvd1wiKS5jaGlsZHJlbigndGQnKS5jc3MoJ2JvcmRlcicsICcxcHggc29saWQgI2RkZGRkZCcpO1xuICAgICAgICAkKFwiLnJvdzpudGgtb2YtdHlwZShcIiArIGZvY3VzICsgXCIpXCIpLmNoaWxkcmVuKCd0ZCcpLmNzcygnYm9yZGVyJywgJzFweCBzb2xpZCAjMDAwMDAwJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3dpdGNoUGxvdHMocGxvdE5hbWUpIHtcbiAgICAgICAgLy8gY2hhbmdlIHZpc2libGUgcGxvdCFcbiAgICAgICAgY29uc29sZS5sb2coJ2NoYW5naW5nIHBsb3RzJyk7XG4gICAgICAgIHZhciBvbGRQbG90SUQgPSBwbG90LmdldFBsb3RJRCgpO1xuICAgICAgICBwbG90LnN3aXRjaFBsb3RzKHBsb3ROYW1lKTtcbiAgICAgICAgZ3VpLmhpZGUob2xkUGxvdElEKTtcbiAgICAgICAgZ3VpLnJlbmRlcihwbG90LmdldEluZm9Gb3JHVUkoKSk7XG4gICAgfVxuXG4gICAgJCgnI3NlYXJjaGJhcicpLm9uKCdrZXl1cCcsIHNlYXJjaEJhcktleVVwKTtcbiAgICAkKCcjc2VhcmNoYmFyJykub24oJ2tleXByZXNzJywgc2VhcmNoQmFyS2V5UHJlc3MpO1xuICAgICQoJyNzZWFyY2hiYXInKS5vbigna2V5ZG93bicsIHNlYXJjaEJhcktleURvd24pO1xuXG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cy5zZWFyY2ggPSBzZWFyY2g7IiwidmFyIHRhZyA9IHJlcXVpcmUoJy4uL3V0aWxzL3RhZy5qcycpLnRhZztcbnZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuLi91dGlscy9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBzZXR1cCA9IChmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBfY3JlYXRlV2lkZ2V0KHRhcmdldCwgd2lkZ2V0SUQsIHdpZHRoLCBoZWlnaHQsIGJhY2tncm91bmRDb2xvcikge1xuICAgICAgICAvLyBjcmVhdGUgd2lkZ2V0IGFuZCBhcHBlbmQgaXQgdG8gdGhlIHRhcmdldFxuICAgICAgICB2YXIgd2lkZ2V0ID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3N2ZycpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdpZCcsIHdpZGdldElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcblxuICAgICAgICAvLyBjcmVhdGUgYmFja2dyb3VuZCBmb3IgcGxvdCB3aWRnZXRcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ3JlY3QnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdmaWxsJywgYmFja2dyb3VuZENvbG9yKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnc3Ryb2tlJywgJyNlM2U3ZWQnKVxuICAgICAgICAgICAgLnBsYWNlKHdpZGdldCk7XG5cbiAgICAgICAgcmV0dXJuIHdpZGdldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfY3JlYXRlUGxvdFdpbmRvdyh0YXJnZXQsIHBsb3RJRCwgd2lkdGgsIGhlaWdodCwgeCwgeSkge1xuICAgICAgICAvLyBjcmVhdGUgcGxvdCBjb250YWluZXIgKHdpZHRoIGFuZCBoZWlnaHQgZGljdGF0ZSB0aGUgc2l6ZSBvZiB0aGUgdmlld2luZyB3aW5kb3cpXG4gICAgICAgIHZhciB3aW5kb3cgPSBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnc3ZnJylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgcGxvdElEKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCB4KVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneScsIHkpXG4gICAgICAgICAgICAucGxhY2UodGFyZ2V0KTtcblxuICAgICAgICAvLyBjcmVhdGUgcGxvdCBiYWNrZ3JvdW5kXG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdyZWN0JylcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdmaWxsJywgJyNlOGViZWYnKVxuICAgICAgICAgICAgLnBsYWNlKHdpbmRvdyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9hZGRCdXR0b25zKHRhcmdldCkge1xuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEJ1dHRvbihpZCwgX2NsYXNzLCB0eXBlLCBuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHRhZygpXG4gICAgICAgICAgICAgICAgLmNyZWF0ZSgnaW5wdXQnKVxuICAgICAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgaWQpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgnY2xhc3MnLCBfY2xhc3MpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgndHlwZScsIHR5cGUpXG4gICAgICAgICAgICAgICAgLmF0dHJpYnV0ZSgnbmFtZScsIG5hbWUpXG4gICAgICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG4gICAgICAgIH07XG4gICAgICAgIGFkZEJ1dHRvbignem9vbS1pbi1idXR0b24nLCAnem9vbS1idXR0b24nLCAnYnV0dG9uJywgJ2luY3JlYXNlJykuYXR0cmlidXRlKCd2YWx1ZScsICcrJyk7XG4gICAgICAgIGFkZEJ1dHRvbignem9vbS1vdXQtYnV0dG9uJywgJ3pvb20tYnV0dG9uJywgJ2J1dHRvbicsJ2RlY3JlYXNlJykuYXR0cmlidXRlKCd2YWx1ZScsICctJyk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9hZGRQbG90VG9QYWdlKHRhcmdldCwgcGxvdElEKSB7XG4gICAgICAgIC8vIGFkZCBnIGZvciBhIHNpbmdsZSBwbG90IChwaGVub3R5cGUpLCBoaWRkZW4gd2l0aCBkaXNwbGF5PW5vbmVcbiAgICAgICAgbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2cnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBwbG90SUQpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdkaXNwbGF5JywgJ25vbmUnKVxuICAgICAgICAgICAgLnBsYWNlKHRhcmdldCk7XG4gICAgfTtcblxuICAgIC8qIHBsYWNlIGEgem9vbSBsYXllciBncm91cCA8Zz48c3ZnPjwvc3ZnPjwvZz4gaW5zaWRlIGEgcGxvdCdzIDxzdmc+ICovXG4gICAgZnVuY3Rpb24gX2FkZEdyb3VwKHBsb3RJRCwgbGV2ZWwsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIHBsb3QgPSBuZXcgdGFnKCkuc2VsZWN0KHBsb3RJRCk7XG5cbiAgICAgICAgdmFyIGdyb3VwID0gbmV3IHRhZygpXG4gICAgICAgICAgICAuY3JlYXRlTlMoJ2cnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLHNlbGVjdG9ycy5pZHMuZ3JvdXAocGxvdElELCBsZXZlbCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpXG4gICAgICAgICAgICAucGxhY2UocGxvdCk7XG4gICAgICAgIG5ldyB0YWcoKVxuICAgICAgICAgICAgLmNyZWF0ZU5TKCdzdmcnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCBzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKHBsb3RJRCwgbGV2ZWwpKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCB3aWR0aClcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgICAgIC5wbGFjZShncm91cCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9hZGRUaWxlKHBsb3RJRCwgbGV2ZWwsIGNvbHVtbiwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCkge1xuICAgICAgICB2YXIgdGlsZVVSTCA9IHVybCArIFwiL1wiICsgbGV2ZWwgKyBcIi9cIiArIGNvbHVtbiArIFwiLnBuZ1wiO1xuXG4gICAgICAgIHZhciB4ID0gY29sdW1uICogaW1hZ2VXaWR0aDtcbiAgICAgICAgdmFyIHkgPSAwO1xuICAgICAgICB2YXIgd2lkdGggPSBpbWFnZVdpZHRoO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gaW1hZ2VIZWlnaHQ7XG5cbiAgICAgICAgdmFyIHN2ZyA9IG5ldyB0YWcoKS5zZWxlY3Qoc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSk7XG5cbiAgICAgICAgLy9jcmVhdGUgdGlsZVxuICAgICAgICBuZXcgdGFnKClcbiAgICAgICAgICAgIC5jcmVhdGVOUygnaW1hZ2UnKVxuICAgICAgICAgICAgLmF0dHJpYnV0ZSgneCcsIFN0cmluZyh4KSlcbiAgICAgICAgICAgIC5hdHRyaWJ1dGUoJ3knLCBTdHJpbmcoeSkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgICAgIC5hZGRIUkVGKHRpbGVVUkwpXG4gICAgICAgICAgICAucGxhY2Uoc3ZnKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2FkZFRpbGVzKHBsb3RJRCwgbGV2ZWwsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgICAgIHZhciB4ID0gMDtcbiAgICAgICAgZm9yICh2YXIgYyA9IDA7IGMgPCBjb2x1bW5zOyBjKyspIHtcbiAgICAgICAgICAgIF9hZGRUaWxlKHBsb3RJRCwgbGV2ZWwsIGMsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpO1xuICAgICAgICAgICAgeCA9IHggKyAyNTY7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc2V0VXBXaWRnZXQodGFyZ2V0SUQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IG5ldyB0YWcoKS5zZWxlY3QodGFyZ2V0SUQpO1xuICAgICAgICBfYWRkQnV0dG9ucyh0YXJnZXQpO1xuICAgICAgICB2YXIgd2lkZ2V0ID0gX2NyZWF0ZVdpZGdldCh0YXJnZXQsIHdpZGdldElELCB3aWR0aCwgaGVpZ2h0LCBiYWNrZ3JvdW5kQ29sb3IpO1xuICAgICAgICByZXR1cm4gd2lkZ2V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFVwUGxvdCh3aWRnZXQsICBwbG90SUQsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQsIHdpbmRvd1gsIHdpbmRvd1kpIHtcbiAgICAgICAgX2NyZWF0ZVBsb3RXaW5kb3cod2lkZ2V0LCBwbG90SUQsIHdpbmRvd1dpZHRoLCB3aW5kb3dIZWlnaHQsIHdpbmRvd1gsIHdpbmRvd1kpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2VydFBsb3RJbWFnZXMocGxvdElELCBtaW5MZXZlbCwgbWF4TGV2ZWwsIHVybCwgaW1hZ2VXaWR0aCwgaW1hZ2VIZWlnaHQpIHtcbiAgICAgICAgdmFyIHBsb3RDb250YWluZXIgPSBuZXcgdGFnKCkuc2VsZWN0KCdwbG90Jyk7XG4gICAgICAgIF9hZGRQbG90VG9QYWdlKHBsb3RDb250YWluZXIsIHBsb3RJRCk7XG4gICAgICAgIGZvciAodmFyIGkgPSBtaW5MZXZlbDsgaTxtYXhMZXZlbCsxOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgaSk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjb2x1bW5zICogaW1hZ2VXaWR0aDtcbiAgICAgICAgICAgIHZhciBoZWlnaHQgPSBpbWFnZUhlaWdodDtcbiAgICAgICAgICAgIF9hZGRHcm91cChwbG90SUQsIGksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgX2FkZFRpbGVzKHBsb3RJRCwgaSwgdXJsLCBpbWFnZVdpZHRoLCBpbWFnZUhlaWdodCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZXRVcFdpZGdldDogc2V0VXBXaWRnZXQsXG4gICAgICAgIHNldFVwUGxvdDogc2V0VXBQbG90LFxuICAgICAgICBpbnNlcnRQbG90SW1hZ2VzOiBpbnNlcnRQbG90SW1hZ2VzLFxuICAgIH1cbn0oKSk7XG5cbm1vZHVsZS5leHBvcnRzLnNldHVwID0gc2V0dXA7IiwiLypDaGVjayBzY2hlbWEgb2YgYW4gb2JqZWN0IGxpdGVyYWwuICovXG52YXIgc2NoZW1hID0ge1xuICAgIGNoZWNrOiBmdW5jdGlvbiAob2JqZWN0LCBrZXlzKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhvYmplY3QpLmxlbmd0aCAhPSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNjaGVtYSA9IHNjaGVtYTsiLCJ2YXIgc2VsZWN0b3JzID0ge1xuICAgIGlkczoge1xuICAgICAgICB3aWRnZXQ6ICd3aWRnZXQnLFxuICAgICAgICBwbG90OiAncGxvdCcsXG4gICAgICAgIGdyb3VwOiBmdW5jdGlvbiAocGxvdElELCBsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHBsb3RJRCtcIi1ncm91cC1sYXllclwiK2xldmVsO1xuICAgICAgICB9LFxuICAgICAgICBzdmdMYXllcjogZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBwbG90SUQrXCItc3ZnLWxheWVyXCIrbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNlbGVjdG9ycyA9IHNlbGVjdG9yczsiLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBlZGl0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubGF5ZXI7XG4gICAgdGhpcy5wbG90O1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHBsb3RJRCwgbGV2ZWwpIHtcbiAgICB0aGlzLmxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5ncm91cChwbG90SUQsIGxldmVsKSk7XG4gICAgdGhpcy5wbG90ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5wbG90KTtcbiAgICB0aGlzLmlubmVyQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5zdmdMYXllcihwbG90SUQsIGxldmVsKSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5kaW1lbnNpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICBpZiAoIXRoaXMuaW5uZXJDb250YWluZXIpIHRocm93IG5ldyBFcnJvcignZWRpdFNWRzogaW5uZXJDb250YWluZXIgbXVzdCBiZSBpbml0aWFsaXplZCcpO1xuICAgIHJldHVybiBbdGhpcy5pbm5lckNvbnRhaW5lci5nZXRCQm94KCkud2lkdGgsIHRoaXMuaW5uZXJDb250YWluZXIuZ2V0QkJveCgpLmhlaWdodF07XG59XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zZm9ybWF0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgbmV3IEVycm9yKFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIik7XG4gICAgdmFyIHRyYW5zZm9ybWF0aW9ucyA9IHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG4gICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgdHJhbnNsYXRlLnNldFRyYW5zbGF0ZSgwLCAwKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHRyYW5zbGF0ZSwgMCk7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICBzY2FsZS5zZXRTY2FsZSgxLjAsIDEuMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZShzY2FsZSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggIT09IDIpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGV4cGVjdGVkIHRyYW5zZm9ybWF0aW9ucyB0byBiZSBhIGxpc3Qgb2YgbGVuZ3RoIDIuXCIpO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMCkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiKTtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDEpLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1NDQUxFKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzaGlmdFgsIHNoaWZ0WSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKVxuICAgIGlmICgoIXNoaWZ0WCB8fCAhc2hpZnRZKSAmJiAoc2hpZnRYICE9IDAgJiYgc2hpZnRZICE9IDApKSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBjYW5ub3QgdHJhbnNsYXRlIFNWRyBvYmplY3Qgd2l0aCBudWxsLCB1bmRlZmluZWQsIG9yIGVtcHR5IHNoaWZ0IHZhbHVlcy4gc2hpZnRYOiBcIitzaGlmdFgrXCIgc2hpZnRZOlwiK3NoaWZ0WSk7XG4gICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy50cmFuc2Zvcm1hdGlvbnMoKS5nZXRJdGVtKDApO1xuICAgIGlmICh0cmFuc2xhdGlvbi50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9UUkFOU0xBVEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCIpO1xuICAgIHRyYW5zbGF0aW9uLnNldFRyYW5zbGF0ZShzaGlmdFgsIHNoaWZ0WSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IG5ldyBFcnJvcihcImVkaXRTVkc6IHNlY29uZCB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCIpO1xuICAgIHNjYWxlLnNldFNjYWxlKHNjYWxlWCwgc2NhbGVZKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbiAob3BhY2l0eSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcIm9wYWNpdHlcIiwgb3BhY2l0eSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBuZXcgRXJyb3IoXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiKTtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJ2aXNpYmxlXCIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMuZWRpdFNWRyA9IGVkaXRTVkc7IiwidmFyIHR5cGVjaGVjayA9IHJlcXVpcmUoJy4vdHlwZWNoZWNrLmpzJykudHlwZWNoZWNrO1xuXG52YXIgdGFnID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG50YWcucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAodGhpcy5lbGVtZW50ICE9IG51bGwpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnNldCgpIGNhbm5vdCBvdmVycmlkZSBub24tbnVsbCBlbGVtZW50IHdpdGggbmV3IGVsZW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbnRhZy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZCh0eXBlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuY3JlYXRlKCkgbXVzdCBoYXZlIGEgYHR5cGVgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5jcmVhdGVOUyA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmNyZWF0ZU5TKCkgbXVzdCBoYXZlIGEgYHR5cGVgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCB0eXBlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJ0YWcoKS5zZWxlY3QoKSBtdXN0IGhhdmUgYW4gYGlkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5hdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChhdHRyKSB8fCB0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHZhbHVlKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYXR0cmlidXRlKCkgbXVzdCBoYXZlIGBhdHRyYCBhbmQgYHZhbHVlYCBhcmd1bWVudHMuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsdWUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxudGFnLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChjaGlsZCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLmFwcGVuZCgpIG11c3QgaGF2ZSBhIGBjaGlsZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZC5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUucGxhY2UgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHR5cGVjaGVjay5udWxsT3JVbmRlZmluZWQocGFyZW50KSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkucGxhY2UoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnRhZy5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIGlmICh0eXBlY2hlY2subnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInRhZygpLnJlbW92ZSgpIG11c3QgaGF2ZSBhIGBwYXJlbnRgIGFyZ3VtZW50LlwiKTtcbiAgICBwYXJlbnQuZWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLmVsZW1lbnQpO1xufTtcblxudGFnLnByb3RvdHlwZS5hZGRIUkVGID0gZnVuY3Rpb24gKGhyZWYpIHtcbiAgICBpZiAodHlwZWNoZWNrLm51bGxPclVuZGVmaW5lZChocmVmKSkgdGhyb3cgbmV3IEVycm9yKFwidGFnKCkuYWRkSFJFRigpIG11c3QgaGF2ZSBhIGBocmVmYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLCBcImhyZWZcIiwgaHJlZik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy50YWcgPSB0YWc7XG4iLCIvKlV0aWxzIGZvciB0eXBlY2hlY2tpbmcuKi9cbnZhciB0eXBlY2hlY2sgPSB7XG4gICAgbnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgfHwgb2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnR5cGVjaGVjayA9IHR5cGVjaGVjazsiXX0=
