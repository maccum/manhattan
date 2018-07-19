var render = {
    /*visible: 2,
    layers: [2, 3],*/
    /*getVisible: function(level) {
        //return new Layer(level);
        return meta.visibles[level];
    },*/
    render: function(focus, percentageCoordinates/*topLeft*//*, scale*/) {
        /*var visibleLayer = this.getLayer(this.visible);
        visibleLayer.scale(scale.x, scale.y);
        visibleLayer.translate(topLeft.x, topLeft.y);*/
 
        for (key in meta.visibles) {
            var visible = meta.visibles[key];
            var visibleLayer = visible.layer;
            var scaleInUnits = meta.scaleInUnits(visible.scale);
            //console.log(visibleLayer.scale);

            var topLeft = position.percentageToTopLeft(
                focus,
                percentageCoordinates,
                scaleInUnits,
                visibleLayer.width(),
                visibleLayer.height(),
            );

            visibleLayer.scale(scaleInUnits.x, scaleInUnits.y);
            visibleLayer.translate(topLeft.x, topLeft.y);
            visibleLayer.fade(meta.alpha(key));
        }
    },
    /*peel: function(level) {
        this.visible = level;
        for (var i = 0; i < this.layers.length; i++) {
            var layerToHide = this.layers[i];
            this.getLayer(layerToHide).hide();
        }
        this.getLayer(this.visible).show();
    },*/
    /*pan: function (level, topLeft, scale) {
        this.peel(level);
        this.render(topLeft, scale);
    },*/
    shift: function(shift) {
        //var visibleLayer = this.getLayer(this.visible);
        //visibleLayer.shift(shift);

        // to do : shift needs to be percentage based!!!!!!!!
        for (key in meta.visibles) {
            var visible = meta.visibles[key];
            visible.layer.shift(shift);
        }
    }
}