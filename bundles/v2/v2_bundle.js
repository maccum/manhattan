(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9ndWkuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvcGFnZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9zZWxlY3RvcnMuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvc3ZnLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9oYW5kbGVyLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9pbml0aWFsaXplci5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcGxvdC5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcG9zaXRpb24uanMiLCJzY3JpcHRzL3YyL3NyYy9wbG90L3NjaGVtYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgZWRpdFNWRyA9IHJlcXVpcmUoJy4vc3ZnLmpzJykuZWRpdFNWRztcbnZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcbnZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi9wbG90L3NjaGVtYS5qcycpLnNjaGVtYTtcblxudmFyIGd1aSA9IHtcbiAgICByZW5kZXI6IGZ1bmN0aW9uICh2aXNpYmxlTGF5ZXJzLCBoaWRkZW5MZXZlbHMpIHtcblxuICAgICAgICAvL2NvbnNvbGUubG9nKGhpZGRlbkxldmVscyk7XG4gICAgICAgIGlmICghKHZpc2libGVMYXllcnMubGVuZ3RoID4gMCAmJiB2aXNpYmxlTGF5ZXJzLmxlbmd0aCA8PSAyKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2codmlzaWJsZUxheWVycyk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNdXN0IGhhdmUgMS0yIHZpc2libGUgbGF5ZXJzLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaW5kZXggaW4gaGlkZGVuTGV2ZWxzKSB7XG4gICAgICAgICAgICB2YXIgbGV2ZWwgPSBoaWRkZW5MZXZlbHNbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChsZXZlbCkgIT0gJ1tvYmplY3QgTnVtYmVyXScpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHVUkgRVJST1I6IGV4cGVjdGVkIGEgbGlzdCBvZiBudW1iZXJzIGZvciBoaWRkZW5MYXllcnMuXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KGxldmVsKS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGluZGV4IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZhciBsYXllciA9IHZpc2libGVMYXllcnNbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEubGF5ZXIobGF5ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGV4cGVjdGVkIGxheWVyIHNjaGVtYS5cIik7XG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbmV3IGVkaXRTVkcoKVxuICAgICAgICAgICAgICAgIC5zZXQobGF5ZXIubGV2ZWwpXG4gICAgICAgICAgICAgICAgLnRyYW5zbGF0ZShsYXllci50b3BMZWZ0LngsIGxheWVyLnRvcExlZnQueSlcbiAgICAgICAgICAgICAgICAuc2NhbGUobGF5ZXIuc2NhbGUueC9wbG90LnNjYWxlRmFjdG9yLCBsYXllci5zY2FsZS55L3Bsb3Quc2NhbGVGYWN0b3IpIC8vIHdoZXJlIGJlc3QgdG8gcHV0IHNjYWxlRmFjdG9yXG4gICAgICAgICAgICAgICAgLmZhZGUobGF5ZXIub3BhY2l0eSlcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpc2libGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIHNjYWxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBvcGFjaXR5U3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgdmlzaWJsZXNTdHJpbmcgKz0gXCIgXCIgKyBrZXk7XG4gICAgICAgICAgICBzY2FsZXNTdHJpbmcgKz0gXCIgXCIgKyBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueC8xMDAwMDtcbiAgICAgICAgICAgIG9wYWNpdHlTdHJpbmcgKz0gXCIgXCIrIHBsb3QudmlzaWJsZXNba2V5XS5vcGFjaXR5O1xuICAgICAgICB9XG4gICAgICAgICQoXCIjem9vbS1kaXZcIikudGV4dCh2aXNpYmxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjZnJhY3Rpb25hbC16b29tLWRpdlwiKS50ZXh0KHNjYWxlc1N0cmluZyk7XG4gICAgICAgICQoXCIjb3BhY2l0eS1kaXZcIikudGV4dChvcGFjaXR5U3RyaW5nKTtcbiAgICB9LFxufVxuXG5tb2R1bGUuZXhwb3J0cy5ndWkgPSBndWk7IiwidmFyIHBhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbn07XG5cbnBhZ2UucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5zZWxlY3QgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5hdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZC5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLnBsYWNlID0gZnVuY3Rpb24gKHBhcmVudCkge1xuICAgIHBhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuZWxlbWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5wYWdlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnBhZ2UucHJvdG90eXBlLmFkZEhSRUYgPSBmdW5jdGlvbiAoaHJlZikge1xuICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIGhyZWYpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5wYWdlID0gcGFnZTtcbiIsInZhciBzZWxlY3RvcnMgPSB7XG4gICAgaWRzOiB7XG4gICAgICAgIHdpZGdldDogXCJ3aWRnZXRcIixcbiAgICAgICAgcGxvdDogXCJwbG90XCIsXG4gICAgICAgIGxheWVyOiBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBcImxheWVyLVwiICsgbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgICAgIHN2Z0xheWVyOiBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBcInN2Zy1sYXllci1cIiArIGxldmVsO1xuICAgICAgICB9LFxuICAgIH0sXG59XG5cbm1vZHVsZS5leHBvcnRzLnNlbGVjdG9ycyA9IHNlbGVjdG9yczsiLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBlZGl0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubGF5ZXI7XG4gICAgdGhpcy5wbG90O1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICB0aGlzLmxheWVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3JzLmlkcy5sYXllcihsZXZlbCkpO1xuICAgIHRoaXMucGxvdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zZm9ybWF0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHZhciB0cmFuc2Zvcm1hdGlvbnMgPSB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsO1xuICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciB0cmFuc2xhdGUgPSB0aGlzLnBsb3QuY3JlYXRlU1ZHVHJhbnNmb3JtKCk7XG4gICAgICAgIHRyYW5zbGF0ZS5zZXRUcmFuc2xhdGUoMCwgMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZSh0cmFuc2xhdGUsIDApO1xuXG4gICAgICAgIHZhciBzY2FsZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgc2NhbGUuc2V0U2NhbGUoMS4wLCAxLjApO1xuICAgICAgICB0aGlzLmxheWVyLnRyYW5zZm9ybS5iYXNlVmFsLmluc2VydEl0ZW1CZWZvcmUoc2NhbGUsIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMubGVuZ3RoICE9PSAyKSB0aHJvdyBcImVkaXRTVkc6IGV4cGVjdGVkIHRyYW5zZm9ybWF0aW9ucyB0byBiZSBhIGxpc3Qgb2YgbGVuZ3RoIDIuXCI7XG4gICAgICAgIGlmICh0cmFuc2Zvcm1hdGlvbnMuZ2V0SXRlbSgwKS50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9UUkFOU0xBVEUpIFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIjtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDEpLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1NDQUxFKSBcImVkaXRTVkc6IHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG59XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzaGlmdFgsIHNoaWZ0WSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdmFyIHRyYW5zbGF0aW9uID0gdGhpcy50cmFuc2Zvcm1hdGlvbnMoKS5nZXRJdGVtKDApO1xuICAgIGlmICh0cmFuc2xhdGlvbi50eXBlICE9PSBTVkdUcmFuc2Zvcm0uU1ZHX1RSQU5TRk9STV9UUkFOU0xBVEUpIHRocm93IFwiZWRpdFNWRzogZmlyc3QgdHJhbnNmb3JtIGlzIG5vdCBhIFRyYW5zbGF0ZS5cIjtcbiAgICB0cmFuc2xhdGlvbi5zZXRUcmFuc2xhdGUoc2hpZnRYLCBzaGlmdFkpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbmVkaXRTVkcucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbiAob3BhY2l0eSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIsIG9wYWNpdHkpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwiaGlkZGVuXCIpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJpbGVcIik7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblxuLypcblRlc3RcblxudmFyIGwyID0gbmV3IGVkaXRTVkcoKS5zZXQoMik7XG5cbnZhciB4ID0gbDIudHJhbnNmb3JtYXRpb25zKCk7IFxuLy8gY2hlY2sgdHJhbnNsYXRlXG54LmdldEl0ZW0oMCkubWF0cml4LmU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbnguZ2V0SXRlbSgwKS5tYXRyaXguZjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMFxuLy8gY2hlY2sgc2NhbGVcbnguZ2V0SXRlbSgxKS5tYXRyaXguYTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxueC5nZXRJdGVtKDEpLm1hdHJpeC5kOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAxXG4vLyBjaGVjayBsZW5ndGhcbngubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMlxuXG5sMi50cmFuc2xhdGUoNTAsIDUwKTtcblxubDIuc2NhbGUoLjUsIC41KTtcblxubDIuZmFkZSguNSk7XG5cbmwyLmhpZGUoKTtcblxubDIuc2hvdygpO1xuKi9cblxubW9kdWxlLmV4cG9ydHMuZWRpdFNWRyA9IGVkaXRTVkc7IiwidmFyIGd1aSA9IHJlcXVpcmUoJy4uL2d1aS9ndWkuanMnKS5ndWk7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG5cbmZ1bmN0aW9uIGxpc3RlbkZvckRyYWcoZXZ0KSB7XG4gICAgY29uc29sZS5sb2coXCJsaXN0ZW5Gb3JEcmFnXCIpO1xuICAgIHZhciBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgdmFyIHN2ZyA9IGV2dC50YXJnZXQ7XG5cbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYmVnaW5EcmFnLCBmYWxzZSk7XG4gICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcsIGZhbHNlKTtcbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGVuZERyYWcsIGZhbHNlKTtcblxuICAgIHZhciBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZTtcblxuICAgIGZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZXZ0KSB7XG4gICAgICAgIHJldHVybiBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBiZWdpbkRyYWcoZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImJlZ2luRHJhZ1wiKTtcbiAgICAgICAgaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgICAgIHZhciBtb3VzZVBvc2l0aW9uT25TdGFydERyYWcgPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgIGlmIChpc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRNb3VzZVBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldnQpO1xuICAgICAgICAgICAgdmFyIGNoYW5nZUluTW91c2VQb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICB5OiBjdXJyZW50TW91c2VQb3NpdGlvbi55IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhjaGFuZ2VJbk1vdXNlUG9zaXRpb24pO1xuICAgICAgICAgICAgcGxvdC5kcmFnKGNoYW5nZUluTW91c2VQb3NpdGlvbik7XG5cbiAgICAgICAgICAgIHZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpO1xuXG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZSA9IGN1cnJlbnRNb3VzZVBvc2l0aW9uO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZW5kRHJhZyhldnQpIHtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG9uV2hlZWwoZXZ0KSB7XG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdmFyIGhvcml6b250YWwgPSBldnQuZGVsdGFYO1xuICAgIHZhciB2ZXJ0aWNhbCA9IGV2dC5kZWx0YVk7XG5cbiAgICBpZiAoTWF0aC5hYnModmVydGljYWwpID49IE1hdGguYWJzKGhvcml6b250YWwpKSB7XG4gICAgICAgIHZhciBzdmcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIik7XG4gICAgICAgIHZhciBtb3VzZVBvcyA9IGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QoZXZ0LmNsaWVudFgsIGV2dC5jbGllbnRZLCBzdmcpXG4gICAgICAgIHBsb3Quem9vbShtb3VzZVBvcywgdmVydGljYWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBsb3QuZHJhZyh7eDogaG9yaXpvbnRhbCwgeTogMH0pO1xuICAgIH1cblxuICAgIHZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICB9KTtcbiAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpO1xufVxuXG5mdW5jdGlvbiBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KG1vdXNlWCwgbW91c2VZLCBib3VuZGluZ09iamVjdCkge1xuICAgIHZhciBjdG0gPSBib3VuZGluZ09iamVjdC5nZXRTY3JlZW5DVE0oKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiAobW91c2VYIC0gY3RtLmUpIC8gY3RtLmEsXG4gICAgICAgIHk6IChtb3VzZVkgLSBjdG0uZikgLyBjdG0uZFxuICAgIH07XG59XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKS5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgb25XaGVlbCk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1pbi1idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgY29uc29sZS5sb2coXCJzbmFwIHpvb20gaW5cIik7XG4gICAgcGxvdC5zbmFwSW4oeyB4OiA1MTIsIHk6IDEyOCB9KTtcblxuICAgIHZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICB9KTtcbiAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpO1xufSk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiem9vbS1vdXQtYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoZSkge1xuICAgIGNvbnNvbGUubG9nKFwic25hcCB6b29tIG91dFwiKTtcbiAgICBwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KTtcblxuICAgIHZhciB2aXNpYmxlcyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmV0dXJuIHBsb3QudmlzaWJsZXNba2V5XTtcbiAgICB9KTtcbiAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpO1xufSk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKS5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsaXN0ZW5Gb3JEcmFnKTsiLCJ2YXIgcGFnZSA9IHJlcXVpcmUoJy4uL2d1aS9wYWdlLmpzJykucGFnZTtcbnZhciBzZWxlY3RvcnMgPSByZXF1aXJlKCcuLi9ndWkvc2VsZWN0b3JzLmpzJykuc2VsZWN0b3JzO1xudmFyIHBsb3QgPSByZXF1aXJlKCcuLi9wbG90L3Bsb3QuanMnKS5wbG90O1xuXG5wbG90LmluaXRpYWxpemVWaXNpYmxlKDIsIHsgd2lkdGg6IDEwMjQsIGhlaWdodDogMjU2IH0pO1xucGxvdC5pbml0aWFsaXplSGlkZGVuKDMsIHsgd2lkdGg6IDIwNDgsIGhlaWdodDogMjU2IH0pO1xuXG52YXIgdGlsZUZvbGRlclBhdGggPSBcIi4uL3Bsb3RzL3N2Z190dXRvcmlhbF9wbG90cy9cIjtcblxuZnVuY3Rpb24gYWRkVGlsZShsZXZlbCwgY29sdW1uKSB7XG4gICAgdmFyIHRpbGVQYXRoID0gdGlsZUZvbGRlclBhdGggKyBcIi9cIiArIGxldmVsICsgXCIvXCIgKyBjb2x1bW4gKyBcIi5wbmdcIjtcblxuICAgIHZhciB4ID0gY29sdW1uICogMjU2O1xuICAgIHZhciB5ID0gMDtcbiAgICB2YXIgd2lkdGggPSAyNTY7XG4gICAgdmFyIGhlaWdodCA9IDI1NjtcblxuICAgIHZhciBzdmcgPSBuZXcgcGFnZSgpLnNlbGVjdChzZWxlY3RvcnMuaWRzLnN2Z0xheWVyKGxldmVsKSk7XG4gICAgdmFyIHRpbGUgPSBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ2ltYWdlJylcbiAgICAgICAgLmF0dHJpYnV0ZSgneCcsIFN0cmluZyh4KSlcbiAgICAgICAgLmF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSlcbiAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgLmFkZEhSRUYodGlsZVBhdGgpXG4gICAgICAgIC5wbGFjZShzdmcpO1xufVxuXG5mdW5jdGlvbiBhZGRBbGxUaWxlc0ZvckxheWVyKGxldmVsKSB7XG4gICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgdmFyIHggPSAwO1xuICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgIGFkZFRpbGUobGV2ZWwsIGMpO1xuICAgICAgICB4ID0geCArIDI1NjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZExheWVyVG9QYWdlKGxldmVsKSB7XG4gICAgLy9jb25zb2xlLmxvZyhzZWxlY3RvcnMucGxvdCk7XG4gICAgdmFyIHBsdCA9IG5ldyBwYWdlKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgLy9jb25zb2xlLmxvZyhwbHQuZWxlbWVudCk7XG4gICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG5cbiAgICB2YXIgZ3JvdXAgPSBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ2cnKVxuICAgICAgICAuYXR0cmlidXRlKCdpZCcsICdsYXllci0nICsgbGV2ZWwpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCAnaGlkZGVuJylcbiAgICAgICAgLnBsYWNlKHBsdCk7XG5cbiAgICB2YXIgd2lkdGggPSBjb2x1bW5zICogMjU2O1xuICAgIHZhciBoZWlnaHQgPSAyNTY7XG5cbiAgICB2YXIgc3ZnID0gbmV3IHBhZ2UoKVxuICAgICAgICAuY3JlYXRlKCdzdmcnKVxuICAgICAgICAuYXR0cmlidXRlKCdpZCcsICdzdmctbGF5ZXItJyArIGxldmVsKVxuICAgICAgICAuYXR0cmlidXRlKCd3aWR0aCcsIFN0cmluZyh3aWR0aCkpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhoZWlnaHQpKVxuICAgICAgICAucGxhY2UoZ3JvdXApO1xuXG4gICAgYWRkQWxsVGlsZXNGb3JMYXllcihsZXZlbCk7XG5cbiAgICBwbG90LmluaXRpYWxpemVIaWRkZW4obGV2ZWwsIHsgd2lkdGg6IHdpZHRoLCBoZWlnaHQ6IGhlaWdodCB9KTtcbiAgICBjb25zb2xlLmxvZyhwbG90LmhpZGRlbnMpO1xuICAgIC8vY29uc29sZS5sb2coXCJIaWRkZW5zOiBcIiArIHBsb3QuaGlkZGVucyk7XG59XG5cbmFkZExheWVyVG9QYWdlKDQpO1xuYWRkTGF5ZXJUb1BhZ2UoNSk7XG5hZGRMYXllclRvUGFnZSg2KTtcbmFkZExheWVyVG9QYWdlKDcpOyIsInZhciBzY2hlbWEgPSByZXF1aXJlKCcuLi9wbG90L3NjaGVtYS5qcycpLnNjaGVtYTtcbnZhciBwb3NpdGlvbiA9IHJlcXVpcmUoXCIuLi9wbG90L3Bvc2l0aW9uLmpzXCIpLnBvc2l0aW9uO1xuXG52YXIgcGxvdCA9IHtcbiAgICBtaW5pbXVtTGV2ZWw6IDIsXG4gICAgbWF4aW11bUxldmVsOiA3LFxuICAgIHNjYWxlRmFjdG9yOiAxMDAwMCxcbiAgICB6b29tSW5jcmVtZW50OiA1LFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudDogWzYwMDAsIDkwMDBdLFxuICAgIHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50OiBbMTIwMDAsIDE4MDAwXSxcbiAgICB2aXNpYmxlczoge30sXG4gICAgaGlkZGVuczogbmV3IFNldChbXSksXG4gICAgZGltZW5zaW9uczoge30sXG4gICAgdW5pdFNjYWxlOiBmdW5jdGlvbiAoc2NhbGUpIHtcbiAgICAgICAgcmV0dXJuIHsgeDogc2NhbGUueCAvIHBsb3Quc2NhbGVGYWN0b3IsIHk6IHNjYWxlLnkgLyBwbG90LnNjYWxlRmFjdG9yIH07XG4gICAgfSxcbiAgICBpbml0aWFsaXplVmlzaWJsZTogZnVuY3Rpb24gKGxldmVsLCBkaW1lbnNpb25zKSB7XG4gICAgICAgIGlmIChsZXZlbCA8IHBsb3QubWluaW11bUxldmVsIHx8IGxldmVsID4gcGxvdC5tYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1lbnNpb25zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHBsb3QudmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogcGxvdC5zY2FsZUZhY3RvciwgeTogMSAqIHBsb3Quc2NhbGVGYWN0b3IgfSwgb3BhY2l0eTogMSB9O1xuICAgICAgICBwbG90LmRpbWVuc2lvbnNbbGV2ZWxdID0gZGltZW5zaW9ucztcbiAgICB9LFxuICAgIGluaXRpYWxpemVIaWRkZW46IGZ1bmN0aW9uIChsZXZlbCwgZGltZW5zaW9ucykge1xuICAgICAgICBpZiAobGV2ZWwgPCBwbG90Lm1pbmltdW1MZXZlbCB8fCBsZXZlbCA+IHBsb3QubWF4aW11bUxldmVsKSB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgYWRkIGhpZGRlbiBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1lbnNpb25zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgIHBsb3QuaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICAgICAgcGxvdC5kaW1lbnNpb25zW2xldmVsXSA9IGRpbWVuc2lvbnM7XG4gICAgfSxcbiAgICBzaG93OiBmdW5jdGlvbiAobGV2ZWwsIHRvcExlZnQsIHNjYWxlLCBvcGFjaXR5LCBkaW1lbnNpb25zKSB7XG4gICAgICAgIGlmICghcGxvdC5oaWRkZW5zLmhhcyhsZXZlbCkpIHRocm93IFwiVHJpZWQgdG8gc2hvdyBhIGxldmVsIHRoYXQgd2FzIG5vdCBoaWRkZW4uXCI7XG4gICAgICAgIHBsb3QudmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHRvcExlZnQsIHNjYWxlOiBzY2FsZSwgb3BhY2l0eTogb3BhY2l0eSB9O1xuICAgICAgICBwbG90LmhpZGRlbnMuZGVsZXRlKGxldmVsKTtcbiAgICB9LFxuICAgIGhpZGU6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICBpZiAoIXBsb3QudmlzaWJsZXNbbGV2ZWxdKSB0aHJvdyBcIlRyaWVkIHRvIGhpZGUgYSBsZXZlbCB0aGF0IGlzIG5vdCB2aXNpYmxlXCI7XG4gICAgICAgIGRlbGV0ZSBwbG90LnZpc2libGVzW2xldmVsXTtcbiAgICAgICAgcGxvdC5oaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlT3BhY2l0eTogZnVuY3Rpb24gKHNjYWxlKSB7XG4gICAgICAgIHZhciB4U2NhbGUgPSBzY2FsZS54O1xuICAgICAgICBpZiAoeFNjYWxlIDwgcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggaGlnaGVyIHpvb20gbGV2ZWwgKG9uIHRvcCBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gcGxvdC5tYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHBsb3Quc2NhbGVSYW5nZUluV2hpY2hIaWdoZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMCwgMV0pO1xuICAgICAgICB9IC8qZWxzZSBpZiAoeFNjYWxlID4gcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBsb3dlciB6b29tIGxldmVsIChiZWxvdyBpbiBjdXJyZW50IGh0bWwpXG4gICAgICAgICAgICByZXR1cm4gcGxvdC5tYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQsIFsxLCAwXSk7XG4gICAgICAgIH0qLyBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBtYXBWYWx1ZU9udG9SYW5nZTogZnVuY3Rpb24gKHZhbHVlLCBvbGRSYW5nZSwgbmV3UmFuZ2UpIHtcbiAgICAgICAgdmFyIG9sZFNwYW4gPSBvbGRSYW5nZVsxXSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgbmV3U3BhbiA9IG5ld1JhbmdlWzFdIC0gbmV3UmFuZ2VbMF07XG4gICAgICAgIHZhciBkaXN0YW5jZVRvVmFsdWUgPSB2YWx1ZSAtIG9sZFJhbmdlWzBdO1xuICAgICAgICB2YXIgcGVyY2VudFNwYW5Ub1ZhbHVlID0gZGlzdGFuY2VUb1ZhbHVlIC8gb2xkU3BhbjtcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9OZXdWYWx1ZSA9IHBlcmNlbnRTcGFuVG9WYWx1ZSAqIG5ld1NwYW47XG4gICAgICAgIHZhciBuZXdWYWx1ZSA9IG5ld1JhbmdlWzBdICsgZGlzdGFuY2VUb05ld1ZhbHVlO1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgfSxcbiAgICBpbmNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAoa2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA8IHBsb3Quc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCArPSBwbG90Lnpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGtleSA8IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggKz0gcGxvdC56b29tSW5jcmVtZW50ICogMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA+PSBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5oaWRlKGtleSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgKyAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsIDw9IHBsb3QubWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0sIHk6IDEgKiBwbG90LnNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgIHBsb3Quc2hvdyhsYXllclRvUmV2ZWFsLCBwbG90LnZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIHBsb3QuY2FsY3VsYXRlT3BhY2l0eShzY2FsZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVjcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICBpZiAoIShrZXk9PXBsb3QubWluaW11bUxldmVsICYmIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHBsb3Quc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHBsb3Quc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggLT0gcGxvdC56b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHBsb3Quem9vbUluY3JlbWVudCAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPD0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0gJiYga2V5ID4gcGxvdC5taW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBwbG90LmhpZGUoa2V5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGxvdC52aXNpYmxlc1trZXldLnNjYWxlLnggPT0gcGxvdC5zY2FsZVJhbmdlSW5XaGljaEhpZ2hlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0pIHtcbiAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgIGlmIChsYXllclRvUmV2ZWFsID49IHBsb3QubWluaW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogcGxvdC5zY2FsZVJhbmdlSW5XaGljaExvd2VyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSwgeTogcGxvdC5zY2FsZUZhY3RvciB9O1xuICAgICAgICAgICAgICAgICAgICBwbG90LnNob3cobGF5ZXJUb1JldmVhbCwgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQsIHNjYWxlLCBwbG90LmNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlcG9zaXRpb246IGZ1bmN0aW9uIChuZXdUb3BMZWZ0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIHBsb3QudmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS50b3BMZWZ0ID0gbmV3VG9wTGVmdDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVzZXRPcGFjaXRpZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLm9wYWNpdHkgPSBwbG90LmNhbGN1bGF0ZU9wYWNpdHkocGxvdC52aXNpYmxlc1trZXldLnNjYWxlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgem9vbTogZnVuY3Rpb24gKGZvY3VzLCB2ZXJ0aWNhbCkge1xuICAgICAgICB2YXIgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXSxcbiAgICAgICAgICAgIGZpcnN0ID0gcGxvdC52aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICB3aWR0aCA9IHBsb3QuZGltZW5zaW9uc1tmaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBwbG90LmRpbWVuc2lvbnNbZmlyc3RLZXldLmhlaWdodDtcblxuICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgcGxvdC51bml0U2NhbGUoZmlyc3Quc2NhbGUpLCB3aWR0aCwgaGVpZ2h0KTtcblxuICAgICAgICB2YXIgaG93TXVjaCA9IE1hdGguZmxvb3IoTWF0aC5hYnModmVydGljYWwpIC8gNSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG93TXVjaDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodmVydGljYWwgPCAwKSB7XG4gICAgICAgICAgICAgICAgcGxvdC5pbmNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBsb3QuZGVjcmVhc2VTY2FsZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcylbMF0sXG4gICAgICAgICAgICBuZXdGaXJzdCA9IHBsb3QudmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgbmV3V2lkdGggPSBwbG90LmRpbWVuc2lvbnNbbmV3Rmlyc3RLZXldLndpZHRoLFxuICAgICAgICAgICAgbmV3SGVpZ2h0ID0gcGxvdC5kaW1lbnNpb25zW25ld0ZpcnN0S2V5XS5oZWlnaHQ7XG4gICAgICAgIHZhciBuZXdUb3BMZWZ0ID0gcG9zaXRpb24ucGVyY2VudGFnZVRvVG9wTGVmdChmb2N1cywgcGVyY2VudGFnZUNvb3JkaW5hdGVzLCBwbG90LnVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICBwbG90LnJlcG9zaXRpb24obmV3VG9wTGVmdCk7XG4gICAgICAgIHBsb3QucmVzZXRPcGFjaXRpZXMoKTtcbiAgICB9LFxuICAgIHNuYXBJbjogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcyk7XG4gICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcblxuICAgICAgICBwbG90Lnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCk7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSBwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDUpIHtcbiAgICAgICAgICAgICAgICBwbG90Lnpvb20oZm9jdXMsIC01KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgICAgICAgICBwbG90LnZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFRPRE86IGNhbGwgdG8gZ3VpIHNob3VsZCBiZSByZWZhY3RvcmVkIHRvIGdvIGVsc2V3aGVyZVxuICAgICAgICAgICAgdmFyIHZpc2libGVzID0gT2JqZWN0LmtleXMocGxvdC52aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGxvdC52aXNpYmxlc1trZXldO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBndWkucmVuZGVyKHZpc2libGVzLCBBcnJheS5mcm9tKHBsb3QuaGlkZGVucykpO1xuXG4gICAgICAgIH0sIC4xKTtcbiAgICB9LFxuICAgIHNuYXBPdXQ6IGZ1bmN0aW9uIChmb2N1cykge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpO1xuICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAyIHx8IGtleXMubGVuZ3RoIDwgMSkgdGhyb3cgXCJQTE9UOiBleHBlY3RlZCAxLTIgbGF5ZXJzXCI7XG5cbiAgICAgICAgcGxvdC56b29tKGZvY3VzLCA1KTtcbiAgICAgICAgdmFyIGludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocGxvdC52aXNpYmxlc1tPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKVswXV0uc2NhbGUueCk7XG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoMTAwMDAgLSBwbG90LnZpc2libGVzW09iamVjdC5rZXlzKHBsb3QudmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgICAgICBwbG90Lnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBwbG90LnZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsb3QudmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVE9ETzogY2FsbCB0byBndWkgc2hvdWxkIGJlIHJlZmFjdG9yZWQgdG8gZ28gZWxzZXdoZXJlXG4gICAgICAgICAgICB2YXIgdmlzaWJsZXMgPSBPYmplY3Qua2V5cyhwbG90LnZpc2libGVzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwbG90LnZpc2libGVzW2tleV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGd1aS5yZW5kZXIodmlzaWJsZXMsIEFycmF5LmZyb20ocGxvdC5oaWRkZW5zKSk7XG5cbiAgICAgICAgfSwgLjEpO1xuICAgIH0sXG4gICAgZHJhZzogZnVuY3Rpb24gKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgZm9yIChrZXkgaW4gcGxvdC52aXNpYmxlcykge1xuICAgICAgICAgICAgcGxvdC52aXNpYmxlc1trZXldLnRvcExlZnQueCArPSBjaGFuZ2VJblBvc2l0aW9uLng7XG4gICAgICAgIH1cbiAgICB9LFxufVxuXG5tb2R1bGUuZXhwb3J0cy5wbG90ID0gcGxvdDsiLCJ2YXIgcG9zaXRpb24gPSB7XG4gICAgY2FsY3VsYXRlUGVyY2VudDogZnVuY3Rpb24gKHBvc2l0aW9uQSwgcG9zaXRpb25CLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLnBvc2l0aW9uID0gcG9zaXRpb247IiwidmFyIHNjaGVtYSA9IHtcbiAgICBjaGVjazogZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMob2JqZWN0KS5sZW5ndGggIT0ga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGluZGV4IGluIGtleXMpIHtcbiAgICAgICAgICAgIGlmICghKGtleXNbaW5kZXhdIGluIG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICB4eTogZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gc2NoZW1hLmNoZWNrKG9iamVjdCwgWyd4JywgJ3knXSk7XG4gICAgfSxcbiAgICBkaW1lbnNpb25zOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3dpZHRoJywgJ2hlaWdodCddKTtcbiAgICB9LFxuICAgIHBvaW50OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIHNjYWxlOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEueHkob2JqZWN0KTtcbiAgICB9LFxuICAgIGxheWVyOiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ2xldmVsJywgJ3RvcExlZnQnLCAnc2NhbGUnLCAnb3BhY2l0eSddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnBvaW50KG9iamVjdFsndG9wTGVmdCddKVxuICAgICAgICAgICAgJiYgc2NoZW1hLnNjYWxlKG9iamVjdFsnc2NhbGUnXSk7XG4gICAgfSxcbn1cblxubW9kdWxlLmV4cG9ydHMuc2NoZW1hID0gc2NoZW1hOyJdfQ==
