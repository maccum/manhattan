var utils = require('../../src/utils/utils.js').utils;

var assert = require('chai').assert;

describe('Utils', function () {
    it('nullOrUndefined is true for null', function () {
        assert.ok(utils.nullOrUndefined(null));
    });

    it('nullOrUndefined is true for undefined', function () {
        assert.ok(utils.nullOrUndefined());
    });

    it('nullOrUndefined is false for 0', function () {
        assert.isNotOk(utils.nullOrUndefined(0));
    });

    it('nullOrUndefined is false for object', function () {
        assert.isNotOk(utils.nullOrUndefined({}));
    });
});