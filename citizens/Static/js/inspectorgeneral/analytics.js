document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Color variables
    const primaryColor = '#34495e';
    const secondaryColor = '#22313f';
    const accentColors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
    
    // Case Trends Chart
    const caseTrendsOptions = {
        series: [{
            name: 'Reported Cases',
            data: [42, 47, 52, 58, 63, 70, 78, 76, 73, 68, 72, 77]
        }, {
            name: 'Resolved Cases',
            data: [35, 41, 36, 45, 58, 59, 64, 60, 66, 53, 59, 60]
        }],
        chart: {
            height: 350,
            type: 'area',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            toolbar: {
                show: false
            }
        },
        colors: [primaryColor, '#3498db'],
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        },
        tooltip: {
            x: {
                format: 'MMM yyyy'
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right'
        }
    };
    const caseTrendsChart = new ApexCharts(document.querySelector('#caseTrendsChart'), caseTrendsOptions);
    caseTrendsChart.render();

    // Case Types Pie Chart
    const caseTypesOptions = {
        series: [42, 26, 15, 8, 9],
        chart: {
            height: 300,
            type: 'donut',
            fontFamily: '"Segoe UI", Arial, sans-serif'
        },
        labels: ['Theft', 'Assault', 'Fraud', 'Robbery', 'Other'],
        colors: accentColors,
        legend: {
            position: 'bottom'
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val.toFixed(1) + "%";
            },
            style: {
                fontSize: '14px',
                fontWeight: 'normal'
            },
            dropShadow: {
                enabled: false
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    background: 'transparent',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                        },
                        value: {
                            show: true,
                            fontSize: '18px',
                            fontWeight: '600',
                            formatter: function(val) {
                                return val;
                            }
                        },
                        total: {
                            show: true,
                            label: 'Total',
                            formatter: function(w) {
                                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                            }
                        }
                    }
                }
            }
        }
    };
    const caseTypesChart = new ApexCharts(document.querySelector('#caseTypesChart'), caseTypesOptions);
    caseTypesChart.render();

    // Resolution Time Chart
    const resolutionTimeOptions = {
        series: [{
            name: 'Resolution Time (Days)',
            data: [32, 27, 18, 45, 22, 16, 35, 28]
        }],
        chart: {
            height: 310,
            type: 'bar',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            toolbar: {
                show: false
            }
        },
        colors: [primaryColor],
        plotOptions: {
            bar: {
                borderRadius: 4,
                dataLabels: {
                    position: 'top',
                },
            }
        },
        dataLabels: {
            enabled: true,
            offsetY: -20,
            style: {
                fontSize: '12px',
                colors: ['#7f8c8d']
            }
        },
        xaxis: {
            categories: ['Theft', 'Assault', 'Fraud', 'Murder', 'Robbery', 'Vandalism', 'Domestic', 'Other'],
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            },
        },
        yaxis: {
            title: {
                text: 'Days',
                style: {
                    color: '#7f8c8d'
                }
            },
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        },
        grid: {
            borderColor: '#e9ecef',
        }
    };
    const resolutionTimeChart = new ApexCharts(document.querySelector('#resolutionTimeChart'), resolutionTimeOptions);
    resolutionTimeChart.render();

    // Officer Performance Chart
    const officerPerformanceOptions = {
        series: [{
            name: 'Cases Resolved',
            data: [28, 22, 19, 27, 25, 17, 18, 21, 15]
        }, {
            name: 'Average Resolution Time (Days)',
            data: [15, 22, 30, 18, 25, 21, 35, 28, 32]
        }],
        chart: {
            type: 'bar',
            height: 310,
            fontFamily: '"Segoe UI", Arial, sans-serif',
            toolbar: {
                show: false
            },
            stacked: false
        },
        colors: ['#3498db', '#e74c3c'],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 2,
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        xaxis: {
            categories: ['Kimani', 'Omondi', 'Wangari', 'Ahmed', 'Njeri', 'Otieno', 'Chege', 'Mwangi', 'Achieng'],
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        },
        yaxis: [{
            title: {
                text: 'Cases Resolved',
                style: {
                    color: '#3498db'
                }
            },
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        }, {
            opposite: true,
            title: {
                text: 'Resolution Time (Days)',
                style: {
                    color: '#e74c3c'
                }
            },
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        }],
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function (val, { seriesIndex }) {
                    if (seriesIndex === 0) {
                        return val + " cases";
                    } else {
                        return val + " days";
                    }
                }
            }
        },
        legend: {
            position: 'top'
        }
    };
    const officerPerformanceChart = new ApexCharts(document.querySelector('#officerPerformanceChart'), officerPerformanceOptions);
    officerPerformanceChart.render();

    // Region Chart
    const regionOptions = {
        series: [{
            data: [42, 38, 27, 22, 19]
        }],
        chart: {
            type: 'bar',
            height: 310,
            fontFamily: '"Segoe UI", Arial, sans-serif',
            toolbar: {
                show: false
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
                distributed: true,
                dataLabels: {
                    position: 'top'
                }
            }
        },
        colors: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'],
        dataLabels: {
            enabled: true,
            offsetX: 28,
            style: {
                fontSize: '14px',
                colors: ['#fff']
            }
        },
        xaxis: {
            categories: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#7f8c8d'
                }
            }
        },
        legend: {
            show: false
        }
    };
    const regionChart = new ApexCharts(document.querySelector('#regionChart'), regionOptions);
    regionChart.render();

    // Priority Chart
    const priorityOptions = {
        series: [45, 35, 20],
        chart: {
            height: 310,
            type: 'radialBar',
            fontFamily: '"Segoe UI", Arial, sans-serif'
        },
        plotOptions: {
            radialBar: {
                dataLabels: {
                    name: {
                        fontSize: '22px',
                    },
                    value: {
                        fontSize: '16px',
                    },
                    total: {
                        show: true,
                        label: 'Total',
                        formatter: function () {
                            return '245';
                        }
                    }
                },
                track: {
                    background: '#f2f2f2'
                }
            }
        },
        colors: ['#e74c3c', '#f39c12', '#3498db'],
        labels: ['High', 'Medium', 'Low'],
        legend: {
            show: true,
            position: 'bottom'
        }
    };
    const priorityChart = new ApexCharts(document.querySelector('#priorityChart'), priorityOptions);
    priorityChart.render();

    // Resolution Rate Gauge Chart
    const resolutionRateOptions = {
        series: [72.5],
        chart: {
            height: 310,
            type: 'radialBar',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            offsetY: -10
        },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                dataLabels: {
                    name: {
                        fontSize: '16px',
                        color: '#7f8c8d',
                        offsetY: 70
                    },
                    value: {
                        offsetY: -10,
                        fontSize: '22px',
                        color: primaryColor,
                        formatter: function (val) {
                            return val + "%";
                        }
                    }
                },
                hollow: {
                    size: '60%'
                },
                track: {
                    background: '#f2f2f2',
                    strokeWidth: '67%',
                    margin: 5
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: 'horizontal',
                shadeIntensity: 0.5,
                gradientToColors: ['#3498db'],
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 1,
                stops: [0, 100]
            }
        },
        stroke: {
            dashArray: 4
        },
        labels: ['Case Resolution Rate'],
    };
    const resolutionRateChart = new ApexCharts(document.querySelector('#resolutionRateChart'), resolutionRateOptions);
    resolutionRateChart.render();
    
    // Handle filter application
    document.getElementById('applyFilters').addEventListener('click', function() {
        // In a real application, you would fetch data based on selected filters
        alert('Filters applied: Data would be refreshed based on selected criteria');
    });
});