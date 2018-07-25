(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
//"use strict";
var editSVG = require('./svg.js').editSVG;
var plot = require('../plot/plot.js').plot;
var schema = require('../plot/schema.js').schema;

var gui = {
    render: function (visibleLayers, hiddenLevels) {

        //console.log(hiddenLevels);
        if (!(visibleLayers.length > 0 && visibleLayers.length <= 2)) {
            console.log(visibleLayers);
            throw new Error("Must have 1-2 visible layers.");
        }

        for (index in hiddenLevels) {
            var level = hiddenLevels[index];
            if (Object.prototype.toString.call(level) != '[object Number]') {
                throw new Error("GUI ERROR: expected a list of numbers for hiddenLayers.")
            }
            
            new editSVG().set(level).hide();
        }

        for (index in visibleLayers) {
            var layer = visibleLayers[index];
            if (!schema.layer(layer)) throw new Error("GUI: expected layer schema.");

            
            new editSVG()
                .set(layer.level)
                .translate(layer.topLeft.x, layer.topLeft.y)
                .scale(layer.scale.x/plot.scaleFactor, layer.scale.y/plot.scaleFactor) // where best to put scaleFactor
                .fade(layer.opacity)
                .show();
        }

        var visiblesString = "";
        var scalesString = "";
        var opacityString = "";
        for (key in plot.visibles) {
            visiblesString += " " + key;
            scalesString += " " + plot.visibles[key].scale.x/10000;
            opacityString += " "+ plot.visibles[key].opacity;
        }
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
        $("#opacity-div").text(opacityString);
    },
}

module.exports.gui = gui;
},{"../plot/plot.js":7,"../plot/schema.js":9,"./svg.js":4}],2:[function(require,module,exports){
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

/*function callGUI() {
    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
}*/

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

            var visibles = Object.keys(plot.visibles).map(function(key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

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
        plot.drag({x: horizontal, y: 0});
    }

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
}

function getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
    var ctm = boundingObject.getScreenCTM();
    return {
        x: (mouseX - ctm.e) / ctm.a,
        y: (mouseY - ctm.f) / ctm.d
    };
}

document.getElementById("plot").addEventListener("wheel", onWheel);

document.getElementById("zoom-in-button").addEventListener("click", function (e) {
    console.log("snap zoom in");
    plot.snapIn({ x: 512, y: 128 });

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
});

document.getElementById("zoom-out-button").addEventListener("click", function (e) {
    console.log("snap zoom out");
    plot.snapOut({ x: 512, y: 128 });

    var visibles = Object.keys(plot.visibles).map(function(key) {
        return plot.visibles[key];
    });
    gui.render(visibles, Array.from(plot.hiddens));
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
//var gui = require('../gui/gui.js').gui;

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
        return { x: scale.x / plot.scaleFactor, y: scale.y / plot.scaleFactor };
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
    show: function (level, topLeft, scale, opacity, dimensions) {
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
        for (key in plot.visibles) {
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
        for (key in plot.visibles) {
            if (!(key==plot.minimumLevel && plot.visibles[key].scale.x == plot.scaleFactor)) {
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
        for (key in plot.visibles) {
            plot.visibles[key].topLeft = newTopLeft;
        }
    },
    resetOpacities: function () {
        for (key in plot.visibles) {
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

        plot.zoom(focus, -5);
        var interval = setInterval(function () {
            console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
            if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 5) {
                plot.zoom(focus, -5);
            } else {
                for (key in plot.visibles) {
                    plot.visibles[key].scale.x = 10000;
                }
                clearInterval(interval);
            }
            // TODO: call to gui should be refactored to go elsewhere
            var visibles = Object.keys(plot.visibles).map(function (key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

        }, .1);
    },
    snapOut: function (focus) {
        var keys = Object.keys(plot.visibles);
        if (keys.length > 2 || keys.length < 1) throw "PLOT: expected 1-2 layers";

        plot.zoom(focus, 5);
        var interval = setInterval(function () {
            console.log(plot.visibles[Object.keys(plot.visibles)[0]].scale.x);
            if (Math.abs(10000 - plot.visibles[Object.keys(plot.visibles)[0]].scale.x) > 4) {
                plot.zoom(focus, 5);
            } else {
                for (key in plot.visibles) {
                    plot.visibles[key].scale.x = 10000;
                }
                clearInterval(interval);
            }
            // TODO: call to gui should be refactored to go elsewhere
            var visibles = Object.keys(plot.visibles).map(function (key) {
                return plot.visibles[key];
            });
            gui.render(visibles, Array.from(plot.hiddens));

        }, .1);
    },
    drag: function (changeInPosition) {
        for (key in plot.visibles) {
            plot.visibles[key].topLeft.x += changeInPosition.x;
        }
    },
}

module.exports.plot = plot;
},{"../plot/position.js":8,"../plot/schema.js":9}],8:[function(require,module,exports){
var position = {
    calculatePercent: function (positionA, positionB, lengthB, scaleB) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9ndWkuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvcGFnZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9zZWxlY3RvcnMuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvc3ZnLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9oYW5kbGVyLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9pbml0aWFsaXplci5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcGxvdC5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcG9zaXRpb24uanMiLCJzY3JpcHRzL3YyL3NyYy9wbG90L3NjaGVtYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvL1widXNlIHN0cmljdFwiO1xudmFyIGVkaXRTVkcgPSByZXF1aXJlKCcuL3N2Zy5qcycpLmVkaXRTVkc7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vcGxvdC9zY2hlbWEuanMnKS5zY2hlbWE7XG5cbnZhciBndWkgPSB7XG4gICAgcmVuZGVyOiBmdW5jdGlvbiAodmlzaWJsZUxheWVycywgaGlkZGVuTGV2ZWxzKSB7XG5cbiAgICAgICAgLy9jb25zb2xlLmxvZyhoaWRkZW5MZXZlbHMpO1xuICAgICAgICBpZiAoISh2aXNpYmxlTGF5ZXJzLmxlbmd0aCA+IDAgJiYgdmlzaWJsZUxheWVycy5sZW5ndGggPD0gMikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHZpc2libGVMYXllcnMpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBoYXZlIDEtMiB2aXNpYmxlIGxheWVycy5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGluZGV4IGluIGhpZGRlbkxldmVscykge1xuICAgICAgICAgICAgdmFyIGxldmVsID0gaGlkZGVuTGV2ZWxzW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGV2ZWwpICE9ICdbb2JqZWN0IE51bWJlcl0nKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR1VJIEVSUk9SOiBleHBlY3RlZCBhIGxpc3Qgb2YgbnVtYmVycyBmb3IgaGlkZGVuTGF5ZXJzLlwiKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBuZXcgZWRpdFNWRygpLnNldChsZXZlbCkuaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChpbmRleCBpbiB2aXNpYmxlTGF5ZXJzKSB7XG4gICAgICAgICAgICB2YXIgbGF5ZXIgPSB2aXNpYmxlTGF5ZXJzW2luZGV4XTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmxheWVyKGxheWVyKSkgdGhyb3cgbmV3IEVycm9yKFwiR1VJOiBleHBlY3RlZCBsYXllciBzY2hlbWEuXCIpO1xuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKClcbiAgICAgICAgICAgICAgICAuc2V0KGxheWVyLmxldmVsKVxuICAgICAgICAgICAgICAgIC50cmFuc2xhdGUobGF5ZXIudG9wTGVmdC54LCBsYXllci50b3BMZWZ0LnkpXG4gICAgICAgICAgICAgICAgLnNjYWxlKGxheWVyLnNjYWxlLngvcGxvdC5zY2FsZUZhY3RvciwgbGF5ZXIuc2NhbGUueS9wbG90LnNjYWxlRmFjdG9yKSAvLyB3aGVyZSBiZXN0IHRvIHB1dCBzY2FsZUZhY3RvclxuICAgICAgICAgICAgICAgIC5mYWRlKGxheWVyLm9wYWNpdHkpXG4gICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2aXNpYmxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBzY2FsZXNTdHJpbmcgPSBcIlwiO1xuICAgICAgICB2YXIgb3BhY2l0eVN0cmluZyA9IFwiXCI7XG4gICAgICAgIGZvciAoa2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzU3RyaW5nICs9IFwiIFwiICsga2V5O1xuICAgICAgICAgICAgc2NhbGVzU3RyaW5nICs9IFwiIFwiICsgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLngvMTAwMDA7XG4gICAgICAgICAgICBvcGFjaXR5U3RyaW5nICs9IFwiIFwiKyBwbG90LnZpc2libGVzW2tleV0ub3BhY2l0eTtcbiAgICAgICAgfVxuICAgICAgICAkKFwiI3pvb20tZGl2XCIpLnRleHQodmlzaWJsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI2ZyYWN0aW9uYWwtem9vbS1kaXZcIikudGV4dChzY2FsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI29wYWNpdHktZGl2XCIpLnRleHQob3BhY2l0eVN0cmluZyk7XG4gICAgfSxcbn1cblxubW9kdWxlLmV4cG9ydHMuZ3VpID0gZ3VpOyIsInZhciBwYWdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsIHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuc2VsZWN0ID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUuYXR0cmlidXRlID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCB2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5wbGFjZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBwYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIHBhcmVudC5lbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZWxlbWVudCk7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5hZGRIUkVGID0gZnVuY3Rpb24gKGhyZWYpIHtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMucGFnZSA9IHBhZ2U7XG4iLCJ2YXIgc2VsZWN0b3JzID0ge1xuICAgIGlkczoge1xuICAgICAgICB3aWRnZXQ6IFwid2lkZ2V0XCIsXG4gICAgICAgIHBsb3Q6IFwicGxvdFwiLFxuICAgICAgICBsYXllcjogZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJsYXllci1cIiArIGxldmVsO1xuICAgICAgICB9LFxuICAgICAgICBzdmdMYXllcjogZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzdmctbGF5ZXItXCIgKyBsZXZlbDtcbiAgICAgICAgfSxcbiAgICB9LFxufVxuXG5tb2R1bGUuZXhwb3J0cy5zZWxlY3RvcnMgPSBzZWxlY3RvcnM7IiwidmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4vc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xuXG52YXIgZWRpdFNWRyA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxheWVyO1xuICAgIHRoaXMucGxvdDtcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMubGF5ZXIobGV2ZWwpKTtcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2Zvcm1hdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB2YXIgdHJhbnNmb3JtYXRpb25zID0gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbiAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgdHJhbnNsYXRlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICB0cmFuc2xhdGUuc2V0VHJhbnNsYXRlKDAsIDApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUodHJhbnNsYXRlLCAwKTtcblxuICAgICAgICB2YXIgc2NhbGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHNjYWxlLnNldFNjYWxlKDEuMCwgMS4wKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHNjYWxlLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmxlbmd0aCAhPT0gMikgdGhyb3cgXCJlZGl0U1ZHOiBleHBlY3RlZCB0cmFuc2Zvcm1hdGlvbnMgdG8gYmUgYSBsaXN0IG9mIGxlbmd0aCAyLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMCkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgxKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9TQ0FMRSkgXCJlZGl0U1ZHOiB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCI7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbiAoc2hpZnRYLCBzaGlmdFkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHZhciB0cmFuc2xhdGlvbiA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgwKTtcbiAgICBpZiAodHJhbnNsYXRpb24udHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fVFJBTlNMQVRFKSB0aHJvdyBcImVkaXRTVkc6IGZpcnN0IHRyYW5zZm9ybSBpcyBub3QgYSBUcmFuc2xhdGUuXCI7XG4gICAgdHJhbnNsYXRpb24uc2V0VHJhbnNsYXRlKHNoaWZ0WCwgc2hpZnRZKTtcbiAgICByZXR1cm4gdGhpcztcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUuc2NhbGUgPSBmdW5jdGlvbiAoc2NhbGVYLCBzY2FsZVkpIHtcbiAgICB2YXIgc2NhbGUgPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMSk7XG4gICAgaWYgKHNjYWxlLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1NDQUxFKSB0aHJvdyBcImVkaXRTVkc6IHNlY29uZCB0cmFuc2Zvcm0gaXMgbm90IGEgU2NhbGUuXCI7XG4gICAgc2NhbGUuc2V0U2NhbGUoc2NhbGVYLCBzY2FsZVkpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwib3BhY2l0eVwiLCBvcGFjaXR5KTtcbiAgICByZXR1cm4gdGhpcztcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUuaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwidmlzaWJpbGl0eVwiLCBcImhpZGRlblwiKTtcbiAgICByZXR1cm4gdGhpcztcbn1cblxuZWRpdFNWRy5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwidmlzaWJpbGl0eVwiLCBcInZpc2liaWxlXCIpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5cbi8qXG5UZXN0XG5cbnZhciBsMiA9IG5ldyBlZGl0U1ZHKCkuc2V0KDIpO1xuXG52YXIgeCA9IGwyLnRyYW5zZm9ybWF0aW9ucygpOyBcbi8vIGNoZWNrIHRyYW5zbGF0ZVxueC5nZXRJdGVtKDApLm1hdHJpeC5lOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAwXG54LmdldEl0ZW0oMCkubWF0cml4LmY7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbi8vIGNoZWNrIHNjYWxlXG54LmdldEl0ZW0oMSkubWF0cml4LmE7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDFcbnguZ2V0SXRlbSgxKS5tYXRyaXguZDsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxuLy8gY2hlY2sgbGVuZ3RoXG54Lmxlbmd0aCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDJcblxubDIudHJhbnNsYXRlKDUwLCA1MCk7XG5cbmwyLnNjYWxlKC41LCAuNSk7XG5cbmwyLmZhZGUoLjUpO1xuXG5sMi5oaWRlKCk7XG5cbmwyLnNob3coKTtcbiovXG5cbm1vZHVsZS5leHBvcnRzLmVkaXRTVkcgPSBlZGl0U1ZHOyIsInZhciBndWkgPSByZXF1aXJlKCcuLi9ndWkvZ3VpLmpzJykuZ3VpO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xuXG4vKmZ1bmN0aW9uIGNhbGxHVUkoKSB7XG4gICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgIH0pO1xuICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG59Ki9cblxuZnVuY3Rpb24gbGlzdGVuRm9yRHJhZyhldnQpIHtcbiAgICBjb25zb2xlLmxvZyhcImxpc3RlbkZvckRyYWdcIik7XG4gICAgdmFyIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB2YXIgc3ZnID0gZXZ0LnRhcmdldDtcblxuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBiZWdpbkRyYWcsIGZhbHNlKTtcbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZHJhZywgZmFsc2UpO1xuICAgIHN2Zy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZywgZmFsc2UpO1xuXG4gICAgdmFyIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlO1xuXG4gICAgZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihldnQpIHtcbiAgICAgICAgcmV0dXJuIGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGJlZ2luRHJhZyhldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmVnaW5EcmFnXCIpO1xuICAgICAgICBpc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgdmFyIG1vdXNlUG9zaXRpb25PblN0YXJ0RHJhZyA9IGdldE1vdXNlUG9zaXRpb24oZXZ0KTtcbiAgICAgICAgbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUgPSBtb3VzZVBvc2l0aW9uT25TdGFydERyYWc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZHJhZyhldnQpIHtcbiAgICAgICAgaWYgKGlzRHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkcmFnZ2luZycpO1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB2YXIgY3VycmVudE1vdXNlUG9zaXRpb24gPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgICAgICB2YXIgY2hhbmdlSW5Nb3VzZVBvc2l0aW9uID0ge1xuICAgICAgICAgICAgICAgIHg6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnggLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS54LFxuICAgICAgICAgICAgICAgIHk6IGN1cnJlbnRNb3VzZVBvc2l0aW9uLnkgLSBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZS55LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNoYW5nZUluTW91c2VQb3NpdGlvbik7XG4gICAgICAgICAgICBwbG90LmRyYWcoY2hhbmdlSW5Nb3VzZVBvc2l0aW9uKTtcblxuICAgICAgICAgICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbG90LnZpc2libGVzW2tleV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG5cbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gb25XaGVlbChldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2YXIgaG9yaXpvbnRhbCA9IGV2dC5kZWx0YVg7XG4gICAgdmFyIHZlcnRpY2FsID0gZXZ0LmRlbHRhWTtcblxuICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKTtcbiAgICAgICAgdmFyIG1vdXNlUG9zID0gZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2ZylcbiAgICAgICAgcGxvdC56b29tKG1vdXNlUG9zLCB2ZXJ0aWNhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGxvdC5kcmFnKHt4OiBob3Jpem9udGFsLCB5OiAwfSk7XG4gICAgfVxuXG4gICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgIH0pO1xuICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG59XG5cbmZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgdmFyIGN0bSA9IGJvdW5kaW5nT2JqZWN0LmdldFNjcmVlbkNUTSgpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgeTogKG1vdXNlWSAtIGN0bS5mKSAvIGN0bS5kXG4gICAgfTtcbn1cblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBvbldoZWVsKTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLWluLWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICBjb25zb2xlLmxvZyhcInNuYXAgem9vbSBpblwiKTtcbiAgICBwbG90LnNuYXBJbih7IHg6IDUxMiwgeTogMTI4IH0pO1xuXG4gICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgIH0pO1xuICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLW91dC1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgY29uc29sZS5sb2coXCJzbmFwIHpvb20gb3V0XCIpO1xuICAgIHBsb3Quc25hcE91dCh7IHg6IDUxMiwgeTogMTI4IH0pO1xuXG4gICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgIH0pO1xuICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGxpc3RlbkZvckRyYWcpOyIsInZhciBwYWdlID0gcmVxdWlyZSgnLi4vZ3VpL3BhZ2UuanMnKS5wYWdlO1xudmFyIHNlbGVjdG9ycyA9IHJlcXVpcmUoJy4uL2d1aS9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG5cbnBsb3QuaW5pdGlhbGl6ZVZpc2libGUoMiwgeyB3aWR0aDogMTAyNCwgaGVpZ2h0OiAyNTYgfSk7XG5wbG90LmluaXRpYWxpemVIaWRkZW4oMywgeyB3aWR0aDogMjA0OCwgaGVpZ2h0OiAyNTYgfSk7XG5cbnZhciB0aWxlRm9sZGVyUGF0aCA9IFwiLi4vcGxvdHMvc3ZnX3R1dG9yaWFsX3Bsb3RzL1wiO1xuXG5mdW5jdGlvbiBhZGRUaWxlKGxldmVsLCBjb2x1bW4pIHtcbiAgICB2YXIgdGlsZVBhdGggPSB0aWxlRm9sZGVyUGF0aCArIFwiL1wiICsgbGV2ZWwgKyBcIi9cIiArIGNvbHVtbiArIFwiLnBuZ1wiO1xuXG4gICAgdmFyIHggPSBjb2x1bW4gKiAyNTY7XG4gICAgdmFyIHkgPSAwO1xuICAgIHZhciB3aWR0aCA9IDI1NjtcbiAgICB2YXIgaGVpZ2h0ID0gMjU2O1xuXG4gICAgdmFyIHN2ZyA9IG5ldyBwYWdlKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMuc3ZnTGF5ZXIobGV2ZWwpKTtcbiAgICB2YXIgdGlsZSA9IG5ldyBwYWdlKClcbiAgICAgICAgLmNyZWF0ZSgnaW1hZ2UnKVxuICAgICAgICAuYXR0cmlidXRlKCd4JywgU3RyaW5nKHgpKVxuICAgICAgICAuYXR0cmlidXRlKCd5JywgU3RyaW5nKHkpKVxuICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAuYWRkSFJFRih0aWxlUGF0aClcbiAgICAgICAgLnBsYWNlKHN2Zyk7XG59XG5cbmZ1bmN0aW9uIGFkZEFsbFRpbGVzRm9yTGF5ZXIobGV2ZWwpIHtcbiAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGxldmVsKTtcbiAgICB2YXIgeCA9IDA7XG4gICAgZm9yICh2YXIgYyA9IDA7IGMgPCBjb2x1bW5zOyBjKyspIHtcbiAgICAgICAgYWRkVGlsZShsZXZlbCwgYyk7XG4gICAgICAgIHggPSB4ICsgMjU2O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkTGF5ZXJUb1BhZ2UobGV2ZWwpIHtcbiAgICAvL2NvbnNvbGUubG9nKHNlbGVjdG9ycy5wbG90KTtcbiAgICB2YXIgcGx0ID0gbmV3IHBhZ2UoKS5zZWxlY3Qoc2VsZWN0b3JzLmlkcy5wbG90KTtcbiAgICAvL2NvbnNvbGUubG9nKHBsdC5lbGVtZW50KTtcbiAgICB2YXIgY29sdW1ucyA9IE1hdGgucG93KDIsIGxldmVsKTtcblxuICAgIHZhciBncm91cCA9IG5ldyBwYWdlKClcbiAgICAgICAgLmNyZWF0ZSgnZycpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgJ2xheWVyLScgKyBsZXZlbClcbiAgICAgICAgLmF0dHJpYnV0ZSgndmlzaWJpbGl0eScsICdoaWRkZW4nKVxuICAgICAgICAucGxhY2UocGx0KTtcblxuICAgIHZhciB3aWR0aCA9IGNvbHVtbnMgKiAyNTY7XG4gICAgdmFyIGhlaWdodCA9IDI1NjtcblxuICAgIHZhciBzdmcgPSBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ3N2ZycpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgJ3N2Zy1sYXllci0nICsgbGV2ZWwpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgIC5wbGFjZShncm91cCk7XG5cbiAgICBhZGRBbGxUaWxlc0ZvckxheWVyKGxldmVsKTtcblxuICAgIHBsb3QuaW5pdGlhbGl6ZUhpZGRlbihsZXZlbCwgeyB3aWR0aDogd2lkdGgsIGhlaWdodDogaGVpZ2h0IH0pO1xuICAgIGNvbnNvbGUubG9nKHBsb3QuaGlkZGVucyk7XG4gICAgLy9jb25zb2xlLmxvZyhcIkhpZGRlbnM6IFwiICsgcGxvdC5oaWRkZW5zKTtcbn1cblxuYWRkTGF5ZXJUb1BhZ2UoNCk7XG5hZGRMYXllclRvUGFnZSg1KTtcbmFkZExheWVyVG9QYWdlKDYpO1xuYWRkTGF5ZXJUb1BhZ2UoNyk7IiwidmFyIHNjaGVtYSA9IHJlcXVpcmUoJy4uL3Bsb3Qvc2NoZW1hLmpzJykuc2NoZW1hO1xudmFyIHBvc2l0aW9uID0gcmVxdWlyZShcIi4uL3Bsb3QvcG9zaXRpb24uanNcIikucG9zaXRpb247XG4vL3ZhciBndWkgPSByZXF1aXJlKCcuLi9ndWkvZ3VpLmpzJykuZ3VpO1xuXG52YXIgcGxvdCA9IHtcbiAgICBtaW5pbXVtTGV2ZWw6IDIsXG4gICAgbWF4aW11bUxldmVsOiA3LFxuICAgIHNjYWxlRmFjdG9yOiAxMDAwMCxcbiAgICB6b29tSW5jcmVtZW50OiA1LFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudDogWzYwMDAsIDkwMDBdLFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50OiBbMTIwMDAsIDE4MDAwXSxcbiAgICB2aXNpYmxlczoge30sXG4gICAgaGlkZGVuczogbmV3IFNldChbXSksXG4gICAgZGltZW5zaW9uczoge30sXG4gICAgdW5pdFNjYWxlOiBmdW5jdGlvbiAoc2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIHsgeDogc2NhbGUueCAvIHBsb3Quc2NhbGVGYWN0b3IsIHk6IHNjYWxlLnkgLyBwbG90LnNjYWxlRmFjdG9yIH07XG4gICAgfSxcbiAgICBpbml0aWFsaXplVmlzaWJsZTogZnVuY3Rpb24gKGxldmVsLCBkaW1lbnNpb25zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IHBsb3QubWluaW11bUxldmVsIHx8IGxldmVsID4gcGxvdC5tYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1lbnNpb25zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHBsb3QudmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogcGxvdC5zY2FsZUZhY3RvciwgeTogMSAqIHBsb3Quc2NhbGVGYWN0b3IgfSwgb3BhY2l0eTogMSB9O1xuICAgICAgICBwbG90LmRpbWVuc2lvbnNbbGV2ZWxdID0gZGltZW5zaW9ucztcbiAgICB9LFxuICAgIGluaXRpYWxpemVIaWRkZW46IGZ1bmN0aW9uIChsZXZlbCwgZGltZW5zaW9ucykge1xuICAgICAgICBpZiAobGV2ZWwgPCBwbG90Lm1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IHBsb3QubWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIGhpZGRlbiBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1lbnNpb25zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHBsb3QuaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICAgICAgcGxvdC5kaW1lbnNpb25zW2xldmVsXSA9IGRpbWVuc2lvbnM7XG4gICAgfSxcbiAgICBzaG93OiBmdW5jdGlvbiAobGV2ZWwsIHRvcExlZnQsIHNjYWxlLCBvcGFjaXR5LCBkaW1lbnNpb25zKSB7XG4gICAgICAgIGlmICghcGxvdC5oaWRkZW5zLmhhcyhsZXZlbCkpIHRocm93IFwiVHJpZWQgdG8gc2hvdyBhIGxldmVsIHRoYXQgd2FzIG5vdCBoaWRkZW4uXCI7XG4gICAgICAgIHBsb3QudmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHRvcExlZnQsIHNjYWxlOiBzY2FsZSwgb3BhY2l0eTogb3BhY2l0eSB9O1xuICAgICAgICBwbG90LmhpZGRlbnMuZGVsZXRlKGxldmVsKTtcbiAgICB9LFxuICAgIGhpZGU6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICBpZiAoIXBsb3QudmlzaWJsZXNbbGV2ZWxdKSB0aHJvdyBcIlRyaWVkIHRvIGhpZGUgYSBsZXZlbCB0aGF0IGlzIG5vdCB2aXNpYmxlXCI7XG4gICAgICAgIGRlbGV0ZSBwbG90LnZpc2libGVzW2xldmVsXTtcbiAgICAgICAgcGxvdC5oaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlT3BhY2l0eTogZnVuY3Rpb24gKHNjYWxlKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBzY2FsZS54O1xuICAgICAgICBpZiAoeFNjYWxlIDwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggaGlnaGVyIHpvb20gbGV2ZWwgKG9uIHRvcCBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gcGxvdC5tYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHBsb3Quc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMCwgMV0pO1xuICAgICAgICB9IC8qZWxzZSBpZiAoeFNjYWxlID4gcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBsb3dlciB6b29tIGxldmVsIChiZWxvdyBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gcGxvdC5tYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsxLCAwXSk7XG4gICAgICAgIH0qLyBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBtYXBWYWx1ZU9udG9SYW5nZTogZnVuY3Rpb24gKHZhbHVlLCBvbGRSYW5nZSwgbmV3UmFuZ2UpIHtcbiAgICAgICAgdmFyIG9sZFNwYW4gPSBvbGRSYW5nZVsxXSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgbmV3U3BhbiA9IG5ld1JhbmdlWzFdIC0gbmV3UmFuZ2VbMF07XG4gICAgICAgIHZhciBkaXN0YW5jZVRvVmFsdWUgPSB2YWx1ZSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgcGVyY2VudFNwYW5Ub1ZhbHVlID0gZGlzdGFuY2VUb1ZhbHVlIC8gb2xkU3BhbjtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9OZXdWYWx1ZSA9IHBlcmNlbnRTcGFuVG9WYWx1ZSAqIG5ld1NwYW47XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IG5ld1JhbmdlWzBdICsgZGlzdGFuY2VUb05ld1ZhbHVlO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgfSxcbiAgICBpbmNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAoa2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA8IHBsb3Quc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCArPSBwbG90Lnpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA8IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggKz0gcGxvdC56b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA+PSBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5oaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgKyAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsIDw9IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0sIHk6IDEgKiBwbG90LnNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHBsb3Quc2hvdyhsYXllclRvUmV2ZWFsLCBwbG90LnZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIHBsb3QuY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVjcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXk9PXBsb3QubWluaW11bUxldmVsICYmIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHBsb3Quc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggLT0gcGxvdC56b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHBsb3Quem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPD0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0gJiYga2V5ID4gcGxvdC5taW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBwbG90LmhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPT0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsID49IHBsb3QubWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSwgeTogcGxvdC5zY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICBwbG90LnNob3cobGF5ZXJUb1JldmVhbCwgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBwbG90LmNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9zaXRpb246IGZ1bmN0aW9uIChuZXdUb3BMZWZ0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS50b3BMZWZ0ID0gbmV3VG9wTGVmdDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVzZXRPcGFjaXRpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLm9wYWNpdHkgPSBwbG90LmNhbGN1bGF0ZU9wYWNpdHkocGxvdC52aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgem9vbTogZnVuY3Rpb24gKGZvY3VzLCB2ZXJ0aWNhbCkge1xuICAgICAgICB2YXIgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXSxcbiAgICAgICAgICAgIGZpcnN0ID0gcGxvdC52aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICB3aWR0aCA9IHBsb3QuZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBwbG90LmRpbWVuc2lvbnNbZmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgcGxvdC51bml0U2NhbGUoZmlyc3Quc2NhbGUpLCB3aWR0aCwgaGVpZ2h0KTtcblxuICAgICAgICB2YXIgaG93TXVjaCA9IE1hdGguZmxvb3IoTWF0aC5hYnModmVydGljYWwpIC8gNSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG93TXVjaDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodmVydGljYWwgPCAwKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5pbmNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsb3QuZGVjcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBuZXdGaXJzdCA9IHBsb3QudmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgbmV3V2lkdGggPSBwbG90LmRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgbmV3SGVpZ2h0ID0gcGxvdC5kaW1lbnNpb25zW25ld0ZpcnN0S2V5XS5oZWlnaHQ7XG4gICAgICAgIHZhciBuZXdUb3BMZWZ0ID0gcG9zaXRpb24ucGVyY2VudGFnZVRvVG9wTGVmdChmb2N1cywgcGVyY2VudGFnZUNvb3JkaW5hdGVzLCBwbG90LnVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICBwbG90LnJlcG9zaXRpb24obmV3VG9wTGVmdCk7XG4gICAgICAgIHBsb3QucmVzZXRPcGFjaXRpZXMoKTtcbiAgICB9LFxuICAgIHNuYXBJbjogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcyk7XG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICBwbG90Lnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCk7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSBwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDUpIHtcbiAgICAgICAgICAgICAgICBwbG90Lnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFRPRE86IGNhbGwgdG8gZ3VpIHNob3VsZCBiZSByZWZhY3RvcmVkIHRvIGdvIGVsc2V3aGVyZVxuICAgICAgICAgICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpO1xuXG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxuICAgIHNuYXBPdXQ6IGZ1bmN0aW9uIChmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgcGxvdC56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCk7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSBwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgICAgICBwbG90Lnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVE9ETzogY2FsbCB0byBndWkgc2hvdWxkIGJlIHJlZmFjdG9yZWQgdG8gZ28gZWxzZXdoZXJlXG4gICAgICAgICAgICB2YXIgdmlzaWJsZXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbG90LnZpc2libGVzW2tleV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG5cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG4gICAgZHJhZzogZnVuY3Rpb24gKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICB9LFxufVxuXG5tb2R1bGUuZXhwb3J0cy5wbG90ID0gcGxvdDsiLCJ2YXIgcG9zaXRpb24gPSB7XG4gICAgY2FsY3VsYXRlUGVyY2VudDogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcG9zaXRpb25CLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLnBvc2l0aW9uID0gcG9zaXRpb247IiwidmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn1cblxubW9kdWxlLmV4cG9ydHMuc2NoZW1hID0gc2NoZW1hOyJdfQ==
