var x_axis_wrapper = d3
    .select('#master')
    .append('svg')
    .attr('id', 'x-axis')
    .attr('width', 1074)
    .attr('height', 50)
    .attr('y', 290)
    .attr("x", 55);
var scale = d3.scaleLinear().domain([-5, 3035120658]).range([5, 1029]);

var x_axis = d3.axisBottom().scale(scale);

x_axis_wrapper.append("g").call(x_axis);


var y_axis_wrapper = d3
    .select('#master')
    .append('svg')
    .attr('id', 'y-axis')
    .attr('width', 70)
    .attr('height', 266)
    .attr('y', 25)
    .attr('x', 5);

var y_scale = d3.scaleLinear().domain([0, 11.592828933781343]).range([261, 5]);

var y_axis = d3.axisLeft().scale(y_scale).tickValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11.592828933781343]);

y_axis_wrapper.append("g")
    .attr("transform", "translate(50, 0)")
    .call(y_axis);



/* 
https://stackoverflow.com/questions/29305824/whats-the-idiomatic-way-to-extend-a-native-d3-component-like-d3-svg-axis

https://bost.ocks.org/mike/chart/
*/
function NonUniformBandedScale() {
    var base = d3.scaleBand();
    var bins = [];

    function scale(sel) {
        // call the scale for the given axis or selection of axes
        sel.call(base);
    }

    scale.bins = function(intervals) {
        bins = intervals;
        return scale;
    }

    d3.rebind(scale, base, 'ticks', 'scale');

    return scale;
}

//ax = NonUniformBandedScale();


