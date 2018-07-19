var render = {
    visible: 2,
    layers: [2, 3],
    getLayer: function(level) {
        return new Layer(level);
    },
    render: function(topLeft, scale) {
        var visibleLayer = this.getLayer(this.visible);
        visibleLayer.scale(scale.x, scale.y);
        visibleLayer.translate(topLeft.x, topLeft.y);
    },
    peel: function(level) {
        this.visible = level;
        for (var i = 0; i < this.layers.length; i++) {
            var layerToHide = this.layers[i];
            this.getLayer(layerToHide).hide();
        }
        this.getLayer(this.visible).show();
    },
    pan: function (level, topLeft, scale) {
        this.peel(level);
        this.render(topLeft, scale);
    },
    shift: function(shift) {
        var visibleLayer = this.getLayer(this.visible);
        visibleLayer.shift(shift);
    }
}