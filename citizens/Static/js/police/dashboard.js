document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
    initializeCharts();
    loadRecentCases();
    loadActivities();
    loadTasks();

});

function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip, {
        placement: 'right',
        trigger: 'hover'
    }));
}

function initializeCharts() {
    const caseAnalyticsOptions = {
        series: [{
            name: 'New Cases',
            data: [31, 40, 28, 51, 42, 109, 100]
        }, {
            name: 'Resolved Cases',
            data: [11, 32, 45, 32, 34, 52, 41]
        }],
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
            categories: ["2024-03-01", "2024-03-02", "2024-03-03", "2024-03-04", 
                        "2024-03-05", "2024-03-06", "2024-03-07"]
        },
        tooltip: {
            x: {
                format: 'dd/MM/yy'
            }
        }
    };

    const chart = new ApexCharts(document.querySelector("#caseAnalyticsChart"), caseAnalyticsOptions);
    chart.render();
}

function loadRecentCases() {
    const cases = [
        {
            id: 'CAS-2024-001',
            title: 'Theft at Downtown Mall',
            status: 'active',
            priority: 'high',
            timestamp: '2 hours ago'
        },
        {
            id: 'CAS-2024-002',
            title: 'Vandalism Report',
            status: 'pending',
            priority: 'medium',
            timestamp: '5 hours ago'
        },
        {
            id: 'CAS-2024-003',
            title: 'Traffic Incident',
            status: 'resolved',
            priority: 'low',
            timestamp: '1 day ago'
        }
    ];

    const casesList = document.getElementById('recentCases');
    if (casesList) {
        casesList.innerHTML = cases.map(case_ => `
            <div class="case-item">
                <div class="case-info">
                    <div class="case-header">
                        <h6>${case_.title}</h6>
                        <span class="badge bg-${getStatusColor(case_.status)}">${case_.status}</span>
                    </div>
                    <p class="case-id">${case_.id}</p>
                    <small class="text-muted">${case_.timestamp}</small>
                </div>
                <button class="btn btn-sm btn-light" onclick="viewCase('${case_.id}')">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `).join('');
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
        'active': 'primary',
        'pending': 'warning',
        'resolved': 'success'
    }[status] || 'secondary';
}

function getPriorityColor(priority) {
    return {
        'high': 'danger',
        'medium': 'warning',
        'low': 'info'
    }[priority] || 'secondary';
}

function viewCase(caseId) {
    console.log(`Viewing case: ${caseId}`);
    // Implement case view navigation
}