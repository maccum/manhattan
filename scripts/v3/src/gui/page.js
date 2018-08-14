var utils = require('../utils/utils.js').utils;

var page = function () {
    this.element = null;
};

page.prototype.set = function(element) {
    if (this.element != null) throw new Error("page().set() cannot override non-null element with new element.");
    this.element = element;
    return this;
}

page.prototype.create = function (type) {
    if (utils.nullOrUndefined(type)) throw new Error("page().create() must have a `type` argument.");
    this.element = document.createElement(type);
    return this;
};

page.prototype.createNS = function (type) {
    if (utils.nullOrUndefined(type)) throw new Error("page().createNS() must have a `type` argument.");
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

page.prototype.select = function (id) {
    if (utils.nullOrUndefined(id)) throw new Error("page().select() must have an `id` argument.");
    this.element = document.getElementById(id);
    return this;
};

page.prototype.attribute = function (attr, value) {
    if (utils.nullOrUndefined(attr) || utils.nullOrUndefined(value)) throw new Error("page().attribute() must have `attr` and `value` arguments.");
    this.element.setAttribute(attr, value);
    return this;
};

page.prototype.append = function (child) {
    if (utils.nullOrUndefined(child)) throw new Error("page().append() must have a `child` argument.");
    this.element.appendChild(child.element);
    return this;
};

page.prototype.place = function (parent) {
    if (utils.nullOrUndefined(parent)) throw new Error("page().place() must have a `parent` argument.");
    parent.element.appendChild(this.element);
    return this;
};

page.prototype.remove = function (parent) {
    if (utils.nullOrUndefined(parent)) throw new Error("page().remove() must have a `parent` argument.");
    parent.element.removeChild(this.element);
};

page.prototype.addHREF = function (href) {
    if (utils.nullOrUndefined(href)) throw new Error("page().addHREF() must have a `href` argument.");
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
};

module.exports.page = page;
