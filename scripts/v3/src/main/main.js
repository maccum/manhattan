var setup = require('../ui/setup.js').setup;
var layers = require('../ui/layers.js').layers;
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;
var handlers = require('../handlers/handlers.js').handlers;
require('../searchbar/searchbar.js');

var main = (function () {

    function init(widgetID, plotID, currentPlot) {
        // setup page
        setup.init(widgetID, 1124, 350, '#e8ebef', plotID, 1024, 256, 50, 30);

        // setup image layers
        layers.insertPlotImages('caffeine_consumption', 2, 7, '../plots/caffeine_plots/caffeine_consumption', 256, 256);
        layers.insertPlotImages('standing_height', 2, 8, '../plots/standing_height_plots/standing_height', 256, 256);
        layers.insertPlotImages('caffeine_consumption2', 2, 3, '../plots/caffeine_plots_2/caffeine_consumption', 256, 256);
        layers.showPlot(currentPlot);

        // setup model
        plot.addPlotByName('caffeine_consumption', '../plots/caffeine_plots/caffeine_consumption', 2, 7);
        plot.addPlotByName('standing_height', '../plots/standing_height_plots/standing_height', 2, 8);
        plot.addPlotByName('caffeine_consumption2', '../plots/caffeine_plots_2/caffeine_consumption', 2, 3);
        /*plot.setPlotID(currentPlot);
        plot.setMinMaxLevel(2, 7);
        plot.initializeVisible(2, { width: 1024, height: 256 });
        var width = 1024;
        for (var i = 3; i < 7 + 1; i++) {
            width = width * 2;
            plot.initializeHidden(i, { width: width, height: 256 });
        }*/
        plot.switchPlots(currentPlot);

        // intial rendering
        gui.render(plot.getInfoForGUI());

        // setup listeners
        console.log("setting up listeners");
        handlers.listenForDrag(document.getElementById('plot'));
        document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
        document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
        document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);
        // enter key inside searchbox
        $('.ui.search').on('keypress', function (e) {
            if (e.keyCode == 13) {
                e.preventDefault();
                console.log("keypress");
                handlers.searchPlots();
            }
        });

        // search icon click 
        $('.fa.fa-search.w3-large').click(function (e) {
            e.preventDefault();
            handlers.searchPlots();
        });

    };

    return {
        init: init
    };
}());

main.init('widget', 'plot', 'standing_height');