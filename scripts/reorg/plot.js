var plot = {
    level: 2,
    scale: 10000, // divide scale by factor of 10,000 to get [0.5, 1.0]
    maxZoom: 7,
    minZoom: 2,
    dragOffset: {
        x: 0,
        y: 0,
    },
    scaleInUnits: function() {
        return {x: this.scale/10000, y: 1};
    },
    zoom: function(focus, vertical) {
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = topLeftToPercentage(
            focus, 
            currentLayer.topLeft(), 
            this.scaleInUnits(), 
            currentLayer.width(), 
            currentLayer.height()
        );

        var howMuch = Math.floor(Math.abs(vertical) / 5);
        for (var i = 0; i < howMuch; i++) {
            if (vertical < 0) {
                this.increaseFractionalZoom();
            } else {
                this.decreaseFractionalZoom();
            }
        }
        var newLayer = new Layer(this.level);
        var topLeft = percentageToTopLeft(
            focus,
            percentageCoordinates, 
            this.scaleInUnits(),
            newLayer.width(),
            newLayer.height(),
        );
        render.peel(this.level);
        render.render(topLeft, this.scaleInUnits());

        $("#zoom-div").text(this.level);
        $("#fractional-zoom-div").text(this.scaleInUnits().x);
    },
    snapZoomIn(focus) {
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = topLeftToPercentage(
            focus, 
            currentLayer.topLeft(), 
            this.scaleInUnits(), 
            currentLayer.width(), 
            currentLayer.height()
        );

        this.increaseAbsoluteZoom();

        var newLayer = new Layer(this.level);
        var topLeft = percentageToTopLeft(
            focus,
            percentageCoordinates, 
            this.scaleInUnits(),
            newLayer.width(),
            newLayer.height(),
        );
        render.peel(this.level);
        render.render(topLeft, this.scaleInUnits());

        $("#zoom-div").text(this.level);
        $("#fractional-zoom-div").text(this.scaleInUnits().x);
    },
    snapZoomOut(focus) {
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = topLeftToPercentage(
            focus, 
            currentLayer.topLeft(), 
            this.scaleInUnits(), 
            currentLayer.width(), 
            currentLayer.height()
        );

        this.decreaseAbsoluteZoom();

        var newLayer = new Layer(this.level);
        var topLeft = percentageToTopLeft(
            focus,
            percentageCoordinates, 
            this.scaleInUnits(),
            newLayer.width(),
            newLayer.height(),
        );
        render.peel(this.level);
        render.render(topLeft, this.scaleInUnits());

        $("#zoom-div").text(this.level);
        $("#fractional-zoom-div").text(this.scaleInUnits().x);
    },
    beforeDrag: function(mouseStart) {
        var currentLayer = new Layer(this.level);
        this.dragOffset.x = mouseStart.x - currentLayer.x();
        console.log("this.dragOffset.x: "+this.dragOffset.x);
    },
    drag: function (mouseCurrent) {
        console.log("draggOffset.x"+this.dragOffset.x);
        render.render({x: mouseCurrent.x - this.dragOffset.x, y: 0}, this.scaleInUnits());
    },
    shift: function(horizontal) {
        render.shift(horizontal);
    },
    increaseFractionalZoom: function () {
        if (this.scale < 10000) {
            this.scale += 5; // .0005 in scale units
        }
        if (this.scale == 10000) {
            if (this.level < this.maxZoom) {
                this.level++;
                this.scale = 5000;
            }
        }
    },
    decreaseFractionalZoom: function () {
        if (this.scale > 5000) {
            this.scale -= 5;
        }
        if (this.scale == 5000) {
            if (this.level > this.minZoom) {
                this.level--;
                this.scale = 10000;
            }
        }
    },
    increaseAbsoluteZoom: function () {
        if (this.level < this.maxZoom) {
            if (this.scale == 10000) {
                console.log("scale is 1");
                this.level++;
            } else {
                console.log("scale is not 1");
                this.scale = 10000;
            }
        }
    },
    decreaseAbsoluteZoom: function () {
        if (this.level > this.minZoom) {
            this.level--;
            this.scale = 10000;
        }
    },
}


