var plot = {
    minimumLevel : 2,
    maximumLevel:  7,
    scaleFactor: 10000,
    visibles: {}, 
    hiddens: new Set([]),
    initializeVisible: function (level) {
        this.visibles[level] = {level: level, topLeft: {x: 0, y: 0}, scale: {x: 1, y: 1}, opacity: 1};
    },
    initializeHidden: function (level) {
        this.hiddens.add(level);
    },
    show: function (level, topLeft, scale, opacity) {
        this.visibles[level] = {level: level, topLeft: topLeft, scale: scale, opacity: opacity};
        this.hiddens.delete(level);
    },
    hide: function (level) {
        delete this.visibles[level];
        this.hiddens.add(level);
    },
    
}

module.exports.plot = plot;