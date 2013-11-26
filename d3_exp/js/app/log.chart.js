define(['moment', 'highcharts/highstock', 'highcharts/exporting', 'underscore-min'], function (moment) {

    var _chart, _chartContainer;

    var _newStackTop = 100;
    var _diColors = Highcharts.getOptions().colors;
    var _logColors = Highcharts.getOptions().colors;

    var _initContainerHeight = false;

    var _graphs = [], _gap = 10;//store each graph yAxis ID along with height and top
    /* {graphId:'', expanded:true, type:'log|digital', top:0, height:0, subgraphs:[{yxId:'', top:0, height:0, title:''}] }  */

    function toggleGraph(graphId) {
        var gr = _.findWhere(_graphs, { graphId: graphId });

        if (gr && !gr.collapsed) {
            //hide y-axis and related series
            var yx = _chart.get(graphId);
            yx.update({ labels: { enabled: false }, title: { text: null } });
            yx.series[0].hide(); // all series linked
            var belowGraphs = _.filter(_graphs, function (g) { return g.top > gr.top; });
            //move up below graphs
            _.each(belowGraphs, function (g) {
                g.top -= gr.height;
                _chart.get(g.graphId).update({ top: g.top }, false);
            });
            _chart.redraw();
            removeSpaceFromBelow(gr.height);
            gr.collapsed = true;
        } else if (gr && gr.collapsed) {
            //show y-axis and related series
            yx = _chart.get(graphId);
            yx.update({ labels: { enabled: true }, title: { text: gr.title } });
            yx.series[0].show();
            belowGraphs = _.filter(_graphs, function (g) { return g.top >= gr.top && g.graphId !== gr.graphId; });
            //move down below graphs
            _.each(belowGraphs, function (g) {
                g.top += gr.height;
                _chart.get(g.graphId).update({ top: g.top }, false);
            });
            _chart.redraw();
            addSpaceBelow(gr.height);
            gr.collapsed = false;
        }

        return _.isUndefined(gr);
    }

    this.initRender = function (initOptions) {

        _chartContainer = initOptions.container;
        if (!_initContainerHeight)//set only the first time initRender is called
            _initContainerHeight = $(_chartContainer).height();

        var options = {
            chart: {
                zoomType: 'x',
                marginTop: 100, //avoid overlapping with navigator
                spacingLeft: 0
            },
            plotOptions: {
                series: {
                    //connectNulls: false,
                    dataGrouping: {
                        //smoothed:true,
                        //forced:true,
                        approximation: function (vals) {
                            if (vals.hasNulls) {
                                return null;
                            }
                            else if (vals.length > 0)
                                return _.max(vals);
                            else {
                                return undefined;
                            }
                        }
                    },
                    events: {
                        legendItemClick: function () {
                            return toggleGraph(this.yAxis.userOptions.id);
                        }
                    }
                }
            },
            rangeSelector: { // highstock
                enabled: false
            },
            scrollbar: { // highstock
                enabled: true,
                barBackgroundColor: 'gray',
                barBorderRadius: 7,
                barBorderWidth: 0,
                buttonBackgroundColor: 'gray',
                buttonBorderWidth: 0,
                buttonArrowColor: 'yellow',
                buttonBorderRadius: 7,
                rifleColor: 'yellow',
                trackBackgroundColor: 'white',
                trackBorderWidth: 1,
                trackBorderColor: 'silver',
                trackBorderRadius: 7
            },
            navigator: { // highstock
                top: 40,
                enabled: true
            },
            legend: { // highstock
                enabled: true,
                //align: 'center',
                //verticalAlign: 'top',
                //y: 100,
                labelFormatter: function () {
                    return this.name.split('.')[0];
                }
            },
            title: {
                text: 'Log Data'
            },
            xAxis: {
                type: 'datetime',
                ordinal: false
            },
            credits: {
                enabled: false
            },
            yAxis: [],
            series: []
        };

        var initDataFound = false;
        _.each(initOptions.logSeries, function (seriesOption, i) {
            var color = _logColors[Math.floor(Math.random() * _logColors.length)];
            var l = seriesOption;
            if (l.data && l.data.length > 0) {
                initDataFound = true;
                var yOptions = {
                    id: 'yx' + l.dataId,
                    labels: {
                        format: l.valFormat ? l.valFormat : '{value}',
                        style: {
                            color: l.color ? l.color : color
                        },
                        align: 'right',
                        x: -8
                    },
                    title: {
                        text: l.name,
                        style: {
                            color: l.color ? l.color : color
                        }
                    },
                    lineWidth: 2,
                    lineColor: l.color ? l.color : color,
                    min: 0,
                    offset: 0,
                    opposite: i > 0,
                    showEmpty: false // hide with legend item click
                };
                if (l.minVal)
                    yOptions.min = l.min;
                if (l.maxVal)
                    yOptions.max = l.max;
                options.yAxis.push(yOptions);

                _.each(createLogSeries(l, l.data), function (sr) {
                    options.series.push(sr);
                });
            }
        });


        //init chart
        Highcharts.setOptions({
            global: {
                useUTC: false
            }
        });

        $(_chartContainer).highcharts('StockChart', options);

        _chart = $(_chartContainer).highcharts();

        //update yAxis height as fixed 
        _.each(_.take(_chart.yAxis, _chart.yAxis.length - 1), function (y) {
            y.update({ height: y.height });
        });
        if (initDataFound) {
            _newStackTop = 100 + _chart.yAxis[0].height;
            addSpaceBelow(_gap);// add 20px space below init chart            
        } else {
            _newStackTop = 100;
        }

    };

    function addSpaceBelow(pixels) {
        _newStackTop += pixels;
        $(_chartContainer).height($(_chartContainer).height() + pixels);
        _chart.setSize($(_chartContainer).width(), $(_chartContainer).height(), false);
    }

    function removeSpaceFromBelow(pixels) {
        _newStackTop -= pixels;
        $(_chartContainer).height($(_chartContainer).height() - pixels);
        _chart.setSize($(_chartContainer).width(), $(_chartContainer).height(), true);
    };

    function createLogSeries(options, data) {
        var series = [];
        _.each(options.yVal, function (prop, propIndx) {
            var sr = {
                name: options.name,
                yAxis: 'yx' + options.dataId
            };
            if (options.color)
                sr.color = options.color;
            else if (options.colors) {
                sr.color = options.colors[propIndx];
            }
            else {
                sr.color = _logColors[Math.floor(Math.random() * _logColors.length)];
            }
            if (propIndx > 0)
                sr.linkedTo = ':previous';
            if (options.yVal.length > 1)
                sr.name = options.name + '.' + prop;
            //setup series point mouseover event if any
            if (options.events && options.events.SeriesPointMouseOver) {
                sr.point = {
                    events: {
                        mouseOver: options.events.SeriesPointMouseOver
                    }
                };
            }
            if (options.decimalPrecision) {
                sr.tooltip = {
                    valueDecimals: options.decimalPrecision
                };
            }

            sr.data = _.map(data, function (d) { return [moment(d.DateTime).valueOf(), d[prop]]; });
            //sr.data = _.map(data, function (d) { return { x: moment(d.DateTime).valueOf(), y: d[prop] }; });
            //console.log(sr.data);

            series.push(sr);
        });

        return series;
    }

    //public methods

    this.addLogGraph = function (options, data) {
        var dataId = options.dataId;

        if (data && data.length > 0) {
            var color = _logColors[Math.floor(Math.random() * _logColors.length)];
            var yxId = 'yx' + dataId;
            var yOptions = {
                id: yxId, // for attaching series data
                labels: {
                    format: options.valFormat ? options.valFormat : '{value}',
                    style: {
                        color: options.color ? options.color : color
                    }
                },
                title: {
                    text: options.name,
                    style: {
                        color: options.color ? options.color : color
                    }
                },
                lineWidth: 2,
                lineColor: options.color ? options.color : color,
                min: options.minVal ? options.minVal : null,
                max: options.maxVal ? options.maxVal : null,
                offset: 0,
                showEmpty: false // hide with legend item click
            };
            //resize chart for new stack
            if (options.newStack && _chart.yAxis.length > 0) {
                yOptions.top = _newStackTop;
                var height = _chart.yAxis[0].height < 50 ? 100 : _chart.yAxis[0].height;// set a minimum height in case first yAxis has no data with height 40
                yOptions.height = height;
                _newStackTop += height;

                $(_chartContainer).height($(_chartContainer).height() + height);
                _chart.setSize($(_chartContainer).width(), $(_chartContainer).height(), false);
                addSpaceBelow(_gap); // add a space below for next graph starting

                //append graph in collection                
                _graphs.push({ graphId: yxId, top: yOptions.top, height: yOptions.height, title: yOptions.title.text });
            }

            _chart.addAxis(yOptions, false, false);
            _.each(createLogSeries(options, data), function (sr) {
                //sr.toolTip = { valueDecimals: 3 };
                _chart.addSeries(sr, false, false);
            });

            _chart.redraw();
        }
    };

    this.addDigitalInputGraph = function (options, data) {
        if (data && data.length > 0) { // if there is any data

            var yxId = options.graphId;
            var color = options.color ? options.color : _diColors[_chart.yAxis.length % _diColors.length];
            //create series from data
            var channelIndx = 0;
            var series = [];
            _.chain(data).groupBy('Channel').each(function (seriesData, diChannel) {
                var dt = [];
                var pointLabels = []; //manually storing labels as highcharts not giving options for points when crossing turboThreshold

                seriesData = _.sortBy(seriesData, function (t) { return moment(t.DateTime).valueOf(); });

                //prepare data for step / gantte chart
                if (options.step) {
                    //for step graph 
                    dt = _.map(seriesData, function (d) {
                        if (d.State && d.Label)
                            pointLabels.push({ x: moment(d.DateTime).valueOf(), y: channelIndx + 0.4, label: d.Label });

                        return { x: moment(d.DateTime).valueOf(), y: (d.State ? (channelIndx + 0.4) : (channelIndx - 0.4)) };
                    });
                } else {
                    //for gant chart
                    for (var i = 0; i < seriesData.length - 1; i++) {
                        var start = seriesData[i], stop = seriesData[i + 1];
                        if (start.State) {
                            dt.push(
                                { x: moment(start.DateTime).valueOf(), y: channelIndx },
                                { x: moment(stop.DateTime).valueOf(), y: channelIndx }
                            );
                            if (start.Label) {
                                pointLabels.push({ x: moment(start.DateTime).valueOf(), y: channelIndx, label: start.Label });
                            }

                        }
                        else {
                            //put a null value
                            dt.push([(moment(start.DateTime).valueOf() + moment(stop.DateTime).valueOf()) / 2, null]);
                        }
                    }
                }

                channelIndx++;
                var item = {
                    name: options.name + '.' + diChannel, data: dt, yAxis: yxId, yVal: channelIndx - 1,
                    lineWidth: options.step ? 1 : 9,
                    step: options.step,
                    shadow: true,
                    marker: { enabled: options.step, radius: 2 },
                    dataLabels: {
                        enabled: true,
                        padding: 5,
                        shadow: true,
                        borderRadius: 5,
                        backgroundColor: 'rgba(252, 255, 197, 0.7)',
                        borderWidth: 1,
                        borderColor: '#AAA',
                        y: -6,
                        formatter: function () {
                            if (pointLabels.length > 0) {
                                var thisX = this.x, thisY = this.y;
                                var lbl = _.find(pointLabels, function (p) { return p.y == thisY && p.x >= thisX; });
                            }
                            return lbl ? lbl.label : null;
                        }
                    }
                };
                //setup series point mouseover event if any
                if (options.events && options.events.SeriesPointMouseOver) {
                    item.point = {
                        events: {
                            mouseOver: options.events.SeriesPointMouseOver
                        }
                    };
                }
                if (dt.length > 0)
                    series.push(item);
            });


            _.each(series, function (sr, i) { if (i > 0) sr.linkedTo = ':previous'; });
            //console.log(series);

            //adjust chart height
            var top = _newStackTop + 10;
            var height = series.length * 30;
            if (height < 50) // make a minimum height
                height = 70;
            //add y-axis
            var yOptions = {
                id: yxId,
                tickInterval: 1,
                top: top,
                height: height,
                offset: 0,
                lineWidth: 2,
                lineColor: color,
                labels: {
                    formatter: function () {
                        var sr = _.findWhere(series, { yVal: this.value });
                        return sr ? sr.name.split('.')[1] : '';
                    }
                },
                title: {
                    text: options.name,
                    style: {
                        color: color
                    },
                },
                minPadding: 0.2,
                maxPadding: 0.2,
                startOnTick: false,
                endOnTick: false,
                showEmpty: false // hide with legend item click
            };
            //remove previous axis if update
            addSpaceBelow(height + _gap);
            if (series.length > 0) {
                _chart.addAxis(yOptions, false, false);
                _.each(series, function (sr) {
                    _chart.addSeries(sr, false, false);
                });
                //_chart.redraw();
            }

            //append graph in collection            
            _graphs.push({ graphId: yxId, top: yOptions.top, height: yOptions.height, title: yOptions.title.text });

            //we can turnoff chart redraw with options, specially when adding many axis with a loop
            if (_.isUndefined(options.redraw) || options.redraw)
                _chart.redraw();
        }
    };

    this.redraw = function () {
        _chart.redraw();
    };

    this.reset = function () {
        if (_chart) {
            _chart.destroy();
            $(_chartContainer).height(_initContainerHeight);
            _newStackTop = 100;
        }
    };






    //deprecated code
    this.addDigitalStepGraph = function (options, data, updateExisting) {

        if (data && data.length > 0) { // if there is any data
            var yxId = options.dataId;
            var color = options.color ? options.color : _diColors[_chart.yAxis.length % _diColors.length];
            //adjust chart height
            var top = _newStackTop + 10;
            //add y-axis with step series
            var yOptions = {
                id: yxId,
                top: top,
                //gridLineWidth: 1,
                offset: 0,
                height: 20,
                labels: {
                    enabled: true,
                    align: 'left',
                    x: 0,
                    y: -1
                },
                title: {
                    text: options.name,
                    style: {
                        color: color
                    },
                    //align: 'low',
                    rotation: 0,
                    //y: -10
                    //offset: 50
                    x: -50
                },
                startOnTick: false,
                endOnTick: false,
                maxPadding: 0,
                minPadding: 0,
                min: 0,
                max: 1
            };
            if (updateExisting) {
                var subgraph = _.findWhere(subgraphs(), { yxId: yxId });
                _chart.get(yxId).remove();
                yOptions.top = subgraph.top;
            } else {
                addSpaceBelow(30);
            }

            _chart.addAxis(yOptions, false, false);
            var seriesData = _.map(data, function (d) { return [moment(d.DateTime).valueOf(), d.State ? 1 : 0]; });
            var showInLegend = _.isUndefined(options.showInLegend) ? true : options.showInLegend;
            var sr = { name: options.name, data: seriesData, step: true, yAxis: yxId, color: color, showInLegend: showInLegend, shadow: true, id: 'sr' + yxId };
            sr.marker = { enabled: true, radius: 2 };
            //point mouse over event if any
            if (options.events && options.events.SeriesPointMouseOver) {
                sr.point = {
                    events: {
                        mouseOver: options.events.SeriesPointMouseOver
                    }
                };
            }
            //toggle event from step to line
            sr.events = {
                click: function () {
                    options.color = color;
                    addDigitalLineGraph(options, data, true);
                    _chart.redraw();
                }
            };

            //add flags based on exceptions
            if (yxId.toString().indexOf('exc_') == 0) {
                var flagSr = { type: 'flags', color: color, shape: 'circlepin', width: 16, data: [], showInLegend: false, shadow: true };
                flagSr.data = _.map(data, function (d) { return { x: moment(d.DateTime).valueOf(), title: 'E', text: options.name + ' ' + (d.State ? 'Start' : 'End') }; });
                if (options.name.indexOf('Speed') >= 0) {
                    flagSr.onSeries = 'sr512Value';
                    _chart.addSeries(flagSr, false, false);
                }
                else if (options.name.indexOf('Rpm') >= 0) {
                    flagSr.onSeries = 'sr513Value';
                    _chart.addSeries(flagSr, false, false);
                }

                //console.log(flagSr);
            }

            _chart.addSeries(sr, false, false);


            //append graph in collection
            if (!updateExisting)
                addGraph(options.dataId, yxId, yOptions.top, 30, yOptions.title.text);


            //we can turnoff chart redraw with options, specially when adding many axis with a loop
            if (_.isUndefined(options.redraw) || options.redraw) {
                _chart.redraw();
            }

        }

    };

    this.addDigitalLineGraph = function (options, data, updateExisting) {

        if (data && data.length > 0) { // if there is any data
            var yxId = options.dataId;
            var color = options.color ? options.color : _diColors[_chart.yAxis.length % _diColors.length];
            //create stack series from data
            var stack = createDigitalInputSingleSeriesForLine(data, yxId, options.name, color, options.showInLegend);

            //add y-axis if there is at least one switch on(state=true)
            if (stack.length > 0) {
                //adjust chart height
                var top = _newStackTop + 10;
                //add y-axis
                var yOptions = {
                    id: yxId,
                    gridLineWidth: 0,
                    top: top,
                    offset: 0,
                    height: 20,
                    labels: {
                        enabled: false
                    },
                    title: {
                        text: options.name,
                        style: {
                            color: color
                        },
                        //align: 'middle',
                        rotation: 0,
                        //y: -10
                        //offset: 50
                        x: -50
                    },
                    showEmpty: false // hide with legend item click
                };
                //remove previous axis if update
                if (updateExisting) {
                    var subgraph = _.findWhere(subgraphs(), { yxId: yxId });
                    _chart.get(yxId).remove();
                    yOptions.top = subgraph.top;
                } else {
                    addSpaceBelow(30);
                }


                _chart.addAxis(yOptions, false, false);
                _.each(stack, function (sr) {
                    //toggle event from step to line
                    sr.events = {
                        click: function () {
                            options.color = color;
                            addDigitalStepGraph(options, data, true);
                            _chart.redraw();
                        }
                    };
                    _chart.addSeries(sr, false, false);
                });


                //append graph in collection
                if (!updateExisting)
                    addGraph(options.dataId, yxId, yOptions.top, yOptions.height, yOptions.title.text);


                //we can turnoff chart redraw with options, specially when adding many axis with a loop
                if (_.isUndefined(options.redraw) || options.redraw)
                    _chart.redraw();
            }
        }
    };


    function createDigitalInputSeriesForLine(data, yAxisId, inputTitle, color, showInLegend) {
        var series = [];
        for (var i = 0; i < data.length - 1; i++) {
            var start = data[i];
            var end = data[i + 1];
            if (start.State) {
                var s = {
                    yAxis: yAxisId,
                    animation: false,
                    stack: 0,
                    data: [
                        { x: moment(start.DateTime).valueOf(), y: 1, name: 'start' },
                        { x: moment(end.DateTime).valueOf(), y: 1, name: 'stop' }
                    ],
                    color: color,
                    lineWidth: 10,
                    marker: {
                        enabled: false
                    },
                    showInLegend: _.isUndefined(showInLegend) ? true : showInLegend,
                    name: inputTitle
                    //tooltip: {
                    //    pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.name}</b><br/>'
                    //}
                };
                if (i > 0)
                    s.linkedTo = ':previous';

                series.push(s);
            }
        }
        return series;
    }

    function createDigitalInputSingleSeriesForLine(data, yAxisId, inputTitle, color, showInLegend) {
        var series = [];
        var seriesData = [];
        _.each(data, function (d, i) {
            seriesData.push([moment(d.DateTime).valueOf(), 1]);
            if (i < (data.length - 1) && !d.State)
                seriesData.push([moment(d.DateTime).add('s', 2).valueOf(), null]);
        });

        series.push({
            yAxis: yAxisId,
            animation: false,
            //stack: 0,
            data: seriesData,
            color: color,
            lineWidth: 10,
            //marker: {
            //    enabled: false
            //},
            showInLegend: _.isUndefined(showInLegend) ? true : showInLegend,
            name: inputTitle
        });

        return series;
    }


    return this;
});