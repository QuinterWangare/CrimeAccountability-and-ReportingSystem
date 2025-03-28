document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
    initializeCharts();
    loadRecentCases();
    loadActivities();
    loadDashboardStats();
    loadTasks();

});

function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip, {
        placement: 'right',
        trigger: 'hover'
    }));
}

// Add this new function
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/police-stats/');
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        const stats = data.stats;
        
        // Update active cases
        document.getElementById('activeCount').textContent = stats.active_cases.count;
        updateTrend('activeTrend', stats.active_cases.trend, stats.active_cases.trend_direction);
        
        // Update pending reviews
        document.getElementById('pendingCount').textContent = stats.pending_reviews.count;
        updateTrend('pendingTrend', stats.pending_reviews.trend, stats.pending_reviews.trend_direction);
        
        // Update resolved cases
        document.getElementById('resolvedCount').textContent = stats.resolved_cases.count;
        updateTrend('resolvedTrend', stats.resolved_cases.trend, stats.resolved_cases.trend_direction);
        
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
        // Show error state in cards
        ['activeCount', 'pendingCount', 'resolvedCount'].forEach(id => {
            document.getElementById(id).textContent = 'N/A';
        });
        
        ['activeTrend', 'pendingTrend', 'resolvedTrend'].forEach(id => {
            document.getElementById(id).innerHTML = '<span class="text-danger">Error loading data</span>';
        });
    }
}

function updateTrend(elementId, trendValue, direction) {
    const trendElement = document.getElementById(elementId);
    trendElement.className = `trend ${direction}`;
    
    const absValue = Math.abs(trendValue);
    const icon = direction === 'up' ? 'fa-arrow-up' : 'fa-arrow-down';
    
    trendElement.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${absValue}% vs last week</span>
    `;
}

function initializeCharts() {
    // Show a loading state
    const chartElement = document.querySelector("#caseAnalyticsChart");
    if (!chartElement) return;
    
    // Fetch data from the server
    fetch('/api/case-analytics/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Prepare the chart options
            const caseAnalyticsOptions = {
                series: [
                    {
                        name: 'New Cases',
                        data: data.new_cases
                    }, 
                    {
                        name: 'Resolved Cases',
                        data: data.resolved_cases
                    }
                ],
                chart: {
                    height: 350,
                    type: 'area',
                    toolbar: {
                        show: false
                    }
                },
                colors: ['#2962ff', '#00c853'],
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.9,
                        stops: [0, 90, 100]
                    }
                },
                dataLabels: {
                    enabled: false
                },
                stroke: {
                    curve: 'smooth',
                    width: 2
                },
                xaxis: {
                    type: 'datetime',
                    categories: data.dates
                },
                tooltip: {
                    x: {
                        format: 'dd/MM/yy'
                    }
                }
            };
            
            // Create and render the chart
            const chart = new ApexCharts(chartElement, caseAnalyticsOptions);
            chart.render();
        })
        .catch(error => {
            console.error('Error loading case analytics:', error);
            chartElement.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load chart data. Please try again later.
                </div>
            `;
        });
}

async function loadRecentCases() {
    const casesList = document.getElementById('recentCases');
    if (!casesList) return;
    
    try {
        // Show loading state
        casesList.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Loading cases...</p></div>';
        
        // Fetch data
        const response = await fetch('/api/recent-reports/');
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle empty reports
        if (data.reports.length === 0) {
            casesList.innerHTML = '<div class="text-center p-3"><p class="text-muted">No recent cases found</p></div>';
            return;
        }
        
       // Render the cases
        casesList.innerHTML = data.reports.map(case_ => `
        <div class="case-item shadow-sm mb-3 rounded">
            <div class="case-info flex-grow-1">
                <div class="case-header d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">
                        <i class="fas fa-folder me-2"></i>${case_.type}
                    </h6>
                    <span class="badge bg-${getStatusColor(case_.status)} text-dark px-3 py-2 rounded-pill">
                        ${case_.status}
                    </span>
                </div>
                <p class="case-id text-secondary mb-1">
                    <strong>ID:</strong> ${case_.tracking_number}
                </p>
                <p class="mb-0 text-muted">
                    <i class="far fa-clock me-1"></i>${case_.date}
                </p>
            </div>
            <div class="case-actions">
                <button class="btn btn-sm rounded-circle" 
                        data-bs-toggle="tooltip" 
                        title="View case details" 
                        onclick="viewCase('${case_.tracking_number}')">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent cases:', error);
        casesList.innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading cases. Please try again later.
            </div>
        `;
    }
}

function loadActivities() {
    const activities = [
        {
            type: 'case_update',
            title: 'Evidence Added',
            description: 'New surveillance footage added to Case #2024-001',
            time: '2 hours ago',
            icon: 'fa-file-upload'
        },
        {
            type: 'case_status',
            title: 'Case Status Updated',
            description: 'Case #2024-002 marked as In Progress',
            time: '4 hours ago',
            icon: 'fa-sync'
        },
        {
            type: 'assignment',
            title: 'New Case Assigned',
            description: 'You have been assigned to Case #2024-003',
            time: '1 day ago',
            icon: 'fa-tasks'
        }
    ];

    const timeline = document.getElementById('activityTimeline');
    if (timeline) {
        timeline.innerHTML = activities.map(activity => `
            <div class="timeline-item">
                <div class="timeline-icon">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h6>${activity.title}</h6>
                    <p>${activity.description}</p>
                    <small class="text-muted">${activity.time}</small>
                </div>
            </div>
        `).join('');
    }
}

function loadTasks() {
    const tasks = [
        {
            id: 1,
            title: 'Review Evidence for Case #2024-001',
            priority: 'high',
            deadline: 'Today'
        },
        {
            id: 2,
            title: 'Submit Report for Case #2024-002',
            priority: 'medium',
            deadline: 'Tomorrow'
        },
        {
            id: 3,
            title: 'Interview Witness',
            priority: 'high',
            deadline: 'Mar 8'
        }
    ];

    const tasksList = document.getElementById('tasksList');
    if (tasksList) {
        tasksList.innerHTML = tasks.map(task => `
            <div class="task-item ${task.priority}">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="task-${task.id}">
                    <label class="form-check-label" for="task-${task.id}">
                        ${task.title}
                    </label>
                </div>
                <div class="task-meta">
                    <span class="badge bg-${getPriorityColor(task.priority)}">${task.priority}</span>
                    <small class="deadline">${task.deadline}</small>
                </div>
            </div>
        `).join('');
    }
}

function getStatusColor(status) {
    return {
        'Active': 'primary',
        'Pending': 'warning',
        'Resolved': 'success'
    }[status] || 'secondary';
}

function getPriorityColor(priority) {
    return {
        'high': 'danger',
        'medium': 'warning',
        'low': 'info'
    }[priority] || 'secondary';
}

function viewCase(tracking_number
    ) {
    fetch(`/report-detail/${tracking_number}/`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("modalReportID").value = data.tracking_number;
            document.getElementById("modalCrimeType").value = data.crime_type;
            document.getElementById("modalLocation").value = data.location;
            document.getElementById("modalDate").value = data.date;
            document.getElementById("modalDescription").value = data.description;
            document.getElementById("modalStatus").value = data.status;

            var reportDetailModal = new bootstrap.Modal(document.getElementById("reportDetailModal"));
            reportDetailModal.show();
        })
        .catch(error => console.error("Error fetching report details:", error));
}