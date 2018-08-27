var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;

var plot = require('./plot/plot.js').plot;
var gui = require('./ui/gui.js').gui;

var handlers = require('./ui/handlers.js').handlers;

function init() {
    // add widget stuff to page
    var widget = setup.setUpWidget('widget-div', selectors.ids.widget, 1124, 350, '#e8ebef');
    setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);

    // add images
    setup.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
    setup.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 256, 256);
    setup.insertPlotImages('caffeine_consumption2', 2, 3, '/Users/maccum/manhattan_data/plots/caffeine_plots_2/caffeine_consumption', 256, 256);

    // initialize info about each plot's name, url, min/max zoom level
    plot.addPlotByName('caffeine_consumption', '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 2, 7);
    plot.addPlotByName('standing_height', '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height', 2, 8);
    plot.addPlotByName('caffeine_consumption2', '/Users/maccum/manhattan_data/plots/caffeine_plots_2/caffeine_consumption', 2, 3);

    // set up default plot for model
    plot.switchPlots('caffeine_consumption2');

    // display default plot
    gui.render(plot.getInfoForGUI());

    // set up listeners
    handlers.listenForDrag(document.getElementById('plot'));
    document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
    document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
    document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);
}

init();