var zoomModule = {
    currentZoomLevel: 2,
    maxZoomLevel: 7,
    minZoomLevel: 2,
    distanceZoomIn: 0,
    distanceZoomOut: 0,
    recentlyZoomed: false,
    zooms: ['zoom-2', 'zoom-3'],
    shiftOnHorizontalScroll: function (horizontal) {
        dragPlotModule.moveContainerByAmount(horizontal);
    },
    zoomOnVerticalScroll: function (vertical, mousePosition) {
        console.log("mousePosition: "+mousePosition.x+" "+mousePosition.y);
        if (vertical < 0) {
            zoomModule.distanceZoomIn += vertical;
            zoomModule.distanceZoomOut = 0;
            if (zoomModule.distanceZoomIn < -20 && !zoomModule.recentlyZoomed) {
                zoomModule.recentlyZoomed = true;
                zoomModule.distanceZoomIn = 0;
                zoomModule.zoomIn(mousePosition);
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
                zoomModule.zoomOut(mousePosition);
                setTimeout(function () {
                    zoomModule.recentlyZoomed = false;
                }, 1000);
            }
        } else {
            //console.log("no zoom");
        }
    },
    zoomIn: function (mousePosition) {
        this.zoomIntoPosition(mousePosition);
    },
    zoomOut: function (mousePosition) {
        this.zoomOutOfPosition(mousePosition);
    },
    zoomIntoCenter: function () {
        zoomModule.zoomIntoPosition({x: 512, y: 0});
    },
    zoomOutOfCenter: function () {
        zoomModule.zoomOutOfPosition({x: 512, y: 0});
    },
    zoomIntoPosition: function (positionToZoomInto) {
        if (zoomModule.currentZoomLevel < zoomModule.maxZoomLevel) {
            zoomModule.currentZoomLevel = zoomModule.currentZoomLevel + 1;
            zoomModule.changeZoom(zoomModule.currentZoomLevel - 1, positionToZoomInto);
        }
    },
    zoomOutOfPosition: function (positionToZoomOutOf) {
        if (zoomModule.currentZoomLevel > zoomModule.minZoomLevel) {
            zoomModule.currentZoomLevel = zoomModule.currentZoomLevel - 1;
            zoomModule.changeZoom(zoomModule.currentZoomLevel + 1, positionToZoomOutOf);
        }
    },
    changeZoom: function (oldZoom, mousePosition) {
        $("#zoom").text(zoomModule.currentZoomLevel);
        var zoomID = "zoom-" + zoomModule.currentZoomLevel;

        zoomModule.changePositionToMatchZoom(oldZoom, zoomModule.currentZoomLevel, mousePosition);

        for (var i = 0; i < zoomModule.zooms.length; i++) {
            $("." + zoomModule.zooms[i]).hide();
        }
        $("." + zoomID).show();
    },
    changePositionToMatchZoom: function (oldZoom, newZoom, mousePosition) {
        var transform = dragPlotModule.addTranslateTransformIfNotExists();
        var currentX = transform.matrix.e;

        //var newTopLeftX = zoomModule.getNewContainerPosition(currentX, oldZoom, newZoom);
        var currentMousePosInZoomLayerCoords = zoomModule.getMousePositionInCurrentZoomLayerCoordinates(mousePosition, {x: transform.matrix.e, y: 0});
        console.log("oldZoom: "+oldZoom);
        var newZoomLayerCoords = zoomModule.getNewZoomLayerCoordiantes(currentMousePosInZoomLayerCoords, oldZoom, newZoom);
        var newTopLeft = zoomModule.getNewTopLeftToPositionContainerUnderMouse(mousePosition, newZoomLayerCoords);

        transform.setTranslate(newTopLeft.x, 0);
        //transform.setTranslate(0, 0);
    },
    createZoomLayer: function (zoomLevel) {
        var g = document.getElementById("container");

        var columns = Math.pow(2, zoomLevel);
        //var width = 256 * (Math.pow(2, zoom));
        var x = 0;

        var newSVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        newSVG.setAttribute("id", "zoom-"+zoomLevel+"-svg");
        newSVG.setAttribute("class", "svg-zoom-layer");
        newSVG.setAttribute("width", String(columns*256));
        g.appendChild(newSVG);

        var newGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        newGroup.setAttribute("id", "zoom-"+zoomLevel+"-group");
        newSVG.appendChild(newGroup);

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

            newGroup.appendChild(newElement);
        }

        for (var c = 0; c < columns; c++) {
            createTile(c);
        }

        $(".zoom-" + zoomLevel).hide();
        zoomModule.zooms.push("zoom-" + zoomLevel)
        console.log(zoomModule.zooms)
    },
    getXRange: function (zoomLevel) {
        return [0, 256 * Math.pow(2, zoomLevel)]
    },
    mapValueOntoRange: function (value, oldRange, newRange) {
        console.log("value: "+value);
        console.log("old range: "+oldRange[0]+"-"+oldRange[1]);
        console.log("new range: "+newRange[0]+"-"+newRange[1]);
        var oldSpan = oldRange[1] - oldRange[0];
        var newSpan = newRange[1] - newRange[0];
        var distanceToValue = value - oldRange[0];
        var percentSpanToValue = distanceToValue / oldSpan;
        var distanceToNewValue = percentSpanToValue * newSpan;
        var newValue = newRange[0] + distanceToNewValue;
        return newValue;
    },
    /*getNewContainerPosition: function (oldTopLeftX, oldZoom, newZoom) {
        var oldCenterX = Math.abs(oldTopLeftX) + 512;
        var oldXRange = zoomModule.getXRange(oldZoom);
        var newXRange = zoomModule.getXRange(newZoom);
        var newCenterX = zoomModule.mapValueOntoRange(oldCenterX, oldXRange, newXRange);
        var newTopLeftX = newCenterX - 512;
        return -newTopLeftX;
    },*/
    getMousePositionInCurrentZoomLayerCoordinates: function (mousePosition, containerPosition) {
        var x_coord;
        var y_coord = mousePosition.y;
        if (containerPosition.x <= 0) {
            x_coord = mousePosition.x + Math.abs(containerPosition.x);
        } else {
            x_coord = mousePosition.x - containerPosition.x;
        }
        return {x: x_coord, y: y_coord};
    },
    getNewZoomLayerCoordiantes: function (oldZoomLayerCoordinates, oldZoomLevel, newZoomLevel) {
        var newX = this.mapValueOntoRange(
            oldZoomLayerCoordinates.x, 
            zoomModule.getXRange(oldZoomLevel), 
            zoomModule.getXRange(newZoomLevel));
        console.log(newX);
        return {x: newX, y: oldZoomLayerCoordinates.y};
    },
    getNewTopLeftToPositionContainerUnderMouse: function (mousePosition, newZoomLayerCoordinates) {
        if (newZoomLayerCoordinates.x > mousePosition.x) {
            return {x: -(newZoomLayerCoordinates.x - mousePosition.x), y: 0};
        } else {
            return {x: mousePosition.x - newZoomLayerCoordinates.x, y: 0};
        }
    },
};
