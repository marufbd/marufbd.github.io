/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(['moment', 'd3', 'underscore'], function (moment) {

    var _container, _graphs = [];

    //chart d3 config
    var _svgContainer, _chartCanvas, _xScale, _xDomain = [Infinity, -Infinity];

    //static config
    var containerWidth = 800, containerHeight = 400;
    var margin = { top: 40, right: 50, bottom: 30, left: 60 },
    width = containerWidth - margin.left - margin.right,
    height = containerHeight - margin.top - margin.bottom;
    var logChartHeight = 100, diChartHeight = 20;
    var gap = 10;
    var color = d3.scale.category10();

    this.init = function (options) {
        _container = options.container;
        containerWidth = $(_container).width();
        width = containerWidth - margin.left - margin.right;

        _svgContainer = d3.select(_container)
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        _svgContainer.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        _chartCanvas = _svgContainer
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // set up the X Axis scale
        _xScale = d3.time.scale().range([0, width]);
       
        var hoverLine = _chartCanvas.append('svg:line')
            .attr('class', 'hover-line')
            .attr('x1', 20).attr('x2', 20)
            .attr('y1', 0).attr('y2', height+20)
            .attr('transform', 'translate(0, -20)')
            .attr('stroke-width', 1)
            .attr('stroke', 'grey')
            .attr('opacity', 1e-6);

        _chartCanvas.append("g")
            .attr('id', 'xAxis')
            .attr('transform', 'translate(0, -20)') // putting x-Axis into the margin area
            .attr("class", "brush");
        _chartCanvas.select('#xAxis').append('g')// where x-axis will be rendered
            .attr("class", "x axis");
        
        
        var timeLegend = _chartCanvas.append('text')
            .attr('class', 'legend-time')
            .attr('x', width)
            .attr('text-anchor', 'end')
            .text('time:');
        

        _svgContainer// mouse event not working on chart canvas
            .on('mouseover', function () {
                var mouse = d3.mouse(this);
                var mX = mouse[0] - margin.left, mY = mouse[1] - margin.top;
                if (mX > 0 && mY > 0 && mX < width)
                    hoverLine.transition().duration(200).style('opacity', 1);
                else
                    hoverLine.transition().style("opacity", 1e-6);
            })
            .on('mouseout', function () {
                hoverLine.transition().duration(500).style("opacity", 1e-6);
            })
            .on('mousemove', function () {
                var mouse = d3.mouse(this);
                var mX = mouse[0] - margin.left, mY = mouse[1] - margin.top;                
                if (mX > 0 && mY > 0 && mX < width) {
                    var dt = moment(_xScale.invert(mX)), nearestPointDiff = Infinity, actDt = null;
                    dt.set('ms', 0);
                    var now = moment();
                    d3.selectAll('.graph').data(_graphs, function (d) { return d.id; })
                        .each(function (d) {
                            var g = d3.select(this);
                            var str = '';
                            _.each(d.yVal, function (yDim, i) {
                                //var v = _.find(d.data, function (t) { return moment(t.DateTime).diff(dt, 'seconds') == 0; });
                                var v = _.findWhere(d.data, { DateTime: d.map[mX] });
                                if (v) {
                                    str += d.yVal.length == 1 ? v[yDim] : ((i > 0 ? ', ' : ' ') + yDim + ':' + v[yDim]);
                                    var diff = dt.diff(v.DateTime, 'ms');
                                    if (diff < nearestPointDiff) {
                                        nearestPointDiff = diff;
                                        actDt = moment(v.DateTime);
                                    }
                                } 
                            });                            
                            g.select('.legend').attr('label', d.id + ' : ' + str);
                        });
                    console.log('lookup took '+moment().diff(now)+' ms');
                    //move plot line to stick to nearest time where any value found , then update time and value legends
                    if(nearestPointDiff!=Infinity) { 
                        timeLegend.text(actDt.format('DD MMM HH:mm:ss.SSS'));

                        d3.selectAll('.graph').selectAll('.legend').text(function(d) {
                            return d3.select(this).attr('label');
                        });                        
                        var moveX = _xScale(actDt);
                        hoverLine.attr('x1', moveX).attr('x2', moveX);
                    } 
                }                    
            });
        
    };
    
    //rendering with d3
    function render() {
        
        function renderTimeSeries(selection) {  
            selection.each(function(d) {
                var g = d3.select(this);
                var chartConfig = this.__chart__;

                if (chartConfig) {
                    var yDomain = chartConfig.yDomain;
                    var y = chartConfig.y;
                } 
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

                    y = d3.scale.linear().domain(yDomain).range([logChartHeight - gap, 0]);
                    var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);
                    g.attr('id', d.id) // add y axis
                        .append('g')
                        .attr("class", "y axis")
                        .attr('transform', 'translate(-1, 0)') // not make the vertical line disappear by clip when zoomed with brush
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
                            .attr("clip-path", "url(#clip)")
                            .style('stroke', color(d.id + i));
                        //add legend
                        g.append('text').text(d.id)
                            .attr('class', 'legend')
                            .attr('x', 10).attr('y', 10);
                    }
                });


                //stash chart settings for update
                this.__chart__ = { yDomain: yDomain, y: y };
            });
        }
        function renderDigitalSeries(selection) {
            selection.each(function (d) {
                var g = d3.select(this);

                var chartConfig = this.__chart__;

                var diGroups = _.groupBy(d.data, 'Channel');
                //setup scales 
                var gh = graphHeight(d);
                //var graphHeight = (height / _graphs.length) - gap;
                var yheight = gh / _.keys(diGroups).length - 5; 
                var y = d3.scale.linear().domain([0, 1]).range([yheight, 0]);
                var txHeight = gh / _.keys(diGroups).length;

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
                            .attr('transform', 'translate(0,' + (i++ * txHeight + (yheight / 2)) + ')');
                    } else { // add
                        g.append("path") //add path
                            .attr('class', 'path ' + 'di_' + channel)
                            .attr("d", valueline(data))
                            .attr("clip-path", "url(#clip)")
                            .style('stroke', color(d.id + channel))
                            .attr('transform', 'translate(0,' + (i * txHeight) + ')');
                        g.append("svg:text")
                            .text(channel)
                            .attr('class', 'inputLabel' + channel)
                            .attr('text-anchor', 'end')
                            .attr('transform', 'translate(0,' + (i++ * txHeight + (yheight / 2)) + ')');
                    }                    
                });
                

                this.__chart__ = { update: true };
            });
        }        

        //data-bind
        var graphs = _chartCanvas.selectAll('.graph')
            .data(_graphs, function (d) { return d.id; });

        //x-axis
        var xAxis = d3.svg.axis().scale(_xScale).orient("top").ticks(5);
        d3.select('.x.axis').call(xAxis);

        //remove graph
        graphs.exit().remove();

        //update existing graphs 
        graphs.each(function (d) {
            var g = d3.select(this);
            //position graph                       
            var tx = 0;
            _.chain(_graphs).filter(function (t) { return t.order < d.order; }).each(function (t) { tx += graphHeight(t); });            
            g.transition().duration(700).attr('transform', function(d) { return 'translate(0, ' + tx + ')'; });
            d.type == 'log' ? renderTimeSeries(g) : renderDigitalSeries(g);
        });

        //add new graphs        
        var newGraphs = graphs
            .enter()
            .append('g')
            .attr('class', 'graph')
            .attr('transform', function (d) {
                var tx = 0;
                _.chain(_graphs).filter(function(t) { return t.order < d.order; }).each(function(t) { tx += graphHeight(t); });                
                return 'translate(0, ' + tx + ')';
            });
        //newGraphs.append('g') //arrow-up
        //    .attr('width', 30)
        //    .attr('height', 30)
        //    .append('polygon') 
        //    .attr('points', '100,600 100,-200  500,200 500,-100  0,-600  -500,-100 -500,200 -100,-200 -100,600');
        newGraphs.each(function (d) { d.type == 'log' ? renderTimeSeries(d3.select(this)) : renderDigitalSeries(d3.select(this)); });
    }


    function graphHeight(d) {
        if (d.type == 'log')
            return logChartHeight;
        else if (d.type == 'di') {
            //calculate height
            var cnt = _.uniq(d.data, false, function (t) { return t.Channel; }).length;
            return diChartHeight * cnt;
        } else {
            return 100;
        }
    }
    
    function adjustChartHeight() {
        height = 0;
        _.each(_graphs, function (t) { height += graphHeight(t); });
        containerHeight = height + margin.top + margin.bottom;
        _svgContainer.attr('height', containerHeight);
        _svgContainer.select('#clip').select('rect').attr('height', height);
        _chartCanvas.select('.hover-line').attr('y2', height + 20);
    }


    //public methods for clients of this module
    this.addGraph = function (graph) {

        //adjust x-axis domain
        var vals = _.chain(graph.data).pluck('DateTime').map(function (d) { return moment(d).valueOf(); }).value();
        var min = _.min(vals);
        var max = _.max(vals);
        if (min < _xDomain[0])
            _xDomain[0] = min;
        if (max > _xDomain[1])
            _xDomain[1] = max;
        _xScale.domain(_xDomain);


        //setup graph data
        graph.order = _graphs.length;
        
        var cf = crossfilter(graph.data);
        var dim = cf.dimension(function (d) { return moment(d.DateTime).valueOf(); });
        var idx = 0;
        dim.filter(function(d) { return (idx++ % 5) == 0; });
        graph.data = dim.bottom(Infinity);

        var map = {}, dates = _.map(graph.data, function (d) { return moment(d.DateTime).valueOf();});
        _.each(d3.range(width), function(px) {
            var dt = _xScale.invert(px);
            var dataIndex = _.sortedIndex(dates, moment(dt).valueOf());// assuming data is sorted
            if(dataIndex<graph.data.length)
                map[px] = graph.data[dataIndex].DateTime;
        });
        graph.map = map;        

        _graphs.push(graph);
        
        
        //zoom scale, this needs to be rendered here as brush event triggers render which cannot change the brush itself
        var zoom = d3.time.scale().range([0, width]).domain(_xScale.domain());
        var brush = d3.svg.brush()
            .x(zoom)
            .on('brush', function () {
                _xScale.domain(brush.empty() ? _xDomain : brush.extent());
                render();
            });
        d3.select('#xAxis')
            .call(brush)
            .selectAll('rect')
            .attr('y', -10)
            .attr('height', 20);

        adjustChartHeight();

        render();
    };

    this.removeGraph = function (graphId) {
        _graphs = _.reject(_graphs, function (g) { return g.id === graphId; });
        _.chain(_graphs).sortBy(function (g) { return g.order; }).each(function (g, i) { g.order = i; });
        
        adjustChartHeight();

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