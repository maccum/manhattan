var page = function () {
    this.element = null;
};

page.prototype.create = function (type) {
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this;
};

page.prototype.select = function (id) {
    this.element = document.getElementById(id);
    return this;
};

page.prototype.attribute = function (attr, value) {
    this.element.setAttribute(attr, value);
    return this;
};

page.prototype.append = function (child) {
    this.element.appendChild(child.element);
    return this;
};

page.prototype.place = function (parent) {
    parent.element.appendChild(this.element);
    return this;
};

page.prototype.remove = function (parent) {
    parent.element.removeChild(this.element);
};

page.prototype.addHREF = function (href) {
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    return this;
}

//module.exports.page = page;
