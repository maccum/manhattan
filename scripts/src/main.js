var search = require('./ui/search.js').search;
var setup = require('./ui/setup.js').setup;
var selectors = require('./utils/selectors.js').selectors;
var plot = require('./model/plot.js').plot;
var gui = require('./ui/gui.js').gui;
var handlers = require('./ui/handlers.js').handlers;
var hover = require('./ui/hover.js').hover;

function init(jsonFilePath) {

    // load information about each plot (id, title, url, min/max zoom, size)
    function _loadPlotDataFromJSON(data) {
        var plotData = {};
        for (var i = 0; i < data.length; i++) {
            var info = data[i];
            plotData[info.id] = info;
            gui.plotURLs[info.id] = info.url;
        }
        return plotData;
    }

    // initialize fuse.js searchbar with data from plots
    function _initializeFuse(plotData) {
        search(Object.values(plotData));
    }

    // add widget 
    function _addWidget() {
        var widget = setup.setUpWidget(selectors.ids.widgetDiv, selectors.ids.widget, 1124, 350, '#e8ebef');
        setup.setUpPlot(widget, selectors.ids.plot, 1024, 256, 50, 30);
    }

    // add images and set up each plot
    function _addPlots(plotData) {
        // add images and initialize each plot
        Object.keys(plotData).map(function (key) {
            setup.insertPlotImages(plotData[key].title, plotData[key].minZoom,
                plotData[key].maxZoom, plotData[key].url, plotData[key].tileWidth,
                plotData[key].tileHeight);
            plot.addPlotByName(key, plotData[key].title, plotData[key].minZoom,
                plotData[key].maxZoom, plotData[key].url);
        });
    }

    // set up default plot for model
    function _setDefaultPlot(id) {
        plot.switchPlots(id);
        gui.render(plot.getInfoForGUI());
    }

    function _setUpEventListeners() {
        // set up listeners
        handlers.listenForDrag(document.getElementById(selectors.ids.plot));
        document.getElementById(selectors.ids.plot).addEventListener("wheel", handlers.onWheel);
        document.getElementById("zoom-in-button").addEventListener("click", handlers.onButtonClickZoomIn);
        document.getElementById("zoom-out-button").addEventListener("click", handlers.onButtonClickZoomOut);

        // hover listener
        hover.insertTextbox(selectors.ids.plot);
        //hover.insertTextbox('widget');
        document.getElementById(selectors.ids.plot).addEventListener('mousemove', hover.hoverListener);
    }

    $.getJSON(jsonFilePath, function (data) {
        var plotData = _loadPlotDataFromJSON(data);
        _initializeFuse(plotData);
        _addWidget();
        _addPlots(plotData);
        _setDefaultPlot(2);
        _setUpEventListeners();
    });
}

// this filepath is relative to html page
init("../scripts/src/slippyplot.json");