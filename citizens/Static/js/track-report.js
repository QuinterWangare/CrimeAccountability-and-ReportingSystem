document.addEventListener('DOMContentLoaded', function() {
    const trackForm = document.querySelector('.track-report-form');
    const resultsContainer = document.getElementById('results-container');
    
    // Add event listener to the form
    if (trackForm) {
        trackForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const reportId = document.getElementById('report_id').value.trim();
            if (!reportId) {
                showMessage('Please enter a valid Report ID.', 'danger');
                return;
            }

            // Show loading indicator
            showLoading();
            
            // Get CSRF token
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            fetch('/track-report/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    report_id: reportId
                })
            })
            .then(response => {
                if (response.status === 404) {
                    return response.json().then(data => {
                        throw new Error(data.error || 'Report not found');
                    });
                }
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                hideLoading();
                if (data.error) {
                    showMessage(data.error, 'danger');
                } else {
                    displayReportDetails(data.report);
                }
            })
            .catch(error => {
                hideLoading();
                showMessage(error.message || 'An error occurred while tracking your report. Please try again later.', 'danger');
                console.error('Error:', error);
            });
        });
    }
    
    // Function to show loading indicator
    function showLoading() {
        if (!resultsContainer) return;
        
        clearResults();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'text-center mt-4 loading-indicator';
        loadingDiv.style.padding = '30px';
        loadingDiv.style.margin = '20px auto';
        loadingDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        loadingDiv.style.borderRadius = '8px';
        loadingDiv.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        
        loadingDiv.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 fw-bold">Tracking your report...</p>
        `;
        
        resultsContainer.appendChild(loadingDiv);
    }
    
    // Function to hide loading indicator
    function hideLoading() {
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
    
    // Function to clear results
    function clearResults() {
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }
    
    // Function to show message
    function showMessage(message, type) {
        clearResults();
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} mt-4`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `<i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>${message}`;
        
        resultsContainer.appendChild(alertDiv);
    }
    
    // Function to display report details
    function displayReportDetails(report) {
        clearResults();
        
        const statusDiv = document.createElement('div');
        statusDiv.className = 'report-status mt-5';
        
        // Format dates
        const submittedDate = new Date(report.submission_date).toLocaleDateString('en-KE', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        const updatedDate = new Date(report.last_updated).toLocaleDateString('en-KE', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        // Create status badge class
        let statusBadgeClass = '';
        switch(report.status.toLowerCase()) {
            case 'pending': statusBadgeClass = 'bg-warning text-dark'; break;
            case 'active': case 'in progress': statusBadgeClass = 'bg-primary'; break;
            case 'under investigation': statusBadgeClass = 'bg-info'; break;
            case 'resolved': case 'closed': statusBadgeClass = 'bg-success'; break;
            case 'rejected': statusBadgeClass = 'bg-danger'; break;
            default: statusBadgeClass = 'bg-secondary';
        }
        
        // Calculate progress percentage based on status
        let progressPercentage = 0;
        switch(report.status.toLowerCase()) {
            case 'pending': progressPercentage = 25; break;
            case 'active': case 'in progress': progressPercentage = 50; break;
            case 'under investigation': progressPercentage = 75; break;
            case 'resolved': case 'closed': progressPercentage = 100; break;
            default: progressPercentage = 10;
        }
        
        // Create HTML for report status
        statusDiv.innerHTML = `
            <div class="card report-card">
                <div class="card-header">
                    <h3 class="mb-0">Report Status</h3>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="report-field"><strong>Report ID:</strong> ${report.id}</p>
                            <p class="report-field"><strong>Submitted On:</strong> ${submittedDate}</p>
                            <p class="report-field"><strong>Last Updated:</strong> ${updatedDate}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="report-field"><strong>Status:</strong> <span class="badge ${statusBadgeClass}">${report.status}</span></p>
                            <p class="report-field"><strong>Assigned to:</strong> ${report.assigned_to || 'Pending assignment'}</p>
                            <p class="report-field"><strong>Police Station:</strong> ${report.police_station || 'Not yet assigned'}</p>
                        </div>
                    </div>
                    
                    <div class="progress-container mt-4">
                        <label class="form-label">Case Progress</label>
                        <div class="progress" style="height: 25px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                role="progressbar" 
                                style="width: ${progressPercentage}%" 
                                aria-valuenow="${progressPercentage}" 
                                aria-valuemin="0" 
                                aria-valuemax="100">
                                ${report.status}
                            </div>
                        </div>
                    </div>
                    
                    <div class="report-details mt-4">
                        <h5>Report Details</h5>
                        <p>${report.details}</p>
                    </div>
                    
                    ${report.updates && report.updates.length > 0 ? generateUpdatesHTML(report.updates) : ''}
                </div>
                <div class="card-footer">
                    <small class="text-muted">For assistance, please call our hotline: 0800-CARS-HELP</small>
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(statusDiv);
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Function to generate HTML for updates
    function generateUpdatesHTML(updates) {
        let html = `
            <div class="case-updates mt-4">
                <h5>Case Updates</h5>
                <div class="timeline">
        `;
        
        updates.forEach(update => {
            const updateDate = new Date(update.timestamp).toLocaleDateString('en-KE', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            
            html += `
                <div class="timeline-item">
                    <div class="timeline-point"></div>
                    <div class="timeline-content">
                        <h6>${update.title}</h6>
                        <p>${update.description}</p>
                        <small class="text-muted">
                            <span class="update-time">${updateDate}</span>
                            ${update.officer ? `<span class="update-officer">by ${update.officer}</span>` : ''}
                        </small>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    // Clear results on page refresh/load
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            clearResults();
        }
    });
});