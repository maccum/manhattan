
zoomModule.createZoomLayer(4);
zoomModule.createZoomLayer(5);
zoomModule.createZoomLayer(6);
zoomModule.createZoomLayer(7);

document.getElementById("container").addEventListener("wheel", onWheel);

document.getElementById("zoom-in-button").addEventListener("click", function (e) {
    zoomModule.zoomIntoCenter();
});
document.getElementById("zoom-out-button").addEventListener("click", function (e) {
    zoomModule.zoomOutOfCenter();
});