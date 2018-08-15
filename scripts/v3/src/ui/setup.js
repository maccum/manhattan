/* Insert HTML DOM elements and SVG DOM elements into webpage.

Structure

<svg> widget svg
    <rect> background rectangle for widget (any color)
    <svg> plot svg
        <rect> background rectangle for plot (white)
        <svg> svg for phenotype 1
            <g> group for each zoom layer
                <svg> svg with width and height for this layer
                    <image> images
            <g>
                ...
        <svg> svg for phenotype 2
            ...
*/

var tag = require('./ui_utils/tag.js').tag;

var setup = (function () {

    function addButtons(target) {

        function addButton(id, _class, type, name, value) {
            return new tag()
                .create('input')
                .attribute('id', id)
                .attribute('class', _class)
                .attribute('type', type)
                .attribute('name', name)
                .place(target);
        };
        addButton('searchbar', '', 'text', 'search').attribute('placeholder', 'Search for phenotypes...');
        addButton('zoom-in-button', 'zoom-button', 'button', 'increase').attribute('value', '+');
        addButton('zoom-out-button', 'zoom-button', 'button','decrease').attribute('value', '-');
    };

    function createWidgetAndBackground(target, widgetID, width, height, backgroundColor) {
        // create widget and append it to the target
        var widget = new tag()
            .createNS('svg')
            .attribute('id', widgetID)
            .attribute('width', String(width))
            .attribute('height', String(height))
            .place(target);

        // create background for plot widget
        new tag()
            .createNS('rect')
            .attribute('width', String(width))
            .attribute('height', String(height))
            .attribute('fill', backgroundColor) // '#dee0e2'
            .place(widget);

        return widget;
    };

    function createPlotContainer(target, plotID, width, height, x, y) {
        // create plot container (width and height dictate the size of the viewing window)
        var plotWindow = new tag()
            .createNS('svg')
            .attribute('id', plotID)
            .attribute('width', width)
            .attribute('height', height)
            .attribute('x', x)
            .attribute('y', y)
            .place(target);

        // create plot background
        new tag()
            .createNS('rect')
            .attribute('width', width)
            .attribute('height', height)
            .attribute('fill', 'white')
            .place(plotWindow);

        return plotWindow;
    };

    /*function addPlotToPage(target, plotID) {
        // add g for a single plot (phenotype), hidden with display=none
        new tag()
            .createNS('g')
            .attribute('id', plotID)
            //.attribute('display', 'none')
            .place(target);
    };

    function addMultiplePlotsToPage(target, plotIDs) {
        for (var i = 0; i < plotIDs.length; i++) {
            addPlotToPage(target, plotIDs[i]);
        }
    };*/

    /*function showPlot(plotID) {
        //new tag().select(plotID).attribute('display', 'inline');
    };

    function hidePlot(plotID) {
        new tag().select(plotID).attribute('display', 'none');
    };*/

    return {
        init: function (widgetID, width, height, backgroundColor, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY, plotIDs) {
            // target for where to insert elements (make sure they are before the <script>!!!)
            target = new tag().select('widget-div');

            addButtons(target);
            var widget = createWidgetAndBackground(target, widgetID, width, height, backgroundColor); //'#dee0e2'
            console.log('plotID: '+plotID);
            var plotWindow = createPlotContainer(widget, plotID, plotWindowWidth, plotWindowHeight, plotWindowX, plotWindowY);
            //addMultiplePlotsToPage(plotWindow, plotIDs);
            // set first plotID to be visible
            //showPlot(plotIDs[0]);
        },
        //showPlot: showPlot,
        //hidePlot: hidePlot,
    }
}());

module.exports.setup = setup;