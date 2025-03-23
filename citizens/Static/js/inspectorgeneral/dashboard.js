document.addEventListener('DOMContentLoaded', function() {
    // Initialize the dashboard
    initializeDashboard();
    
    // Set up event listeners
    setupEventHandlers();
});

/**
 * Initialize all dashboard components and load data
 */
function initializeDashboard() {
    // Fetch and display recent cases
    fetchRecentCases();
    
    // Load officer data for assignment modal
    fetchAvailableOfficers();
}

/**
 * Set up all event handlers for interactive elements
 */
function setupEventHandlers() {
    // Assign case button in modal
    const assignButton = document.querySelector('#assignCaseModal .btn-primary');
    if (assignButton) {
        assignButton.addEventListener('click', handleCaseAssignment);
    }
    
    // Generate new case ID when modal is opened
    const modal = document.getElementById('assignCaseModal');
    if (modal) {
        modal.addEventListener('show.bs.modal', function() {
            generateCaseId();
        });
    }
    
    // Add global handler for view case buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-case-btn') || 
            e.target.parentElement.classList.contains('view-case-btn')) {
            const button = e.target.classList.contains('view-case-btn') ? 
                e.target : e.target.parentElement;
            const caseId = button.getAttribute('data-case-id');
            viewCaseDetails(caseId);
        }
    });
}

/**
 * Fetch recent cases for the dashboard table
 */
async function fetchRecentCases() {
    try {
        // Show loading state
        const tableBody = document.querySelector('.recent-assignments table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-3">
                        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        Loading recent cases...
                    </td>
                </tr>
            `;
        }
        
        // In a real app, fetch from API 
        // const response = await fetch('api/recent-reports/');
        // const data = await response.json();
        
        // This would be real case data from your database
        const cases = [
            {
                id: 'CR-2025-8342',
                type: 'Armed Robbery',
                location: 'Karen, Nairobi',
                officer: 'Capt. James Maina',
                status: 'active',
                priority: 'high',
                dateAssigned: '2025-03-18T09:23:45Z',
                victimCount: 2
            },
            {
                id: 'CR-2025-7291',
                type: 'Domestic Violence',
                location: 'Westlands, Nairobi',
                officer: 'Lt. Sarah Kamau',
                status: 'pending',
                priority: 'high',
                dateAssigned: '2025-03-17T14:08:22Z',
                victimCount: 1
            },
            {
                id: 'CR-2025-6104',
                type: 'Fraud',
                location: 'CBD, Nairobi',
                officer: 'Sgt. Michael Odhiambo',
                status: 'active',
                priority: 'medium',
                dateAssigned: '2025-03-15T11:45:10Z',
                victimCount: 12
            },
            {
                id: 'CR-2025-5922',
                type: 'Car Theft',
                location: 'Kilimani, Nairobi',
                officer: 'Col. Diana Wanjiku',
                status: 'resolved',
                priority: 'medium',
                dateAssigned: '2025-03-12T08:30:00Z',
                victimCount: 1
            },
            {
                id: 'CR-2025-5201',
                type: 'Cybercrime',
                location: 'Kenyatta University',
                officer: 'Lt. Paul Njoroge',
                status: 'resolved',
                priority: 'low',
                dateAssigned: '2025-03-10T16:22:33Z',
                victimCount: 45
            }
        ];
        
        // Render cases in the table
        renderCasesTable(cases);
        
    } catch (error) {
        console.error('Error fetching recent cases:', error);
        showErrorState('cases');
    }
}

/**
 * Render the cases table with fetched data
 */
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
        if (caseItem.status === 'pending') badgeClass = 'bg-warning';
        if (caseItem.status === 'active') badgeClass = 'bg-primary';
        if (caseItem.status === 'resolved') badgeClass = 'bg-success';
        
        // Format the status text (capitalize first letter)
        const statusText = caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1);
        
        // Format date
        const date = new Date(caseItem.dateAssigned);
        const formattedDate = date.toLocaleDateString('en-KE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Fill the row with case data
        row.innerHTML = `
            <td>#${caseItem.id}</td>
            <td>${caseItem.type}</td>
            <td>${caseItem.location}</td>
            <td>${caseItem.officer}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td>
                <button class="btn btn-sm btn-link view-case-btn" data-case-id="${caseItem.id}">
                    View
                </button>
            </td>
        `;
        
        // Add row to table
        tableBody.appendChild(row);
    });
}

/**
 * Fetch available officers for case assignment
 */
async function fetchAvailableOfficers() {
    try {
        // In a real app, you'd fetch from an API
        // const response = await fetch('/api/director/available-officers');
        // const officers = await response.json();
        
        // This would be real officer data from your database
        const officers = [
            { id: 'OFF-1001', name: 'Capt. James Maina', badge: 'KPS-1234', specialization: 'Violent Crime', available: true },
            { id: 'OFF-1002', name: 'Lt. Sarah Kamau', badge: 'KPS-5678', specialization: 'Domestic Violence', available: true },
            { id: 'OFF-1003', name: 'Sgt. Michael Odhiambo', badge: 'KPS-9012', specialization: 'Financial Crime', available: true },
            { id: 'OFF-1004', name: 'Col. Diana Wanjiku', badge: 'KPS-3456', specialization: 'Auto Theft', available: true },
            { id: 'OFF-1005', name: 'Lt. Paul Njoroge', badge: 'KPS-7890', specialization: 'Cybercrime', available: true },
            { id: 'OFF-1006', name: 'Sgt. Lucy Nyambura', badge: 'KPS-2345', specialization: 'Narcotics', available: false },
            { id: 'OFF-1007', name: 'Maj. David Kamau', badge: 'KPS-6789', specialization: 'Homicide', available: true }
        ];
        
        // Populate officer dropdown in assignment modal
        populateOfficerDropdown(officers);
        
    } catch (error) {
        console.error('Error fetching officers:', error);
        // Show default placeholder in officer dropdown
        const select = document.querySelector('#assignCaseForm select:first-of-type');
        if (select) {
            select.innerHTML = `
                <option selected disabled>Error loading officers</option>
                <option>Refresh to try again</option>
            `;
        }
    }
}

/**
 * Populate the officer selection dropdown
 */
function populateOfficerDropdown(officers) {
    const select = document.querySelector('#assignCaseForm select:first-of-type');
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '<option selected disabled>Choose officer...</option>';
    
    // Filter to only available officers
    const availableOfficers = officers.filter(officer => officer.available);
    
    // Add each officer as an option
    availableOfficers.forEach(officer => {
        const option = document.createElement('option');
        option.value = officer.id;
        option.textContent = `${officer.name} (${officer.badge}) - ${officer.specialization}`;
        select.appendChild(option);
    });
}

/**
 * Generate a realistic case ID for new assignment
 */
function generateCaseId() {
    const caseIdInput = document.querySelector('#assignCaseForm input[readonly]');
    if (!caseIdInput) return;
    
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    caseIdInput.value = `#CR-${year}-${randomNum}`;
}

/**
 * Handle the assignment of a new case
 */
function handleCaseAssignment() {
    // Get form elements
    const form = document.getElementById('assignCaseForm');
    const caseId = form.querySelector('input[readonly]').value;
    const officerSelect = form.querySelector('select:first-of-type');
    const prioritySelect = form.querySelector('select:nth-of-type(2)');
    const notesTextarea = form.querySelector('textarea');
    
    // Basic validation
    if (officerSelect.selectedIndex === 0) {
        showFormError('Please select an officer for this case');
        officerSelect.focus();
        return;
    }
    
    // Get selected values
    const officerId = officerSelect.value;
    const officerName = officerSelect.options[officerSelect.selectedIndex].text;
    const priority = prioritySelect.value;
    const notes = notesTextarea.value;
    
    // In a real app, you would send data to your API
    // const response = await fetch('/api/director/assign-case', {
    //    method: 'POST',
    //    headers: { 'Content-Type': 'application/json' },
    //    body: JSON.stringify({
    //        caseId: caseId.replace('#', ''),
    //        officerId,
    //        priority,
    //        notes,
    //        assignedBy: 'current-user-id',
    //        assignedDate: new Date().toISOString()
    //    })
    // });
    
    // For demo, simulate success
    console.log('Assigning case:', {
        caseId: caseId.replace('#', ''),
        officerId,
        officerName,
        priority,
        notes
    });
    
    // Show loading state on button
    const assignButton = document.querySelector('#assignCaseModal .btn-primary');
    const originalButtonText = assignButton.innerHTML;
    assignButton.disabled = true;
    assignButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Assigning...';
    
    // Simulate API delay
    setTimeout(() => {
        // Reset button
        assignButton.disabled = false;
        assignButton.innerHTML = originalButtonText;
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('assignCaseModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show success notification
        showNotification(`Case ${caseId} assigned to ${officerName.split('(')[0].trim()}`, 'success');
        
        // Refresh case list to show the new assignment
        fetchRecentCases();
    }, 1500);
}

/**
 * View case details
 */
function viewCaseDetails(caseId) {
    // In a real app, this would navigate to a case details page
    showNotification(`Opening case #${caseId}`, 'info');
    
    // In a real app, you would use:
    // window.location.href = `case-details.html?id=${caseId}`;
    
    // For demo, just log that we're viewing this case
    console.log('Viewing case details for:', caseId);
}

/**
 * Show form validation error
 */
function showFormError(message) {
    // Create error alert if doesn't exist
    let errorAlert = document.querySelector('.modal-form-error');
    
    if (!errorAlert) {
        errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger modal-form-error mb-3';
        
        // Insert at top of form
        const form = document.getElementById('assignCaseForm');
        form.insertBefore(errorAlert, form.firstChild);
    }
    
    // Set error message
    errorAlert.textContent = message;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (errorAlert.parentNode) {
            errorAlert.parentNode.removeChild(errorAlert);
        }
    }, 3000);
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Choose icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'error') icon = 'times-circle';
    
    // Set notification content
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <p>${message}</p>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add close button event listener
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.classList.add('notification-hiding');
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('notification-hiding');
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

/**
 * Show error state when data can't be loaded
 */
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


