class Loc {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Box {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}

class TopLeft {
    constructor(layer, window, scale, zLoc, wLoc) {
        this.layer = layer; // Layer object
        this.window = window; // Box object
        this.scale = scale;
        this.zLoc = zLoc; // pixel location in zoom layer
        this.wLoc = wLoc; // pixel location in viewing window
    }

    loc() {
        // return top left such that zLoc will be placed at wLoc in the viewing window
        var zLocScaled = new Loc(
            mapValueOntoRange(this.zLoc.x, [0,this.layer.getLayerWidth()], [0,this.layer.getLayerWidth()*this.scale]),
            this.zLoc.y);
        var x = wLoc.x - zLocScaled.x;
        var y = wLoc.y;
        return new Loc(x, y);
    }

    changeScale(scale) {
        this.scale = scale;
        return this.loc();
    }

    convert(newLayer, newScale) {
        // return new TopLeft
        var newZLoc = new Loc(
            mapValueOntoRange(this.zLoc.x, [0,this.layer.getLayerWidth()], [0, newlayer.getLayerWidth()]),
            this.zLoc.y);
        // calculate coordinates in newZoom, with newScale
        // return a TopLeft with newZoom, newScale, newZLoc, cLoc same as old cLoc
    }
}

class Layer {
    constructor(rows, columns, imageWidth, imageHeight) {
        this.rows = rows;
        this.columns = columns;
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
    }

    getLayerWidth() {
        return this.imageWidth * this.columns;
    }

    getLayerHeight() {
        return this.imageHeight * this.rows;
    }

    getImageSize() {
        return {width: imageWidth, height: imageHeight};
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