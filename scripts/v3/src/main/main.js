var setup = require('../ui/setup.js').setup;
var layers = require('../ui/layers.js').layers;
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;
var handlers = require('../handlers/handlers.js').handlers;
require('../searchbar/searchbar.js');

// MAP : plot name => literal with url, minZoom, maxZoom
// 'standing_height' : { url: '/path/to/standing_height/plots', minZoom: 2, maxZoom: 8 },

var main = (function () {

    function init(widgetID, plotID, currentPlot) {
        // setup page
        setup.init(widgetID, 1124, 350, 'white', plotID, 1024, 256, 50, 30);

        // setup image layers
        layers.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
        layers.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 256, 256);
        layers.showPlot(currentPlot);

        // setup model
        plot.setPlotID(currentPlot);
        plot.setMinMaxLevel(2, 7);
        plot.initializeVisible(2, { width: 1024, height: 256 });
        var width = 1024;
        for (var i = 3; i < 7 + 1; i++) {
            width = width * 2;
            plot.initializeHidden(i, { width: width, height: 256 });
        }

        // intial rendering
        var plotID = plot.getPlotID();
        var visiblesAndHiddens = plot.getInfoForGUI();
        gui.render(plotID, visiblesAndHiddens[0], visiblesAndHiddens[1]);

        // setup listeners
        console.log("setting up listeners");
        handlers.listenForDrag(document.getElementById('plot'));
        document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
        document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
        document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);
    };

    return {
        init: init
    };
}());

main.init('widget', 'plot', 'standing_height');