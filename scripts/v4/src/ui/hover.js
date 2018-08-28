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
            console.log(tspans);
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

    // convert x,y in viewing window coordinates to graph coordinates
    function _getCoordinates(x, y) {
        var args = plot.getInfoForGUI();
        var visibles = args.visibleLayers;
        var dimensions = args.dimensions;

        var first = visibles[0],
            firstKey = first.level,
            width = dimensions[firstKey].width,
            height = dimensions[firstKey].height;
        
        var percentageCoordinates = position.topLeftToPercentage({x: x, y: y}, first.topLeft, first.scale, width, height);
        var pixelCoordinates = {x: percentageCoordinates.x * width, y: percentageCoordinates.y * height};
        
        // map % coordinates to graph coordinates
        //var graphX = plot._mapValueOntoRange(percentageCoordinates.x, [0,1], [-9095836,3045120653]);
        //var graphY = plot._mapValueOntoRange(percentageCoordinates.y, [1,0], [-1.9999969651507141,11.767494897838054]);

        return [pixelCoordinates, width, height];
    }

    return {
        insertTextbox: insertTextbox,
        hoverListener: function (e) {
            if (typecheck.nullOrUndefined(hoverArea)) throw new Error("hover: hoverArea must be initialized.");
            mousepos = _getMousePositionWithinObject(e.clientX, e.clientY, hoverArea);
            //console.log('mouse pos: ' + mousepos.x + " " + mousepos.y);

            var res = _getCoordinates(mousepos.x, mousepos.y);
            var graphCoords = res[0], width = res[1], height = res[2];
            console.log('pixel pos: ' + graphCoords.x + " " + graphCoords.y);

            var points = [
                {x: 504127070, y: 8.19918, chrPos: "3:11677077", alleles: '[C,T]', p: 2.74879},
                {x: 544549434, y: 9.76749, chrPos: "3:52099441", alleles: '[T,C]', p: 5.72837},
                {x: 2706668928, y: 8.41574, chrPos: "19:47224607", alleles: '[C,T]', p: 2.21356},
            ];
        
            // check if mouse is over 50,50 circle with radius 3
            for (var i = 0; i< points.length; i++) {
                var pixelPoint = {x: plot._mapValueOntoRange(points[i].x, [-9095836,3045120653], [0,width]), y: plot._mapValueOntoRange(points[i].y, [-1.9999969651507141,11.767494897838054], [height,0])};

                if (Math.abs(graphCoords.x - pixelPoint.x) < 2 && Math.abs(graphCoords.y - pixelPoint.y) < 2) {
                    //makeTextBox(['1:200,000,000', 'alleles: T/C', 'rsid: rs142134', 'gene: foo gene', '5.3e-61'], 50, 50, document.getElementById('root'));
                    console.log('match!');
                    _displayTextBox(mousepos.x, mousepos.y, [points[i].chrPos, points[i].alleles, 'rs0', 'gene label...', points[i].p]);
                    return;
                } else {
                    _hideTextBox();
                }
            }
        }
    };
}());

module.exports.hover = hover;