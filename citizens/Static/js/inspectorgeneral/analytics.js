document.addEventListener('DOMContentLoaded', function() {
    // Helper function to safely parse JSON data
    function safeParseJSON(elementId, defaultValue = []) {
        try {
            const element = document.getElementById(elementId);
            if (element && element.textContent) {
                return JSON.parse(element.textContent);
            }
            return defaultValue;
        } catch (error) {
            console.error(`Error parsing JSON for ${elementId}:`, error);
            return defaultValue;
        }
    }

    // CHART 1: Case Trends Chart
    async function initCaseTrendsChart() {
        try {
            const response = await fetch('/api/case-analytics/');
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = await response.json();
            
            const trendLabels = data.dates;           
            const reportedData = data.new_cases;        
            const resolvedData = data.resolved_cases; async function initCaseTrendsChart() {
                try {
                    const response = await fetch('/api/case-analytics/');
                    if (!response.ok) {
                        throw new Error(`HTTP error ${response.status}`);
                    }
                    const data = await response.json();

                    const trendLabels = data.dates;           // Labels for x-axis) - dates
                    const reportedData = data.new_cases;        // Cases reported per day
                    const resolvedData = data.resolved_cases;   // Cases resolved per day
            
                    const caseTrendsOptions = {
                        series: [
                            {
                                name: 'Cases Reported',
                                data: reportedData
                            },
                            {
                                name: 'Cases Resolved',
                                data: resolvedData
                            }
                        ],
                        chart: {
                            height: 350,
                            type: 'area',
                            toolbar: {
                                show: false
                            }
                        },
                        dataLabels: {
                            enabled: false
                        },
                        stroke: {
                            curve: 'smooth',
                            width: 2
                        },
                        colors: ['#4361ee', '#2cc692'],
                        fill: {
                            type: 'gradient',
                            gradient: {
                                shadeIntensity: 1,
                                opacityFrom: 0.7,
                                opacityTo: 0.3,
                                stops: [0, 90, 100]
                            }
                        },
                        xaxis: {
                            categories: trendLabels,
                            labels: {
                                style: {
                                    fontSize: '12px'
                                }
                            }
                        },
                        yaxis: {
                            title: {
                                text: 'Number of Cases'
                            }
                        },
                        tooltip: {
                            shared: true,
                            intersect: false,
                            y: {
                                formatter: function (value) {
                                    return value + " cases";
                                }
                            }
                        },
                        legend: {
                            position: 'top'
                        }
                    };
            
                    // Initialize the chart if the container exists
                    const caseTrendsEl = document.getElementById('caseTrendsChart');
                    if (caseTrendsEl) {
                        const caseTrendsChart = new ApexCharts(caseTrendsEl, caseTrendsOptions);
                        caseTrendsChart.render();
                    }
                } catch (error) {
                    console.error('Error initializing Case Trends Chart:', error);
                }
            }
    
            const caseTrendsOptions = {
                series: [
                    {
                        name: 'Cases Reported',
                        data: reportedData
                    },
                    {
                        name: 'Cases Resolved',
                        data: resolvedData
                    }
                ],
                chart: {
                    height: 350,
                    type: 'area',
                    toolbar: {
                        show: false
                    }
                },
                dataLabels: {
                    enabled: false
                },
                stroke: {
                    curve: 'smooth',
                    width: 2
                },
                colors: ['#4361ee', '#2cc692'],
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.3,
                        stops: [0, 90, 100]
                    }
                },
                xaxis: {
                    categories: trendLabels,
                    labels: {
                        style: {
                            fontSize: '12px'
                        }
                    }
                },
                yaxis: {
                    title: {
                        text: 'Number of Cases'
                    }
                },
                tooltip: {
                    shared: true,
                    intersect: false,
                    y: {
                        formatter: function (value) {
                            return value + " cases";
                        }
                    }
                },
                legend: {
                    position: 'top'
                }
            };
    
            // Initialize the chart if the container exists
            const caseTrendsEl = document.getElementById('caseTrendsChart');
            if (caseTrendsEl) {
                const caseTrendsChart = new ApexCharts(caseTrendsEl, caseTrendsOptions);
                caseTrendsChart.render();
            }
        } catch (error) {
            console.error('Error initializing Case Trends Chart:', error);
        }
    }
    
    // CHART 2: Case Types Chart (Pie)
    function initCaseTypesChart() {
        const typeLabels = safeParseJSON('type-labels');
        const typeValues = safeParseJSON('type-values');
        
        const caseTypesOptions = {
            series: typeValues,
            chart: {
                type: 'pie',
                height: 350,
                toolbar: { show: false }
            },
            labels: typeLabels,
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            legend: {
                position: 'bottom'
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 300
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };
        
        const caseTypesEl = document.getElementById('caseTypesChart');
        if (caseTypesEl) {
            const caseTypesChart = new ApexCharts(caseTypesEl, caseTypesOptions);
            caseTypesChart.render();
        }
    }
    
    // CHART 3: Officer Performance Chart
    function initOfficerPerformanceChart() {
        const officerLabels = safeParseJSON('officer-labels');
        const officerAssigned = safeParseJSON('officer-assigned');
        const officerResolved = safeParseJSON('officer-resolved');
        
        const officerPerformanceOptions = {
            series: [{
                name: 'Assigned Cases',
                data: officerAssigned
            }, {
                name: 'Resolved Cases',
                data: officerResolved
            }],
            chart: {
                type: 'bar',
                height: 350,
                stacked: false,
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    borderRadius: 4
                }
            },
            xaxis: {
                categories: officerLabels
            },
            colors: ['#3b82f6', '#10b981'],
            legend: {
                position: 'top'
            }
        };
        
        const officerPerformanceEl = document.getElementById('officerPerformanceChart');
        if (officerPerformanceEl) {
            const officerPerformanceChart = new ApexCharts(officerPerformanceEl, officerPerformanceOptions);
            officerPerformanceChart.render();
        }
    }
    
    // CHART 4: Region Chart
    function initRegionChart() {
        const regionLabels = safeParseJSON('region-labels');
        const regionValues = safeParseJSON('region-values');
        
        const regionChartOptions = {
            series: [{
                name: 'Cases',
                data: regionValues
            }],
            chart: {
                type: 'bar',
                height: 350,
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: true
                }
            },
            xaxis: {
                categories: regionLabels
            },
            colors: ['#8b5cf6']
        };
        
        const regionChartEl = document.getElementById('regionChart');
        if (regionChartEl) {
            const regionChart = new ApexCharts(regionChartEl, regionChartOptions);
            regionChart.render();
        }
    }
    
    // Initialize all charts
    try {
        initCaseTrendsChart();
        initCaseTypesChart();
        initOfficerPerformanceChart();
        initRegionChart();
    } catch (error) {
        console.error("Error initializing charts:", error);
    }
});