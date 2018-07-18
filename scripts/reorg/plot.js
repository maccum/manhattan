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

        console.log("zooming");
        var currentLayer = new Layer(this.level);
        var percentageCoordinates = topLeftToPercentage(
            focus,
            currentLayer.topLeft(),
            this.scaleInUnits(),
            currentLayer.width(),
            currentLayer.height()
        );
        function str(pt) {
            return "("+pt.x+","+pt.y+")";
        }
        console.log("OLD\n:focus: "+str(focus)
        +"\ntopLeft:"+str(currentLayer.topLeft())
        +"\nscale"+str(this.scaleInUnits())
        +"\nwidth:"+currentLayer.width()
        +"\nheight:"+currentLayer.height()
        +"\n% start:"+str(percentageCoordinates));

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

        var p = topLeftToPercentage(focus, newLayer.topLeft(), this.scaleInUnits(), newLayer.width(), newLayer.height());
        console.log("NEW:\nfocus: "+str(focus)
        +"\ntopLeft:"+str(newLayer.topLeft())
        +"\nscale"+str(this.scaleInUnits())
        +"\nwidth:"+newLayer.width()
        +"\nheight:"+newLayer.height()
        +"\n% start:"+str(p));

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

        if (this.level < this.maxZoom) {
            if (this.scale == 10000) {
                this.increaseFractionalZoom();
            }
            var interval = setInterval(function () {
                if (/*plot.scale != 10000*/ 10000 - plot.scale > 5) {
                    plot.increaseFractionalZoom();
                } else {
                    plot.scale = 10000;
                    clearInterval(interval);
                }
                var newLayer = new Layer(plot.level);
                var topLeft = percentageToTopLeft(
                    focus,
                    percentageCoordinates,
                    plot.scaleInUnits(),
                    newLayer.width(),
                    newLayer.height(),
                );
                render.peel(plot.level);
                render.render(topLeft, plot.scaleInUnits());
                $("#zoom-div").text(plot.level);
                $("#fractional-zoom-div").text(plot.scaleInUnits().x);
            }, .1);
        }
        /*
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
        $("#fractional-zoom-div").text(this.scaleInUnits().x);*/
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

        if (this.level > this.minZoom) {
            if (this.scale == 10000) {
                this.decreaseFractionalZoom();
            }
            var interval = setInterval(function () {
                if (/*plot.scale != 10000*/ 10000 - plot.scale > 1) {
                    plot.decreaseFractionalZoom();
                } else {
                    plot.scale = 10000;
                    clearInterval(interval);
                }

                var newLayer = new Layer(plot.level);
                var topLeft = percentageToTopLeft(
                    focus,
                    percentageCoordinates,
                    plot.scaleInUnits(),
                    newLayer.width(),
                    newLayer.height(),
                );
                render.peel(plot.level);
                render.render(topLeft, plot.scaleInUnits());
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


