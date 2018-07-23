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
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1, y: 1}, opacity: 1}
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
                2: {level: 2, topLeft: {x: 0, y: 0}, scale: {x: 1, y: 1}, opacity: 1}
            };

            plot.initializeHidden(2);
            plot.show(2, {x: 0, y: 0}, {x: 1, y: 1}, 1);
            assert.equal(false, plot.hiddens.has(2));
            assert.deepEqual(expected, plot.visibles);
        });
    });
});