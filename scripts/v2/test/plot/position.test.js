var position = require('../../src/plot/position.js').position;

var assert = require('chai').assert

describe('Position Functions', function () {
    describe('(Mouse Position, Edge of Plot, Length of Plot, Scale of Plot) => Percent Coordinate of Mouse in Plot', function () {
        it('Mouse at 10, Plot at -30, Plot Length 80, Plot Scale 1   =>   50%', function () {
            assert.equal(.5, position.calculatePercent(10, -30, 80, 1));
        });

        it('Mouse at 10, Plot at -30, Plot Length 80, Plot Scale .5   =>   100%', function () {
            assert.equal(1, position.calculatePercent(10, -30, 80, .5));
        });

        it('Mouse at 20, Plot at 10, Plot Length 200, Plot Scale .5   =>   10%', function () {
            assert.equal(.1, position.calculatePercent(20, 10, 200, .5));
        });
    });

    describe('Calculate position from a % of a scaled length', function () {
        it('Mouse at pixel 10 is at 50% of plot with 1*80 length => Plot should be at pixel -30', function () {
            assert.equal(-30, position.calculatePosition(10, .5, 80, 1));
        });

        it('Mouse at pixel 10 at 100% of plot with .5*80 length => Plot should be at -30', function () {
            assert.equal(-30, position.calculatePosition(10, 1, 80, .5));
        });

        it('Mouse at pixel 20 at 10% of plot with .5*200 length => Plot should be at 10', function () {
            assert.equal(10, position.calculatePosition(20, .1, 200, .5));
        });
    });

    describe('Mouse Position, Top Left => Percentage Coordinates of Mouse in Plot', function () {
        it('Mouse positioned in center of plot should have (50%, 50%) coordinates', function () {
            assert.deepEqual({x: .5, y: .5}, position.topLeftToPercentage({x: 512, y: 128}, {x: 0, y: 0}, {x: 1, y: 1}, 1024, 256));
        });

        it('Get percentage coordinates', function () {
            assert.deepEqual({x: .1, y: 1}, position.topLeftToPercentage({x: 20, y: 10}, {x: 10, y: -30}, {x: .5, y: .5}, 200, 80));
        });

    });

    describe('Mouse Position, Percentage Coordinates => Top Left of Plot', function () {
        it('Mouse positioned at 50%, 50% should give 0,0 as plot position', function () {
            assert.deepEqual({x: 0, y: 0}, position.percentageToTopLeft({x: 512, y: 128}, {x: .5, y: .5}, {x: 1, y: 1}, 1024, 256));
        });

        it('Get Top Left from percentage', function () {
            assert.deepEqual({x: 10, y: -30}, position.percentageToTopLeft({x: 20, y: 10}, {x: .1, y: 1}, {x: .5, y: .5}, 200, 80));
        });
    });

});