var typecheck = require('../utils/typecheck.js').typecheck;
var position = require("../plot/position.js").position;
var plot = require('../plot/plot.js').plot;
/* Hover data.

Display metadata when mouse hovers over point. */
var hover = (function () {

    var hoverArea = null;

    function insertTextbox(parentID) {
        hoverArea = document.getElementById(parentID);

        // make svg to contain textbox
        var textbox = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        textbox.setAttribute('id', "textbox");
        textbox.setAttribute('x', "0");
        textbox.setAttribute('y', "0");
        textbox.setAttribute('visibility', "hidden");
        hoverArea.appendChild(textbox);
    
        // insert rect background with line into first svg element
        var rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        rect.setAttribute('id', 'textboxRect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('fill', 'white');
        textbox.appendChild(rect);
    
        // make container for text (with margins) inside textbox
        var innerText = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        innerText.setAttribute('id', 'textboxInner');
        innerText.setAttribute('x', '5');
        innerText.setAttribute('y', '5');
        textbox.appendChild(innerText);
    
        var text = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        text.setAttribute('id', 'textboxText');
        text.setAttribute('y', '5');
        text.setAttribute('font-size', '10');
        text.setAttribute('dy', '0');
    
        // insert text into second svg element
        innerText.appendChild(text);
    }

    function _displayTextBox(x, y, lines) {
        var textbox = document.getElementById('textbox');
        textbox.setAttribute('x', String(x+5));
        textbox.setAttribute('y', String(y));
        textbox.setAttribute('visibility', "visible");
    
        // add tspans to text element with tspans
        var lineCount = lines.length;
        var tspans = '<tspan x="0" dy="0.6em" xml:space="preserve">' + lines[0] + '</tspan>';
        for (var i = 1; i < lineCount; i++) {
            tspans += '<tspan x="0" dy="1.2em" xml:space="preserve">' + lines[i] + '</tspan>';
        }
        var text = document.getElementById('textboxText');
        text.innerHTML = tspans;
    
        // get width and height of text element
        var width = text.getBBox().width;
        var height = text.getBBox().height;
    
        // set width/height of background rect
        var rect = document.getElementById('textboxRect');
        rect.setAttribute('width', width + 15);
        rect.setAttribute('height', height + 15);
    
        // set width/height of whole textbox
        textbox.setAttribute('width', width + 15);
        textbox.setAttribute('height', height + 15);
        
        // set width/height of text container
        var innerText = document.getElementById('textboxInner');
        innerText.setAttribute('width', width + 10);
        innerText.setAttribute('height', height + 10);
    }

    function _hideTextBox() {
        var textbox = document.getElementById('textbox');
        textbox.setAttribute('visibility', "hidden");
    }
    
    function _getMousePositionWithinObject(mouseX, mouseY, boundingObject) {
        var ctm = boundingObject.getScreenCTM();
        return {
            x: (mouseX - ctm.e) / ctm.a,
            y: (mouseY - ctm.f) / ctm.d
        };
    };

    function _getFirstPlotLayerInfo() {
        var args = plot.getInfoForGUI();
        var visibles = args.visibleLayers;
        var dimensions = args.dimensions;

        var first = visibles[0],
            firstKey = first.level,
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;

        var nCols = Math.pow(2, first.level);

        return [first.topLeft, first.scale, width, height, first.level, nCols];
    }

    // convert x,y in viewing window coordinates to graph coordinates
    function _getCoordinates(x, y) {
        /*var args = plot.getInfoForGUI();
        var visibles = args.visibleLayers;
        var dimensions = args.dimensions;

        var first = visibles[0],
            firstKey = first.level,
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;*/
        var res = _getFirstPlotLayerInfo();
        var topLeft = res[0], scale = res[1], width = res[2], height = res[3];
        
        var percentageCoordinates = position.topLeftToPercentage({x: x, y: y}, topLeft, scale, width, height);
        var pixelCoordinates = {x: percentageCoordinates.x * width, y: percentageCoordinates.y * height};
        
        // map % coordinates to graph coordinates
        //var graphX = plot._mapValueOntoRange(percentageCoordinates.x, [0,1], [-9095836,3045120653]);
        //var graphY = plot._mapValueOntoRange(percentageCoordinates.y, [1,0], [-1.9999969651507141,11.767494897838054]);

        return [pixelCoordinates, width, height];
    }

    function _getTilesInView(topLeft, scale, width, height, nCols) {
        // get plot coordinate of top left corner of viewing window 
        var percentageCoordinates = position.topLeftToPercentage({x:0,y:0}, topLeft, scale, width, height);
        var topLeftPercent = percentageCoordinates.x;
        // get visible tiles
        var firstTileInView = Math.floor(topLeftPercent * nCols);
        var tilesInView = [firstTileInView, firstTileInView+1, firstTileInView+2, firstTileInView+3];
        return tilesInView;
    }

    function _afterLoadingPoints(points, x_axis_range, y_axis_range, width, height, graphCoords) {
        //console.log(points);
        for (var i = 0; i< points.length; i++) {
            var pixelPoint = {x: plot._mapValueOntoRange(points[i].gp, [x_axis_range[0], x_axis_range[1]], [0,width]), 
                y: plot._mapValueOntoRange(points[i].nlp, [y_axis_range[0], y_axis_range[1]], [height,0])};

            if (Math.abs(graphCoords.x - pixelPoint.x) < 2 && Math.abs(graphCoords.y - pixelPoint.y) < 2) {
                //_displayTextBox(mousepos.x, mousepos.y, [points[i].chrPos, points[i].alleles, 'rs0', 'gene label...', points[i].p]);
                console.log('display text box');
                _displayTextBox(mousepos.x, mousepos.y, points[i].label);
                return;
            } else {
                _hideTextBox();
            }
        }
    }

    return {
        insertTextbox: insertTextbox,
        hoverListener: function (e) {
            if (typecheck.nullOrUndefined(hoverArea)) throw new Error("hover: hoverArea must be initialized.");
            mousepos = _getMousePositionWithinObject(e.clientX, e.clientY, hoverArea);

            var res = _getCoordinates(mousepos.x, mousepos.y);
            var graphCoords = res[0], width = res[1], height = res[2];

            var x_axis_range = null, y_axis_range = null;
            $.getJSON('../plots/caffeine_plots_2/caffeine_consumption/metadata.json', function(data) {
                x_axis_range = data.x_axis_range;
                y_axis_range = data.y_axis_range;

                var res = _getFirstPlotLayerInfo();
                var topLeft = res[0], scale = res[1], width = res[2], height = res[3], zoomLevel = res[4], nCols = res[5];
                $.getJSON('../plots/caffeine_plots_2/caffeine_consumption/'+zoomLevel+'/hover.json', function (data) {
                    var tilesWithHoverData = new Set(data);
                    var points = [];
                    var tilesInView = _getTilesInView(topLeft, scale, width, height, nCols);
                    console.log(new Date().getTime());
                    console.log(tilesInView);
                    for (var i = 0; i<tilesInView.length; i++) {
                        if (tilesWithHoverData.has(tilesInView[i])) {
                            $.getJSON('../plots/caffeine_plots_2/caffeine_consumption/'+zoomLevel+'/'+tilesInView[i]+'.json', function (data) {
                                console.log(new Date().getTime());
                                console.log('loadingpoints');
                                points.push.apply(points,data);
                                _afterLoadingPoints(points, x_axis_range, y_axis_range, width, height, graphCoords);
                            });
                        }                        
                    }  
                });
            });
        }
    };
}());

module.exports.hover = hover;