var plot = {
    //level: 2,
    //scale: 10000, // divide scale by factor of 10,000 to get [0.5, 1.0]
    /*maxZoom: 7,
    minZoom: 2,*/
    dragOffset: {
        x: 0,
        y: 0,
    },
    /*scaleInUnits: function () {
        return { x: this.scale / 10000, y: 1 };
    },*/
    redraw: function(focus, percentageCoordinates) {

    },
    zoom: function (focus, vertical) {
        //var currentLayer = new Layer(this.level);
        if (Object.keys(meta.visibles).length == 0 ) throw "No Visibles!";
        //console.log(meta.visibles);
        var currentVisible = meta.visibles[Object.keys(meta.visibles)[0]]; // gets first visible layer
        var percentageCoordinates = position.topLeftToPercentage(
            focus,
            currentVisible.layer.topLeft(),
            meta.scaleInUnits(currentVisible.scale),
            currentVisible.layer.width(),
            currentVisible.layer.height()
        );

        var howMuch = Math.floor(Math.abs(vertical) / 5);
        for (var i = 0; i < howMuch; i++) {
            if (vertical < 0) {
                //this.increaseFractionalZoom();
                meta.increaseScale();
            } else {
                //this.decreaseFractionalZoom();
                meta.decreaseScale();
            }
        }
        /*var newLayer = new Layer(this.level);
        var topLeft = position.percentageToTopLeft(
            focus,
            percentageCoordinates,
            this.scaleInUnits(),
            newLayer.width(),
            newLayer.height(),
        );*/

        //render.pan(this.level, topLeft, this.scaleInUnits());
        render.render(focus, percentageCoordinates);

        //$("#zoom-div").text(this.level);
        //$("#fractional-zoom-div").text(this.scaleInUnits().x);
        var visiblesString = "";
        var scalesString = "";
        for (key in meta.visibles) {
            visiblesString += " " + key;
            scalesString += " " + meta.visibles[key].scale.x/10000;
        }
        $("#zoom-div").text(visiblesString);
        $("#fractional-zoom-div").text(scalesString);
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

        if (this.level < meta.max) {
            if (this.scale == 10000) {
                //this.increaseFractionalZoom();
                meta.increaseScale();
                console.log("fractional zoom"+this.scaleInUnits().x);
            }
            var interval = setInterval(function () {
                if (/*plot.scale != 10000*/ Math.abs(10000 - plot.scale) >= 5) {
                    //plot.increaseFractionalZoom();
                    meta.increaseScale();
                } else {
                    plot.scale = 10000;
                    clearInterval(interval);
                }
                /*var newLayer = new Layer(plot.level);
                var topLeft = position.percentageToTopLeft(
                    focus,
                    percentageCoordinates,
                    plot.scaleInUnits(),
                    newLayer.width(),
                    newLayer.height(),
                );*/
                //render.pan(plot.level, topLeft, plot.scaleInUnits());
                render.render(focus, percentageCoordinates);
                //$("#zoom-div").text(plot.level);
                $("#zoom-div").text(meta.visibles);
                //$("#fractional-zoom-div").text(plot.scaleInUnits().x);
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

        if (this.level > meta.min) {
            if (this.scale == 10000) {
                //this.decreaseFractionalZoom();
                meta.decreaseScale();
            }
            var interval = setInterval(function () {
                if (/*plot.scale != 10000*/ Math.abs(10000 - plot.scale) >= 5) {
                    //plot.decreaseFractionalZoom();
                    meta.decreaseScale();
                } else {
                    //plot.scale = 10000;
                    clearInterval(interval);
                }

                /*var newLayer = new Layer(plot.level);
                var topLeft = position.percentageToTopLeft(
                    focus,
                    percentageCoordinates,
                    plot.scaleInUnits(),
                    newLayer.width(),
                    newLayer.height(),
                );
                render.pan(plot.level, topLeft, plot.scaleInUnits());*/
                render.render(focus, percentageCoordinates);
                //$("#zoom-div").text(plot.level);
                $("#zoom-div").text(meta.visibles);
                //$("#fractional-zoom-div").text(plot.scaleInUnits().x);
            }, .1);
        }
    },
    beforeDrag: function (mouseStart) {
        var currentLayer = new Layer(this.level);
        this.dragOffset.x = mouseStart.x - currentLayer.x();
    },
    drag: function (mouseCurrent) {
        // TODO: fix drag;
        //render.render({ x: mouseCurrent.x - this.dragOffset.x, y: 0 }, this.scaleInUnits());
    },
    shift: function (horizontal) {
        render.shift(horizontal);
    },
    /*increaseFractionalZoom: function () {
        if (this.scale < 12000) {
            this.scale += 5; // .0005 in scale units
        }
        if (this.scale == 12000) {
            if (this.level < this.maxZoom) {
                this.level++;
                this.scale = 6000;
            }
        }
    },
    decreaseFractionalZoom: function () {
        if (this.scale > 6000) {
            this.scale -= 5;
        }
        if (this.scale == 6000) {
            if (this.level > this.minZoom) {
                this.level--;
                this.scale = 12000;
            }
        }
    },*/
    /*increaseAbsoluteZoom: function () {
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
    },*/
}


