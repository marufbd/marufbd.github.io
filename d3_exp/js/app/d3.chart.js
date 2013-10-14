
define(['d3.v3.min', 'underscore-min', 'moment.min'], function () {

    var _container, _graphs = [], _xDomain = [];

    //chart d3 config
    var _svgContainer, _chartCanvas, _xScale;

    //static config
    var containerWidth = 800, containerHeight = 600;
    var margin = { top: 30, right: 50, bottom: 30, left: 50 },
    width = containerWidth - margin.left - margin.right,
    height = containerHeight - margin.top - margin.bottom;
    var gap = 10;
    var color = d3.scale.category10();


    this.init = function (options) {
        _container = options.container;

        _svgContainer = d3.select("body")
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
    };
    
    function renderDiAdd(d, g) { 
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

        //add graph for each channel 
        var i = 0;
        _.each(diGroups, function (data, channel) {

            g.append("path") //add path
                .attr('class', 'path ' + 'di_' + channel)
                .attr("d", valueline(data))
                .style('stroke', color(d.id + channel))
                .attr('transform', 'translate(0,' + (i * txHeight) + ')');
            g.append("svg:text")
                .text('Input-' + channel)
                .attr('class', 'inputLabel'+channel)
                .attr('transform', 'translate(-25,' + (i++ * txHeight + (yheight / 2)) + ')');
        });
    }
    
    function renderDiUpdate(d, g) {               
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

        //add graph for each channel 
        var i = 0;
        _.each(diGroups, function (data, channel) { 
            g.select(".path."+'di_'+channel) //update path
                .transition().duration(600)
                .attr("d", valueline(data))
                .attr('transform', 'translate(0,' + (i * txHeight) + ')');
            g.select(".inputLabel"+channel) //update text 
                .transition().duration(600)
                .attr('transform', 'translate(-25,' + (i++ * txHeight + (yheight / 2)) + ')');
        });
    }


    //d3 rendering functions
    function render() {
        
        function renderUpdate(d, g) {

            //setup scales 
            var yheight = height / _graphs.length - gap;
            var y = d3.scale.linear().domain(d.__chart__.yDomain).range([yheight, 0]);

            //setup y axis for this graph
            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

            //update graph            
            g.select('.y.axis').transition().duration(500)  // update y-axis 
                .call(yAxis);


            _.each(d.yVal, function (c) {
                //setup line function
                var valueline = d3.svg.line()
                    .interpolate('basis')
                    .x(function (d) { return _xScale(moment(d.DateTime).toDate()); })
                    .y(function (d) { return y(d[c]); });

                g.select(".path." + c).transition().duration(1000) //update path
                    .attr("d", valueline(d.data));
            });
        }

        function renderAdd(d, g) { 
            var minY = _.min(d.data, function (v) {
                return _.chain(d.yVal).map(function (c) { return v[c]; }).min().value();
            });
            var maxY = _.max(d.data, function (v) {
                return _.chain(d.yVal).map(function (c) { return v[c]; }).max().value();
            });
            minY = _.chain(d.yVal).map(function (c) { return minY[c]; }).min().value();
            maxY = _.chain(d.yVal).map(function (c) { return maxY[c]; }).max().value();            

            //setup scales 
            var yheight = height / _graphs.length - gap;
            var y = d3.scale.linear().domain([minY, maxY]).range([yheight, 0]);

            //setup y axis for this graph
            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

            //add graph
            g.attr('id', d.id) // add y axis
                .append('g')
                .attr("class", "y axis")
                .call(yAxis);

            //add path for each y-Value dimension 
            _.each(d.yVal, function (c, i) {
                //setup line function
                var valueline = d3.svg.line()
                    .interpolate('basis')
                    .x(function (d) { return _xScale(moment(d.DateTime).toDate()); })
                    .y(function (d) { return y(d[c]); });

                g.append("path") //add path
                    .attr('class', 'path ' + c)
                    .attr("d", valueline(d.data))
                    .style('stroke', color(d.id + i));
            });
            

            //stash chart settings for update
            d.__chart__ = { y: y, yDomain: [minY, maxY] };
        }

        function renderAddOrUpdate(d) {
            var g = d3.select(this);


            if(this.__chart__) { //update
                var yDomain = this.__chart__.yDomain;
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
            } 

            //setup scales  
            var yheight = height / _graphs.length - gap;
            var y = d3.scale.linear().domain(yDomain).range([yheight, 0]);
            this.__chart__.y = y;

            //setup y axis for this graph
            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

            //add or update graph
            if(this.__chart__) {
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
                    .x(function (d) { return _xScale(moment(d.DateTime).toDate()); })
                    .y(function (d) { return y(d[c]); });

                if(this.__chart__) {
                    g.select(".path." + c).transition().duration(1000) //update path
                        .attr("d", valueline(d.data));
                } else {
                    g.append("path") //add path
                        .attr('class', 'path ' + c)
                        .attr("d", valueline(d.data))
                        .style('stroke', color(d.id + i));
                }                
            });


            //stash chart settings for update
            this.__chart__ = { y: y, yDomain: [minY, maxY] };
        }


        var graphs = _chartCanvas.selectAll('.graph')
            .data(_graphs, function (d) { return d.id; });

        //adjust x-axis domain and position the x-axis at bottom
        _xScale.domain(_xDomain);
        var xAxis = d3.svg.axis().scale(_xScale).orient("bottom").ticks(5);
        d3.select('#xAxis').call(xAxis);
        d3.select('#xAxis').transition().duration(200).attr('transform', 'translate(0,' + height + ")");

        //remove graph
        graphs.exit().remove();
        

        //update existing graphs
        //graphs.each(function(d) {
        //    var g = d3.select(this);
        //    //position graph 
        //    g.transition().duration(700).attr('transform', function(d) { return 'translate(0, ' + (d.order * height / _graphs.length) + ')'; });
        //    d.type === 'log' ? renderUpdate(d, g) : renderDiUpdate(d, g);
        //});
        
        graphs.each(renderAddOrUpdate);

        //add new graphs
        var txHeight = height / _graphs.length;
        var newGraphs = graphs
            .enter()
            .append('g')
            .attr('class', 'graph')
            .attr('transform', function(d) { return 'translate(0, ' + (d.order * txHeight) + ')'; });
        
        //newGraphs.each(function (d) { d.type === 'log' ? renderAdd(d, d3.select(this)) : renderDiAdd(d, d3.select(this)); });
        newGraphs.each(renderAddOrUpdate);
    }


    //public methods for clients of this module
    this.addGraph = function (graph) {
        graph.order = _graphs.length;
        _graphs.push(graph);


        //adjust x-axis domain
        var vals = _.chain(graph.data).pluck('DateTime').map(function(d) { return moment(d).valueOf(); }).value();
        var min = _.min(vals);
        var max = _.max(vals);
        if (!_xDomain[0] || min < _xDomain[0])
            _xDomain[0] = min;
        if (!_xDomain[1] || max > _xDomain[1])
            _xDomain[1] = max;        

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