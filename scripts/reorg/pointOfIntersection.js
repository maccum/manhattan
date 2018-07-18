function calculatePercent(positionA, positionB, lengthB, scaleB) {
    return (positionA - positionB) / (lengthB * scaleB);
}

function calculatePosition(positionA, percentB, lengthB, scaleB) {
    return positionA - ((lengthB * scaleB) * percentB);
}

function topLeftToPercentage(focus, topLeft, scale, width, height) {
    return {
        x: calculatePercent(focus.x, topLeft.x, width, scale.x),
        y: calculatePercent(focus.y, topLeft.y, height, scale.y),
    };
}

function percentageToTopLeft(focus, percentage, scale, width, height) {
    return {
        x: calculatePosition(focus.x, percentage.x, width, scale.x),
        y: calculatePosition(focus.y, percentage.y, height, scale.y),
    };
}


//topLeftToPercentage({x: 0, y: 0}, {x: 0, y: 0}, {x: 1.0, y: 1.0}, 1024, 256); --> (0,0)
//topLeftToPercentage({x: 1024, y: 256}, {x: 0, y: 0}, {x: 1.0, y: 1.0}, 1024, 256); --> (1,1)
//topLeftToPercentage({x: 512, y: 128}, {x: 0, y: 0}, {x: 1.0, y: 1.0}, 1024, 256); --> (.5,.5)

//percentageToTopLeft({x: 0, y: 0}, {x: 0, y: 0}, {x: 1.0, y: 1.0}, 1024, 256); --> (0,0)
//percentageToTopLeft({x: 1024, y: 256}, {x: 1, y: 1}, {x: 1.0, y: 1.0}, 1024, 256); --> (0,0)
//percentageToTopLeft({x: 512, y: 128}, {x: .5, y: .5}, {x: 1.0, y: 1.0}, 1024, 256); --> (0, 0)

//percentageToTopLeft({x: 512, y: 128}, {x: .5, y: .5}, {x: .5, y: 1}, 2048, 256);

