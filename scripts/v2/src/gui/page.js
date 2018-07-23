var page = function () {
    this.element = null;
};

page.prototype.create = function (type) {
    this.element = document.createElementNS("http://www.w3.org/2000/svg", type);
    return this.element;
};

page.prototype.select = function (id) {
    this.element = document.getElementById(id);
    return this.element;
};

page.prototype.attribute = function (attr, value) {
    this.element.setAttribute(attr, value);
    return this.element;
};

page.prototype.append = function (child) {
    this.element.appendChild(child);
    return this.element;
};

page.prototype.place = function (parent) {
    parent.appendChild(this.element);
    return this.element;
};

page.prototype.remove = function (parent) {
    parent.removeChild(this.element);
};

//module.exports.page = page;
