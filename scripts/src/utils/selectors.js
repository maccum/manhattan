/*Store constants for html selectors (classes and ids) */
var selectors = {
    ids: {
        widgetDiv: 'widget-div',
        widget: 'widget',
        plot: 'plot',
        group: function (plotID, level) {
            return plotID+"-group-layer"+level;
        },
        svgLayer: function (plotID, level) {
            return plotID+"-svg-layer"+level;
        },
        tileID: function(plotID, level, column) {
            return "tile-"+plotID+"-level"+level+"-column"+column;
        }
    },
};

module.exports.selectors = selectors;