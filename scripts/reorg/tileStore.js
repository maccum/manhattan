var tileStore = {
    local: true,
    localURL: "",
    setLocalTileBin: function(path) {
        this.localURL = path;
    },
    fetchTile: function (level , column) {
        var tileURL;
        if (this.local) {
            // tiles stored locally
            tileURL = this.localURL + "/" + level + "/" + column + ".png";
        } else {
            // tiles stored remotely
            tileURL = "";
        }
        
        var x = column * 256;
        var y = 0;
        var width = 256;
        var height = 256;
        createTile(level, tileURL, x, y, width, height);
    },
}