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