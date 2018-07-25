var schema = require('../src/schema.js').schema;

var assert = require('assert');

describe('Schema Tests', function () {
    describe('xy schema', function () {
        it('has xy schema', function () {
            assert.equal(true, schema.xy({x: 0, y: 0}));
        });

        it('{x, y, foo} schema is not xy schema', function () {
            assert.equal(false, schema.xy({x: 0, y: 0, foo: 0}));
        });

        it('{x} schema is not xy schema', function () {
            assert.equal(false, schema.xy({x: 0}));
        });

        it('{y} schema is not xy schema', function () {
            assert.equal(false, schema.xy({y: 0}));
        });

        it('{x, z} schema is not xy schema', function () {
            assert.equal(false, schema.xy({x: 0, z: 0}));
        });
    });

    describe('layer schema', function () {
        it('has layer schema', function () {
            assert.equal(true, schema.layer({level: 0, topLeft: {x: 0, y: 0}, scale: {x: 0, y: 0}, opacity: 0}));
        });

        it('does not have layer schema', function () {
            assert.equal(false, schema.layer({level: 0, topLeft: {x: 0, y: 0}, scale: {x: 0, y: 0}, opacity: 0, foo: 0}));
            assert.equal(false, schema.layer({level: 0}));
            assert.equal(false, schema.layer({scale: {x: 0, y: 0}}));
            assert.equal(false, schema.layer({level: 0, scale: {x: 0, z: 0}}));
            assert.equal(false, schema.layer({level: 0, foo: {x: 0, y: 0}}));
        });
    });
});