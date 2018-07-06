var axis = d3
    .select('svg')
    .append('svg')
    .attr('id', 'axis')
    .attr('width', 1024)
    .attr('height', 50)
    .attr('y', 290)
    .attr("x", 30);
var scale = d3.scaleLinear().domain([0, 500]).range([0, 1024]);

var x_axis = d3.axisBottom().scale(scale);

axis.append("g").call(x_axis);
