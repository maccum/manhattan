var typecheck = require('../../src/utils/typecheck.js').typecheck;

var assert = require('chai').assert;

describe('Typecheck', function () {
    it('nullOrUndefined is true for null', function () {
        assert.ok(typecheck.nullOrUndefined(null));
    });

    it('nullOrUndefined is true for undefined', function () {
        assert.ok(typecheck.nullOrUndefined());
    });

    it('nullOrUndefined is false for 0', function () {
        assert.isNotOk(typecheck.nullOrUndefined(0));
    });

    it('nullOrUndefined is false for object', function () {
        assert.isNotOk(typecheck.nullOrUndefined({}));
    });
});