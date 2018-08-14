var page = require('../gui/page.js').page;

var widgetSingleton = (function () {
    var fields = {
        widgetID = null,
        width,
        height,
        plotDimensions = {
            width: null,
            height: null
        },
        currentPlot = null,
        plots = {
            // MAP : plot name => literal with url, minZoom, maxZoom
            // 'standing_height' : { url: '/path/to/standing_height/plots', minZoom: 2, maxZoom: 8 },
        }
    };

    function addButtons(target) {
        function addButton(id, name, value) {
            new page()
                .create('input')
                .attribute('id', id)
                .attribute('class', 'zoom-button')
                .attribute('type', 'button')
                .attribute('name', name)
                .attribute('value', value)
                .place(target);
        };

        addButton('zoom-in-button', 'increase', '+');
        addButton('zoom-out-button', 'decrease', '-');
    };

    function createWidgetAndBackground(target) {
        // create widget and append it to <body>
        var svg = new page()
            .createNS('svg')
            .attribute('id', fields.widgetID)
            .attribute('width', String(fields.width))
            .attribute('height', String(fields.height))
            .place(target);

        // create background for plot widget
        new page()
            .createNS('rect')
            .attribute('width', String(fields.width))
            .attribute('height', String(fields.height))
            .attribute('fill', '#dee0e2')
            .attribute('stroke', 'black')
            .place(svg);
    };

    function addPlotToPage(plotID, tileURL, minZoom, maxZoom) {
        if (width <= 0 || height <= 0) throw new Error("addPlotBox: height and width must be greater than 0.");
        if (minZoom < 0 || maxZoom < 0 || minZoom > maxZoom) throw new Error("addPlotBox: invalid min or max zoom.");

        fields.plots[plotID] = { url: tileURL, minZoom: minZoom, maxZoom: maxZoom };

        new page()
            .createNS('svg')
            .attribute('id', plotID)
            .attribute('width', String(fields.plotDimensions.width))
            .attribute('height', String(fields.plotDimensions.height))
            .attribute('display', 'none')
            .place(new page().select(fields.widgetID));
    };

    function switchPlots(plotID) {
        if (fields.currentPlot != null) {
            new page().select(fields.currentPlot).attribute('display', 'none');
            // remove listeners?
        }

        if (!widget.plots[plotID]) throw new Error("Cannot switch to nonexistant plot " + plotID);
        new page().select(plotID).attribute('display', 'inline');

        // add listeners to this plot
        // set up plot object with visible layers, and scale 
    };

    function addMultiplePlotsToPage(plotIDs, tileURLs, minZooms, maxZooms) {
        if (plotIDs.length != tileURLs.length || plotIDs.length != minZooms.length || plotIDs.length != maxZooms.length) {
            throw new Error("widgetModule.init: lengths of plotIDS, tileURLs, minZooms, maxZooms must be same.")
        }
        for (var i = 0; i < plotIDS.length; i++) {
            addPlotToPage(plotIDs[i], tileURLs[i], minZooms[i], maxZooms[i]);
        }
        // set first plotID to be visible
        switchPlots(plotIDs[0]);
    };

    return {
        init: function (widgetID, width, height, plotWidth, plotHeight, plotIDs, tileURLs, minZooms, maxZooms) {
            // target for where to insert elements is <body>
            target = new page().set(document.body);

            fields.widgetID = widgetID;
            fields.width = width;
            fields.height = height;
            fields.plotDimensions.width = plotWidth;
            fields.plotDimensions.height = plotHeight;

            addButtons(target);
            createWidgetAndBackground(target);

            addMultiplePlotsToPage(plotIDs, tileURLs, minZooms, maxZooms);
        },
    }
}());

module.exports.widgetSingleton = widgetSingleton;