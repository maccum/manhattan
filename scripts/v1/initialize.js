
function initializeSlippyPlot() {

    tileStore.localURL = "../plots/svg_tutorial_plots/";
    for (var i = 4; i<8; i++) {
        //createLayer(i);
        //populateLayer(i);
        tileStore.createLayer(i);
        tileStore.fetchLayerTiles(i);
    }
}

initializeSlippyPlot();