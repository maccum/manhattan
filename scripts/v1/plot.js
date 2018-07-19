var plot = {
    level: 2,
    scale: 10000, // divide scale by factor of 10,000 to get [0.5, 1.0]
    maxZoom: 7,
    minZoom: 2,
    dragOffset: {
        x: 0,
        y: 0,
    },
    scaleInUnits: function () {
        return { x: this.scale / 10000, y: 1 };
    },
    zoom: function (focus, vertical) {
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = position.topLeftToPercentage(
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
        var topLeft = position.percentageToTopLeft(
            focus,
            percentageCoordinates,
            this.scaleInUnits(),
            newLayer.width(),
            newLayer.height(),
        );

        render.pan(this.level, topLeft, this.scaleInUnits());

        $("#zoom-div").text(this.level);
        $("#fractional-zoom-div").text(this.scaleInUnits().x);
    },
    snapZoomIn(focus) {
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = position.topLeftToPercentage(
            focus,
            currentLayer.topLeft(),
            this.scaleInUnits(),
            currentLayer.width(),
            currentLayer.height()
        );

        if (this.level < this.maxZoom) {
            if (this.scale == 10000) {
                this.increaseFractionalZoom();
                console.log("fractional zoom"+this.scaleInUnits().x);
            }
            var interval = setInterval(function () {
                if (/*plot.scale != 10000*/ Math.abs(10000 - plot.scale) >= 5) {
                    plot.increaseFractionalZoom();
                } else {
                    plot.scale = 10000;
                    clearInterval(interval);
                }
                var newLayer = new Layer(plot.level);
                var topLeft = position.percentageToTopLeft(
                    focus,
                    percentageCoordinates,
                    plot.scaleInUnits(),
                    newLayer.width(),
                    newLayer.height(),
                );
                render.pan(plot.level, topLeft, plot.scaleInUnits());
                $("#zoom-div").text(plot.level);
                $("#fractional-zoom-div").text(plot.scaleInUnits().x);
            }, .1);
        }
    },
    snapZoomOut(focus) {
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = position.topLeftToPercentage(
            focus,
            currentLayer.topLeft(),
            this.scaleInUnits(),
            currentLayer.width(),
            currentLayer.height()
        );

        if (this.level > this.minZoom) {
            if (this.scale == 10000) {
                this.decreaseFractionalZoom();
            }
            var interval = setInterval(function () {
                if (/*plot.scale != 10000*/ Math.abs(10000 - plot.scale) >= 5) {
                    plot.decreaseFractionalZoom();
                } else {
                    plot.scale = 10000;
                    clearInterval(interval);
                }

                var newLayer = new Layer(plot.level);
                var topLeft = position.percentageToTopLeft(
                    focus,
                    percentageCoordinates,
                    plot.scaleInUnits(),
                    newLayer.width(),
                    newLayer.height(),
                );
                render.pan(plot.level, topLeft, plot.scaleInUnits());
                $("#zoom-div").text(plot.level);
                $("#fractional-zoom-div").text(plot.scaleInUnits().x);
            }, .1);
        }
    },
    beforeDrag: function (mouseStart) {
        var currentLayer = new Layer(this.level);
        this.dragOffset.x = mouseStart.x - currentLayer.x();
    },
    drag: function (mouseCurrent) {
        render.render({ x: mouseCurrent.x - this.dragOffset.x, y: 0 }, this.scaleInUnits());
    },
    shift: function (horizontal) {
        render.shift(horizontal);
    },
    increaseFractionalZoom: function () {
        if (/*this.scale < 10000*/ this.scale < 12000) {
            this.scale += 5; // .0005 in scale units
        }
        if (/*this.scale == 10000*/ this.scale == 12000) {
            if (this.level < this.maxZoom) {
                this.level++;
                //this.scale = 5000;
                this.scale = 6000;
            }
        }
    },
    decreaseFractionalZoom: function () {
        if (this.scale > /*5000*/ 6000) {
            this.scale -= 5;
        }
        if (this.scale == /*5000*/ 6000) {
            if (this.level > this.minZoom) {
                this.level--;
                //this.scale = 10000;
                this.scale = 12000;
            }
        }
    },
    increaseAbsoluteZoom: function () {
        if (this.level < this.maxZoom) {
            if (this.scale == 10000) {
                this.level++;
            } else {
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


