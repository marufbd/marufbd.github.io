
define(['moment', 'underscore-min'], function (moment) {

    var _container, _graphs = [];

    //chart d3 config
    var _svgContainer, _chartCanvas, _xScale, _xDomain = [Infinity, -Infinity];

    //static config
    var containerWidth = 800, containerHeight = 600;
    var margin = { top: 30, right: 50, bottom: 30, left: 50 },
    width = containerWidth - margin.left - margin.right,
    height = containerHeight - margin.top - margin.bottom;
    var gap = 10;
    var color = d3.scale.category10();

    function reverseX(val) {        
        var minDt = moment(_xScale.domain()[0]).valueOf(), maxDt = moment(_xScale.domain()[1]).valueOf();
        var rx = d3.scale.linear().domain(_xScale.range()).range([minDt, maxDt]).nice().clamp(true);

        return rx(val);
    }
    

    this.init = function (options) {
        _container = options.container;

        _svgContainer = d3.select(_container)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);
        _chartCanvas = _svgContainer
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // set up the X Axis shared by all graphs
        _xScale = d3.time.scale().range([0, width]);
        
        _chartCanvas.append("g")
            .attr('id', 'xAxis')
            .attr("class", "x axis");

        var hoverLine = _chartCanvas.append('svg:line')
            .attr('class', 'hover-line')
            .attr('x1', 20).attr('x2', 20)
            .attr('y1', 0).attr('y2', height)
            .attr('stroke-width', 1)
            .attr('stroke', 'grey')
            .attr('opacity', 1e-6);
        
        var timeLegend = _chartCanvas.append('text')
            .attr('class', 'legend-time')
            .attr('x', width)
            .attr('text-anchor', 'end')            
            .text('time:');


        _svgContainer
            .on('mouseover', function () {
                var mouse = d3.mouse(this);
                var mX = mouse[0] - margin.left, mY = mouse[1] - margin.top;
                if (mX > 0 && mY > 0 && mX<width)
                    hoverLine.transition().duration(500).style('opacity', 1);
                else
                    hoverLine.transition().duration(500).style("opacity", 1e-6);
            })
            .on('mouseout', function () {
                hoverLine.transition().duration(500).style("opacity", 1e-6);
            })
            .on('mousemove', function () {
                var mouse = d3.mouse(this);
                var mX = mouse[0] - margin.left, mY = mouse[1] - margin.top;
                if (mX > 0 && mY > 0 && mX < width) {
                    hoverLine.attr('x1', mX).attr('x2', mX);
                    
                    var dt = moment(reverseX(mX));
                    dt.set('ms', 0);
                    timeLegend.text(dt.format('DD MMM HH:mm:ss.SSS'));
                    d3.selectAll('.graph').data(_graphs, function (d) { return d.id; })
                        .each(function (d) {                            
                            var g = d3.select(this);
                            var str = '';
                            _.each(d.yVal, function (yDim, i) {
                                var v = _.find(d.data, function(t) { return moment(t.DateTime).diff(dt, 'seconds') == 0; });
                                if (v)
                                    str += d.yVal.length == 1 ? v[yDim] : ((i > 0 ? ', ' : ' ') + yDim + ':' + v[yDim]);
                            });
                            g.select('.legend').text(d.id + ' : ' + str);
                        });
                }                    
            });
        
    };
    
    //rendering with d3
    function render() {
        
        function renderTimeSeries(selection) {            
            selection.each(function(d) {
                var g = d3.select(this);
                var chartConfig = this.__chart__;

                if (chartConfig) // update
                    var yDomain = chartConfig.yDomain;
                else {
                    var minY = _.min(d.data, function (v) {
                        return _.chain(d.yVal).map(function (c) { return v[c]; }).min().value();
                    });
                    var maxY = _.max(d.data, function (v) {
                        return _.chain(d.yVal).map(function (c) { return v[c]; }).max().value();
                    });
                    minY = _.chain(d.yVal).map(function (c) { return minY[c]; }).min().value();
                    maxY = _.chain(d.yVal).map(function (c) { return maxY[c]; }).max().value();
                    yDomain = [minY, maxY];
                }                

                //setup scales  
                var yheight = height / _graphs.length - gap;
                var y = d3.scale.linear().domain(yDomain).range([yheight, 0]);

                //setup y axis for this graph
                var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

                //add or update graph
                if (chartConfig) {
                    g.select('.y.axis').transition().duration(500)  // update y-axis 
                        .call(yAxis);
                } else {
                    g.attr('id', d.id) // add y axis
                        .append('g')
                        .attr("class", "y axis")
                        .call(yAxis);
                }


                //add path for each y-Value dimension 
                _.each(d.yVal, function (c, i) {
                    //setup line function
                    var valueline = d3.svg.line()
                        .interpolate('basis')
                        .x(function (a) { return _xScale(moment(a.DateTime).toDate()); })
                        .y(function (a) { return y(a[c]); });

                    if (chartConfig) {
                        g.select(".path." + c).transition().duration(1000) //update path
                            .attr("d", valueline(d.data));
                    } else {
                        g.append("path") //add path 
                            .attr('class', 'path ' + c)
                            .attr("d", valueline(d.data))
                            .style('stroke', color(d.id + i));
                        //add legend
                        g.append('text').text(d.id)
                            .attr('class', 'legend')
                            .attr('x', 10).attr('y', 10);
                    }
                });


                //stash chart settings for update
                this.__chart__ = { yDomain: yDomain };
            });
        }
        function renderDigitalSeries(selection) {
            selection.each(function (d) {
                var g = d3.select(this);

                var chartConfig = this.__chart__;

                var diGroups = _.groupBy(d.data, 'Channel');
                //setup scales 
                var graphHeight = (height / _graphs.length) - gap;
                var yheight = graphHeight / _.keys(diGroups).length - 5;
                var y = d3.scale.linear().domain([0, 1]).range([yheight, 0]);
                var txHeight = graphHeight / _.keys(diGroups).length;

                //setup line function
                var valueline = d3.svg.line()
                    .interpolate('step-after')
                    .x(function (d) { return _xScale(moment(d.DateTime).toDate()); })
                    .y(function (d) { return y(d.State ? 1 : 0); });

                //add/update graph for each channel 
                var i = 0;
                _.each(diGroups, function (data, channel) {
                    if(chartConfig) {// update
                        g.select(".path." + 'di_' + channel) //update path
                            .transition().duration(600)
                            .attr("d", valueline(data))
                            .attr('transform', 'translate(0,' + (i * txHeight) + ')');
                        g.select(".inputLabel" + channel) //update text 
                            .transition().duration(600)
                            .attr('transform', 'translate(-25,' + (i++ * txHeight + (yheight / 2)) + ')');
                    } else { // add
                        g.append("path") //add path
                            .attr('class', 'path ' + 'di_' + channel)
                            .attr("d", valueline(data))
                            .style('stroke', color(d.id + channel))
                            .attr('transform', 'translate(0,' + (i * txHeight) + ')');
                        g.append("svg:text")
                            .text('Input-' + channel)
                            .attr('class', 'inputLabel' + channel)
                            .attr('transform', 'translate(-25,' + (i++ * txHeight + (yheight / 2)) + ')');
                    }                    
                });
                

                this.__chart__ = { update: true };
            });
        }

        //data-bind
        var graphs = _chartCanvas.selectAll('.graph')
            .data(_graphs, function (d) { return d.id; });

        //position x-axis at bottom 
        var xAxis = d3.svg.axis().scale(_xScale).orient("bottom").ticks(5);
        d3.select('#xAxis').call(xAxis);
        d3.select('#xAxis').transition().duration(200).attr('transform', 'translate(0,' + height + ")");

        //remove graph
        graphs.exit().remove();        

        //update existing graphs 
        graphs.each(function (d) {
            var g = d3.select(this);
            //position graph
            g.transition().duration(700).attr('transform', function (d) { return 'translate(0, ' + (d.order * height / _graphs.length) + ')'; });
            d.type == 'log' ? renderTimeSeries(g) : renderDigitalSeries(g);
        });

        //add new graphs
        var txHeight = height / _graphs.length;
        var newGraphs = graphs
            .enter()
            .append('g')
            .attr('class', 'graph')
            .attr('transform', function(d) { return 'translate(0, ' + (d.order * txHeight) + ')'; });
        newGraphs.each(function (d) { d.type == 'log' ? renderTimeSeries(d3.select(this)) : renderDigitalSeries(d3.select(this)); });
    }


    //public methods for clients of this module
    this.addGraph = function (graph) {
        graph.order = _graphs.length;
        _graphs.push(graph);

        //adjust x-axis domain
        var vals = _.chain(graph.data).pluck('DateTime').map(function(d) { return moment(d).valueOf(); }).value();
        var min = _.min(vals);
        var max = _.max(vals);
        if (min < _xDomain[0])
            _xDomain[0] = min;
        if (max > _xDomain[1])
            _xDomain[1] = max;
        _xScale.domain(_xDomain);


        render();
    };

    this.removeGraph = function (graphId) {
        _graphs = _.reject(_graphs, function (g) { return g.id === graphId; });
        _.chain(_graphs).sortBy(function(g) { return g.order; }).each(function(g, i) { g.order = i; });

        render();
    };

    this.reorderGraph = function (graphId, updown) { 
        var g = _.findWhere(_graphs, { id: graphId });
        if (updown == 'up') {
            var prv = _.findWhere(_graphs, { order: g.order - 1 });
            g.order = g.order > 0 ? (g.order - 1) : 0;
            if (prv)
                prv.order++; 
        }
        else if (updown === 'down') {
            var next = _.findWhere(_graphs, { order: g.order + 1 });
            g.order++;
            if (next)
                next.order--;
        }

        render();
    };

    return this;
});