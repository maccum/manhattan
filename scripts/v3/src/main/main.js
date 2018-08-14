var setup = require('../ui/setup.js').setup;
var layers = require('../ui/layers.js').layers;
var plot = require('../plot/plot.js').plot;
var gui = require('../ui/gui.js').gui;

// MAP : plot name => literal with url, minZoom, maxZoom
// 'standing_height' : { url: '/path/to/standing_height/plots', minZoom: 2, maxZoom: 8 },

var main = (function () {
    var widgetID = 'widget',
        plotID = 'plot',
        currentPlot = 'caffeine_consumption';

    function callGUI() {
        var visiblesAndHiddens = plot.getInfoForGUI();
        gui.render(plotID, visiblesAndHiddens[0], visiblesAndHiddens[1]);
    }

    function init () {
        //set up page
        //set up image layers
        // set up model
        // render
        // set up listeners
        

    }

    return {
        init: init,
    };
}());

function init() {
    var widgetID = 'widget',
        plotID = 'plot',
        currentPlot = 'caffeine_consumption';

    // setup page
    setup.init(widgetID, 1300, 350, '#e3e7ed', plotID, 1024, 256, 60, 30,
        ['caffeine_consumption', 'standing_height']);

    // setup image layers
    layers.insertPlotImages('caffeine_consumption', 2, 7, '/Users/maccum/manhattan_data/plots/caffeine_plots/caffeine_consumption', 256, 256);
    layers.insertPlotImages('standing_height', 2, 8, '/Users/maccum/manhattan_data/plots/standing_height_plots/standing_height_plots', 256, 256);

    // setup model
    plot.setMinMaxLevel(2, 7);
    plot.initializeVisible(2, { width: 1024, height: 256 });
    var width = 1024;
    for (var i = 3; i < 7 + 1; i++) {
        width = width * 2;
        plot.initializeHidden(i, { width: width, height: 256 });
    }

    // render
    callGUI(currentPlot, plot.getInfoForGUI());

    // setup listeners
    document.getElementById("plot").addEventListener("wheel", onWheel);

    document.getElementById("zoom-in-button").addEventListener("click", function () {
        plot.zoom({ x: 512, y: 128 }, -5);
        var interval = setInterval(function () {
            try {
                if (plot.snapIn({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                callGUI(currentPlot, plot.getInfoForGUI());
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    });

    document.getElementById("zoom-out-button").addEventListener("click", function () {
        console.log("snap zoom out");

        plot.zoom({ x: 512, y: 128 }, 5);
        var interval = setInterval(function () {
            try {
                if (plot.snapOut({ x: 512, y: 128 })) {
                    clearInterval(interval);
                }
                callGUI(currentPlot, plot.getInfoForGUI());
            } catch (e) {
                console.error(e.stack);
                clearInterval(interval);
            }
        }, .1);
    });

    document.getElementById("plot").addEventListener("load", listenForDrag);
}

main.init();
