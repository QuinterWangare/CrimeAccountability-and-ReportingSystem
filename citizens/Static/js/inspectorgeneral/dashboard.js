document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    initializeDashboard();
});

//Initialize all dashboard components and load data
function initializeDashboard() {
    // Fetch and display recent cases
    fetchRecentCases();
    
    // Load officer data for assignment modal
    fetchAvailableOfficers();

}

// Fetch recent cases for the dashboard table
async function fetchRecentCases() {
    try {
        // Get the table body element
        const tableBody = document.querySelector('.recent-assignments table tbody');
        if (!tableBody) return;
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted">
                        <div class="spinner-border text-primary mb-2"></div>
                        <p>Loading cases...</p>
                    </div>
                </td>
            </tr>
        `;
        
        // Fetch data from API
        const response = await fetch('/api/police-cases/?page=1&per_page=5');
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // If no cases found or empty result, show empty state
        if (!data.cases || data.cases.length === 0) {
            showErrorState('cases', 'No cases available');
            return;
        }
        
        // Render the cases table
        renderCasesTable(data.cases);
        
    } catch (error) {
        console.error('Error fetching recent cases:', error);
        showErrorState('cases');
    }
}

//Render the cases table with fetched data
function renderCasesTable(cases) {
    const tableBody = document.querySelector('.recent-assignments table tbody');
    if (!tableBody) return;
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Check if there are cases to display
    if (!cases || cases.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-folder-open mb-2 d-block" style="font-size: 2rem; opacity: 0.3;"></i>
                        <p>No cases found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Render each case as a table row
    cases.forEach(caseItem => {
        // Create a new row
        const row = document.createElement('tr');
        
        // Determine status badge class based on case status
        let badgeClass = 'bg-secondary';
        if (caseItem.status === 'Pending') badgeClass = 'bg-warning text-dark';
        if (caseItem.status === 'Active') badgeClass = 'bg-success';
        if (caseItem.status === 'Resolved') badgeClass = 'bg-success';
        
        // Fill the row with case data
        row.innerHTML = `
            <td>${caseItem.case_id}</td>
            <td>${caseItem.case_type}</td>
            <td>${caseItem.location}</td>
            <td>${caseItem.assigned_officer}</td>
            <td><span class="badge ${badgeClass}">${caseItem.status}</span></td>
            <td>
                <button class="btn btn-sm btn-link view-case-btn" data-case-id="${caseItem.case_id}" onclick="viewCase('${caseItem.case_id}')">
                    View
                </button>
            </td>
        `;
        
        // Add row to table
        tableBody.appendChild(row);
    });
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
            document.getElementById('reportDetailModal').addEventListener('show.bs.modal', fetchAvailableOfficers);

            var reportDetailModal = new bootstrap.Modal(document.getElementById("reportDetailModal"));
            reportDetailModal.show();
        })
        .catch(error => console.error("Error fetching report details:", error));
}

//Fetch available officers for case assignment
async function fetchAvailableOfficers() {
    try {
        // Fetch officer data from the API
        const response = await fetch('/api/available-officers/');
        if (!response.ok) {
            throw new Error(`Failed to fetch officers. Status: ${response.status}`);
        }

        const officers = await response.json();

        // Populate the officer dropdown in the modal
        populateOfficerDropdown(officers);
    } catch (error) {
        console.error('Error fetching officers:', error);

        // Show default placeholder in the officer dropdown
        const select = document.getElementById('modalAssignedOfficer');
        if (select) {
            select.innerHTML = `
                <option selected disabled>Error loading officers</option>
                <option>Refresh to try again</option>
            `;
        }
    }
}


//Populate the officer selection dropdown
function populateOfficerDropdown(officers) {
    const select = document.getElementById('modalAssignedOfficer');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '<option selected disabled>Choose officer...</option>';

    // Add each officer as an option
    officers.forEach(officer => {
        const option = document.createElement('option');
        option.value = officer.id; // Use the officer's unique ID
        option.textContent = `${officer.name} (${officer.badge}) - ${officer.specialization}`;
        select.appendChild(option);
    });
}

//Handle the assignment of a case to an officer from the modal
async function handleOfficerAssignment() {
    // Get form elements from the modal
    const caseId = document.getElementById('modalReportID').value; 
    const officerId = document.getElementById('modalAssignedOfficer').value;

    // Validate the form inputs
    if (!officerId) {
        showNotification('Please select an officer to assign the case.', 'danger');
        return;
    }

    // Show loading state on the assign button
    const assignButton = document.getElementById('assignOfficerBtn');
    const originalButtonText = assignButton.innerHTML;
    assignButton.disabled = true;
    assignButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Assigning...';

    try {
        // Make an API call to assign the case
        const response = await fetch('/api/assign-case/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                case_id: caseId,
                officer_id: officerId
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to assign case. Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Check if the assignment was successful
        if (data.success) {
            showNotification(`Case ${caseId} successfully assigned to Officer ${data.officer_name}.`, 'success');

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reportDetailModal'));
            if (modal) {
                modal.hide();
            }

            // Refresh the recent cases table to reflect the new assignment
            fetchRecentCases();
        } else {
            throw new Error(data.message || 'Failed to assign case.');
        }
    } catch (error) {
        console.error('Error assigning case:', error);
        showNotification('Error assigning case. Please try again.', 'danger');
    } finally {
        // Reset the assign button state
        assignButton.disabled = false;
        assignButton.innerHTML = originalButtonText;
    }
}


//Show notification at top of page
function showNotification(message, type = 'info') {
    try {
        // Create or get notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:350px;';
            document.body.appendChild(container);
        }

        // Create notification element with Bootstrap 5 classes
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center shadow-sm`;
        notification.setAttribute('role', 'alert');
        
        // Ensure the notification is visible initially
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(20px)';
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        // Set icon based on type
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'exclamation-circle',
            info: 'info-circle'
        };

        // Create notification content with proper Bootstrap 5 structure
        notification.innerHTML = `
            <div class="d-flex w-100 align-items-center">
                <i class="fas fa-${icons[type] || 'info-circle'} me-2"></i>
                <div>${message}</div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Add to container
        container.prepend(notification);
        
        // Force reflow to enable transitions
        notification.offsetHeight;
        
        // Make notification visible with animation
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';

        // Initialize Bootstrap alert
        const bsAlert = new bootstrap.Alert(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            
            // Remove from DOM after transition
            setTimeout(() => {
                try {
                    bsAlert.dispose();
                    notification.remove();
                } catch (e) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
        
        // Log that notification was created
        console.log('Notification shown:', message);

    } catch (error) {
        console.error('Error showing notification:', error, error.stack);
        
        // Fallback alert if the notification system fails
        alert(`${type.toUpperCase()}: ${message}`);
    }
}



//Show error state when data can't be loaded
function showErrorState(section) {
    if (section === 'statistics') {
        // Update statistics cards to show error state
        document.querySelectorAll('.overview-card .card-content h3').forEach(card => {
            card.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i>';
        });
    } else if (section === 'cases') {
        // Show error in cases table
        const tableBody = document.querySelector('.recent-assignments table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="text-danger">
                            <i class="fas fa-exclamation-triangle mb-2 d-block" style="font-size: 2rem;"></i>
                            <p>Could not load case data</p>
                            <button class="btn btn-sm btn-outline-primary mt-2" onclick="fetchRecentCases()">
                                Try Again
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
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
