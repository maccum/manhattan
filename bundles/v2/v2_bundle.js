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
    if (utils.nullOrUndefined(parent)) throw new Error("page().place() must have a `parent` argument.");
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
},{"./selectors.js":3}],5:[function(require,module,exports){
var gui = require('../gui/gui.js').gui;
var plot = require('../plot/plot.js').plot;

//browserify --debug scripts/v2/src/handler/initializer.js scripts/v2/src/handler/handler.js -o bundles/v2/v2_bundle.js

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

//var tileFolderPath = "../plots/svg_tutorial_plots/";
var tileFolderPath = document.getElementById('plot_url').innerHTML;
console.log("tileFolderPath"+tileFolderPath);

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

function addLayerToPage(level, visibility) {
    //console.log(selectors.plot);
    var plt = new page().select(selectors.ids.plot);
    //console.log(plt.element);
    var columns = Math.pow(2, level);

    var group = new page()
        .create('g')
        .attribute('id', 'layer-' + level)
        .attribute('visibility', visibility)
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

var smallestZoom = parseInt(document.getElementById('smallest_zoom').innerHTML);
var largestZoom = parseInt(document.getElementById('largest_zoom').innerHTML);

/*
addLayerToPage(4);
addLayerToPage(5);
addLayerToPage(6);
addLayerToPage(7);*/

addLayerToPage(smallestZoom, 'visible');
for (var i = smallestZoom+1; i<largestZoom+1; i++) {
    addLayerToPage(i, 'hidden');
}

},{"../gui/page.js":2,"../gui/selectors.js":3,"../plot/plot.js":7}],7:[function(require,module,exports){
var schema = require('../utils/schema.js').schema;
var position = require("../plot/position.js").position;

var plot = (function () {
    var minimumLevel = parseInt(document.getElementById('smallest_zoom').innerHTML),
        maximumLevel = parseInt(document.getElementById('largest_zoom').innerHTML),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9ndWkuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvcGFnZS5qcyIsInNjcmlwdHMvdjIvc3JjL2d1aS9zZWxlY3RvcnMuanMiLCJzY3JpcHRzL3YyL3NyYy9ndWkvc3ZnLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9oYW5kbGVyLmpzIiwic2NyaXB0cy92Mi9zcmMvaGFuZGxlci9pbml0aWFsaXplci5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcGxvdC5qcyIsInNjcmlwdHMvdjIvc3JjL3Bsb3QvcG9zaXRpb24uanMiLCJzY3JpcHRzL3YyL3NyYy91dGlscy9zY2hlbWEuanMiLCJzY3JpcHRzL3YyL3NyYy91dGlscy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwidmFyIGVkaXRTVkcgPSByZXF1aXJlKCcuL3N2Zy5qcycpLmVkaXRTVkc7XG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vdXRpbHMvc2NoZW1hLmpzJykuc2NoZW1hO1xuXG52YXIgZ3VpID0ge1xuICAgIHJlbmRlcjogZnVuY3Rpb24gKHZpc2libGVMYXllcnMsIGhpZGRlbkxldmVscykge1xuXG4gICAgICAgIGlmICghKHZpc2libGVMYXllcnMubGVuZ3RoID4gMCAmJiB2aXNpYmxlTGF5ZXJzLmxlbmd0aCA8PSAyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBoYXZlIDEtMiB2aXNpYmxlIGxheWVycy5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBoaWRkZW5JbmRleCBpbiBoaWRkZW5MZXZlbHMpIHtcbiAgICAgICAgICAgIHZhciBsZXZlbCA9IGhpZGRlbkxldmVsc1toaWRkZW5JbmRleF07XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGxldmVsKSAhPSAnW29iamVjdCBOdW1iZXJdJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSSBFUlJPUjogZXhwZWN0ZWQgYSBsaXN0IG9mIG51bWJlcnMgZm9yIGhpZGRlbkxheWVycy5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKCkuc2V0KGxldmVsKS5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciB2aXNpYmxlSW5kZXggaW4gdmlzaWJsZUxheWVycykge1xuICAgICAgICAgICAgdmFyIGxheWVyID0gdmlzaWJsZUxheWVyc1t2aXNpYmxlSW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEubGF5ZXIobGF5ZXIpKSB0aHJvdyBuZXcgRXJyb3IoXCJHVUk6IGV4cGVjdGVkIGxheWVyIHNjaGVtYS5cIik7XG4gICAgICAgICAgICBpZiAobGF5ZXIuc2NhbGUueCA+IDIgfHwgbGF5ZXIuc2NhbGUueCA8IC41IHx8IGxheWVyLnNjYWxlLnkgPiAyIHx8IGxheWVyLnNjYWxlLnkgPCAuNSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdVSTogc2NhbGUgb3V0c2lkZSBbLjUsMl0gcmFuZ2UuIFNjYWxlIHNob3VsZCBiZSBjb252ZXJ0ZWQgdG8gWy41LDJdIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gR1VJLiBbXCIrbGF5ZXIuc2NhbGUueCtcIiwgXCIrbGF5ZXIuc2NhbGUueStcIl1cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG5ldyBlZGl0U1ZHKClcbiAgICAgICAgICAgICAgICAuc2V0KGxheWVyLmxldmVsKVxuICAgICAgICAgICAgICAgIC50cmFuc2xhdGUobGF5ZXIudG9wTGVmdC54LCBsYXllci50b3BMZWZ0LnkpXG4gICAgICAgICAgICAgICAgLnNjYWxlKGxheWVyLnNjYWxlLngsIGxheWVyLnNjYWxlLnkpXG4gICAgICAgICAgICAgICAgLmZhZGUobGF5ZXIub3BhY2l0eSlcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZpc2libGVzU3RyaW5nID0gXCJcIjtcbiAgICAgICAgdmFyIHNjYWxlc1N0cmluZyA9IFwiXCI7XG4gICAgICAgIHZhciBvcGFjaXR5U3RyaW5nID0gXCJcIjtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVMYXllcnMpIHtcbiAgICAgICAgICAgIHZpc2libGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLmxldmVsO1xuICAgICAgICAgICAgc2NhbGVzU3RyaW5nICs9IFwiIFwiICsgdmlzaWJsZUxheWVyc1trZXldLnNjYWxlLng7XG4gICAgICAgICAgICBvcGFjaXR5U3RyaW5nICs9IFwiIFwiKyB2aXNpYmxlTGF5ZXJzW2tleV0ub3BhY2l0eTtcbiAgICAgICAgfVxuICAgICAgICAkKFwiI3pvb20tZGl2XCIpLnRleHQodmlzaWJsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI2ZyYWN0aW9uYWwtem9vbS1kaXZcIikudGV4dChzY2FsZXNTdHJpbmcpO1xuICAgICAgICAkKFwiI29wYWNpdHktZGl2XCIpLnRleHQob3BhY2l0eVN0cmluZyk7XG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLmd1aSA9IGd1aTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy91dGlscy5qcycpLnV0aWxzO1xuXG52YXIgcGFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVsZW1lbnQgPSBudWxsO1xufTtcblxucGFnZS5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHR5cGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJwYWdlKCkuY3JlYXRlKCkgbXVzdCBoYXZlIGEgYHR5cGVgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCB0eXBlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uIChpZCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoaWQpKSB0aHJvdyBuZXcgRXJyb3IoXCJwYWdlKCkuc2VsZWN0KCkgbXVzdCBoYXZlIGFuIGBpZGAgYXJndW1lbnQuXCIpO1xuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLmF0dHJpYnV0ZSA9IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoYXR0cikgfHwgdXRpbHMubnVsbE9yVW5kZWZpbmVkKHZhbHVlKSkgdGhyb3cgbmV3IEVycm9yKFwicGFnZSgpLmF0dHJpYnV0ZSgpIG11c3QgaGF2ZSBgYXR0cmAgYW5kIGB2YWx1ZWAgYXJndW1lbnRzLlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoY2hpbGQpKSB0aHJvdyBuZXcgRXJyb3IoXCJwYWdlKCkuYXBwZW5kKCkgbXVzdCBoYXZlIGEgYGNoaWxkYCBhcmd1bWVudC5cIik7XG4gICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkLmVsZW1lbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxucGFnZS5wcm90b3R5cGUucGxhY2UgPSBmdW5jdGlvbiAocGFyZW50KSB7XG4gICAgaWYgKHV0aWxzLm51bGxPclVuZGVmaW5lZChwYXJlbnQpKSB0aHJvdyBuZXcgRXJyb3IoXCJwYWdlKCkucGxhY2UoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbnBhZ2UucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChwYXJlbnQpIHtcbiAgICBpZiAodXRpbHMubnVsbE9yVW5kZWZpbmVkKHBhcmVudCkpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5yZW1vdmUoKSBtdXN0IGhhdmUgYSBgcGFyZW50YCBhcmd1bWVudC5cIik7XG4gICAgcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbn07XG5cbnBhZ2UucHJvdG90eXBlLmFkZEhSRUYgPSBmdW5jdGlvbiAoaHJlZikge1xuICAgIGlmICh1dGlscy5udWxsT3JVbmRlZmluZWQoaHJlZikpIHRocm93IG5ldyBFcnJvcihcInBhZ2UoKS5hZGRIUkVGKCkgbXVzdCBoYXZlIGEgYGhyZWZgIGFyZ3VtZW50LlwiKTtcbiAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsIFwiaHJlZlwiLCBocmVmKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzLnBhZ2UgPSBwYWdlO1xuIiwidmFyIHNlbGVjdG9ycyA9IHtcbiAgICBpZHM6IHtcbiAgICAgICAgd2lkZ2V0OiBcIndpZGdldFwiLFxuICAgICAgICBwbG90OiBcInBsb3RcIixcbiAgICAgICAgbGF5ZXI6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwibGF5ZXItXCIgKyBsZXZlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnTGF5ZXI6IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwic3ZnLWxheWVyLVwiICsgbGV2ZWw7XG4gICAgICAgIH0sXG4gICAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzLnNlbGVjdG9ycyA9IHNlbGVjdG9yczsiLCJ2YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi9zZWxlY3RvcnMuanMnKS5zZWxlY3RvcnM7XG5cbnZhciBlZGl0U1ZHID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubGF5ZXI7XG4gICAgdGhpcy5wbG90O1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgdGhpcy5sYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHNlbGVjdG9ycy5pZHMubGF5ZXIobGV2ZWwpKTtcbiAgICB0aGlzLnBsb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChzZWxlY3RvcnMuaWRzLnBsb3QpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuZWRpdFNWRy5wcm90b3R5cGUudHJhbnNmb3JtYXRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdmFyIHRyYW5zZm9ybWF0aW9ucyA9IHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWw7XG4gICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIHRyYW5zbGF0ZSA9IHRoaXMucGxvdC5jcmVhdGVTVkdUcmFuc2Zvcm0oKTtcbiAgICAgICAgdHJhbnNsYXRlLnNldFRyYW5zbGF0ZSgwLCAwKTtcbiAgICAgICAgdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbC5pbnNlcnRJdGVtQmVmb3JlKHRyYW5zbGF0ZSwgMCk7XG5cbiAgICAgICAgdmFyIHNjYWxlID0gdGhpcy5wbG90LmNyZWF0ZVNWR1RyYW5zZm9ybSgpO1xuICAgICAgICBzY2FsZS5zZXRTY2FsZSgxLjAsIDEuMCk7XG4gICAgICAgIHRoaXMubGF5ZXIudHJhbnNmb3JtLmJhc2VWYWwuaW5zZXJ0SXRlbUJlZm9yZShzY2FsZSwgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5sZW5ndGggIT09IDIpIHRocm93IFwiZWRpdFNWRzogZXhwZWN0ZWQgdHJhbnNmb3JtYXRpb25zIHRvIGJlIGEgbGlzdCBvZiBsZW5ndGggMi5cIjtcbiAgICAgICAgaWYgKHRyYW5zZm9ybWF0aW9ucy5nZXRJdGVtKDApLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgICAgICBpZiAodHJhbnNmb3JtYXRpb25zLmdldEl0ZW0oMSkudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIFwiZWRpdFNWRzogdHJhbnNmb3JtIGlzIG5vdCBhIFNjYWxlLlwiO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5sYXllci50cmFuc2Zvcm0uYmFzZVZhbDtcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChzaGlmdFgsIHNoaWZ0WSkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgaWYgKCghc2hpZnRYIHx8ICFzaGlmdFkpICYmIChzaGlmdFggIT0gMCAmJiBzaGlmdFkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCB0cmFuc2xhdGUgU1ZHIG9iamVjdCB3aXRoIG51bGwsIHVuZGVmaW5lZCwgb3IgZW1wdHkgc2hpZnQgdmFsdWVzLiBzaGlmdFg6IFwiK3NoaWZ0WCtcIiBzaGlmdFk6XCIrc2hpZnRZKTtcbiAgICB2YXIgdHJhbnNsYXRpb24gPSB0aGlzLnRyYW5zZm9ybWF0aW9ucygpLmdldEl0ZW0oMCk7XG4gICAgaWYgKHRyYW5zbGF0aW9uLnR5cGUgIT09IFNWR1RyYW5zZm9ybS5TVkdfVFJBTlNGT1JNX1RSQU5TTEFURSkgdGhyb3cgXCJlZGl0U1ZHOiBmaXJzdCB0cmFuc2Zvcm0gaXMgbm90IGEgVHJhbnNsYXRlLlwiO1xuICAgIHRyYW5zbGF0aW9uLnNldFRyYW5zbGF0ZShzaGlmdFgsIHNoaWZ0WSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIChzY2FsZVgsIHNjYWxlWSkge1xuICAgIHZhciBzY2FsZSA9IHRoaXMudHJhbnNmb3JtYXRpb25zKCkuZ2V0SXRlbSgxKTtcbiAgICBpZiAoc2NhbGUudHlwZSAhPT0gU1ZHVHJhbnNmb3JtLlNWR19UUkFOU0ZPUk1fU0NBTEUpIHRocm93IFwiZWRpdFNWRzogc2Vjb25kIHRyYW5zZm9ybSBpcyBub3QgYSBTY2FsZS5cIjtcbiAgICBzY2FsZS5zZXRTY2FsZShzY2FsZVgsIHNjYWxlWSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICBpZiAoIXRoaXMubGF5ZXIgfHwgIXRoaXMucGxvdCkgdGhyb3cgXCJlZGl0U1ZHOiBsYXllciBhbmQgcGxvdCBtdXN0IGJlIGluaXRpYWxpemVkLlwiO1xuICAgIHRoaXMubGF5ZXIuc2V0QXR0cmlidXRlKFwib3BhY2l0eVwiLCBvcGFjaXR5KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbmVkaXRTVkcucHJvdG90eXBlLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmxheWVyIHx8ICF0aGlzLnBsb3QpIHRocm93IFwiZWRpdFNWRzogbGF5ZXIgYW5kIHBsb3QgbXVzdCBiZSBpbml0aWFsaXplZC5cIjtcbiAgICB0aGlzLmxheWVyLnNldEF0dHJpYnV0ZShcInZpc2liaWxpdHlcIiwgXCJoaWRkZW5cIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5lZGl0U1ZHLnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5sYXllciB8fCAhdGhpcy5wbG90KSB0aHJvdyBcImVkaXRTVkc6IGxheWVyIGFuZCBwbG90IG11c3QgYmUgaW5pdGlhbGl6ZWQuXCI7XG4gICAgdGhpcy5sYXllci5zZXRBdHRyaWJ1dGUoXCJ2aXNpYmlsaXR5XCIsIFwidmlzaWJsZVwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLypcblRlc3RcblxudmFyIGwyID0gbmV3IGVkaXRTVkcoKS5zZXQoMik7XG5cbnZhciB4ID0gbDIudHJhbnNmb3JtYXRpb25zKCk7IFxuLy8gY2hlY2sgdHJhbnNsYXRlXG54LmdldEl0ZW0oMCkubWF0cml4LmU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS0+IDBcbnguZ2V0SXRlbSgwKS5tYXRyaXguZjsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMFxuLy8gY2hlY2sgc2NhbGVcbnguZ2V0SXRlbSgxKS5tYXRyaXguYTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMVxueC5nZXRJdGVtKDEpLm1hdHJpeC5kOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tPiAxXG4vLyBjaGVjayBsZW5ndGhcbngubGVuZ3RoICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtLT4gMlxuXG5sMi50cmFuc2xhdGUoNTAsIDUwKTtcblxubDIuc2NhbGUoLjUsIC41KTtcblxubDIuZmFkZSguNSk7XG5cbmwyLmhpZGUoKTtcblxubDIuc2hvdygpO1xuKi9cblxubW9kdWxlLmV4cG9ydHMuZWRpdFNWRyA9IGVkaXRTVkc7IiwidmFyIGd1aSA9IHJlcXVpcmUoJy4uL2d1aS9ndWkuanMnKS5ndWk7XG52YXIgcGxvdCA9IHJlcXVpcmUoJy4uL3Bsb3QvcGxvdC5qcycpLnBsb3Q7XG5cbi8vYnJvd3NlcmlmeSAtLWRlYnVnIHNjcmlwdHMvdjIvc3JjL2hhbmRsZXIvaW5pdGlhbGl6ZXIuanMgc2NyaXB0cy92Mi9zcmMvaGFuZGxlci9oYW5kbGVyLmpzIC1vIGJ1bmRsZXMvdjIvdjJfYnVuZGxlLmpzXG5cbmZ1bmN0aW9uIGNhbGxHVUkodmlzaWJsZXNBbmRIaWRkZW5zKSB7XG4gICAgZ3VpLnJlbmRlcih2aXNpYmxlc0FuZEhpZGRlbnNbMF0sIHZpc2libGVzQW5kSGlkZGVuc1sxXSk7XG59XG5cbmZ1bmN0aW9uIGxpc3RlbkZvckRyYWcoZXZ0KSB7XG4gICAgY29uc29sZS5sb2coXCJsaXN0ZW5Gb3JEcmFnXCIpO1xuICAgIHZhciBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgdmFyIHN2ZyA9IGV2dC50YXJnZXQ7XG5cbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgYmVnaW5EcmFnLCBmYWxzZSk7XG4gICAgc3ZnLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGRyYWcsIGZhbHNlKTtcbiAgICBzdmcuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGVuZERyYWcsIGZhbHNlKTtcblxuICAgIHZhciBtb3VzZVBvc2l0aW9uU2luY2VMYXN0TW92ZTtcblxuICAgIGZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZXZ0KSB7XG4gICAgICAgIHJldHVybiBnZXRNb3VzZVBvc2l0aW9uV2l0aGluT2JqZWN0KGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSwgc3ZnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBiZWdpbkRyYWcoZXZ0KSB7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImJlZ2luRHJhZ1wiKTtcbiAgICAgICAgaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgICAgIHZhciBtb3VzZVBvc2l0aW9uT25TdGFydERyYWcgPSBnZXRNb3VzZVBvc2l0aW9uKGV2dCk7XG4gICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gbW91c2VQb3NpdGlvbk9uU3RhcnREcmFnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYWcoZXZ0KSB7XG4gICAgICAgIGlmIChpc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRNb3VzZVBvc2l0aW9uID0gZ2V0TW91c2VQb3NpdGlvbihldnQpO1xuICAgICAgICAgICAgdmFyIGNoYW5nZUluTW91c2VQb3NpdGlvbiA9IHtcbiAgICAgICAgICAgICAgICB4OiBjdXJyZW50TW91c2VQb3NpdGlvbi54IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueCxcbiAgICAgICAgICAgICAgICB5OiBjdXJyZW50TW91c2VQb3NpdGlvbi55IC0gbW91c2VQb3NpdGlvblNpbmNlTGFzdE1vdmUueSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBwbG90LmRyYWcoY2hhbmdlSW5Nb3VzZVBvc2l0aW9uKTtcblxuICAgICAgICAgICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG5cbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb25TaW5jZUxhc3RNb3ZlID0gY3VycmVudE1vdXNlUG9zaXRpb247XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlbmREcmFnKGV2dCkge1xuICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gb25XaGVlbChldnQpIHtcbiAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICB2YXIgaG9yaXpvbnRhbCA9IGV2dC5kZWx0YVg7XG4gICAgdmFyIHZlcnRpY2FsID0gZXZ0LmRlbHRhWTtcblxuICAgIGlmIChNYXRoLmFicyh2ZXJ0aWNhbCkgPj0gTWF0aC5hYnMoaG9yaXpvbnRhbCkpIHtcbiAgICAgICAgdmFyIHN2ZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxvdFwiKTtcbiAgICAgICAgdmFyIG1vdXNlUG9zID0gZ2V0TW91c2VQb3NpdGlvbldpdGhpbk9iamVjdChldnQuY2xpZW50WCwgZXZ0LmNsaWVudFksIHN2Zyk7XG4gICAgICAgIHBsb3Quem9vbShtb3VzZVBvcywgdmVydGljYWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHBsb3QuZHJhZyh7IHg6IGhvcml6b250YWwsIHk6IDAgfSk7XG4gICAgfVxuXG4gICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG59XG5cbmZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb25XaXRoaW5PYmplY3QobW91c2VYLCBtb3VzZVksIGJvdW5kaW5nT2JqZWN0KSB7XG4gICAgdmFyIGN0bSA9IGJvdW5kaW5nT2JqZWN0LmdldFNjcmVlbkNUTSgpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHg6IChtb3VzZVggLSBjdG0uZSkgLyBjdG0uYSxcbiAgICAgICAgeTogKG1vdXNlWSAtIGN0bS5mKSAvIGN0bS5kXG4gICAgfTtcbn1cblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbG90XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJ3aGVlbFwiLCBvbldoZWVsKTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ6b29tLWluLWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIC01KTtcbiAgICB2YXIgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAocGxvdC5zbmFwSW4oeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgfVxuICAgIH0sIC4xKTtcbn0pO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInpvb20tb3V0LWJ1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUubG9nKFwic25hcCB6b29tIG91dFwiKTtcblxuICAgIHBsb3Quem9vbSh7IHg6IDUxMiwgeTogMTI4IH0sIDUpO1xuICAgIHZhciBpbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChwbG90LnNuYXBPdXQoeyB4OiA1MTIsIHk6IDEyOCB9KSkge1xuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbEdVSShwbG90LmdldEluZm9Gb3JHVUkoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZS5zdGFjayk7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgfVxuICAgIH0sIC4xKTtcbn0pO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsb3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgbGlzdGVuRm9yRHJhZyk7IiwidmFyIHBhZ2UgPSByZXF1aXJlKCcuLi9ndWkvcGFnZS5qcycpLnBhZ2U7XG52YXIgc2VsZWN0b3JzID0gcmVxdWlyZSgnLi4vZ3VpL3NlbGVjdG9ycy5qcycpLnNlbGVjdG9ycztcbnZhciBwbG90ID0gcmVxdWlyZSgnLi4vcGxvdC9wbG90LmpzJykucGxvdDtcblxucGxvdC5pbml0aWFsaXplVmlzaWJsZSgyLCB7IHdpZHRoOiAxMDI0LCBoZWlnaHQ6IDI1NiB9KTtcbnBsb3QuaW5pdGlhbGl6ZUhpZGRlbigzLCB7IHdpZHRoOiAyMDQ4LCBoZWlnaHQ6IDI1NiB9KTtcblxuLy92YXIgdGlsZUZvbGRlclBhdGggPSBcIi4uL3Bsb3RzL3N2Z190dXRvcmlhbF9wbG90cy9cIjtcbnZhciB0aWxlRm9sZGVyUGF0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbG90X3VybCcpLmlubmVySFRNTDtcbmNvbnNvbGUubG9nKFwidGlsZUZvbGRlclBhdGhcIit0aWxlRm9sZGVyUGF0aCk7XG5cbmZ1bmN0aW9uIGFkZFRpbGUobGV2ZWwsIGNvbHVtbikge1xuICAgIHZhciB0aWxlUGF0aCA9IHRpbGVGb2xkZXJQYXRoICsgXCIvXCIgKyBsZXZlbCArIFwiL1wiICsgY29sdW1uICsgXCIucG5nXCI7XG5cbiAgICB2YXIgeCA9IGNvbHVtbiAqIDI1NjtcbiAgICB2YXIgeSA9IDA7XG4gICAgdmFyIHdpZHRoID0gMjU2O1xuICAgIHZhciBoZWlnaHQgPSAyNTY7XG5cbiAgICB2YXIgc3ZnID0gbmV3IHBhZ2UoKS5zZWxlY3Qoc2VsZWN0b3JzLmlkcy5zdmdMYXllcihsZXZlbCkpO1xuICAgIFxuICAgIC8vY3JlYXRlIHRpbGVcbiAgICBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ2ltYWdlJylcbiAgICAgICAgLmF0dHJpYnV0ZSgneCcsIFN0cmluZyh4KSlcbiAgICAgICAgLmF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSlcbiAgICAgICAgLmF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcod2lkdGgpKVxuICAgICAgICAuYXR0cmlidXRlKCdoZWlnaHQnLCBTdHJpbmcoaGVpZ2h0KSlcbiAgICAgICAgLmFkZEhSRUYodGlsZVBhdGgpXG4gICAgICAgIC5wbGFjZShzdmcpO1xufVxuXG5mdW5jdGlvbiBhZGRBbGxUaWxlc0ZvckxheWVyKGxldmVsKSB7XG4gICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG4gICAgdmFyIHggPSAwO1xuICAgIGZvciAodmFyIGMgPSAwOyBjIDwgY29sdW1uczsgYysrKSB7XG4gICAgICAgIGFkZFRpbGUobGV2ZWwsIGMpO1xuICAgICAgICB4ID0geCArIDI1NjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZExheWVyVG9QYWdlKGxldmVsLCB2aXNpYmlsaXR5KSB7XG4gICAgLy9jb25zb2xlLmxvZyhzZWxlY3RvcnMucGxvdCk7XG4gICAgdmFyIHBsdCA9IG5ldyBwYWdlKCkuc2VsZWN0KHNlbGVjdG9ycy5pZHMucGxvdCk7XG4gICAgLy9jb25zb2xlLmxvZyhwbHQuZWxlbWVudCk7XG4gICAgdmFyIGNvbHVtbnMgPSBNYXRoLnBvdygyLCBsZXZlbCk7XG5cbiAgICB2YXIgZ3JvdXAgPSBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ2cnKVxuICAgICAgICAuYXR0cmlidXRlKCdpZCcsICdsYXllci0nICsgbGV2ZWwpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3Zpc2liaWxpdHknLCB2aXNpYmlsaXR5KVxuICAgICAgICAucGxhY2UocGx0KTtcblxuICAgIHZhciB3aWR0aCA9IGNvbHVtbnMgKiAyNTY7XG4gICAgdmFyIGhlaWdodCA9IDI1NjtcblxuICAgIC8vY3JlYXRlIDxzdmc+IGluc2lkZSA8Zz5cbiAgICBuZXcgcGFnZSgpXG4gICAgICAgIC5jcmVhdGUoJ3N2ZycpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ2lkJywgJ3N2Zy1sYXllci0nICsgbGV2ZWwpXG4gICAgICAgIC5hdHRyaWJ1dGUoJ3dpZHRoJywgU3RyaW5nKHdpZHRoKSlcbiAgICAgICAgLmF0dHJpYnV0ZSgnaGVpZ2h0JywgU3RyaW5nKGhlaWdodCkpXG4gICAgICAgIC5wbGFjZShncm91cCk7XG5cbiAgICBhZGRBbGxUaWxlc0ZvckxheWVyKGxldmVsKTtcblxuICAgIHBsb3QuaW5pdGlhbGl6ZUhpZGRlbihsZXZlbCwgeyB3aWR0aDogd2lkdGgsIGhlaWdodDogaGVpZ2h0IH0pO1xuICAgIGNvbnNvbGUubG9nKHBsb3QuaGlkZGVucyk7XG59XG5cbnZhciBzbWFsbGVzdFpvb20gPSBwYXJzZUludChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc21hbGxlc3Rfem9vbScpLmlubmVySFRNTCk7XG52YXIgbGFyZ2VzdFpvb20gPSBwYXJzZUludChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VzdF96b29tJykuaW5uZXJIVE1MKTtcblxuLypcbmFkZExheWVyVG9QYWdlKDQpO1xuYWRkTGF5ZXJUb1BhZ2UoNSk7XG5hZGRMYXllclRvUGFnZSg2KTtcbmFkZExheWVyVG9QYWdlKDcpOyovXG5cbmFkZExheWVyVG9QYWdlKHNtYWxsZXN0Wm9vbSwgJ3Zpc2libGUnKTtcbmZvciAodmFyIGkgPSBzbWFsbGVzdFpvb20rMTsgaTxsYXJnZXN0Wm9vbSsxOyBpKyspIHtcbiAgICBhZGRMYXllclRvUGFnZShpLCAnaGlkZGVuJyk7XG59XG4iLCJ2YXIgc2NoZW1hID0gcmVxdWlyZSgnLi4vdXRpbHMvc2NoZW1hLmpzJykuc2NoZW1hO1xudmFyIHBvc2l0aW9uID0gcmVxdWlyZShcIi4uL3Bsb3QvcG9zaXRpb24uanNcIikucG9zaXRpb247XG5cbnZhciBwbG90ID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgbWluaW11bUxldmVsID0gcGFyc2VJbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NtYWxsZXN0X3pvb20nKS5pbm5lckhUTUwpLFxuICAgICAgICBtYXhpbXVtTGV2ZWwgPSBwYXJzZUludChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbGFyZ2VzdF96b29tJykuaW5uZXJIVE1MKSxcbiAgICAgICAgc2NhbGVGYWN0b3IgPSAxMDAwMCxcbiAgICAgICAgem9vbUluY3JlbWVudCA9IDUsXG4gICAgICAgIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCA9IFs2MDAwLCA5MDAwXSxcbiAgICAgICAgc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnQgPSBbMTIwMDAsIDE4MDAwXSxcbiAgICAgICAgdmlzaWJsZXMgPSB7fSxcbiAgICAgICAgaGlkZGVucyA9IG5ldyBTZXQoW10pLFxuICAgICAgICBkaW1lbnNpb25zID0ge307XG5cbiAgICBmdW5jdGlvbiB1bml0U2NhbGUoc2NhbGUpIHtcbiAgICAgICAgaWYgKChzY2FsZS54ID4gLjUgJiYgc2NhbGUueCA8IDIpIHx8IChzY2FsZS55ID4gLjUgJiYgc2NhbGUueSA8IDIpKSB0aHJvdyBuZXcgRXJyb3IoJ3NjYWxlIGFscmVhZHkgaW4gdW5pdCBzY2FsZScpO1xuICAgICAgICByZXR1cm4geyB4OiBzY2FsZS54IC8gc2NhbGVGYWN0b3IsIHk6IHNjYWxlLnkgLyBzY2FsZUZhY3RvciB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3cgKGxldmVsLCB0b3BMZWZ0LCBzY2FsZSwgb3BhY2l0eSkge1xuICAgICAgICBpZiAoIWhpZGRlbnMuaGFzKGxldmVsKSkgdGhyb3cgXCJUcmllZCB0byBzaG93IGEgbGV2ZWwgdGhhdCB3YXMgbm90IGhpZGRlbi5cIjtcbiAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHRvcExlZnQsIHNjYWxlOiBzY2FsZSwgb3BhY2l0eTogb3BhY2l0eSB9O1xuICAgICAgICBoaWRkZW5zLmRlbGV0ZShsZXZlbCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGlkZSAobGV2ZWwpIHtcbiAgICAgICAgaWYgKCF2aXNpYmxlc1tsZXZlbF0pIHRocm93IFwiVHJpZWQgdG8gaGlkZSBhIGxldmVsIHRoYXQgaXMgbm90IHZpc2libGVcIjtcbiAgICAgICAgZGVsZXRlIHZpc2libGVzW2xldmVsXTtcbiAgICAgICAgaGlkZGVucy5hZGQocGFyc2VJbnQobGV2ZWwpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVPcGFjaXR5IChzY2FsZSkge1xuICAgICAgICB2YXIgeFNjYWxlID0gc2NhbGUueDtcbiAgICAgICAgaWYgKHhTY2FsZSA8IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgLy8gbGF5ZXIgd2l0aCBoaWdoZXIgem9vbSBsZXZlbCAob24gdG9wIGluIGN1cnJlbnQgaHRtbClcbiAgICAgICAgICAgIHJldHVybiBtYXBWYWx1ZU9udG9SYW5nZSh4U2NhbGUsIHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudCwgWzAsIDFdKTtcbiAgICAgICAgfSAvKmVsc2UgaWYgKHhTY2FsZSA+IHBsb3Quc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgIC8vIGxheWVyIHdpdGggbG93ZXIgem9vbSBsZXZlbCAoYmVsb3cgaW4gY3VycmVudCBodG1sKVxuICAgICAgICAgICAgcmV0dXJuIHBsb3QubWFwVmFsdWVPbnRvUmFuZ2UoeFNjYWxlLCBwbG90LnNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50LCBbMSwgMF0pO1xuICAgICAgICB9Ki8gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hcFZhbHVlT250b1JhbmdlICh2YWx1ZSwgb2xkUmFuZ2UsIG5ld1JhbmdlKSB7XG4gICAgICAgIHZhciBvbGRTcGFuID0gb2xkUmFuZ2VbMV0gLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIG5ld1NwYW4gPSBuZXdSYW5nZVsxXSAtIG5ld1JhbmdlWzBdO1xuICAgICAgICB2YXIgZGlzdGFuY2VUb1ZhbHVlID0gdmFsdWUgLSBvbGRSYW5nZVswXTtcbiAgICAgICAgdmFyIHBlcmNlbnRTcGFuVG9WYWx1ZSA9IGRpc3RhbmNlVG9WYWx1ZSAvIG9sZFNwYW47XG4gICAgICAgIHZhciBkaXN0YW5jZVRvTmV3VmFsdWUgPSBwZXJjZW50U3BhblRvVmFsdWUgKiBuZXdTcGFuO1xuICAgICAgICB2YXIgbmV3VmFsdWUgPSBuZXdSYW5nZVswXSArIGRpc3RhbmNlVG9OZXdWYWx1ZTtcbiAgICAgICAgcmV0dXJuIG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcG9zaXRpb24gKG5ld1RvcExlZnQpIHtcbiAgICAgICAgaWYgKCghbmV3VG9wTGVmdC54ICYmIG5ld1RvcExlZnQueCAhPSAwKSB8fCAoIW5ld1RvcExlZnQueSAmJiBuZXdUb3BMZWZ0LnkgIT0gMCkpIHRocm93IG5ldyBFcnJvcihcImJhZCBuZXcgVG9wIExlZnQ6IFtcIiArIG5ld1RvcExlZnQueCArIFwiLCBcIiArIG5ld1RvcExlZnQueSArIFwiXVwiKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICB2aXNpYmxlc1trZXldLnRvcExlZnQgPSBuZXdUb3BMZWZ0O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVzZXRPcGFjaXRpZXMgKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgIHZpc2libGVzW2tleV0ub3BhY2l0eSA9IGNhbGN1bGF0ZU9wYWNpdHkodmlzaWJsZXNba2V5XS5zY2FsZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRJbmZvRm9yR1VJIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mVmlzaWJsZXMgPSBPYmplY3Qua2V5cyh2aXNpYmxlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHNjYWxlIGZvciBwYXNzaW5nIHRvIEdVSTogXG4gICAgICAgICAgICAgICAgdmFyIGd1aUxheWVyID0ge1xuICAgICAgICAgICAgICAgICAgICBsZXZlbDogdmlzaWJsZXNba2V5XS5sZXZlbCxcbiAgICAgICAgICAgICAgICAgICAgdG9wTGVmdDogdmlzaWJsZXNba2V5XS50b3BMZWZ0LFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogdW5pdFNjYWxlKHZpc2libGVzW2tleV0uc2NhbGUpLFxuICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiB2aXNpYmxlc1trZXldLm9wYWNpdHksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ3VpTGF5ZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZIaWRkZW5zID0gQXJyYXkuZnJvbShoaWRkZW5zKTtcbiAgICAgICAgICAgIHJldHVybiBbbGlzdE9mVmlzaWJsZXMsIGxpc3RPZkhpZGRlbnNdO1xuICAgICAgICB9LFxuICAgICAgICBjbGVhckZvclRlc3Rpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IGJldHRlciB3YXkgdG8gY2xlYXIgc2luZ2xldG9uIGZvciB0ZXN0aW5nP1xuICAgICAgICAgICAgdmlzaWJsZXMgPSB7fTtcbiAgICAgICAgICAgIGhpZGRlbnMgPSBuZXcgU2V0KFtdKTtcbiAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB7fTtcbiAgICAgICAgfSwgIFxuICAgICAgICBnZXRWaXNpYmxlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHZpc2libGVzO1xuICAgICAgICB9LFxuICAgICAgICBnZXRIaWRkZW5zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gaGlkZGVucztcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhbGl6ZVZpc2libGU6IGZ1bmN0aW9uKGxldmVsLCBkaW1zKSB7XG4gICAgICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgdmlzaWJsZSBsYXllciBvdXRzaWRlIFttaW4sbWF4XSB6b29tLlwiKTtcbiAgICAgICAgICAgIGlmICghc2NoZW1hLmRpbWVuc2lvbnMoZGltcykpIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGRpbWVuc2lvbnMgc2NoZW1hXCIpO1xuICAgICAgICAgICAgdmlzaWJsZXNbbGV2ZWxdID0geyBsZXZlbDogbGV2ZWwsIHRvcExlZnQ6IHsgeDogMCwgeTogMCB9LCBzY2FsZTogeyB4OiAxICogc2NhbGVGYWN0b3IsIHk6IDEgKiBzY2FsZUZhY3RvciB9LCBvcGFjaXR5OiAxIH07XG4gICAgICAgICAgICBkaW1lbnNpb25zW2xldmVsXSA9IGRpbXM7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXRpYWxpemVIaWRkZW46ZnVuY3Rpb24gKGxldmVsLCBkaW1zKSB7XG4gICAgICAgICAgICBpZiAobGV2ZWwgPCBtaW5pbXVtTGV2ZWwgfHwgbGV2ZWwgPiBtYXhpbXVtTGV2ZWwpIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBhZGQgaGlkZGVuIGxheWVyIG91dHNpZGUgW21pbixtYXhdIHpvb20uXCIpO1xuICAgICAgICAgICAgaWYgKCFzY2hlbWEuZGltZW5zaW9ucyhkaW1zKSkgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZGltZW5zaW9ucyBzY2hlbWFcIik7XG4gICAgICAgICAgICBoaWRkZW5zLmFkZChwYXJzZUludChsZXZlbCkpO1xuICAgICAgICAgICAgZGltZW5zaW9uc1tsZXZlbF0gPSBkaW1zO1xuICAgICAgICB9LFxuICAgICAgICBpbmNyZWFzZVNjYWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDwgc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgPCBtYXhpbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ICs9IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID49IHNjYWxlUmFuZ2VJbldoaWNoTG93ZXJab29tTGF5ZXJJc1RyYW5zcGFyZW50WzFdICYmIGtleSA8IG1heGltdW1MZXZlbCkge1xuICAgICAgICAgICAgICAgICAgICBoaWRlKGtleSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxheWVyVG9SZXZlYWwgPSBwYXJzZUludChrZXkpICsgMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxheWVyVG9SZXZlYWwgPD0gbWF4aW11bUxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSB7IHg6IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSwgeTogMSAqIHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVjcmVhc2VTY2FsZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoa2V5ID09IG1pbmltdW1MZXZlbCAmJiB2aXNpYmxlc1trZXldLnNjYWxlLnggPT0gc2NhbGVGYWN0b3IpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2aXNpYmxlc1trZXldLnNjYWxlLnggPD0gc2NhbGVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCAtPSB6b29tSW5jcmVtZW50O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54IC09IHpvb21JbmNyZW1lbnQgKiAyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54IDw9IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFswXSAmJiBrZXkgPiBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaGlkZShrZXkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmlzaWJsZXNba2V5XS5zY2FsZS54ID09IHNjYWxlUmFuZ2VJbldoaWNoSGlnaGVyWm9vbUxheWVySXNUcmFuc3BhcmVudFsxXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGF5ZXJUb1JldmVhbCA9IHBhcnNlSW50KGtleSkgLSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGF5ZXJUb1JldmVhbCA+PSBtaW5pbXVtTGV2ZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IHsgeDogc2NhbGVSYW5nZUluV2hpY2hMb3dlclpvb21MYXllcklzVHJhbnNwYXJlbnRbMV0sIHk6IHNjYWxlRmFjdG9yIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93KGxheWVyVG9SZXZlYWwsIHZpc2libGVzW2tleV0udG9wTGVmdCwgc2NhbGUsIGNhbGN1bGF0ZU9wYWNpdHkoc2NhbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgem9vbTogZnVuY3Rpb24gKGZvY3VzLCB2ZXJ0aWNhbCkge1xuXG4gICAgICAgICAgICB2YXIgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyh2aXNpYmxlcylbMF0sXG4gICAgICAgICAgICAgICAgZmlyc3QgPSB2aXNpYmxlc1tmaXJzdEtleV0sXG4gICAgICAgICAgICAgICAgd2lkdGggPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSBkaW1lbnNpb25zW2ZpcnN0S2V5XS5oZWlnaHQ7XG4gICAgXG4gICAgICAgICAgICB2YXIgcGVyY2VudGFnZUNvb3JkaW5hdGVzID0gcG9zaXRpb24udG9wTGVmdFRvUGVyY2VudGFnZShmb2N1cywgZmlyc3QudG9wTGVmdCwgdW5pdFNjYWxlKGZpcnN0LnNjYWxlKSwgd2lkdGgsIGhlaWdodCk7XG4gICAgXG4gICAgICAgICAgICB2YXIgaG93TXVjaCA9IE1hdGguZmxvb3IoTWF0aC5hYnModmVydGljYWwpIC8gNSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvd011Y2g7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICh2ZXJ0aWNhbCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWNyZWFzZVNjYWxlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIFxuICAgICAgICAgICAgdmFyIG5ld0ZpcnN0S2V5ID0gT2JqZWN0LmtleXModmlzaWJsZXMpWzBdLFxuICAgICAgICAgICAgICAgIG5ld0ZpcnN0ID0gdmlzaWJsZXNbbmV3Rmlyc3RLZXldLFxuICAgICAgICAgICAgICAgIG5ld1dpZHRoID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0ud2lkdGgsXG4gICAgICAgICAgICAgICAgbmV3SGVpZ2h0ID0gZGltZW5zaW9uc1tuZXdGaXJzdEtleV0uaGVpZ2h0O1xuICAgIFxuICAgICAgICAgICAgdmFyIG5ld1RvcExlZnQgPSBwb3NpdGlvbi5wZXJjZW50YWdlVG9Ub3BMZWZ0KGZvY3VzLCBwZXJjZW50YWdlQ29vcmRpbmF0ZXMsIHVuaXRTY2FsZShuZXdGaXJzdC5zY2FsZSksIG5ld1dpZHRoLCBuZXdIZWlnaHQpO1xuICAgICAgICAgICAgcmVwb3NpdGlvbihuZXdUb3BMZWZ0KTtcbiAgICAgICAgICAgIHJlc2V0T3BhY2l0aWVzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNuYXBJbjogZnVuY3Rpb24gKGZvY3VzKSB7XG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZpc2libGVzKTtcbiAgICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDIgfHwga2V5cy5sZW5ndGggPCAxKSB0aHJvdyBcIlBMT1Q6IGV4cGVjdGVkIDEtMiBsYXllcnNcIjtcbiAgICBcbiAgICAgICAgICAgIGlmIChNYXRoLmFicygxMDAwMCAtIHZpc2libGVzW09iamVjdC5rZXlzKHZpc2libGVzKVswXV0uc2NhbGUueCkgPiA1KSB7XG4gICAgICAgICAgICAgICAgdGhpcy56b29tKGZvY3VzLCAtNSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmlzaWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZXNba2V5XS5zY2FsZS54ID0gMTAwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzbmFwT3V0OiBmdW5jdGlvbiAoZm9jdXMpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModmlzaWJsZXMpO1xuICAgICAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMiB8fCBrZXlzLmxlbmd0aCA8IDEpIHRocm93IFwiUExPVDogZXhwZWN0ZWQgMS0yIGxheWVyc1wiO1xuICAgIFxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKDEwMDAwIC0gdmlzaWJsZXNbT2JqZWN0LmtleXModmlzaWJsZXMpWzBdXS5zY2FsZS54KSA+IDQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnpvb20oZm9jdXMsIDUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZpc2libGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0uc2NhbGUueCA9IDEwMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZHJhZzogZnVuY3Rpb24gKGNoYW5nZUluUG9zaXRpb24pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiB2aXNpYmxlcykge1xuICAgICAgICAgICAgICAgIHZpc2libGVzW2tleV0udG9wTGVmdC54ICs9IGNoYW5nZUluUG9zaXRpb24ueDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMucGxvdCA9IHBsb3Q7IiwidmFyIHBvc2l0aW9uID0ge1xuICAgIGNhbGN1bGF0ZVBlcmNlbnQ6IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBvc2l0aW9uQiwgbGVuZ3RoQiwgc2NhbGVCKSB7XG4gICAgICAgIGlmIChsZW5ndGhCIDw9IDApIHRocm93IG5ldyBFcnJvcihcIkxlbmd0aCBtdXN0IGJlIHBvc2l0aXZlLlwiKTtcbiAgICAgICAgcmV0dXJuIChwb3NpdGlvbkEgLSBwb3NpdGlvbkIpIC8gKGxlbmd0aEIgKiBzY2FsZUIpO1xuICAgIH0sXG4gICAgY2FsY3VsYXRlUG9zaXRpb246IGZ1bmN0aW9uIChwb3NpdGlvbkEsIHBlcmNlbnRCLCBsZW5ndGhCLCBzY2FsZUIpIHtcbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uQSAtICgobGVuZ3RoQiAqIHNjYWxlQikgKiBwZXJjZW50Qik7XG4gICAgfSxcbiAgICB0b3BMZWZ0VG9QZXJjZW50YWdlOiBmdW5jdGlvbiAoZm9jdXMsIHRvcExlZnQsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQZXJjZW50KGZvY3VzLngsIHRvcExlZnQueCwgd2lkdGgsIHNjYWxlLngpLFxuICAgICAgICAgICAgeTogcG9zaXRpb24uY2FsY3VsYXRlUGVyY2VudChmb2N1cy55LCB0b3BMZWZ0LnksIGhlaWdodCwgc2NhbGUueSksXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBwZXJjZW50YWdlVG9Ub3BMZWZ0OiBmdW5jdGlvbiAoZm9jdXMsIHBlcmNlbnRhZ2UsIHNjYWxlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3NpdGlvbi5jYWxjdWxhdGVQb3NpdGlvbihmb2N1cy54LCBwZXJjZW50YWdlLngsIHdpZHRoLCBzY2FsZS54KSxcbiAgICAgICAgICAgIHk6IHBvc2l0aW9uLmNhbGN1bGF0ZVBvc2l0aW9uKGZvY3VzLnksIHBlcmNlbnRhZ2UueSwgaGVpZ2h0LCBzY2FsZS55KSxcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5wb3NpdGlvbiA9IHBvc2l0aW9uOyIsInZhciBzY2hlbWEgPSB7XG4gICAgY2hlY2s6IGZ1bmN0aW9uIChvYmplY3QsIGtleXMpIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG9iamVjdCkubGVuZ3RoICE9IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaW5kZXggaW4ga2V5cykge1xuICAgICAgICAgICAgaWYgKCEoa2V5c1tpbmRleF0gaW4gb2JqZWN0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIHh5OiBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBzY2hlbWEuY2hlY2sob2JqZWN0LCBbJ3gnLCAneSddKTtcbiAgICB9LFxuICAgIGRpbWVuc2lvbnM6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsnd2lkdGgnLCAnaGVpZ2h0J10pO1xuICAgIH0sXG4gICAgcG9pbnQ6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS54eShvYmplY3QpO1xuICAgIH0sXG4gICAgc2NhbGU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS54eShvYmplY3QpO1xuICAgIH0sXG4gICAgbGF5ZXI6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIHNjaGVtYS5jaGVjayhvYmplY3QsIFsnbGV2ZWwnLCAndG9wTGVmdCcsICdzY2FsZScsICdvcGFjaXR5J10pXG4gICAgICAgICAgICAmJiBzY2hlbWEucG9pbnQob2JqZWN0Wyd0b3BMZWZ0J10pXG4gICAgICAgICAgICAmJiBzY2hlbWEuc2NhbGUob2JqZWN0WydzY2FsZSddKTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMuc2NoZW1hID0gc2NoZW1hOyIsInZhciB1dGlscyA9IHtcbiAgICBudWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAodHlwZW9mIG9iaiA9PT0gXCJ1bmRlZmluZWRcIiB8fCBvYmogPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxufTtcblxubW9kdWxlLmV4cG9ydHMudXRpbHMgPSB1dGlsczsiXX0=
