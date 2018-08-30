var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;
var plot = require('./plot/plot.js').plot;
var gui = require('./ui/gui.js').gui;
var handlers = require('./ui/handlers.js').handlers;
var hover = require('./ui/hover.js').hover;

function init() {
    var about = {
        0: {id: 0, title: 'caffeine_consumption', minZoom: 2, maxZoom: 7, url: '../plots/caffeine_plots/caffeine_consumption', tileWidth: 256, tileHeight: 256, x_axis_range: [804164,3035220653], y_axis_range: [-4.999996965150714,14.767494897838054], desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed'},
        1: {id: 1, title: 'standing_height', minZoom: 2, maxZoom: 8, url: '../plots/standing_height_plots/standing_height', tileWidth: 256, tileHeight: 256, x_axis_range: [693730, 2880965782], y_axis_range: [0, 670.175],desc: 'do eiusmod tempor incididunt ut labore et dolore magna aliqua.'},
        2: {id: 2, title: 'caffeine_consumption2', minZoom: 2, maxZoom: 8, url: '../plots/caffeine_plots_2/caffeine_consumption', tileWidth: 256, tileHeight: 256, x_axis_range: [-9095836,3045120653], y_axis_range: [-1.9999969651507141,11.767494897838054], desc: 'transparent background'},
        //id#: {id: , title: , minZoom: , maxZoom: , url: , tileWidth: , tileHeight: , x_axis_range: , y_axis_range},
    };

    search(Object.values(about));

    // add widget stuff to page
    var widget = setup.setUpWidget('widget-div', selectors.ids.widget, 1124, 350, '#e8ebef');
    setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);

    // add images and initialize each plot
    Object.keys(about).map(function (key) {
        setup.insertPlotImages(about[key].title, about[key].minZoom, 
            about[key].maxZoom, about[key].url, about[key].tileWidth, 
            about[key].tileHeight);
        plot.addPlotByName(key, about[key].title, about[key].minZoom, 
            about[key].maxZoom, about[key].url);
    });

    // set up default plot for model
    //plot.switchPlots('caffeine_consumption2');
    plot.switchPlots(2);

    // display default plot
    gui.render(plot.getInfoForGUI());

    // set up listeners
    handlers.listenForDrag(document.getElementById('plot'));
    document.getElementById("plot").addEventListener("wheel", handlers.onWheel);
    document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
    document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);

    // hover listener
    hover.insertTextbox('plot');
    //hover.insertTextbox('widget');
    document.getElementById('plot').addEventListener('mousemove', hover.hoverListener);
}

init();