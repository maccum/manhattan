var plot = require('../../src/plot/plot.js').plot;
var schema = require('../../src/plot/schema.js').schema;
var position = require('../../src/plot/position.js').position;
var gui = require('../../src/gui/gui.js').gui;

var sinon = require('sinon');

var assert = require('chai').assert

describe('Plot', function () {

    beforeEach(function () {
        plot.visibles = {};
        plot.hiddens = new Set([]);
    });

    describe('Visibles and Hiddens', function () {
        it('initialize visible', function () {
            assert.ok(Object.keys(plot.visibles).length==0);
            var expected = {
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, opacity: 1}
            };
            
            plot.initializeVisible(2, {width: 1024, height: 512});
            assert.deepEqual(expected, plot.visibles);
        });

        it('initialize hidden', function () {
            plot.initializeHidden(2, {width: 1024, height: 512});
            assert.equal(true, plot.hiddens.has(2));
        });

        it('move from visible to hidden list', function () {
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeVisible(3, {width: 2048, height: 512});
            plot.hide(3);
            assert.equal(true, plot.hiddens.has(3));
            assert.equal(null, plot.visibles[3]);
        });

        it('move from hidden to visible list', function () {
            var expected = {
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, opacity: 1}
            };

            plot.initializeHidden(2, {width: 1024, height: 512});
            plot.show(2, {x: 0, y: 0}, {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, 1);
            assert.equal(false, plot.hiddens.has(2));
            assert.deepEqual(expected, plot.visibles);
        });
    });

    describe('Map value onto range', function () {
        it('value at end of range should be mapped to end of range', function() {
            assert.equal(7, plot.mapValueOntoRange(2, [0,2], [5,7]));
        });

        it('value in middle of range mapped to middle', function () {
            assert.equal(3, plot.mapValueOntoRange(5, [-5, 15], [1, 5]));
        });

        it('value mapped to range in reverse', function () {
            assert.equal(6, plot.mapValueOntoRange(4, [0, 10], [10, 0]));
        })
    });

    describe('Opacity', function () {
        it('opacity should be 0 if xScale is 6000', function () {
            assert.equal(0, plot.calculateOpacity({x: 6000, y: 1}));
        });

        it('opacity should be 1 if xScale is 9000', function () {
            assert.equal(1, plot.calculateOpacity({x: 9000, y: 1}));
        });

        it('opacity should be .5 if xScale is 7500', function () {
            assert.equal(.5, plot.calculateOpacity({x: 7500, y: 1}));
        });

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
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeHidden(3, {width: 2048, height: 512});
            assert.equal(plot.visibles[2].scale.x, 10000);
            plot.increaseScale();
            assert.equal(plot.visibles[2].scale.x, 10010);
        });

        it('Increasing scale to 12000 causes next layer to appear at scale 6000', function () {
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeHidden(3, {width: 2048, height: 512});
            while (plot.visibles[2].scale.x < 12000) {
                plot.increaseScale();
            }
            assert.equal(plot.visibles[2].scale.x, 12000);
            assert.equal(plot.visibles[3].scale.x, 6000);
        });

        it('Increasing scale to 18000 causes that layer to disappear', function () {
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeHidden(3, {width: 2048, height: 512});
            while (plot.visibles[2].scale.x < 17990) {
                plot.increaseScale();
            }
            assert.equal(plot.visibles[2].scale.x, 17990);
            plot.increaseScale();
            assert.equal(plot.visibles[3].scale.x, 9000);
            assert.ok(plot.hiddens.has(2));
        });
    
        it('Decreasing Scale Once', function () {
            plot.initializeVisible(3, {width: 2048, height: 512});
            plot.initializeVisible(2, {width: 1024, height: 512});
            assert.equal(plot.visibles[3].scale.x, 10000);
            plot.decreaseScale();
            assert.equal(plot.visibles[3].scale.x, 9995);
        });

        it('Decreasing scale to 9000 causes next layer to appear', function () {
            plot.initializeVisible(3, {width: 2048, height: 512});
            plot.initializeHidden(2, {width: 1024, height: 512});
            while (plot.visibles[3].scale.x > 9005) {
                plot.decreaseScale();
            }
            assert.ok(plot.hiddens.has(2));
            plot.decreaseScale();
            assert.equal(plot.visibles[3].scale.x, 9000);
            assert.equal(plot.visibles[2].scale.x, 18000);
        });

        it('Decreasing scale to 6000 causes this layer to disappear', function () {
            plot.initializeVisible(3, {width: 2048, height: 512});
            plot.initializeHidden(2, {width: 1024, height: 512});
            while (plot.visibles[3].scale.x > 6005) {
                plot.decreaseScale();
            }
            plot.decreaseScale();
            assert.equal(plot.visibles[2].scale.x, 12000);
            assert.ok(plot.hiddens.has(3));
        });
    });

    describe('Zoom', function () {
        it('zooming in', function () {
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeHidden(3, {width: 2048, height: 512});
            while (plot.visibles[2].scale.x < 12000) {
                plot.zoom({x: 512, y: 128}, -5);
            }
            assert.equal(plot.visibles[2].scale.x, 12000);
            assert.equal(plot.visibles[3].scale.x, 6000);
            assert.deepEqual(plot.visibles[2].topLeft, plot.visibles[3].topLeft);
        });

        // can't use mocha to set async things (e.g. setInterval)
        /*
        it('snap zoom in when currently at scale=1', function () {
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeHidden(3, {width: 2048, height: 512});
            plot.snapIn({x: 512, y:128});
            console.log(plot.visibles);
            assert.ok(plot.hiddens.has(2), 'expected 2 to be hidden');
            assert.equal(10000, plot.visibles[3].scale.x);
            assert.equal(-512, plot.visibles[3].topLeft.x);
        });*/

        it('snap zoom in when currently at scale-1', function () {
            var clock = sinon.useFakeTimers();
            var documentStub = sinon.stub(document);
            //var document = sinon.fake();
            plot.initializeVisible(2, {width: 1024, height: 512});
            plot.initializeHidden(3, {width: 2048, height: 512});
            plot.snapIn({x: 512, y:128});
            clock.tick(100);
            assert.ok(plot.hiddens.has(2), 'expected 2 to be hidden');
            assert.equal(10000, plot.visibles[3].scale.x);
            assert.equal(-512, plot.visibles[3].topLeft.x);
            clock.restore();
        }); 
    });
});