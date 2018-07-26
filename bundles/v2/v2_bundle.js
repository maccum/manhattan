(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
//"use strict";
var editSVG = require('./svg.js').editSVG;
//var plot = require('../plot/plot.js').plot; // gui should not depend on plot
var schema = require('../plot/schema.js').schema;

var gui = {
    render: function (visibleLayers, hiddenLevels) {

        //console.log(hiddenLevels);
        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            console.log(visibleLayers);
            throw new Error("Must have 1-2 visible layers.");
        }

        for (var hiddenIndex in hiddenLevels) {
            var level = hiddenLevels[hiddenIndex];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw new Error("GUI ERROR: expected a list of numbers for hiddenLayers.")
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
                .scale(layer.scale.x, layer.scale.y) // where best to put scaleFactor
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
}

module.exports.gui = gui;
},{"../plot/schema.js":9,"./svg.js":4}],2:[function(require,module,exports){
var page = function () {
    this.element = null;
};

page.prototype.create = function (type) {
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

page.prototype.select = function (id) {
    this.element = document.getElementById(id);
    return this;
};

page.prototype.attribute = function (attr, value) {
    this.element.setAttribute(attr, value);
    return this;
};

page.prototype.append = function (child) {
    this.element.appendChild(child.element);
    return this;
};

page.prototype.place = function (parent) {
    parent.element.appendChild(this.element);
    return this;
};

page.prototype.remove = function (parent) {
    parent.element.removeChild(this.element);
};

page.prototype.addHREF = function (href) {
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
}

module.exports.page = page;

},{}],3:[function(require,module,exports){
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
}

module.exports.selectors = selectors;
},{}],4:[function(require,module,exports){
var selectors = require('./selectors.js').selectors;

var editSVG = function () {
    this.layer;
    this.plot;
}

editSVG.prototype.set = function (level) {
    this.layer = document.getElementById(selectors.ids.layer(level));
    this.plot = document.getElementById(selectors.ids.plot);
    return this;
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
}

editSVG.prototype.translate = function (shiftX, shiftY) {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    if ((!shiftX || !shiftY) && (shiftX != 0 && shiftY != 0)) throw new Error("Cannot translate SVG object with null, undefined, or empty shift values. shiftX: "+shiftX+" shiftY:"+shiftY);
    var translation = this.transformations().getItem(0);
    if (translation.type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) throw "editSVG: first transform is not a Translate.";
    translation.setTranslate(shiftX, shiftY);
    return this;
}

editSVG.prototype.scale = function (scaleX, scaleY) {
    var scale = this.transformations().getItem(1);
    if (scale.type !== SVGTransform.SVG_TRANSFORM_SCALE) throw "editSVG: second transform is not a Scale.";
    scale.setScale(scaleX, scaleY);
    return this;
}

editSVG.prototype.fade = function (opacity) {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    this.layer.setAttribute("opacity", opacity);
    return this;
}

editSVG.prototype.hide = function () {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    this.layer.setAttribute("visibility", "hidden");
    return this;
}

editSVG.prototype.show = function () {
    if (!this.layer || !this.plot) throw "editSVG: layer and plot must be initialized.";
    this.layer.setAttribute("visibility", "visibile");
    return this;
}


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
    console.log(visiblesAndHiddens);
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
            console.log(changeInMousePosition);
            plot.drag(changeInMousePosition);

            /*var visibles = Object.keys(plot.visibles).map(function(key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));*/
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
        var mousePos = getMousePositionWithinObject(evt.clientX, evt.clientY, svg)
        plot.zoom(mousePos, vertical);
    } else {
        plot.drag({ x: horizontal, y: 0 });
    }

    /*var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));*/
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
    console.log("snap zoom in");
    console.log(plot.visibles[Object.keys(plot.visibles)[0]]);
    console.log(plot.visibles[Object.keys(plot.visibles)[0]].topLeft);

    /*plot.snapIn({ x: 512, y: 128 });

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));*/

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
    console.log(plot.visibles);

    /*plot.snapOut({ x: 512, y: 128 });

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));*/

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
    var tile = new page()
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

    var svg = new page()
        .create('svg')
        .attribute('id', 'svg-layer-' + level)
        .attribute('width', String(width))
        .attribute('height', String(height))
        .place(group);

    addAllTilesForLayer(level);

    plot.initializeHidden(level, { width: width, height: height });
    console.log(plot.hiddens);
    //console.log("Hiddens: " + plot.hiddens);
}

addLayerToPage(4);
addLayerToPage(5);
addLayerToPage(6);
addLayerToPage(7);
},{"../gui/page.js":2,"../gui/selectors.js":3,"../plot/plot.js":7}],7:[function(require,module,exports){
var schema = require('../plot/schema.js').schema;
var position = require("../plot/position.js").position;
//var gui = require('../gui/gui.js').gui; // <---- bug: circular dependency!

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
        } /*else if (xScale > plot.scaleRangeInWhichLowerZoomLayerIsTransparent[0]) {
            // layer with lower zoom level (below in current html)
            return plot.mapValueOntoRange(xScale, plot.scaleRangeInWhichLowerZoomLayerIsTransparent, [1, 0]);
        }*/ else {
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

        if ((!first.topLeft.x && first.topLeft.x != 0) || (!first.topLeft.y && first.topLeft.y != 0)) { 
            throw new Error("bad first top Left: [" + first.topLeft.x + ", " + first.topLeft.y + "]"); 
        } else {
            console.log(" okay : [" + first.topLeft.x + ", " + first.topLeft.y + "]");
        }
        console.log('focus');
        console.log(focus);
        console.log(first.topLeft);
        console.log(plot.unitScale(first.scale));
        console.log(width);
        console.log(height);
        var percentageCoordinates = position.topLeftToPercentage(focus, first.topLeft, plot.unitScale(first.scale), width, height);
        console.log(first.topLeft);
        console.log('percentage coords: ');
        console.log(percentageCoordinates);

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

        /*plot.zoom(focus, -5);
        var interval = setInterval(function () {
            console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
            if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 5) {
                plot.zoom(focus, -5);
            } else {
                for (var key in plot.visibles) {
                    plot.visibles[key].scale.x = 10000;
                }
                clearInterval(interval);
            }
            // TODO: call to gui should be refactored to go elsewhere
            var visibles = Object.keys(plot.visibles).map(function (key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

        }, .1);*/

        //console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
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

        /*
        plot.zoom(focus, 5);
        var interval = setInterval(function () {
            console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
            if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 4) {
                plot.zoom(focus, 5);
            } else {
                for (var key in plot.visibles) {
                    plot.visibles[key].scale.x = 10000;
                }
                clearInterval(interval);
            }
            // TODO: call to gui should be refactored to go elsewhere
            var visibles = Object.keys(plot.visibles).map(function (key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

        }, .1);*/

        //console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
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
}

module.exports.plot = plot;
},{"../plot/position.js":8,"../plot/schema.js":9}],8:[function(require,module,exports){
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
}

module.exports.position = position;
},{}],9:[function(require,module,exports){
var schema = {
    check: function (object, keys) {
        if (Object.keys(object).length != keys.length) {
            return false;
        }
        for (index in keys) {
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
}

module.exports.schema = schema;
},{}]},{},[6,5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9ndWkuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvcGFnZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9zZWxlY3RvcnMuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvc3ZnLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9oYW5kbGVyLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9pbml0aWFsaXplci5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcGxvdC5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcG9zaXRpb24uanMiLCJzY3JpcHRzL3YyL3NyYy9wbG90L3NjaGVtYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIi8vXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZWRpdFNWRyA9IHJlcXVpcmUoJy4vc3ZnLmpzJykuZWRpdFNWRztcbi8vdmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90OyAvLyBndWkgc2hvdWxkIG5vdCBkZXBlbmQgb24gcGxvdFxudmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3Bsb3Qvc2NoZW1hLmpzJykuc2NoZW1hO1xuXG52YXIgZ3VpID0ge1xuICAgIHJlbmRlcjogZnVuY3Rpb24gKHZpc2libGVMYXllcnMsIGhpZGRlbkxldmVscykge1xuXG4gICAgICAgIC8vY29uc29sZS5sb2coaGlkZGVuTGV2ZWxzKTtcbiAgICAgICAgaWYgKCEodmlzaWJsZUxheWVycy5sZW5ndGggPiAwICYmIHZpc2libGVMYXllcnMubGVuZ3RoIDw9IDIpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh2aXNpYmxlTGF5ZXJzKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgaGF2ZSAxLTIgdmlzaWJsZSBsYXllcnMuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaGlkZGVuSW5kZXggaW4gaGlkZGVuTGV2ZWxzKSB7XG4gICAgICAgICAgICB2YXIgbGV2ZWwgPSBoaWRkZW5MZXZlbHNbaGlkZGVuSW5kZXhdO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChsZXZlbCkgIT0gJ1tvYmplY3QgTnVtYmVyXScpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUkgRVJST1I6IGV4cGVjdGVkIGEgbGlzdCBvZiBudW1iZXJzIGZvciBoaWRkZW5MYXllcnMuXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KGxldmVsKS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciB2aXNpYmxlSW5kZXggaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmFyIGxheWVyID0gdmlzaWJsZUxheWVyc1t2aXNpYmxlSW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEubGF5ZXIobGF5ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGV4cGVjdGVkIGxheWVyIHNjaGVtYS5cIik7XG4gICAgICAgICAgICBpZiAobGF5ZXIuc2NhbGUueCA+IDIgfHwgbGF5ZXIuc2NhbGUueCA8IC41IHx8IGxheWVyLnNjYWxlLnkgPiAyIHx8IGxheWVyLnNjYWxlLnkgPCAuNSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSTogc2NhbGUgb3V0c2lkZSBbLjUsMl0gcmFuZ2UuIFNjYWxlIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gWy41LDJdIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gR1VJLiBbXCIrbGF5ZXIuc2NhbGUueCtcIiwgXCIrbGF5ZXIuc2NhbGUueStcIl1cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKClcbiAgICAgICAgICAgICAgICAuc2V0KGxheWVyLmxldmVsKVxuICAgICAgICAgICAgICAgIC50cmFuc2xhdGUobGF5ZXIudG9wTGVmdC54LCBsYXllci50b3BMZWZ0LnkpXG4gICAgICAgICAgICAgICAgLnNjYWxlKGxheWVyLnNjYWxlLngsIGxheWVyLnNjYWxlLnkpIC8vIHdoZXJlIGJlc3QgdG8gcHV0IHNjYWxlRmFjdG9yXG4gICAgICAgICAgICAgICAgLmZhZGUobGF5ZXIub3BhY2l0eSlcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpc2libGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIHNjYWxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBvcGFjaXR5U3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZpc2libGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLmxldmVsO1xuICAgICAgICAgICAgc2NhbGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLnNjYWxlLng7XG4gICAgICAgICAgICBvcGFjaXR5U3RyaW5nICs9IFwiIFwiKyB2aXNpYmxlTGF5ZXJzW2tleV0ub3BhY2l0eTtcbiAgICAgICAgfVxuICAgICAgICAkKFwiI3pvb20tZGl2XCIpLnRleHQodmlzaWJsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI2ZyYWN0aW9uYWwtem9vbS1kaXZcIikudGV4dChzY2FsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI29wYWNpdHktZGl2XCIpLnRleHQob3BhY2l0eVN0cmluZyk7XG4gICAgfSxcbn1cblxubW9kdWxlLmV4cG9ydHMuZ3VpID0gZ3VpOyIsInZhciBwYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuYXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5wbGFjZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBwYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIHBhcmVudC5lbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5hZGRIUkVGID0gZnVuY3Rpb24gKGhyZWYpIHtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMucGFnZSA9IHBhZ2U7XG4iLCJ2YXIgc2VsZWN0b3JzID0ge1xuICAgIGlkczoge1xuICAgICAgICB3aWRnZXQ6IFwid2lkZ2V0XCIsXG4gICAgICAgIHBsb3Q6IFwicGxvdFwiLFxuICAgICAgICBsYXllcjogZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJsYXllci1cIiArIGxldmVsO1xuICAgICAgICB9LFxuICAgICAgICBzdmdMYXllcjogZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzdmctbGF5ZXItXCIgKyBsZXZlbDtcbiAgICAgICAgfSxcbiAgICB9LFxufVxuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyO1xuICAgIHRoaXMucGxvdDtcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMubGF5ZXIobGV2ZWwpKTtcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB2YXIgdHJhbnNmb3JtYXRpb25zID0gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbiAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgdHJhbnNsYXRlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICB0cmFuc2xhdGUuc2V0VHJhbnNsYXRlKDAsIDApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUodHJhbnNsYXRlLCAwKTtcblxuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHNjYWxlLnNldFNjYWxlKDEuMCwgMS4wKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHNjYWxlLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCAhPT0gMikgdGhyb3cgXCJlZGl0U1ZHOiBleHBlY3RlZCB0cmFuc2Zvcm1hdGlvbnMgdG8gYmUgYSBsaXN0IG9mIGxlbmd0aCAyLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMCkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgxKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgXCJlZGl0U1ZHOiB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCI7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoc2hpZnRYLCBzaGlmdFkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIGlmICgoIXNoaWZ0WCB8fCAhc2hpZnRZKSAmJiAoc2hpZnRYICE9IDAgJiYgc2hpZnRZICE9IDApKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgdHJhbnNsYXRlIFNWRyBvYmplY3Qgd2l0aCBudWxsLCB1bmRlZmluZWQsIG9yIGVtcHR5IHNoaWZ0IHZhbHVlcy4gc2hpZnRYOiBcIitzaGlmdFgrXCIgc2hpZnRZOlwiK3NoaWZ0WSk7XG4gICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy50cmFuc2Zvcm1hdGlvbnMoKS5nZXRJdGVtKDApO1xuICAgIGlmICh0cmFuc2xhdGlvbi50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9UUkFOU0xBVEUpIHRocm93IFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIjtcbiAgICB0cmFuc2xhdGlvbi5zZXRUcmFuc2xhdGUoc2hpZnRYLCBzaGlmdFkpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbmVkaXRTVkcucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbiAob3BhY2l0eSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIsIG9wYWNpdHkpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJpbGVcIik7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblxuLypcblRlc3RcblxudmFyIGwyID0gbmV3IGVkaXRTVkcoKS5zZXQoMik7XG5cbnZhciB4ID0gbDIudHJhbnNmb3JtYXRpb25zKCk7IFxuLy8gY2hlY2sgdHJhbnNsYXRlXG54LmdldEl0ZW0oMCkubWF0cml4LmU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbnguZ2V0SXRlbSgwKS5tYXRyaXguZjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMFxuLy8gY2hlY2sgc2NhbGVcbnguZ2V0SXRlbSgxKS5tYXRyaXguYTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxueC5nZXRJdGVtKDEpLm1hdHJpeC5kOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAxXG4vLyBjaGVjayBsZW5ndGhcbngubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMlxuXG5sMi50cmFuc2xhdGUoNTAsIDUwKTtcblxubDIuc2NhbGUoLjUsIC41KTtcblxubDIuZmFkZSguNSk7XG5cbmwyLmhpZGUoKTtcblxubDIuc2hvdygpO1xuKi9cblxubW9kdWxlLmV4cG9ydHMuZWRpdFNWRyA9IGVkaXRTVkc7IiwidmFyIGd1aSA9IHJlcXVpcmUoJy4uL2d1aS9ndWkuanMnKS5ndWk7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG5cbmZ1bmN0aW9uIGNhbGxHVUkodmlzaWJsZXNBbmRIaWRkZW5zKSB7XG4gICAgY29uc29sZS5sb2codmlzaWJsZXNBbmRIaWRkZW5zKTtcbiAgICBndWkucmVuZGVyKHZpc2libGVzQW5kSGlkZGVuc1swXSwgdmlzaWJsZXNBbmRIaWRkZW5zWzFdKTtcbn1cblxuZnVuY3Rpb24gbGlzdGVuRm9yRHJhZyhldnQpIHtcbiAgICBjb25zb2xlLmxvZyhcImxpc3RlbkZvckRyYWdcIik7XG4gICAgdmFyIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB2YXIgc3ZnID0gZXZ0LnRhcmdldDtcblxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBiZWdpbkRyYWcsIGZhbHNlKTtcbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZywgZmFsc2UpO1xuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZywgZmFsc2UpO1xuXG4gICAgdmFyIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlO1xuXG4gICAgZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihldnQpIHtcbiAgICAgICAgcmV0dXJuIGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJlZ2luRHJhZyhldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmVnaW5EcmFnXCIpO1xuICAgICAgICBpc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZyA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUgPSBtb3VzZVBvc2l0aW9uT25TdGFydERyYWc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHJhZyhldnQpIHtcbiAgICAgICAgaWYgKGlzRHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB2YXIgY3VycmVudE1vdXNlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHg6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnggLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS54LFxuICAgICAgICAgICAgICAgIHk6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnkgLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS55LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNoYW5nZUluTW91c2VQb3NpdGlvbik7XG4gICAgICAgICAgICBwbG90LmRyYWcoY2hhbmdlSW5Nb3VzZVBvc2l0aW9uKTtcblxuICAgICAgICAgICAgLyp2YXIgdmlzaWJsZXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZ3VpLnJlbmRlcih2aXNpYmxlcywgQXJyYXkuZnJvbShwbG90LmhpZGRlbnMpKTsqL1xuICAgICAgICAgICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG5cbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gb25XaGVlbChldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2YXIgaG9yaXpvbnRhbCA9IGV2dC5kZWx0YVg7XG4gICAgdmFyIHZlcnRpY2FsID0gZXZ0LmRlbHRhWTtcblxuICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKTtcbiAgICAgICAgdmFyIG1vdXNlUG9zID0gZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2ZylcbiAgICAgICAgcGxvdC56b29tKG1vdXNlUG9zLCB2ZXJ0aWNhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGxvdC5kcmFnKHsgeDogaG9yaXpvbnRhbCwgeTogMCB9KTtcbiAgICB9XG5cbiAgICAvKnZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICB9KTtcbiAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpOyovXG4gICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG59XG5cbmZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgdmFyIGN0bSA9IGJvdW5kaW5nT2JqZWN0LmdldFNjcmVlbkNUTSgpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgeTogKG1vdXNlWSAtIGN0bS5mKSAvIGN0bS5kXG4gICAgfTtcbn1cblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBvbldoZWVsKTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLWluLWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKFwic25hcCB6b29tIGluXCIpO1xuICAgIGNvbnNvbGUubG9nKHBsb3QudmlzaWJsZXNbT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF1dKTtcbiAgICBjb25zb2xlLmxvZyhwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS50b3BMZWZ0KTtcblxuICAgIC8qcGxvdC5zbmFwSW4oeyB4OiA1MTIsIHk6IDEyOCB9KTtcblxuICAgIHZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICB9KTtcbiAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpOyovXG5cbiAgICBwbG90Lnpvb20oeyB4OiA1MTIsIHk6IDEyOCB9LCAtNSk7XG4gICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHBsb3Quc25hcEluKHsgeDogNTEyLCB5OiAxMjggfSkpIHtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbGxHVUkocGxvdC5nZXRJbmZvRm9yR1VJKCkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUuc3RhY2spO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICB9LCAuMSk7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLW91dC1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmxvZyhcInNuYXAgem9vbSBvdXRcIik7XG4gICAgY29uc29sZS5sb2cocGxvdC52aXNpYmxlcyk7XG5cbiAgICAvKnBsb3Quc25hcE91dCh7IHg6IDUxMiwgeTogMTI4IH0pO1xuXG4gICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgIH0pO1xuICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7Ki9cblxuICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIDUpO1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgfVxuICAgIH0sIC4xKTtcblxufSk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKS5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsaXN0ZW5Gb3JEcmFnKTsiLCJ2YXIgcGFnZSA9IHJlcXVpcmUoJy4uL2d1aS9wYWdlLmpzJykucGFnZTtcbnZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuLi9ndWkvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xuXG5wbG90LmluaXRpYWxpemVWaXNpYmxlKDIsIHsgd2lkdGg6IDEwMjQsIGhlaWdodDogMjU2IH0pO1xucGxvdC5pbml0aWFsaXplSGlkZGVuKDMsIHsgd2lkdGg6IDIwNDgsIGhlaWdodDogMjU2IH0pO1xuXG52YXIgdGlsZUZvbGRlclBhdGggPSBcIi4uL3Bsb3RzL3N2Z190dXRvcmlhbF9wbG90cy9cIjtcblxuZnVuY3Rpb24gYWRkVGlsZShsZXZlbCwgY29sdW1uKSB7XG4gICAgdmFyIHRpbGVQYXRoID0gdGlsZUZvbGRlclBhdGggKyBcIi9cIiArIGxldmVsICsgXCIvXCIgKyBjb2x1bW4gKyBcIi5wbmdcIjtcblxuICAgIHZhciB4ID0gY29sdW1uICogMjU2O1xuICAgIHZhciB5ID0gMDtcbiAgICB2YXIgd2lkdGggPSAyNTY7XG4gICAgdmFyIGhlaWdodCA9IDI1NjtcblxuICAgIHZhciBzdmcgPSBuZXcgcGFnZSgpLnNlbGVjdChzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKGxldmVsKSk7XG4gICAgdmFyIHRpbGUgPSBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ2ltYWdlJylcbiAgICAgICAgLmF0dHJpYnV0ZSgneCcsIFN0cmluZyh4KSlcbiAgICAgICAgLmF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSlcbiAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgLmFkZEhSRUYodGlsZVBhdGgpXG4gICAgICAgIC5wbGFjZShzdmcpO1xufVxuXG5mdW5jdGlvbiBhZGRBbGxUaWxlc0ZvckxheWVyKGxldmVsKSB7XG4gICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgdmFyIHggPSAwO1xuICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgIGFkZFRpbGUobGV2ZWwsIGMpO1xuICAgICAgICB4ID0geCArIDI1NjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZExheWVyVG9QYWdlKGxldmVsKSB7XG4gICAgLy9jb25zb2xlLmxvZyhzZWxlY3RvcnMucGxvdCk7XG4gICAgdmFyIHBsdCA9IG5ldyBwYWdlKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgLy9jb25zb2xlLmxvZyhwbHQuZWxlbWVudCk7XG4gICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG5cbiAgICB2YXIgZ3JvdXAgPSBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ2cnKVxuICAgICAgICAuYXR0cmlidXRlKCdpZCcsICdsYXllci0nICsgbGV2ZWwpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJylcbiAgICAgICAgLnBsYWNlKHBsdCk7XG5cbiAgICB2YXIgd2lkdGggPSBjb2x1bW5zICogMjU2O1xuICAgIHZhciBoZWlnaHQgPSAyNTY7XG5cbiAgICB2YXIgc3ZnID0gbmV3IHBhZ2UoKVxuICAgICAgICAuY3JlYXRlKCdzdmcnKVxuICAgICAgICAuYXR0cmlidXRlKCdpZCcsICdzdmctbGF5ZXItJyArIGxldmVsKVxuICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAucGxhY2UoZ3JvdXApO1xuXG4gICAgYWRkQWxsVGlsZXNGb3JMYXllcihsZXZlbCk7XG5cbiAgICBwbG90LmluaXRpYWxpemVIaWRkZW4obGV2ZWwsIHsgd2lkdGg6IHdpZHRoLCBoZWlnaHQ6IGhlaWdodCB9KTtcbiAgICBjb25zb2xlLmxvZyhwbG90LmhpZGRlbnMpO1xuICAgIC8vY29uc29sZS5sb2coXCJIaWRkZW5zOiBcIiArIHBsb3QuaGlkZGVucyk7XG59XG5cbmFkZExheWVyVG9QYWdlKDQpO1xuYWRkTGF5ZXJUb1BhZ2UoNSk7XG5hZGRMYXllclRvUGFnZSg2KTtcbmFkZExheWVyVG9QYWdlKDcpOyIsInZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi9wbG90L3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuLi9wbG90L3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuLy92YXIgZ3VpID0gcmVxdWlyZSgnLi4vZ3VpL2d1aS5qcycpLmd1aTsgLy8gPC0tLS0gYnVnOiBjaXJjdWxhciBkZXBlbmRlbmN5IVxuXG52YXIgcGxvdCA9IHtcbiAgICBtaW5pbXVtTGV2ZWw6IDIsXG4gICAgbWF4aW11bUxldmVsOiA3LFxuICAgIHNjYWxlRmFjdG9yOiAxMDAwMCxcbiAgICB6b29tSW5jcmVtZW50OiA1LFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudDogWzYwMDAsIDkwMDBdLFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50OiBbMTIwMDAsIDE4MDAwXSxcbiAgICB2aXNpYmxlczoge30sXG4gICAgaGlkZGVuczogbmV3IFNldChbXSksXG4gICAgZGltZW5zaW9uczoge30sXG4gICAgdW5pdFNjYWxlOiBmdW5jdGlvbiAoc2NhbGUpIHtcbiAgICAgICAgaWYgKChzY2FsZS54ID4gLjUgJiYgc2NhbGUueCA8IDIpIHx8IChzY2FsZS55ID4gLjUgJiYgc2NhbGUueSA8IDIpKSB0aHJvdyBuZXcgRXJyb3IoJ3NjYWxlIGFscmVhZHkgaW4gdW5pdCBzY2FsZScpO1xuICAgICAgICByZXR1cm4geyB4OiBzY2FsZS54IC8gcGxvdC5zY2FsZUZhY3RvciwgeTogc2NhbGUueSAvIHBsb3Quc2NhbGVGYWN0b3IgfTtcbiAgICB9LFxuICAgIGdldEluZm9Gb3JHVUk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGxpc3RPZlZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnQgc2NhbGUgZm9yIHBhc3NpbmcgdG8gR1VJOiBcbiAgICAgICAgICAgIHZhciBndWlMYXllciA9IHtcbiAgICAgICAgICAgICAgICBsZXZlbDogcGxvdC52aXNpYmxlc1trZXldLmxldmVsLFxuICAgICAgICAgICAgICAgIHRvcExlZnQ6IHBsb3QudmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgIHNjYWxlOiBwbG90LnVuaXRTY2FsZShwbG90LnZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgIG9wYWNpdHk6IHBsb3QudmlzaWJsZXNba2V5XS5vcGFjaXR5LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBndWlMYXllcjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShwbG90LmhpZGRlbnMpO1xuICAgICAgICByZXR1cm4gW2xpc3RPZlZpc2libGVzLCBsaXN0T2ZIaWRkZW5zXTtcbiAgICB9LFxuICAgIGluaXRpYWxpemVWaXNpYmxlOiBmdW5jdGlvbiAobGV2ZWwsIGRpbWVuc2lvbnMpIHtcbiAgICAgICAgaWYgKGxldmVsIDwgcGxvdC5taW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBwbG90Lm1heGltdW1MZXZlbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFkZCB2aXNpYmxlIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbWVuc2lvbnMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgcGxvdC52aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogeyB4OiAwLCB5OiAwIH0sIHNjYWxlOiB7IHg6IDEgKiBwbG90LnNjYWxlRmFjdG9yLCB5OiAxICogcGxvdC5zY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgIHBsb3QuZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1lbnNpb25zO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZUhpZGRlbjogZnVuY3Rpb24gKGxldmVsLCBkaW1lbnNpb25zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IHBsb3QubWluaW11bUxldmVsIHx8IGxldmVsID4gcGxvdC5tYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICBpZiAoIXNjaGVtYS5kaW1lbnNpb25zKGRpbWVuc2lvbnMpKSB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBkaW1lbnNpb25zIHNjaGVtYVwiKTtcbiAgICAgICAgcGxvdC5oaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgICAgICBwbG90LmRpbWVuc2lvbnNbbGV2ZWxdID0gZGltZW5zaW9ucztcbiAgICB9LFxuICAgIHNob3c6IGZ1bmN0aW9uIChsZXZlbCwgdG9wTGVmdCwgc2NhbGUsIG9wYWNpdHkpIHtcbiAgICAgICAgaWYgKCFwbG90LmhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIjtcbiAgICAgICAgcGxvdC52aXNpYmxlc1tsZXZlbF0gPSB7IGxldmVsOiBsZXZlbCwgdG9wTGVmdDogdG9wTGVmdCwgc2NhbGU6IHNjYWxlLCBvcGFjaXR5OiBvcGFjaXR5IH07XG4gICAgICAgIHBsb3QuaGlkZGVucy5kZWxldGUobGV2ZWwpO1xuICAgIH0sXG4gICAgaGlkZTogZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgIGlmICghcGxvdC52aXNpYmxlc1tsZXZlbF0pIHRocm93IFwiVHJpZWQgdG8gaGlkZSBhIGxldmVsIHRoYXQgaXMgbm90IHZpc2libGVcIjtcbiAgICAgICAgZGVsZXRlIHBsb3QudmlzaWJsZXNbbGV2ZWxdO1xuICAgICAgICBwbG90LmhpZGRlbnMuYWRkKHBhcnNlSW50KGxldmVsKSk7XG4gICAgfSxcbiAgICBjYWxjdWxhdGVPcGFjaXR5OiBmdW5jdGlvbiAoc2NhbGUpIHtcbiAgICAgICAgdmFyIHhTY2FsZSA9IHNjYWxlLng7XG4gICAgICAgIGlmICh4U2NhbGUgPCBwbG90LnNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBoaWdoZXIgem9vbSBsZXZlbCAob24gdG9wIGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBwbG90Lm1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFswLCAxXSk7XG4gICAgICAgIH0gLyplbHNlIGlmICh4U2NhbGUgPiBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzBdKSB7XG4gICAgICAgICAgICAvLyBsYXllciB3aXRoIGxvd2VyIHpvb20gbGV2ZWwgKGJlbG93IGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBwbG90Lm1hcFZhbHVlT250b1JhbmdlKHhTY2FsZSwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzEsIDBdKTtcbiAgICAgICAgfSovIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIG1hcFZhbHVlT250b1JhbmdlOiBmdW5jdGlvbiAodmFsdWUsIG9sZFJhbmdlLCBuZXdSYW5nZSkge1xuICAgICAgICB2YXIgb2xkU3BhbiA9IG9sZFJhbmdlWzFdIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBuZXdTcGFuID0gbmV3UmFuZ2VbMV0gLSBuZXdSYW5nZVswXTtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9WYWx1ZSA9IHZhbHVlIC0gb2xkUmFuZ2VbMF07XG4gICAgICAgIHZhciBwZXJjZW50U3BhblRvVmFsdWUgPSBkaXN0YW5jZVRvVmFsdWUgLyBvbGRTcGFuO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb05ld1ZhbHVlID0gcGVyY2VudFNwYW5Ub1ZhbHVlICogbmV3U3BhbjtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gbmV3UmFuZ2VbMF0gKyBkaXN0YW5jZVRvTmV3VmFsdWU7XG4gICAgICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgICB9LFxuICAgIGluY3JlYXNlU2NhbGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA8IHBsb3Quc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCArPSBwbG90Lnpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA8IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggKz0gcGxvdC56b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA+PSBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5oaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgKyAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsIDw9IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0sIHk6IDEgKiBwbG90LnNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHBsb3Quc2hvdyhsYXllclRvUmV2ZWFsLCBwbG90LnZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIHBsb3QuY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVjcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgaWYgKCEoa2V5ID09IHBsb3QubWluaW11bUxldmVsICYmIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHBsb3Quc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggLT0gcGxvdC56b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHBsb3Quem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPD0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0gJiYga2V5ID4gcGxvdC5taW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBwbG90LmhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPT0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsID49IHBsb3QubWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSwgeTogcGxvdC5zY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICBwbG90LnNob3cobGF5ZXJUb1JldmVhbCwgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBwbG90LmNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9zaXRpb246IGZ1bmN0aW9uIChuZXdUb3BMZWZ0KSB7XG4gICAgICAgIGlmICgoIW5ld1RvcExlZnQueCAmJiBuZXdUb3BMZWZ0LnggIT0gMCkgfHwgKCFuZXdUb3BMZWZ0LnkgJiYgbmV3VG9wTGVmdC55ICE9IDApKSB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbmV3IFRvcCBMZWZ0OiBbXCIgKyBuZXdUb3BMZWZ0LnggKyBcIiwgXCIgKyBuZXdUb3BMZWZ0LnkgKyBcIl1cIik7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0udG9wTGVmdCA9IG5ld1RvcExlZnQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlc2V0T3BhY2l0aWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0ub3BhY2l0eSA9IHBsb3QuY2FsY3VsYXRlT3BhY2l0eShwbG90LnZpc2libGVzW2tleV0uc2NhbGUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB6b29tOiBmdW5jdGlvbiAoZm9jdXMsIHZlcnRpY2FsKSB7XG5cbiAgICAgICAgdmFyIGZpcnN0S2V5ID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBmaXJzdCA9IHBsb3QudmlzaWJsZXNbZmlyc3RLZXldLFxuICAgICAgICAgICAgd2lkdGggPSBwbG90LmRpbWVuc2lvbnNbZmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gcGxvdC5kaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKCghZmlyc3QudG9wTGVmdC54ICYmIGZpcnN0LnRvcExlZnQueCAhPSAwKSB8fCAoIWZpcnN0LnRvcExlZnQueSAmJiBmaXJzdC50b3BMZWZ0LnkgIT0gMCkpIHsgXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgZmlyc3QgdG9wIExlZnQ6IFtcIiArIGZpcnN0LnRvcExlZnQueCArIFwiLCBcIiArIGZpcnN0LnRvcExlZnQueSArIFwiXVwiKTsgXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIiBva2F5IDogW1wiICsgZmlyc3QudG9wTGVmdC54ICsgXCIsIFwiICsgZmlyc3QudG9wTGVmdC55ICsgXCJdXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKCdmb2N1cycpO1xuICAgICAgICBjb25zb2xlLmxvZyhmb2N1cyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGZpcnN0LnRvcExlZnQpO1xuICAgICAgICBjb25zb2xlLmxvZyhwbG90LnVuaXRTY2FsZShmaXJzdC5zY2FsZSkpO1xuICAgICAgICBjb25zb2xlLmxvZyh3aWR0aCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGhlaWdodCk7XG4gICAgICAgIHZhciBwZXJjZW50YWdlQ29vcmRpbmF0ZXMgPSBwb3NpdGlvbi50b3BMZWZ0VG9QZXJjZW50YWdlKGZvY3VzLCBmaXJzdC50b3BMZWZ0LCBwbG90LnVuaXRTY2FsZShmaXJzdC5zY2FsZSksIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zb2xlLmxvZyhmaXJzdC50b3BMZWZ0KTtcbiAgICAgICAgY29uc29sZS5sb2coJ3BlcmNlbnRhZ2UgY29vcmRzOiAnKTtcbiAgICAgICAgY29uc29sZS5sb2cocGVyY2VudGFnZUNvb3JkaW5hdGVzKTtcblxuICAgICAgICB2YXIgaG93TXVjaCA9IE1hdGguZmxvb3IoTWF0aC5hYnModmVydGljYWwpIC8gNSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG93TXVjaDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodmVydGljYWwgPCAwKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5pbmNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsb3QuZGVjcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBuZXdGaXJzdCA9IHBsb3QudmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgbmV3V2lkdGggPSBwbG90LmRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgbmV3SGVpZ2h0ID0gcGxvdC5kaW1lbnNpb25zW25ld0ZpcnN0S2V5XS5oZWlnaHQ7XG5cbiAgICAgICAgdmFyIG5ld1RvcExlZnQgPSBwb3NpdGlvbi5wZXJjZW50YWdlVG9Ub3BMZWZ0KGZvY3VzLCBwZXJjZW50YWdlQ29vcmRpbmF0ZXMsIHBsb3QudW5pdFNjYWxlKG5ld0ZpcnN0LnNjYWxlKSwgbmV3V2lkdGgsIG5ld0hlaWdodCk7XG4gICAgICAgIHBsb3QucmVwb3NpdGlvbihuZXdUb3BMZWZ0KTtcbiAgICAgICAgcGxvdC5yZXNldE9wYWNpdGllcygpO1xuICAgIH0sXG4gICAgc25hcEluOiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIC8qcGxvdC56b29tKGZvY3VzLCAtNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsb3QudmlzaWJsZXNbT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF1dLnNjYWxlLngpO1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gcGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICAgICAgcGxvdC56b29tKGZvY3VzLCAtNSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVE9ETzogY2FsbCB0byBndWkgc2hvdWxkIGJlIHJlZmFjdG9yZWQgdG8gZ28gZWxzZXdoZXJlXG4gICAgICAgICAgICB2YXIgdmlzaWJsZXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbG90LnZpc2libGVzW2tleV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG5cbiAgICAgICAgfSwgLjEpOyovXG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS5zY2FsZS54KTtcbiAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gcGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICBwbG90Lnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzbmFwT3V0OiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKTtcbiAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuXG4gICAgICAgIC8qXG4gICAgICAgIHBsb3Quem9vbShmb2N1cywgNSk7XG4gICAgICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHBsb3QudmlzaWJsZXNbT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF1dLnNjYWxlLngpO1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gcGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCkgPiA0KSB7XG4gICAgICAgICAgICAgICAgcGxvdC56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPSAxMDAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBUT0RPOiBjYWxsIHRvIGd1aSBzaG91bGQgYmUgcmVmYWN0b3JlZCB0byBnbyBlbHNld2hlcmVcbiAgICAgICAgICAgIHZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZ3VpLnJlbmRlcih2aXNpYmxlcywgQXJyYXkuZnJvbShwbG90LmhpZGRlbnMpKTtcblxuICAgICAgICB9LCAuMSk7Ki9cblxuICAgICAgICAvL2NvbnNvbGUubG9nKHBsb3QudmlzaWJsZXNbT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF1dLnNjYWxlLngpO1xuICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSBwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgIHBsb3Quem9vbShmb2N1cywgNSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZHJhZzogZnVuY3Rpb24gKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS50b3BMZWZ0LnggKz0gY2hhbmdlSW5Qb3NpdGlvbi54O1xuICAgICAgICB9XG4gICAgfSxcbn1cblxubW9kdWxlLmV4cG9ydHMucGxvdCA9IHBsb3Q7IiwidmFyIHBvc2l0aW9uID0ge1xuICAgIGNhbGN1bGF0ZVBlcmNlbnQ6IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBvc2l0aW9uQiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIGlmIChsZW5ndGhCIDw9IDApIHRocm93IG5ldyBFcnJvcihcIkxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlLlwiKTtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLnBvc2l0aW9uID0gcG9zaXRpb247IiwidmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn1cblxubW9kdWxlLmV4cG9ydHMuc2NoZW1hID0gc2NoZW1hOyJdfQ==
