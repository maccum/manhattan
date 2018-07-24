var plot = require('../../src/plot/plot.js').plot;

var assert = require('chai').assert

describe('Plot', function () {

    afterEach(function () {
        plot.visibles = {};
        plot.hiddens = new Set([]);
    });

    describe('Visibles and Hiddens', function () {
        it('initialize visible', function () {
            var expected = {
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, opacity: 1}
            };
            
            plot.initializeVisible(2);
            assert.deepEqual(expected, plot.visibles);
        });

        it('initialize hidden', function () {
            plot.initializeHidden(2);
            assert.equal(true, plot.hiddens.has(2));
        });

        it('move from visible to hidden list', function () {
            plot.initializeVisible(1);
            plot.initializeVisible(2);
            plot.initializeVisible(3);
            plot.hide(3);
            assert.equal(true, plot.hiddens.has(3));
            assert.equal(null, plot.visibles[3]);
        });

        it('move from hidden to visible list', function () {
            var expected = {
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1*plot.scaleFactor, y: 1*plot.scaleFactor}, opacity: 1}
            };

            plot.initializeHidden(2);
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

    });

    describe('Increase scale', function () {

    });

    describe('Decrease scale', function () {
        
    })
});