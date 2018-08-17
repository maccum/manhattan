var plot = require('../../src/plot/plot.js').plot;

var assert = require('chai').assert;

describe('Plot', function () {

    beforeEach(function () {
        plot.setMinMaxLevel(2, 3);
    });

    afterEach(function () {
        plot.clearForTesting();
    });

    describe('Visibles and Hiddens', function () {
        it('initialize visible', function () {
            //assert.ok(Object.keys(plot.visibles).length==0);
            var expectedVisible = [{level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1, y: 1}, opacity: 1}];
            
            plot.initializeVisible(2, {width: 1024, height: 512});
            var res = plot.getInfoForGUI();
            assert.deepEqual([expectedVisible, []], [res.visibleLayers, res.hiddenLevels]);
        });

        it('initialize hidden', function () {
            plot.initializeHidden(2, {width: 1024, height: 512});
            var res = plot.getInfoForGUI();
            assert.deepEqual([[], [2]], [res.visibleLayers, res.hiddenLevels]);
        });

        // hide is now a private method
        /*it('move from visible to hidden list', function () {
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeVisible(3, {width: 2048, height: 512});
            plot.hide(3);
            assert.equal(true, plot.hiddens.has(3));
            assert.equal(null, plot.visibles[3]);
        });*/

        // show is now a private method
        /*it('move from hidden to visible list', function () {
            var expected = {
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, opacity: 1}
            };

            plot.initializeHidden(2, {width: 1024, height: 512});
            plot.show(2, {x: 0, y: 0}, {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, 1);
            assert.equal(false, plot.hiddens.has(2));
            assert.deepEqual(expected, plot.visibles);
        });*/
    });

    // private method
    /*describe('Map value onto range', function () {
        it('value at end of range should be mapped to end of range', function() {
            assert.equal(7, plot.mapValueOntoRange(2, [0,2], [5,7]));
        });

        it('value in middle of range mapped to middle', function () {
            assert.equal(3, plot.mapValueOntoRange(5, [-5, 15], [1, 5]));
        });

        it('value mapped to range in reverse', function () {
            assert.equal(6, plot.mapValueOntoRange(4, [0, 10], [10, 0]));
        });
    });*/

    describe('Opacity', function () {
        //private method
        /*it('opacity should be 0 if xScale is 6000', function () {
            assert.equal(0, plot.calculateOpacity({x: 6000, y: 1}));
        });

        it('opacity should be 1 if xScale is 9000', function () {
            assert.equal(1, plot.calculateOpacity({x: 9000, y: 1}));
        });

        it('opacity should be .5 if xScale is 7500', function () {
            assert.equal(.5, plot.calculateOpacity({x: 7500, y: 1}));
        });*/

        // these tests are for when opacity of bottom layer is changing as well
        /*it('opacity should be 0 if xScale is 18000', function () {
            assert.equal(0, plot.calculateOpacity({x: 18000, y: 1}));
        });

        it('opacity should be 1 if xScale is 12000', function () {
            assert.equal(1, plot.calculateOpacity({x: 12000, y: 1}));
        });

        it('opacity should be .5 if xScale is 15000', function () {
            assert.equal(.5, plot.calculateOpacity({x: 15000, y: 1}));
        });*/
    });

    describe('Scale', function () {
        it('Increasing Scale Once', function () {
            plot.initializeVisible(2, {width: 1024, height: 256});
            plot.initializeHidden(3, {width: 2048, height: 256});

            var expectedVisible = [{level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1, y: 1}, opacity: 1}];
            var expectedHidden = [3];
            var res = plot.getInfoForGUI();
            assert.deepEqual([res.visibleLayers, res.hiddenLevels], [expectedVisible, expectedHidden]);

            plot.increaseScale();

            var expectedVisibleAfterScale = [{level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1.0010, y: 1}, opacity: 1}];
            res = plot.getInfoForGUI();
            assert.deepEqual([res.visibleLayers, res.hiddenLevels], [expectedVisibleAfterScale, expectedHidden]);
        });

        it('Increasing scale to 12000 causes next layer to appear at scale 6000', function () {
            plot.initializeVisible(2, {width: 1024, height: 256});
            plot.initializeHidden(3, {width: 2048, height: 256});
            while (plot.getVisibles()[2].scale.x < 12000) {
                plot.increaseScale();
            }

            var expectedVisible = [
                {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1.2, y: 1}, opacity: 1},
                {level: 3, topLeft: {x: 0, y: 0}, scale: {x: .6, y: 1}, opacity: 0}
            ];

            //assert.equal(plot.visibles[2].scale.x, 12000);

            //assert.equal(plot.visibles[3].scale.x, 6000);
            var res = plot.getInfoForGUI();
            assert.deepEqual([res.visibleLayers, res.hiddenLevels], [expectedVisible, []]);
        });

        it('Increasing scale to 18000 causes that layer to disappear', function () {
            plot.initializeVisible(2, {width: 1024, height: 256});
            plot.initializeHidden(3, {width: 2048, height: 256});
            while (plot.getVisibles()[2].scale.x < 17990) {
                plot.increaseScale();
            }
            assert.equal(plot.getVisibles()[2].scale.x, 17990);
            plot.increaseScale();
            assert.equal(plot.getVisibles()[3].scale.x, 9000);
            assert.ok(plot.getHiddens().has(2));
        });
    
        it('Decreasing Scale Once', function () {
            plot.initializeVisible(3, {width: 2048, height: 256});
            plot.initializeVisible(2, {width: 1024, height: 256});
            assert.equal(plot.getVisibles()[3].scale.x, 10000);
            plot.decreaseScale();
            assert.equal(plot.getVisibles()[3].scale.x, 9995);
        });

        it('Decreasing scale to 9000 causes next layer to appear', function () {
            plot.initializeVisible(3, {width: 2048, height: 256});
            plot.initializeHidden(2, {width: 1024, height: 256});
            while (plot.getVisibles()[3].scale.x > 9005) {
                plot.decreaseScale();
            }
            assert.ok(plot.getHiddens().has(2));
            plot.decreaseScale();
            assert.equal(plot.getVisibles()[3].scale.x, 9000);
            assert.equal(plot.getVisibles()[2].scale.x, 18000);
        });

        it('Decreasing scale to 6000 causes this layer to disappear', function () {
            plot.initializeVisible(3, {width: 2048, height: 256});
            plot.initializeHidden(2, {width: 1024, height: 256});
            while (plot.getVisibles()[3].scale.x > 6005) {
                plot.decreaseScale();
            }
            plot.decreaseScale();
            assert.equal(plot.getVisibles()[2].scale.x, 12000);
            assert.ok(plot.getHiddens().has(3));
        });
    });

    describe('Zoom', function () {
        it('zooming in', function () {
            plot.initializeVisible(2, {width: 1024, height: 256});
            plot.initializeHidden(3, {width: 2048, height: 256});
            while (plot.getVisibles()[2].scale.x < 12000) {
                plot.zoom({x: 512, y: 128}, -5);
            }
            assert.equal(plot.getVisibles()[2].scale.x, 12000);
            assert.equal(plot.getVisibles()[3].scale.x, 6000);
            assert.deepEqual(plot.getVisibles()[2].topLeft, plot.getVisibles()[3].topLeft);
        });

        it('snap zoom in when currently at scale-1', function () {
            plot.initializeVisible(2, {width: 1024, height: 256});
            plot.initializeHidden(3, {width: 2048, height: 256});
            plot.zoom({x: 512, y: 128}, -5);
            while (!plot.snapIn({x: 512, y:128}));
            assert.ok(plot.getHiddens().has(2), 'layer 2 is not hidden after snapping in');
            assert.equal(10000, plot.getVisibles()[3].scale.x, 'layer 3 is not at scale 100% after snapping in');
            
            // TODO: precision problem, floating point:
            
            //assert.equal(-512, plot.visibles[3].topLeft.x); 
            assert.closeTo(plot.getVisibles()[3].topLeft.x, -512, 1, 'position of Layer 3 is not centered after snapping in.');
        }); 
    });
});