var zoomModule = {
    currentZoomLevel: 2,
    maxZoomLevel: 7,
    minZoomLevel: 2,
    distanceZoomIn: 0,
    distanceZoomOut: 0,
    recentlyZoomed: false,
    zooms: ['zoom-2', 'zoom-3'],
    onWheel: function (evt) {
        evt.preventDefault();
        var horizontal = evt.deltaX;
        var vertical = evt.deltaY;

        if (Math.abs(vertical) >= Math.abs(horizontal)) {
            zoomModule.zoomOnVerticalScroll(vertical);
        } else {
            zoomModule.shiftOnHorizontalScroll(horizontal);
        }
    },
    shiftOnHorizontalScroll: function (horizontal) {
        var g = document.getElementById("container")
        console.log("horizontal: " + horizontal);
        dragPlotModule.moveContainerByAmount(horizontal);
    },
    zoomOnVerticalScroll: function (vertical) {
        if (vertical < 0) {
            zoomModule.distanceZoomIn += vertical;
            zoomModule.distanceZoomOut = 0;
            if (zoomModule.distanceZoomIn < -20 && !zoomModule.recentlyZoomed) {
                zoomModule.recentlyZoomed = true;
                zoomModule.distanceZoomIn = 0;
                zoomModule.zoomIn();
                setTimeout(function () {
                    zoomModule.recentlyZoomed = false;
                }, 1000);
            }
        } else if (vertical > 0) {
            zoomModule.distanceZoomOut += vertical;
            zoomModule.distanceZoomIn = 0;
            if (zoomModule.distanceZoomOut > 20 && !zoomModule.recentlyZoomed) {
                zoomModule.recentlyZoomed = true;
                zoomModule.distanceZoomOut = 0;
                zoomModule.zoomOut();
                setTimeout(function () {
                    zoomModule.recentlyZoomed = false;
                }, 1000);
            }
        } else {
            //console.log("no zoom");
        }
    },
    zoomIn: function () {
        if (zoomModule.currentZoomLevel < zoomModule.maxZoomLevel) {
            zoomModule.currentZoomLevel = zoomModule.currentZoomLevel + 1;
            zoomModule.changeZoom(zoomModule.currentZoomLevel - 1);
        }
    },
    zoomOut: function () {
        if (zoomModule.currentZoomLevel > zoomModule.minZoomLevel) {
            zoomModule.currentZoomLevel = zoomModule.currentZoomLevel - 1;
            zoomModule.changeZoom(zoomModule.currentZoomLevel + 1);
        }
    },
    changeZoom: function (oldZoom) {
        $("#zoom").text(zoomModule.currentZoomLevel);
        var zoomID = "zoom-" + zoomModule.currentZoomLevel;

        zoomModule.changePositionToMatchZoom(oldZoom, zoomModule.currentZoomLevel);

        for (var i = 0; i < zoomModule.zooms.length; i++) {
            $("." + zoomModule.zooms[i]).hide();
        }
        $("." + zoomID).show();
    },
    changePositionToMatchZoom: function (oldZoom, newZoom) {
        var g = document.getElementById("container");
        var svg = document.getElementById("slippyplot");
        var transform = dragPlotModule.addTranslateTransformIfNotExists();
        var currentX = transform.matrix.e;

        var newTopLeftX = zoomModule.getNewContainerPosition(currentX, oldZoom, newZoom);
        transform.setTranslate(newTopLeftX, 0);
    },
    createZoomLayer: function (zoomLevel) {
        var g = document.getElementById("container");

        var columns = Math.pow(2, zoomLevel);
        //var width = 256 * (Math.pow(2, zoom));
        var x = 0;

        function createTile(c) {
            var newElement = document.createElementNS("http://www.w3.org/2000/svg", 'image');
            newElement.setAttribute("class", "tile zoom-" + zoomLevel);
            newElement.setAttribute("y", "0");
            newElement.setAttribute("width", '256');
            newElement.setAttribute("height", '256');

            newElement.setAttribute("x", String(x));
            x = x + 256;
            var tilePath = "../plots/svg_tutorial_plots/" + zoomLevel + "/" + c + ".png";
            newElement.setAttributeNS("http://www.w3.org/1999/xlink", "href", tilePath);

            g.appendChild(newElement);
        }

        for (var c = 0; c < columns; c++) {
            createTile(c);
        }

        $(".zoom-" + zoomLevel).hide();
        zoomModule.zooms.push("zoom-" + zoomLevel)
        console.log(zoomModule.zooms)
    },
    getXRange: function (zoomLevel) {
        return [0, 256 * Math.pow(2, zoomModule.currentZoomLevel)]
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
    getNewContainerPosition: function (oldTopLeftX, oldZoom, newZoom) {
        var oldCenterX = Math.abs(oldTopLeftX) + 512;
        var oldXRange = zoomModule.getXRange(oldZoom);
        var newXRange = zoomModule.getXRange(newZoom);
        var newCenterX = zoomModule.mapValueOntoRange(oldCenterX, oldXRange, newXRange);
        var newTopLeftX = newCenterX - 512;
        return -newTopLeftX;
    }
};
