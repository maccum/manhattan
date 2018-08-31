
/*Helpers for converting a particular position within
the viewing window to a percentage coordinate within the actual plot. 

e.g. a plot of size 1024 * 256 and a mouse position of (512,128) would
give a % coordinate of (50%,50%) assuming that the plot is at position
(0,0) and scale(1,1). 

A plot of size 2048 * 256 with position (-512, 0) and scale(1,1), and mouse position 
(512, 128) would also give a % coordinate of (50%, 50%).

Plot layers (<g> elements) are positioned by their top left coordinate.
When zooming in and out, the plots need to be repositioned each time
they are re-scaled, so that the mouse position stays at approximately the same
coordinate in the plot. Before zooming, a percent position of the mouse is calculated.
After zooming, the percent position is re-converted to a topLeft coordinate
at the new zoom level of the plot. */
var position = {
    calculatePercent: function (positionA, positionB, lengthB, scaleB) {
        if (lengthB <= 0) throw new Error("Length must be positive.");
        return (positionA - positionB) / (lengthB * scaleB);
    },
    calculatePosition: function (positionA, percentB, lengthB, scaleB) {
        return positionA - ((lengthB * scaleB) * percentB);
    },
    /* focus: mouse position
    topLeft: top left coordinate of plot layer
    scale: scale of plot layer
    width: width of plot layer
    height: height of plot layer*/
    topLeftToPercentage: function (focus, topLeft, scale, width, height) {
        return {
            x: position.calculatePercent(focus.x, topLeft.x, width, scale.x),
            y: position.calculatePercent(focus.y, topLeft.y, height, scale.y),
        };
    },
    /* percentage: percentage coordinates of the current focus */
    percentageToTopLeft: function (focus, percentage, scale, width, height) {
        return {
            x: position.calculatePosition(focus.x, percentage.x, width, scale.x),
            y: position.calculatePosition(focus.y, percentage.y, height, scale.y),
        };
    }
};

module.exports.position = position;