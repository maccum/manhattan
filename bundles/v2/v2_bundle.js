(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var editSVG = require('./svg.js').editSVG;
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
},{"../utils/schema.js":9,"./svg.js":4}],2:[function(require,module,exports){
var utils = require('../utils/utils.js').utils;

var page = function () {
    this.element = null;
};

page.prototype.create = function (type) {
    if (utils.nullOrUndefined(type)) throw new Error("page().create() must have a `type` argument.");
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

page.prototype.select = function (id) {
    if (utils.nullOrUndefined(id)) throw new Error("page().select() must have an `id` argument.");
    this.element = document.getElementById(id);
    return this;
};

page.prototype.attribute = function (attr, value) {
    if (utils.nullOrUndefined(attr) || utils.nullOrUndefined(value)) throw new Error("page().attribute() must have `attr` and `value` arguments.");
    this.element.setAttribute(attr, value);
    return this;
};

page.prototype.append = function (child) {
    if (utils.nullOrUndefined(child)) throw new Error("page().append() must have a `child` argument.");
    this.element.appendChild(child.element);
    return this;
};

page.prototype.place = function (parent) {
    if (utils.nullOrUndefined(parent)) throw new Error("page().placec() must have a `parent` argument.");
    parent.element.appendChild(this.element);
    return this;
};

page.prototype.remove = function (parent) {
    if (utils.nullOrUndefined(parent)) throw new Error("page().remove() must have a `parent` argument.");
    parent.element.removeChild(this.element);
};

page.prototype.addHREF = function (href) {
    if (utils.nullOrUndefined(href)) throw new Error("page().addHREF() must have a `href` argument.");
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
};

module.exports.page = page;

},{"../utils/utils.js":10}],3:[function(require,module,exports){
var selectors = {
    ids: {
        widget: "widget",
        plot: "plot",
        layer: function (level) {
            return "layer-" + level;
        },
        svgLayer: function (level) {
            return "svg-layer-" + level;
        },
    },
};

module.exports.selectors = selectors;
},{}],4:[function(require,module,exports){
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
},{"./selectors.js":3}],5:[function(require,module,exports){
var gui = require('../gui/gui.js').gui;
var plot = require('../plot/plot.js').plot;

function callGUI(visiblesAndHiddens) {
    gui.render(visiblesAndHiddens[0], visiblesAndHiddens[1]);
}

function listenForDrag(evt) {
    console.log("listenForDrag");
    var isDragging = false;
    var svg = evt.target;

    svg.addEventListener('mousedown', beginDrag, false);
    svg.addEventListener('mousemove', drag, false);
    svg.addEventListener('mouseup', endDrag, false);

    var mousePositionSinceLastMove;

    function getMousePosition(evt) {
        return getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
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

            callGUI(plot.getInfoForGUI());

            mousePositionSinceLastMove = currentMousePosition;
        }
    }

    function endDrag(evt) {
        evt.preventDefault();
        isDragging = false;
    }
}

function onWheel(evt) {
    evt.preventDefault();
    var horizontal = evt.deltaX;
    var vertical = evt.deltaY;

    if (Math.abs(vertical) >= Math.abs(horizontal)) {
        var svg = document.getElementById("plot");
        var mousePos = getMousePositionWithinObject(evt.clientX, evt.clientY, svg);
        plot.zoom(mousePos, vertical);
    } else {
        plot.drag({ x: horizontal, y: 0 });
    }

    callGUI(plot.getInfoForGUI());
}

function getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
    var ctm = boundingObject.getScreenCTM();
    return {
        x: (mouseX - ctm.e) / ctm.a,
        y: (mouseY - ctm.f) / ctm.d
    };
}

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
},{"../gui/gui.js":1,"../plot/plot.js":7}],6:[function(require,module,exports){
var page = require('../gui/page.js').page;
var selectors = require('../gui/selectors.js').selectors;
var plot = require('../plot/plot.js').plot;

plot.initializeVisible(2, { width: 1024, height: 256 });
plot.initializeHidden(3, { width: 2048, height: 256 });

var tileFolderPath = "../plots/svg_tutorial_plots/";

function addTile(level, column) {
    var tilePath = tileFolderPath + "/" + level + "/" + column + ".png";

    var x = column * 256;
    var y = 0;
    var width = 256;
    var height = 256;

    var svg = new page().select(selectors.ids.svgLayer(level));
    
    //create tile
    new page()
        .create('image')
        .attribute('x', String(x))
        .attribute('y', String(y))
        .attribute('width', String(width))
        .attribute('height', String(height))
        .addHREF(tilePath)
        .place(svg);
}

function addAllTilesForLayer(level) {
    var columns = Math.pow(2, level);
    var x = 0;
    for (var c = 0; c < columns; c++) {
        addTile(level, c);
        x = x + 256;
    }
}

function addLayerToPage(level) {
    //console.log(selectors.plot);
    var plt = new page().select(selectors.ids.plot);
    //console.log(plt.element);
    var columns = Math.pow(2, level);

    var group = new page()
        .create('g')
        .attribute('id', 'layer-' + level)
        .attribute('visibility', 'hidden')
        .place(plt);

    var width = columns * 256;
    var height = 256;

    //create <svg> inside <g>
    new page()
        .create('svg')
        .attribute('id', 'svg-layer-' + level)
        .attribute('width', String(width))
        .attribute('height', String(height))
        .place(group);

    addAllTilesForLayer(level);

    plot.initializeHidden(level, { width: width, height: height });
    console.log(plot.hiddens);
}

addLayerToPage(4);
addLayerToPage(5);
addLayerToPage(6);
addLayerToPage(7);
},{"../gui/page.js":2,"../gui/selectors.js":3,"../plot/plot.js":7}],7:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("../plot/position.js").position;

var plot = (function () {
    var minimumLevel = 2,
        maximumLevel = 7,
        scaleFactor = 10000,
        zoomIncrement = 5,
        scaleRangeInWhichHigherZoomLayerIsTransparent = [6000, 9000],
        scaleRangeInWhichLowerZoomLayerIsTransparent = [12000, 18000],
        visibles = {},
        hiddens = new Set([]),
        dimensions = {};

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
    };
}());

/*
var plot = {
    minimumLevel: 2,
    maximumLevel: 7,
    scaleFactor: 10000,
    zoomIncrement: 5,
    scaleRangeInWhichHigherZoomLayerIsTransparent: [6000, 9000],
    scaleRangeInWhichLowerZoomLayerIsTransparent: [12000, 18000],
    visibles: {},
    hiddens: new Set([]),
    dimensions: {},
    unitScale: function (scale) {
        if ((scale.x > .5 && scale.x < 2) || (scale.y > .5 && scale.y < 2)) throw new Error('scale already in unit scale');
        return { x: scale.x / plot.scaleFactor, y: scale.y / plot.scaleFactor };
    },
    getInfoForGUI: function () {
        var listOfVisibles = Object.keys(plot.visibles).map(function (key) {
            // convert scale for passing to GUI: 
            var guiLayer = {
                level: plot.visibles[key].level,
                topLeft: plot.visibles[key].topLeft,
                scale: plot.unitScale(plot.visibles[key].scale),
                opacity: plot.visibles[key].opacity,
            };
            return guiLayer;
        });
        var listOfHiddens = Array.from(plot.hiddens);
        return [listOfVisibles, listOfHiddens];
    },
    initializeVisible: function (level, dimensions) {
        if (level < plot.minimumLevel || level > plot.maximumLevel) throw new Error("Cannot add visible layer outside [min,max] zoom.");
        if (!schema.dimensions(dimensions)) throw new Error("Expected dimensions schema");
        plot.visibles[level] = { level: level, topLeft: { x: 0, y: 0 }, scale: { x: 1 * plot.scaleFactor, y: 1 * plot.scaleFactor }, opacity: 1 };
        plot.dimensions[level] = dimensions;
    },
    initializeHidden: function (level, dimensions) {
        if (level < plot.minimumLevel || level > plot.maximumLevel) throw new Error("Cannot add hidden layer outside [min,max] zoom.");
        if (!schema.dimensions(dimensions)) throw new Error("Expected dimensions schema");
        plot.hiddens.add(parseInt(level));
        plot.dimensions[level] = dimensions;
    },
    show: function (level, topLeft, scale, opacity) {
        if (!plot.hiddens.has(level)) throw "Tried to show a level that was not hidden.";
        plot.visibles[level] = { level: level, topLeft: topLeft, scale: scale, opacity: opacity };
        plot.hiddens.delete(level);
    },
    hide: function (level) {
        if (!plot.visibles[level]) throw "Tried to hide a level that is not visible";
        delete plot.visibles[level];
        plot.hiddens.add(parseInt(level));
    },
    calculateOpacity: function (scale) {
        var xScale = scale.x;
        if (xScale < plot.scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
            // layer with higher zoom level (on top in current html)
            return plot.mapValueOntoRange(xScale, plot.scaleRangeInWhichHigherZoomLayerIsTransparent, [0, 1]);
        } 
        //else if (xScale > plot.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
            // layer with lower zoom level (below in current html)
          //  return plot.mapValueOntoRange(xScale, plot.scaleRangeInWhichLowerZoomLayerIsTransparent, [1, 0]);
        //} 
        else {
            return 1;
        }
    },
    mapValueOntoRange: function (value, oldRange, newRange) {
        var oldSpan = oldRange[1] - oldRange[0];
        var newSpan = newRange[1] - newRange[0];
        var distanceToValue = value - oldRange[0];
        var percentSpanToValue = distanceToValue / oldSpan;
        var distanceToNewValue = percentSpanToValue * newSpan;
        var newValue = newRange[0] + distanceToNewValue;
        return newValue;
    },
    increaseScale: function () {
        for (var key in plot.visibles) {
            if (plot.visibles[key].scale.x < plot.scaleFactor) {
                plot.visibles[key].scale.x += plot.zoomIncrement;
            } else if (key < plot.maximumLevel) {
                plot.visibles[key].scale.x += plot.zoomIncrement * 2;
            }
            if (plot.visibles[key].scale.x >= plot.scaleRangeInWhichLowerZoomLayerIsTransparent[1] && key < plot.maximumLevel) {
                plot.hide(key);
            } else if (plot.visibles[key].scale.x == plot.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
                var layerToReveal = parseInt(key) + 1;
                if (layerToReveal <= plot.maximumLevel) {
                    var scale = { x: plot.scaleRangeInWhichHigherZoomLayerIsTransparent[0], y: 1 * plot.scaleFactor };
                    plot.show(layerToReveal, plot.visibles[key].topLeft, scale, plot.calculateOpacity(scale));
                }
            }
        }
    },
    decreaseScale: function () {
        for (var key in plot.visibles) {
            if (!(key == plot.minimumLevel && plot.visibles[key].scale.x == plot.scaleFactor)) {
                if (plot.visibles[key].scale.x <= plot.scaleFactor) {
                    plot.visibles[key].scale.x -= plot.zoomIncrement;
                } else {
                    plot.visibles[key].scale.x -= plot.zoomIncrement * 2;
                }
            }

            if (plot.visibles[key].scale.x <= plot.scaleRangeInWhichHigherZoomLayerIsTransparent[0] && key > plot.minimumLevel) {
                plot.hide(key);
            } else if (plot.visibles[key].scale.x == plot.scaleRangeInWhichHigherZoomLayerIsTransparent[1]) {
                var layerToReveal = parseInt(key) - 1;
                if (layerToReveal >= plot.minimumLevel) {
                    var scale = { x: plot.scaleRangeInWhichLowerZoomLayerIsTransparent[1], y: plot.scaleFactor };
                    plot.show(layerToReveal, plot.visibles[key].topLeft, scale, plot.calculateOpacity(scale));
                }
            }
        }
    },
    reposition: function (newTopLeft) {
        if ((!newTopLeft.x && newTopLeft.x != 0) || (!newTopLeft.y && newTopLeft.y != 0)) throw new Error("bad new Top Left: [" + newTopLeft.x + ", " + newTopLeft.y + "]");
        for (var key in plot.visibles) {
            plot.visibles[key].topLeft = newTopLeft;
        }
    },
    resetOpacities: function () {
        for (var key in plot.visibles) {
            plot.visibles[key].opacity = plot.calculateOpacity(plot.visibles[key].scale);
        }
    },
    zoom: function (focus, vertical) {

        var firstKey = Object.keys(plot.visibles)[0],
            first = plot.visibles[firstKey],
            width = plot.dimensions[firstKey].width,
            height = plot.dimensions[firstKey].height;

        var percentageCoordinates = position.topLeftToPercentage(focus, first.topLeft, plot.unitScale(first.scale), width, height);

        var howMuch = Math.floor(Math.abs(vertical) / 5);
        for (var i = 0; i < howMuch; i++) {
            if (vertical < 0) {
                plot.increaseScale();
            } else {
                plot.decreaseScale();
            }
        }

        var newFirstKey = Object.keys(plot.visibles)[0],
            newFirst = plot.visibles[newFirstKey],
            newWidth = plot.dimensions[newFirstKey].width,
            newHeight = plot.dimensions[newFirstKey].height;

        var newTopLeft = position.percentageToTopLeft(focus, percentageCoordinates, plot.unitScale(newFirst.scale), newWidth, newHeight);
        plot.reposition(newTopLeft);
        plot.resetOpacities();
    },
    snapIn: function (focus) {
        var keys = Object.keys(plot.visibles);
        if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

        if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 5) {
            plot.zoom(focus, -5);
            return false;
        } else {
            for (var key in plot.visibles) {
                plot.visibles[key].scale.x = 10000;
            }
            return true;
        }
    },
    snapOut: function (focus) {
        var keys = Object.keys(plot.visibles);
        if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

        if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 4) {
            plot.zoom(focus, 5);
            return false;
        } else {
            for (var key in plot.visibles) {
                plot.visibles[key].scale.x = 10000;
            }
            return true;
        }
    },
    drag: function (changeInPosition) {
        for (var key in plot.visibles) {
            plot.visibles[key].topLeft.x += changeInPosition.x;
        }
    },
};*/

module.exports.plot = plot;
},{"../plot/position.js":8,"../utils/schema.js":9}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
var utils = {
    nullOrUndefined: function(obj) {
        if (typeof obj === "undefined" || obj === null) {
            return true;
        }
        return false;
    },
};

module.exports.utils = utils;
},{}]},{},[6,5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9ndWkuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvcGFnZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9zZWxlY3RvcnMuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvc3ZnLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9oYW5kbGVyLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9pbml0aWFsaXplci5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcGxvdC5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcG9zaXRpb24uanMiLCJzY3JpcHRzL3YyL3NyYy91dGlscy9zY2hlbWEuanMiLCJzY3JpcHRzL3YyL3NyYy91dGlscy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgZWRpdFNWRyA9IHJlcXVpcmUoJy4vc3ZnLmpzJykuZWRpdFNWRztcbnZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi91dGlscy9zY2hlbWEuanMnKS5zY2hlbWE7XG5cbnZhciBndWkgPSB7XG4gICAgcmVuZGVyOiBmdW5jdGlvbiAodmlzaWJsZUxheWVycywgaGlkZGVuTGV2ZWxzKSB7XG5cbiAgICAgICAgaWYgKCEodmlzaWJsZUxheWVycy5sZW5ndGggPiAwICYmIHZpc2libGVMYXllcnMubGVuZ3RoIDw9IDIpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGhhdmUgMS0yIHZpc2libGUgbGF5ZXJzLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGhpZGRlbkluZGV4IGluIGhpZGRlbkxldmVscykge1xuICAgICAgICAgICAgdmFyIGxldmVsID0gaGlkZGVuTGV2ZWxzW2hpZGRlbkluZGV4XTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGV2ZWwpICE9ICdbb2JqZWN0IE51bWJlcl0nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJIEVSUk9SOiBleHBlY3RlZCBhIGxpc3Qgb2YgbnVtYmVycyBmb3IgaGlkZGVuTGF5ZXJzLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKS5zZXQobGV2ZWwpLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIHZpc2libGVJbmRleCBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB2aXNpYmxlTGF5ZXJzW3Zpc2libGVJbmRleF07XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5sYXllcihsYXllcikpIHRocm93IG5ldyBFcnJvcihcIkdVSTogZXhwZWN0ZWQgbGF5ZXIgc2NoZW1hLlwiKTtcbiAgICAgICAgICAgIGlmIChsYXllci5zY2FsZS54ID4gMiB8fCBsYXllci5zY2FsZS54IDwgLjUgfHwgbGF5ZXIuc2NhbGUueSA+IDIgfHwgbGF5ZXIuc2NhbGUueSA8IC41KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBzY2FsZSBvdXRzaWRlIFsuNSwyXSByYW5nZS4gU2NhbGUgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byBbLjUsMl0gYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBHVUkuIFtcIitsYXllci5zY2FsZS54K1wiLCBcIitsYXllci5zY2FsZS55K1wiXVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKVxuICAgICAgICAgICAgICAgIC5zZXQobGF5ZXIubGV2ZWwpXG4gICAgICAgICAgICAgICAgLnRyYW5zbGF0ZShsYXllci50b3BMZWZ0LngsIGxheWVyLnRvcExlZnQueSlcbiAgICAgICAgICAgICAgICAuc2NhbGUobGF5ZXIuc2NhbGUueCwgbGF5ZXIuc2NhbGUueSlcbiAgICAgICAgICAgICAgICAuZmFkZShsYXllci5vcGFjaXR5KVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlzaWJsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgc2NhbGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIG9wYWNpdHlTdHJpbmcgPSBcIlwiO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmlzaWJsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0ubGV2ZWw7XG4gICAgICAgICAgICBzY2FsZXNTdHJpbmcgKz0gXCIgXCIgKyB2aXNpYmxlTGF5ZXJzW2tleV0uc2NhbGUueDtcbiAgICAgICAgICAgIG9wYWNpdHlTdHJpbmcgKz0gXCIgXCIrIHZpc2libGVMYXllcnNba2V5XS5vcGFjaXR5O1xuICAgICAgICB9XG4gICAgICAgICQoXCIjem9vbS1kaXZcIikudGV4dCh2aXNpYmxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjZnJhY3Rpb25hbC16b29tLWRpdlwiKS50ZXh0KHNjYWxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjb3BhY2l0eS1kaXZcIikudGV4dChvcGFjaXR5U3RyaW5nKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuZ3VpID0gZ3VpOyIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzLmpzJykudXRpbHM7XG5cbnZhciBwYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQodHlwZSkpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5jcmVhdGUoKSBtdXN0IGhhdmUgYSBgdHlwZWAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChpZCkpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5zZWxlY3QoKSBtdXN0IGhhdmUgYW4gYGlkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuYXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChhdHRyKSB8fCB1dGlscy5udWxsT3JVbmRlZmluZWQodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoXCJwYWdlKCkuYXR0cmlidXRlKCkgbXVzdCBoYXZlIGBhdHRyYCBhbmQgYHZhbHVlYCBhcmd1bWVudHMuXCIpO1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsdWUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChjaGlsZCkpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5hcHBlbmQoKSBtdXN0IGhhdmUgYSBgY2hpbGRgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5wbGFjZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5wbGFjZWMoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5yZW1vdmUoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnBhZ2UucHJvdG90eXBlLmFkZEhSRUYgPSBmdW5jdGlvbiAoaHJlZikge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoaHJlZikpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5hZGRIUkVGKCkgbXVzdCBoYXZlIGEgYGhyZWZgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnBhZ2UgPSBwYWdlO1xuIiwidmFyIHNlbGVjdG9ycyA9IHtcbiAgICBpZHM6IHtcbiAgICAgICAgd2lkZ2V0OiBcIndpZGdldFwiLFxuICAgICAgICBwbG90OiBcInBsb3RcIixcbiAgICAgICAgbGF5ZXI6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwibGF5ZXItXCIgKyBsZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnTGF5ZXI6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwic3ZnLWxheWVyLVwiICsgbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNlbGVjdG9ycyA9IHNlbGVjdG9yczsiLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBlZGl0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubGF5ZXI7XG4gICAgdGhpcy5wbG90O1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMubGF5ZXIobGV2ZWwpKTtcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNmb3JtYXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdmFyIHRyYW5zZm9ybWF0aW9ucyA9IHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG4gICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgdHJhbnNsYXRlLnNldFRyYW5zbGF0ZSgwLCAwKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHRyYW5zbGF0ZSwgMCk7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICBzY2FsZS5zZXRTY2FsZSgxLjAsIDEuMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZShzY2FsZSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggIT09IDIpIHRocm93IFwiZWRpdFNWRzogZXhwZWN0ZWQgdHJhbnNmb3JtYXRpb25zIHRvIGJlIGEgbGlzdCBvZiBsZW5ndGggMi5cIjtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDApLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMSkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIFwiZWRpdFNWRzogdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzaGlmdFgsIHNoaWZ0WSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgaWYgKCghc2hpZnRYIHx8ICFzaGlmdFkpICYmIChzaGlmdFggIT0gMCAmJiBzaGlmdFkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCB0cmFuc2xhdGUgU1ZHIG9iamVjdCB3aXRoIG51bGwsIHVuZGVmaW5lZCwgb3IgZW1wdHkgc2hpZnQgdmFsdWVzLiBzaGlmdFg6IFwiK3NoaWZ0WCtcIiBzaGlmdFk6XCIrc2hpZnRZKTtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMCk7XG4gICAgaWYgKHRyYW5zbGF0aW9uLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgIHRyYW5zbGF0aW9uLnNldFRyYW5zbGF0ZShzaGlmdFgsIHNoaWZ0WSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwib3BhY2l0eVwiLCBvcGFjaXR5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJpbGVcIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qXG5UZXN0XG5cbnZhciBsMiA9IG5ldyBlZGl0U1ZHKCkuc2V0KDIpO1xuXG52YXIgeCA9IGwyLnRyYW5zZm9ybWF0aW9ucygpOyBcbi8vIGNoZWNrIHRyYW5zbGF0ZVxueC5nZXRJdGVtKDApLm1hdHJpeC5lOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAwXG54LmdldEl0ZW0oMCkubWF0cml4LmY7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbi8vIGNoZWNrIHNjYWxlXG54LmdldEl0ZW0oMSkubWF0cml4LmE7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDFcbnguZ2V0SXRlbSgxKS5tYXRyaXguZDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxuLy8gY2hlY2sgbGVuZ3RoXG54Lmxlbmd0aCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDJcblxubDIudHJhbnNsYXRlKDUwLCA1MCk7XG5cbmwyLnNjYWxlKC41LCAuNSk7XG5cbmwyLmZhZGUoLjUpO1xuXG5sMi5oaWRlKCk7XG5cbmwyLnNob3coKTtcbiovXG5cbm1vZHVsZS5leHBvcnRzLmVkaXRTVkcgPSBlZGl0U1ZHOyIsInZhciBndWkgPSByZXF1aXJlKCcuLi9ndWkvZ3VpLmpzJykuZ3VpO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xuXG5mdW5jdGlvbiBjYWxsR1VJKHZpc2libGVzQW5kSGlkZGVucykge1xuICAgIGd1aS5yZW5kZXIodmlzaWJsZXNBbmRIaWRkZW5zWzBdLCB2aXNpYmxlc0FuZEhpZGRlbnNbMV0pO1xufVxuXG5mdW5jdGlvbiBsaXN0ZW5Gb3JEcmFnKGV2dCkge1xuICAgIGNvbnNvbGUubG9nKFwibGlzdGVuRm9yRHJhZ1wiKTtcbiAgICB2YXIgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIHZhciBzdmcgPSBldnQudGFyZ2V0O1xuXG4gICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGJlZ2luRHJhZywgZmFsc2UpO1xuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBkcmFnLCBmYWxzZSk7XG4gICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBlbmREcmFnLCBmYWxzZSk7XG5cbiAgICB2YXIgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmU7XG5cbiAgICBmdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uKGV2dCkge1xuICAgICAgICByZXR1cm4gZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYmVnaW5EcmFnKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJiZWdpbkRyYWdcIik7XG4gICAgICAgIGlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICB2YXIgbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnID0gZ2V0TW91c2VQb3NpdGlvbihldnQpO1xuICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmFnKGV2dCkge1xuICAgICAgICBpZiAoaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2RyYWdnaW5nJyk7XG4gICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHZhciBjdXJyZW50TW91c2VQb3NpdGlvbiA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgICAgIHZhciBjaGFuZ2VJbk1vdXNlUG9zaXRpb24gPSB7XG4gICAgICAgICAgICAgICAgeDogY3VycmVudE1vdXNlUG9zaXRpb24ueCAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLngsXG4gICAgICAgICAgICAgICAgeTogY3VycmVudE1vdXNlUG9zaXRpb24ueSAtIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlLnksXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcGxvdC5kcmFnKGNoYW5nZUluTW91c2VQb3NpdGlvbik7XG5cbiAgICAgICAgICAgIGNhbGxHVUkocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuXG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IGN1cnJlbnRNb3VzZVBvc2l0aW9uO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZW5kRHJhZyhldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG9uV2hlZWwoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdmFyIGhvcml6b250YWwgPSBldnQuZGVsdGFYO1xuICAgIHZhciB2ZXJ0aWNhbCA9IGV2dC5kZWx0YVk7XG5cbiAgICBpZiAoTWF0aC5hYnModmVydGljYWwpID49IE1hdGguYWJzKGhvcml6b250YWwpKSB7XG4gICAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIik7XG4gICAgICAgIHZhciBtb3VzZVBvcyA9IGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgICAgICBwbG90Lnpvb20obW91c2VQb3MsIHZlcnRpY2FsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwbG90LmRyYWcoeyB4OiBob3Jpem9udGFsLCB5OiAwIH0pO1xuICAgIH1cblxuICAgIGNhbGxHVUkocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xufVxuXG5mdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KG1vdXNlWCwgbW91c2VZLCBib3VuZGluZ09iamVjdCkge1xuICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiAobW91c2VYIC0gY3RtLmUpIC8gY3RtLmEsXG4gICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgIH07XG59XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKS5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgb25XaGVlbCk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCAtNSk7XG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHBsb3Quc25hcEluKHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxHVUkocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICB9LCAuMSk7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLW91dC1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZyhcInNuYXAgem9vbSBvdXRcIik7XG5cbiAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCA1KTtcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAocGxvdC5zbmFwT3V0KHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxHVUkocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICB9LCAuMSk7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGxpc3RlbkZvckRyYWcpOyIsInZhciBwYWdlID0gcmVxdWlyZSgnLi4vZ3VpL3BhZ2UuanMnKS5wYWdlO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4uL2d1aS9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG5cbnBsb3QuaW5pdGlhbGl6ZVZpc2libGUoMiwgeyB3aWR0aDogMTAyNCwgaGVpZ2h0OiAyNTYgfSk7XG5wbG90LmluaXRpYWxpemVIaWRkZW4oMywgeyB3aWR0aDogMjA0OCwgaGVpZ2h0OiAyNTYgfSk7XG5cbnZhciB0aWxlRm9sZGVyUGF0aCA9IFwiLi4vcGxvdHMvc3ZnX3R1dG9yaWFsX3Bsb3RzL1wiO1xuXG5mdW5jdGlvbiBhZGRUaWxlKGxldmVsLCBjb2x1bW4pIHtcbiAgICB2YXIgdGlsZVBhdGggPSB0aWxlRm9sZGVyUGF0aCArIFwiL1wiICsgbGV2ZWwgKyBcIi9cIiArIGNvbHVtbiArIFwiLnBuZ1wiO1xuXG4gICAgdmFyIHggPSBjb2x1bW4gKiAyNTY7XG4gICAgdmFyIHkgPSAwO1xuICAgIHZhciB3aWR0aCA9IDI1NjtcbiAgICB2YXIgaGVpZ2h0ID0gMjU2O1xuXG4gICAgdmFyIHN2ZyA9IG5ldyBwYWdlKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIobGV2ZWwpKTtcbiAgICBcbiAgICAvL2NyZWF0ZSB0aWxlXG4gICAgbmV3IHBhZ2UoKVxuICAgICAgICAuY3JlYXRlKCdpbWFnZScpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCkpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3knLCBTdHJpbmcoeSkpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgIC5hZGRIUkVGKHRpbGVQYXRoKVxuICAgICAgICAucGxhY2Uoc3ZnKTtcbn1cblxuZnVuY3Rpb24gYWRkQWxsVGlsZXNGb3JMYXllcihsZXZlbCkge1xuICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgbGV2ZWwpO1xuICAgIHZhciB4ID0gMDtcbiAgICBmb3IgKHZhciBjID0gMDsgYyA8IGNvbHVtbnM7IGMrKykge1xuICAgICAgICBhZGRUaWxlKGxldmVsLCBjKTtcbiAgICAgICAgeCA9IHggKyAyNTY7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRMYXllclRvUGFnZShsZXZlbCkge1xuICAgIC8vY29uc29sZS5sb2coc2VsZWN0b3JzLnBsb3QpO1xuICAgIHZhciBwbHQgPSBuZXcgcGFnZSgpLnNlbGVjdChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIC8vY29uc29sZS5sb2cocGx0LmVsZW1lbnQpO1xuICAgIHZhciBjb2x1bW5zID0gTWF0aC5wb3coMiwgbGV2ZWwpO1xuXG4gICAgdmFyIGdyb3VwID0gbmV3IHBhZ2UoKVxuICAgICAgICAuY3JlYXRlKCdnJylcbiAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCAnbGF5ZXItJyArIGxldmVsKVxuICAgICAgICAuYXR0cmlidXRlKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpXG4gICAgICAgIC5wbGFjZShwbHQpO1xuXG4gICAgdmFyIHdpZHRoID0gY29sdW1ucyAqIDI1NjtcbiAgICB2YXIgaGVpZ2h0ID0gMjU2O1xuXG4gICAgLy9jcmVhdGUgPHN2Zz4gaW5zaWRlIDxnPlxuICAgIG5ldyBwYWdlKClcbiAgICAgICAgLmNyZWF0ZSgnc3ZnJylcbiAgICAgICAgLmF0dHJpYnV0ZSgnaWQnLCAnc3ZnLWxheWVyLScgKyBsZXZlbClcbiAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgLnBsYWNlKGdyb3VwKTtcblxuICAgIGFkZEFsbFRpbGVzRm9yTGF5ZXIobGV2ZWwpO1xuXG4gICAgcGxvdC5pbml0aWFsaXplSGlkZGVuKGxldmVsLCB7IHdpZHRoOiB3aWR0aCwgaGVpZ2h0OiBoZWlnaHQgfSk7XG4gICAgY29uc29sZS5sb2cocGxvdC5oaWRkZW5zKTtcbn1cblxuYWRkTGF5ZXJUb1BhZ2UoNCk7XG5hZGRMYXllclRvUGFnZSg1KTtcbmFkZExheWVyVG9QYWdlKDYpO1xuYWRkTGF5ZXJUb1BhZ2UoNyk7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3V0aWxzL3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuLi9wbG90L3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuXG52YXIgcGxvdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1pbmltdW1MZXZlbCA9IDIsXG4gICAgICAgIG1heGltdW1MZXZlbCA9IDcsXG4gICAgICAgIHNjYWxlRmFjdG9yID0gMTAwMDAsXG4gICAgICAgIHpvb21JbmNyZW1lbnQgPSA1LFxuICAgICAgICBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbNjAwMCwgOTAwMF0sXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50ID0gWzEyMDAwLCAxODAwMF0sXG4gICAgICAgIHZpc2libGVzID0ge30sXG4gICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKSxcbiAgICAgICAgZGltZW5zaW9ucyA9IHt9O1xuXG4gICAgZnVuY3Rpb24gdW5pdFNjYWxlKHNjYWxlKSB7XG4gICAgICAgIGlmICgoc2NhbGUueCA+IC41ICYmIHNjYWxlLnggPCAyKSB8fCAoc2NhbGUueSA+IC41ICYmIHNjYWxlLnkgPCAyKSkgdGhyb3cgbmV3IEVycm9yKCdzY2FsZSBhbHJlYWR5IGluIHVuaXQgc2NhbGUnKTtcbiAgICAgICAgcmV0dXJuIHsgeDogc2NhbGUueCAvIHNjYWxlRmFjdG9yLCB5OiBzY2FsZS55IC8gc2NhbGVGYWN0b3IgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaG93IChsZXZlbCwgdG9wTGVmdCwgc2NhbGUsIG9wYWNpdHkpIHtcbiAgICAgICAgaWYgKCFoaWRkZW5zLmhhcyhsZXZlbCkpIHRocm93IFwiVHJpZWQgdG8gc2hvdyBhIGxldmVsIHRoYXQgd2FzIG5vdCBoaWRkZW4uXCI7XG4gICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB0b3BMZWZ0LCBzY2FsZTogc2NhbGUsIG9wYWNpdHk6IG9wYWNpdHkgfTtcbiAgICAgICAgaGlkZGVucy5kZWxldGUobGV2ZWwpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhpZGUgKGxldmVsKSB7XG4gICAgICAgIGlmICghdmlzaWJsZXNbbGV2ZWxdKSB0aHJvdyBcIlRyaWVkIHRvIGhpZGUgYSBsZXZlbCB0aGF0IGlzIG5vdCB2aXNpYmxlXCI7XG4gICAgICAgIGRlbGV0ZSB2aXNpYmxlc1tsZXZlbF07XG4gICAgICAgIGhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY3VsYXRlT3BhY2l0eSAoc2NhbGUpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IHNjYWxlLng7XG4gICAgICAgIGlmICh4U2NhbGUgPCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggaGlnaGVyIHpvb20gbGV2ZWwgKG9uIHRvcCBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gbWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFswLCAxXSk7XG4gICAgICAgIH0gLyplbHNlIGlmICh4U2NhbGUgPiBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGxvd2VyIHpvb20gbGV2ZWwgKGJlbG93IGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBwbG90Lm1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzEsIDBdKTtcbiAgICAgICAgfSovIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXBWYWx1ZU9udG9SYW5nZSAodmFsdWUsIG9sZFJhbmdlLCBuZXdSYW5nZSkge1xuICAgICAgICB2YXIgb2xkU3BhbiA9IG9sZFJhbmdlWzFdIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBuZXdTcGFuID0gbmV3UmFuZ2VbMV0gLSBuZXdSYW5nZVswXTtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9WYWx1ZSA9IHZhbHVlIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBwZXJjZW50U3BhblRvVmFsdWUgPSBkaXN0YW5jZVRvVmFsdWUgLyBvbGRTcGFuO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb05ld1ZhbHVlID0gcGVyY2VudFNwYW5Ub1ZhbHVlICogbmV3U3BhbjtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmV3UmFuZ2VbMF0gKyBkaXN0YW5jZVRvTmV3VmFsdWU7XG4gICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBvc2l0aW9uIChuZXdUb3BMZWZ0KSB7XG4gICAgICAgIGlmICgoIW5ld1RvcExlZnQueCAmJiBuZXdUb3BMZWZ0LnggIT0gMCkgfHwgKCFuZXdUb3BMZWZ0LnkgJiYgbmV3VG9wTGVmdC55ICE9IDApKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbmV3IFRvcCBMZWZ0OiBbXCIgKyBuZXdUb3BMZWZ0LnggKyBcIiwgXCIgKyBuZXdUb3BMZWZ0LnkgKyBcIl1cIik7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNba2V5XS50b3BMZWZ0ID0gbmV3VG9wTGVmdDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0T3BhY2l0aWVzICgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLm9wYWNpdHkgPSBjYWxjdWxhdGVPcGFjaXR5KHZpc2libGVzW2tleV0uc2NhbGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0SW5mb0ZvckdVSSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZlZpc2libGVzID0gT2JqZWN0LmtleXModmlzaWJsZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgLy8gY29udmVydCBzY2FsZSBmb3IgcGFzc2luZyB0byBHVUk6IFxuICAgICAgICAgICAgICAgIHZhciBndWlMYXllciA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IHZpc2libGVzW2tleV0ubGV2ZWwsXG4gICAgICAgICAgICAgICAgICAgIHRvcExlZnQ6IHZpc2libGVzW2tleV0udG9wTGVmdCxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHVuaXRTY2FsZSh2aXNpYmxlc1trZXldLnNjYWxlKSxcbiAgICAgICAgICAgICAgICAgICAgb3BhY2l0eTogdmlzaWJsZXNba2V5XS5vcGFjaXR5LFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGd1aUxheWVyO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbGlzdE9mSGlkZGVucyA9IEFycmF5LmZyb20oaGlkZGVucyk7XG4gICAgICAgICAgICByZXR1cm4gW2xpc3RPZlZpc2libGVzLCBsaXN0T2ZIaWRkZW5zXTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJGb3JUZXN0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBiZXR0ZXIgd2F5IHRvIGNsZWFyIHNpbmdsZXRvbiBmb3IgdGVzdGluZz9cbiAgICAgICAgICAgIHZpc2libGVzID0ge307XG4gICAgICAgICAgICBoaWRkZW5zID0gbmV3IFNldChbXSk7XG4gICAgICAgICAgICBkaW1lbnNpb25zID0ge307XG4gICAgICAgIH0sICBcbiAgICAgICAgZ2V0VmlzaWJsZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB2aXNpYmxlcztcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SGlkZGVuczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGhpZGRlbnM7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXRpYWxpemVWaXNpYmxlOiBmdW5jdGlvbihsZXZlbCwgZGltcykge1xuICAgICAgICAgICAgaWYgKGxldmVsIDwgbWluaW11bUxldmVsIHx8IGxldmVsID4gbWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIHZpc2libGUgbGF5ZXIgb3V0c2lkZSBbbWluLG1heF0gem9vbS5cIik7XG4gICAgICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbXMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgICAgIHZpc2libGVzW2xldmVsXSA9IHsgbGV2ZWw6IGxldmVsLCB0b3BMZWZ0OiB7IHg6IDAsIHk6IDAgfSwgc2NhbGU6IHsgeDogMSAqIHNjYWxlRmFjdG9yLCB5OiAxICogc2NhbGVGYWN0b3IgfSwgb3BhY2l0eTogMSB9O1xuICAgICAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgICAgICB9LFxuICAgICAgICBpbml0aWFsaXplSGlkZGVuOmZ1bmN0aW9uIChsZXZlbCwgZGltcykge1xuICAgICAgICAgICAgaWYgKGxldmVsIDwgbWluaW11bUxldmVsIHx8IGxldmVsID4gbWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIGhpZGRlbiBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmRpbWVuc2lvbnMoZGltcykpIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGRpbWVuc2lvbnMgc2NoZW1hXCIpO1xuICAgICAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICAgICAgICAgIGRpbWVuc2lvbnNbbGV2ZWxdID0gZGltcztcbiAgICAgICAgfSxcbiAgICAgICAgaW5jcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8IHNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCArPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5IDwgbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCArPSB6b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA+PSBzY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSAmJiBrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaGlkZShrZXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXllclRvUmV2ZWFsID0gcGFyc2VJbnQoa2V5KSArIDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsIDw9IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjYWxlID0geyB4OiBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0sIHk6IDEgKiBzY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlY3JlYXNlU2NhbGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIGlmICghKGtleSA9PSBtaW5pbXVtTGV2ZWwgJiYgdmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlRmFjdG9yKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggLT0gem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA8PSBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0gJiYga2V5ID4gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGhpZGUoa2V5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZpc2libGVzW2tleV0uc2NhbGUueCA9PSBzY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPj0gbWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdLCB5OiBzY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdyhsYXllclRvUmV2ZWFsLCB2aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBjYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHpvb206IGZ1bmN0aW9uIChmb2N1cywgdmVydGljYWwpIHtcblxuICAgICAgICAgICAgdmFyIGZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgICAgIGZpcnN0ID0gdmlzaWJsZXNbZmlyc3RLZXldLFxuICAgICAgICAgICAgICAgIHdpZHRoID0gZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0ID0gZGltZW5zaW9uc1tmaXJzdEtleV0uaGVpZ2h0O1xuICAgIFxuICAgICAgICAgICAgdmFyIHBlcmNlbnRhZ2VDb29yZGluYXRlcyA9IHBvc2l0aW9uLnRvcExlZnRUb1BlcmNlbnRhZ2UoZm9jdXMsIGZpcnN0LnRvcExlZnQsIHVuaXRTY2FsZShmaXJzdC5zY2FsZSksIHdpZHRoLCBoZWlnaHQpO1xuICAgIFxuICAgICAgICAgICAgdmFyIGhvd011Y2ggPSBNYXRoLmZsb29yKE1hdGguYWJzKHZlcnRpY2FsKSAvIDUpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3dNdWNoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodmVydGljYWwgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5jcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVjcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICBcbiAgICAgICAgICAgIHZhciBuZXdGaXJzdEtleSA9IE9iamVjdC5rZXlzKHZpc2libGVzKVswXSxcbiAgICAgICAgICAgICAgICBuZXdGaXJzdCA9IHZpc2libGVzW25ld0ZpcnN0S2V5XSxcbiAgICAgICAgICAgICAgICBuZXdXaWR0aCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgICAgIG5ld0hlaWdodCA9IGRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLmhlaWdodDtcbiAgICBcbiAgICAgICAgICAgIHZhciBuZXdUb3BMZWZ0ID0gcG9zaXRpb24ucGVyY2VudGFnZVRvVG9wTGVmdChmb2N1cywgcGVyY2VudGFnZUNvb3JkaW5hdGVzLCB1bml0U2NhbGUobmV3Rmlyc3Quc2NhbGUpLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KTtcbiAgICAgICAgICAgIHJlcG9zaXRpb24obmV3VG9wTGVmdCk7XG4gICAgICAgICAgICByZXNldE9wYWNpdGllcygpO1xuICAgICAgICB9LFxuICAgICAgICBzbmFwSW46IGZ1bmN0aW9uIChmb2N1cykge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcyk7XG4gICAgICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG4gICAgXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSB2aXNpYmxlc1tPYmplY3Qua2V5cyh2aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNSkge1xuICAgICAgICAgICAgICAgIHRoaXMuem9vbShmb2N1cywgLTUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc25hcE91dDogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcbiAgICBcbiAgICAgICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRyYWc6IGZ1bmN0aW9uIChjaGFuZ2VJblBvc2l0aW9uKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbn0oKSk7XG5cbi8qXG52YXIgcGxvdCA9IHtcbiAgICBtaW5pbXVtTGV2ZWw6IDIsXG4gICAgbWF4aW11bUxldmVsOiA3LFxuICAgIHNjYWxlRmFjdG9yOiAxMDAwMCxcbiAgICB6b29tSW5jcmVtZW50OiA1LFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudDogWzYwMDAsIDkwMDBdLFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50OiBbMTIwMDAsIDE4MDAwXSxcbiAgICB2aXNpYmxlczoge30sXG4gICAgaGlkZGVuczogbmV3IFNldChbXSksXG4gICAgZGltZW5zaW9uczoge30sXG4gICAgdW5pdFNjYWxlOiBmdW5jdGlvbiAoc2NhbGUpIHtcbiAgICAgICAgaWYgKChzY2FsZS54ID4gLjUgJiYgc2NhbGUueCA8IDIpIHx8IChzY2FsZS55ID4gLjUgJiYgc2NhbGUueSA8IDIpKSB0aHJvdyBuZXcgRXJyb3IoJ3NjYWxlIGFscmVhZHkgaW4gdW5pdCBzY2FsZScpO1xuICAgICAgICByZXR1cm4geyB4OiBzY2FsZS54IC8gcGxvdC5zY2FsZUZhY3RvciwgeTogc2NhbGUueSAvIHBsb3Quc2NhbGVGYWN0b3IgfTtcbiAgICB9LFxuICAgIGdldEluZm9Gb3JHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGxpc3RPZlZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgc2NhbGUgZm9yIHBhc3NpbmcgdG8gR1VJOiBcbiAgICAgICAgICAgIHZhciBndWlMYXllciA9IHtcbiAgICAgICAgICAgICAgICBsZXZlbDogcGxvdC52aXNpYmxlc1trZXldLmxldmVsLFxuICAgICAgICAgICAgICAgIHRvcExlZnQ6IHBsb3QudmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgIHNjYWxlOiBwbG90LnVuaXRTY2FsZShwbG90LnZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IHBsb3QudmlzaWJsZXNba2V5XS5vcGFjaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBndWlMYXllcjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShwbG90LmhpZGRlbnMpO1xuICAgICAgICByZXR1cm4gW2xpc3RPZlZpc2libGVzLCBsaXN0T2ZIaWRkZW5zXTtcbiAgICB9LFxuICAgIGluaXRpYWxpemVWaXNpYmxlOiBmdW5jdGlvbiAobGV2ZWwsIGRpbWVuc2lvbnMpIHtcbiAgICAgICAgaWYgKGxldmVsIDwgcGxvdC5taW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBwbG90Lm1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCB2aXNpYmxlIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbWVuc2lvbnMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgcGxvdC52aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogeyB4OiAwLCB5OiAwIH0sIHNjYWxlOiB7IHg6IDEgKiBwbG90LnNjYWxlRmFjdG9yLCB5OiAxICogcGxvdC5zY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgIHBsb3QuZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1lbnNpb25zO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZUhpZGRlbjogZnVuY3Rpb24gKGxldmVsLCBkaW1lbnNpb25zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IHBsb3QubWluaW11bUxldmVsIHx8IGxldmVsID4gcGxvdC5tYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbWVuc2lvbnMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgcGxvdC5oaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgICAgICBwbG90LmRpbWVuc2lvbnNbbGV2ZWxdID0gZGltZW5zaW9ucztcbiAgICB9LFxuICAgIHNob3c6IGZ1bmN0aW9uIChsZXZlbCwgdG9wTGVmdCwgc2NhbGUsIG9wYWNpdHkpIHtcbiAgICAgICAgaWYgKCFwbG90LmhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIjtcbiAgICAgICAgcGxvdC52aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogdG9wTGVmdCwgc2NhbGU6IHNjYWxlLCBvcGFjaXR5OiBvcGFjaXR5IH07XG4gICAgICAgIHBsb3QuaGlkZGVucy5kZWxldGUobGV2ZWwpO1xuICAgIH0sXG4gICAgaGlkZTogZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgIGlmICghcGxvdC52aXNpYmxlc1tsZXZlbF0pIHRocm93IFwiVHJpZWQgdG8gaGlkZSBhIGxldmVsIHRoYXQgaXMgbm90IHZpc2libGVcIjtcbiAgICAgICAgZGVsZXRlIHBsb3QudmlzaWJsZXNbbGV2ZWxdO1xuICAgICAgICBwbG90LmhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgfSxcbiAgICBjYWxjdWxhdGVPcGFjaXR5OiBmdW5jdGlvbiAoc2NhbGUpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IHNjYWxlLng7XG4gICAgICAgIGlmICh4U2NhbGUgPCBwbG90LnNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBoaWdoZXIgem9vbSBsZXZlbCAob24gdG9wIGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBwbG90Lm1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFswLCAxXSk7XG4gICAgICAgIH0gXG4gICAgICAgIC8vZWxzZSBpZiAoeFNjYWxlID4gcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBsb3dlciB6b29tIGxldmVsIChiZWxvdyBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgLy8gIHJldHVybiBwbG90Lm1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzEsIDBdKTtcbiAgICAgICAgLy99IFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBtYXBWYWx1ZU9udG9SYW5nZTogZnVuY3Rpb24gKHZhbHVlLCBvbGRSYW5nZSwgbmV3UmFuZ2UpIHtcbiAgICAgICAgdmFyIG9sZFNwYW4gPSBvbGRSYW5nZVsxXSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgbmV3U3BhbiA9IG5ld1JhbmdlWzFdIC0gbmV3UmFuZ2VbMF07XG4gICAgICAgIHZhciBkaXN0YW5jZVRvVmFsdWUgPSB2YWx1ZSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgcGVyY2VudFNwYW5Ub1ZhbHVlID0gZGlzdGFuY2VUb1ZhbHVlIC8gb2xkU3BhbjtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9OZXdWYWx1ZSA9IHBlcmNlbnRTcGFuVG9WYWx1ZSAqIG5ld1NwYW47XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IG5ld1JhbmdlWzBdICsgZGlzdGFuY2VUb05ld1ZhbHVlO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgfSxcbiAgICBpbmNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPCBwbG90LnNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggKz0gcGxvdC56b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgPCBwbG90Lm1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHBsb3Quem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPj0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSAmJiBrZXkgPCBwbG90Lm1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgIHBsb3QuaGlkZShrZXkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA9PSBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpICsgMTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA8PSBwbG90Lm1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdLCB5OiAxICogcGxvdC5zY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICBwbG90LnNob3cobGF5ZXJUb1JldmVhbCwgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBwbG90LmNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRlY3JlYXNlU2NhbGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleSA9PSBwbG90Lm1pbmltdW1MZXZlbCAmJiBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA9PSBwbG90LnNjYWxlRmFjdG9yKSkge1xuICAgICAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA8PSBwbG90LnNjYWxlRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHBsb3Quem9vbUluY3JlbWVudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCAtPSBwbG90Lnpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdICYmIGtleSA+IHBsb3QubWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5oaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpIC0gMTtcbiAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA+PSBwbG90Lm1pbmltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHBsb3Quc2NhbGVGYWN0b3IgfTtcbiAgICAgICAgICAgICAgICAgICAgcGxvdC5zaG93KGxheWVyVG9SZXZlYWwsIHBsb3QudmlzaWJsZXNba2V5XS50b3BMZWZ0LCBzY2FsZSwgcGxvdC5jYWxjdWxhdGVPcGFjaXR5KHNjYWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICByZXBvc2l0aW9uOiBmdW5jdGlvbiAobmV3VG9wTGVmdCkge1xuICAgICAgICBpZiAoKCFuZXdUb3BMZWZ0LnggJiYgbmV3VG9wTGVmdC54ICE9IDApIHx8ICghbmV3VG9wTGVmdC55ICYmIG5ld1RvcExlZnQueSAhPSAwKSkgdGhyb3cgbmV3IEVycm9yKFwiYmFkIG5ldyBUb3AgTGVmdDogW1wiICsgbmV3VG9wTGVmdC54ICsgXCIsIFwiICsgbmV3VG9wTGVmdC55ICsgXCJdXCIpO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQgPSBuZXdUb3BMZWZ0O1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZXNldE9wYWNpdGllczogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLm9wYWNpdHkgPSBwbG90LmNhbGN1bGF0ZU9wYWNpdHkocGxvdC52aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgem9vbTogZnVuY3Rpb24gKGZvY3VzLCB2ZXJ0aWNhbCkge1xuXG4gICAgICAgIHZhciBmaXJzdEtleSA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgZmlyc3QgPSBwbG90LnZpc2libGVzW2ZpcnN0S2V5XSxcbiAgICAgICAgICAgIHdpZHRoID0gcGxvdC5kaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IHBsb3QuZGltZW5zaW9uc1tmaXJzdEtleV0uaGVpZ2h0O1xuXG4gICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKGZvY3VzLCBmaXJzdC50b3BMZWZ0LCBwbG90LnVuaXRTY2FsZShmaXJzdC5zY2FsZSksIHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICAgIHZhciBob3dNdWNoID0gTWF0aC5mbG9vcihNYXRoLmFicyh2ZXJ0aWNhbCkgLyA1KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3dNdWNoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh2ZXJ0aWNhbCA8IDApIHtcbiAgICAgICAgICAgICAgICBwbG90LmluY3JlYXNlU2NhbGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGxvdC5kZWNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmV3Rmlyc3RLZXkgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXSxcbiAgICAgICAgICAgIG5ld0ZpcnN0ID0gcGxvdC52aXNpYmxlc1tuZXdGaXJzdEtleV0sXG4gICAgICAgICAgICBuZXdXaWR0aCA9IHBsb3QuZGltZW5zaW9uc1tuZXdGaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBuZXdIZWlnaHQgPSBwbG90LmRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgbmV3VG9wTGVmdCA9IHBvc2l0aW9uLnBlcmNlbnRhZ2VUb1RvcExlZnQoZm9jdXMsIHBlcmNlbnRhZ2VDb29yZGluYXRlcywgcGxvdC51bml0U2NhbGUobmV3Rmlyc3Quc2NhbGUpLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KTtcbiAgICAgICAgcGxvdC5yZXBvc2l0aW9uKG5ld1RvcExlZnQpO1xuICAgICAgICBwbG90LnJlc2V0T3BhY2l0aWVzKCk7XG4gICAgfSxcbiAgICBzbmFwSW46IGZ1bmN0aW9uIChmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gcGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICBwbG90Lnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzbmFwT3V0OiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHBsb3QudmlzaWJsZXNbT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF1dLnNjYWxlLngpID4gNCkge1xuICAgICAgICAgICAgcGxvdC56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBkcmFnOiBmdW5jdGlvbiAoY2hhbmdlSW5Qb3NpdGlvbikge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICB9LFxufTsqL1xuXG5tb2R1bGUuZXhwb3J0cy5wbG90ID0gcGxvdDsiLCJ2YXIgcG9zaXRpb24gPSB7XG4gICAgY2FsY3VsYXRlUGVyY2VudDogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcG9zaXRpb25CLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgaWYgKGxlbmd0aEIgPD0gMCkgdGhyb3cgbmV3IEVycm9yKFwiTGVuZ3RoIG11c3QgYmUgcG9zaXRpdmUuXCIpO1xuICAgICAgICByZXR1cm4gKHBvc2l0aW9uQSAtIHBvc2l0aW9uQikgLyAobGVuZ3RoQiAqIHNjYWxlQik7XG4gICAgfSxcbiAgICBjYWxjdWxhdGVQb3NpdGlvbjogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcGVyY2VudEIsIGxlbmd0aEIsIHNjYWxlQikge1xuICAgICAgICByZXR1cm4gcG9zaXRpb25BIC0gKChsZW5ndGhCICogc2NhbGVCKSAqIHBlcmNlbnRCKTtcbiAgICB9LFxuICAgIHRvcExlZnRUb1BlcmNlbnRhZ2U6IGZ1bmN0aW9uIChmb2N1cywgdG9wTGVmdCwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHBvc2l0aW9uLmNhbGN1bGF0ZVBlcmNlbnQoZm9jdXMueCwgdG9wTGVmdC54LCB3aWR0aCwgc2NhbGUueCksXG4gICAgICAgICAgICB5OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLnksIHRvcExlZnQueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIHBlcmNlbnRhZ2VUb1RvcExlZnQ6IGZ1bmN0aW9uIChmb2N1cywgcGVyY2VudGFnZSwgc2NhbGUsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLngsIHBlcmNlbnRhZ2UueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUG9zaXRpb24oZm9jdXMueSwgcGVyY2VudGFnZS55LCBoZWlnaHQsIHNjYWxlLnkpLFxuICAgICAgICB9O1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLnBvc2l0aW9uID0gcG9zaXRpb247IiwidmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpbmRleCBpbiBrZXlzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXlzW2luZGV4XSBpbiBvYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgeHk6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsneCcsICd5J10pO1xuICAgIH0sXG4gICAgZGltZW5zaW9uczogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd3aWR0aCcsICdoZWlnaHQnXSk7XG4gICAgfSxcbiAgICBwb2ludDogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBzY2FsZTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLnh5KG9iamVjdCk7XG4gICAgfSxcbiAgICBsYXllcjogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWydsZXZlbCcsICd0b3BMZWZ0JywgJ3NjYWxlJywgJ29wYWNpdHknXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5wb2ludChvYmplY3RbJ3RvcExlZnQnXSlcbiAgICAgICAgICAgICYmIHNjaGVtYS5zY2FsZShvYmplY3RbJ3NjYWxlJ10pO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy5zY2hlbWEgPSBzY2hlbWE7IiwidmFyIHV0aWxzID0ge1xuICAgIG51bGxPclVuZGVmaW5lZDogZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiIHx8IG9iaiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG59O1xuXG5tb2R1bGUuZXhwb3J0cy51dGlscyA9IHV0aWxzOyJdfQ==
