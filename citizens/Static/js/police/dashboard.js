document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
    initializeCharts();
    loadRecentCases();
    loadActivities();
    loadDashboardStats();

    const updateStatusBtn = document.getElementById('updateStatusBtn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', updateCaseStatus);
    }

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
        
        // Update pending reviews
        document.getElementById('pendingCount').textContent = stats.pending_reviews.count;
        
        // Update resolved cases
        document.getElementById('resolvedCount').textContent = stats.resolved_cases.count;
        
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
                    <span class="badge bg-${getStatusColor(case_.status)} ${['warning', 'info', 'light'].includes(getStatusColor(case_.status)) ? 'text-dark' : 'text-white'} px-3 py-2 rounded-pill">
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

function getStatusColor(status) {
    return {
        'Active': 'success',
        'Under Investigation': 'info',
        'Pending': 'warning',
        'Pending Review': 'warning',
        'Resolved': 'success',
        'Closed': 'secondary'
    }[status] || 'secondary';
}

function viewCase(tracking_number) {
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


function updateCaseStatus() {
    const reportId = document.getElementById('modalReportID').value;
    const newStatus = document.getElementById('modalNewStatus').value;
    const feedbackElement = document.getElementById('updateStatusFeedback');

    console.log("Update status function called");
    console.log("Report ID:", reportId);
    console.log("New Status:", newStatus);
    
    // Validate input
    if (!newStatus) {
        feedbackElement.innerHTML = '<div class="text-danger">Please select a new status</div>';
        return;
    }
    
    // Show loading state
    const button = document.getElementById('updateStatusBtn');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    
    // Make the API request
    fetch(`/api/update-report-status/${reportId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => {
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        // Update UI with success message
        feedbackElement.innerHTML = '<div class="text-success">Status updated successfully!</div>';
        
        // Update the displayed status
        document.getElementById('modalStatus').value = newStatus;
        
        // If we're on the dashboard, refresh the recent cases list
        loadRecentCases();

        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportDetailModal'));
            if (modal) {
                modal.hide();
            }
        }, 1500);
    })
    .catch(error => {
        console.error('Error updating status:', error);
        feedbackElement.innerHTML = '<div class="text-danger">Failed to update status. Please try again.</div>';
    })
    .finally(() => {
        // Reset button state
        button.disabled = false;
        button.innerHTML = originalText;
    });
}

// Utility function to get CSRF token from cookies
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}