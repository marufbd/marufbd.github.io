define(['d3.v3.min', 'underscore-min', 'moment.min'], function () {

    var _container, _graphs = [];

    //chart d3 config
    var _svgContainer, _chartCanvas, _xScale;

    //static config
    var containerWidth = 800, containerHeight = 270;
    var margin = { top: 30, right: 50, bottom: 30, left: 50 },
    width = containerWidth - margin.left - margin.right,
    height = containerHeight - margin.top - margin.bottom;
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
        _xScale = d3.time.scale().domain(options.timeRange).range([0, width]);
        var xAxis = d3.svg.axis().scale(_xScale).orient("bottom").ticks(5);
        _chartCanvas.append("g")
            .attr('id', 'xAxis')
            .attr("class", "x axis")
            .call(xAxis);
    };

    this.render=function() {
        
        var gap = 10;
        var graphs = _chartCanvas.selectAll('.graph')
            .data(_graphs, function (d) { return d.id; });

        //remove graph
        graphs.exit().remove();

        //move x-axis
        d3.select('#xAxis').transition().duration(200).attr('transform', 'translate(0,' + (height + (_graphs.length - 1) * gap) + ")");

        //update existing graphs 
        graphs.each(function (d) {
            var g = d3.select(this);

            var data = _.map(d.data, function (d) { return { date: moment(d.DateTime).toDate(), value: d.Value }; });

            //setup scales 
            var yheight = height / _graphs.length;
            var y = d3.scale.linear().domain([0, d3.max(data, function (d) { return d.value; })]).range([yheight, 0]);

            //setup y axis for this graph
            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

            //setup line function
            var valueline = d3.svg.line()
                .interpolate('basis')
                .x(function (d) { return _xScale(d.date); })
                .y(function (d) { return y(d.value); });

            //update graph
            g.transition().duration(700).attr('transform', function (d, i) { return 'translate(0, ' + (d.order * height / _graphs.length + (d.order * gap)) + ')'; });
            g.select('.y.axis').transition().duration(500)  // update y-axis                
                .call(yAxis);
            g.select(".path").transition().duration(1000) //update path
                .attr("d", valueline(data))
                .style('stroke', color(d.id));
        });

        var newGraphs = graphs
            .enter()
            .append('g')
            .attr('class', 'graph')
            .attr('transform', function (d) { return 'translate(0, ' + (d.order * height / _graphs.length + (d.order * gap)) + ')'; });               

        newGraphs.each(function (d) {
            var g = d3.select(this);

            var data = _.map(d.data, function (d) { return { date: moment(d.DateTime).toDate(), value: d.Value }; });

            //setup scales 
            var yheight = height / _graphs.length;
            var y = d3.scale.linear().domain([0, d3.max(data, function (d) { return d.value; })]).range([yheight, 0]);

            //setup y axis for this graph
            var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

            //setup line function
            var valueline = d3.svg.line()
                .interpolate('basis')
                .x(function (d) { return _xScale(d.date); })
                .y(function (d) { return y(d.value); });

            //add graph
            g.attr('id', d.id) // add y axis
                .append('g')
                .attr("class", "y axis")
                .call(yAxis);
            g.append("path") //add path
                .attr('class', 'path')
                .attr("d", valueline(data))
                .style('stroke', color(d.id));

        });        
        
    }

    this.renderLogGraph = function (options) {

        var data = _.map(options.data, function (d) { return { date: moment(d.DateTime).toDate(), value: d.Value }; });

        //setup scales        
        var y = d3.scale.linear().domain([0, d3.max(data, function (d) { return d.value; })]).range([height, 0]);

        //setup y axis for this graph
        var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

        //setup line function
        var valueline = d3.svg.line()
            .interpolate('basis')
            .x(function (d) { return _xScale(d.date); })
            .y(function (d) { return y(d.value); });


        //add graph
        var graphId = options.id, selId = '#' + options.id;
        var translateHeight = _graphs.length * height;

        _svgContainer.attr('height', containerHeight + parseInt(_svgContainer.attr('height')));
        d3.select('#xAxis').transition().duration(500).attr('transform', 'translate(0,' + (_graphs.length + 1) * height + ")");

        _chartCanvas.append("g") // Add the Y Axis
            .attr('id', graphId)
            .attr('transform', 'translate(0,' + translateHeight + ')')
            .append('g')
            .attr("class", "y axis")
            .call(yAxis);
        d3.select(selId).append("path") //add path
            .attr("d", valueline(data))
            .style('stroke', color(graphId))
            .on('mouseover', function () {
                d3.select(selId).transition().duration(500).remove();
                //d3.select('#rpm').transition().duration(2000).attr("transform", "translate(0, 0)");
                //svgContainer.transition().duration(2000).attr('height', containerHeight);
            });

        //add graph in collection
        _graphs.push({ id: graphId });
    };


    this.addGraph = function (graph) {
        graph.order = _graphs.length;
        _graphs.push(graph);

        render();
    };

    this.removeGraph = function (graphId) {
        _graphs = _.reject(_graphs, function (g) { return g.id === graphId; });

        render();
    };

    this.reorderGraph = function (graphId, dir) {
        var g = _.findWhere(_graphs, { id: graphId });
        if (dir == 'up') {
            g.order = g.order > 0 ? (g.order - 1) : 0;
            var prv = _.findWhere(_graphs, { order: g.order - 1 });
            if (prv)
                prv.order++;
        }
        else if (dir == 'down') {            
            g.order++;
            var next = _.findWhere(_graphs, { order: g.order });            
            if (next)
                next.order--;
        }

        render();
    };

    return this;
});