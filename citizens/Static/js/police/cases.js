// Pagination settings
let currentPage = 1;
let totalPages = 1;
let casesPerPage = 10; // Show 10 cases per page
let totalCases = 0;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });
    
    // Load cases when page loads
    loadCases();
    
    // Handle case filter changes
    const statusFilter = document.getElementById('caseStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            loadCases(this.value, document.getElementById('caseSearch')?.value.trim() || '', 1);
        });
    }
    
    // Handle search
    const searchInput = document.getElementById('caseSearch');
    const searchButton = document.querySelector('.input-group button');
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = searchInput.value.trim();
            loadCases(statusFilter ? statusFilter.value : '', searchTerm, 1);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.trim();
                loadCases(statusFilter ? statusFilter.value : '', searchTerm, 1);
            }
        });
    }
    
    // Handle case creation
    const createCaseBtn = document.getElementById('createCaseBtn');
    if (createCaseBtn) {
        createCaseBtn.addEventListener('click', createNewCase);
    }
});

// Load cases from API with pagination
async function loadCases(statusFilter = '', searchTerm = '', page = 1) {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;
    
    // Update current page
    currentPage = page;
    
    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Loading cases...</p>
            </td>
        </tr>
    `;
    
    try {
        // Construct the API URL with filters and pagination
        let url = '/api/police-cases/';
        const params = new URLSearchParams();
        
        if (statusFilter) {
            params.append('status', statusFilter);
        }
        
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        
        // Add pagination parameters
        params.append('page', page);
        params.append('per_page', casesPerPage);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        // Fetch cases from API
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update pagination variables
        totalCases = data.pagination?.total_items || 0;
        totalPages = data.pagination?.total_pages || 1;
        
        if (!data.cases || !data.cases.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>
                            No cases found matching your criteria
                        </div>
                    </td>
                </tr>
            `;
            
            // Update pagination display
            updatePagination(0);
            return;
        }
        
        // Render cases
        tableBody.innerHTML = data.cases.map(caseData => `
            <tr>
                <td>${caseData.case_id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div>
                            <strong>${caseData.description}</strong>
                            <div class="small text-muted">${caseData.case_type}</div>
                        </div>
                    </div>
                </td>
                <td>${formatDate(caseData.date)}</td>
                <td><span class="badge ${getStatusBadgeClass(caseData.status)}">${caseData.status}</span></td>
                <td>${caseData.assigned_officer || 'Unassigned'}</td>
                <td>
                    <button class="btn btn-sm btn-primary view-case-btn" 
                            data-id="${caseData.case_id}"
                            data-bs-toggle="modal" 
                            data-bs-target="#viewCaseModal">
                        <i class="fas fa-eye me-1"></i>View
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Attach event listeners to view buttons
        attachViewButtons();
        
        // Update pagination UI
        updatePagination(totalPages);
        
    } catch (error) {
        console.error('Error loading cases:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="alert alert-danger mb-0">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error loading cases. Please try again later.
                    </div>
                </td>
            </tr>
        `;
        
        // Reset pagination
        updatePagination(0);
    }
}

// Update pagination controls
function updatePagination(totalPages) {
    // Find the table container
    const tableContainer = document.querySelector('.table').closest('.card-body');
    if (!tableContainer) return;
    
    // Remove existing pagination if any
    const existingPagination = tableContainer.querySelector('.cases-pagination');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    // If no pages, don't add pagination
    if (totalPages <= 0) {
        return;
    }
    
    // Create pagination container
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'cases-pagination d-flex justify-content-between align-items-center pt-3 border-top mt-3';
    
    // Calculate pagination info text
    const startItem = (currentPage - 1) * casesPerPage + 1;
    const endItem = Math.min(startItem + casesPerPage - 1, totalCases);
    
    // Create pagination HTML
    paginationContainer.innerHTML = `
        <div class="text-muted small">
            Showing ${startItem}-${endItem} of ${totalCases} cases
        </div>
        <div class="pagination d-flex align-items-center">
            <button class="btn btn-sm btn-outline-secondary ${currentPage === 1 ? 'disabled' : ''}" id="prevPageBtn">
                <i class="fas fa-chevron-left"></i>
            </button>
            
            <div class="mx-2">
                ${getPaginationButtons(totalPages)}
            </div>
            
            <button class="btn btn-sm btn-outline-secondary ${currentPage === totalPages ? 'disabled' : ''}" id="nextPageBtn">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    // Append to table container
    tableContainer.appendChild(paginationContainer);
    
    // Add event listeners to pagination buttons
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (prevPageBtn && currentPage > 1) {
        prevPageBtn.addEventListener('click', () => {
            const statusFilter = document.getElementById('caseStatusFilter')?.value || '';
            const searchTerm = document.getElementById('caseSearch')?.value.trim() || '';
            loadCases(statusFilter, searchTerm, currentPage - 1);
        });
    }
    
    if (nextPageBtn && currentPage < totalPages) {
        nextPageBtn.addEventListener('click', () => {
            const statusFilter = document.getElementById('caseStatusFilter')?.value || '';
            const searchTerm = document.getElementById('caseSearch')?.value.trim() || '';
            loadCases(statusFilter, searchTerm, currentPage + 1);
        });
    }
    
    // Add event listeners to page number buttons
    document.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', function() {
            const pageNum = parseInt(this.getAttribute('data-page'));
            const statusFilter = document.getElementById('caseStatusFilter')?.value || '';
            const searchTerm = document.getElementById('caseSearch')?.value.trim() || '';
            loadCases(statusFilter, searchTerm, pageNum);
        });
    });
}

// Generate the pagination number buttons HTML
function getPaginationButtons(totalPages) {
    // If only a few pages, show all
    if (totalPages <= 5) {
        let buttons = '';
        for (let i = 1; i <= totalPages; i++) {
            buttons += `
                <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'} mx-1 page-btn" 
                        data-page="${i}">${i}</button>
            `;
        }
        return buttons;
    }
    
    // For many pages, show current page, 2 before and 2 after when possible
    let buttons = '';
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // First page
    if (startPage > 1) {
        buttons += `
            <button class="btn btn-sm btn-outline-secondary mx-1 page-btn" data-page="1">1</button>
        `;
        
        if (startPage > 2) {
            buttons += `<span class="mx-1">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        buttons += `
            <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-secondary'} mx-1 page-btn" 
                    data-page="${i}">${i}</button>
        `;
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons += `<span class="mx-1">...</span>`;
        }
        
        buttons += `
            <button class="btn btn-sm btn-outline-secondary mx-1 page-btn" 
                    data-page="${totalPages}">${totalPages}</button>
        `;
    }
    
    return buttons;
}

// Attach event listeners to view buttons
function attachViewButtons() {
    document.querySelectorAll('.view-case-btn').forEach(button => {
        button.addEventListener('click', function() {
            const caseId = this.getAttribute('data-id');
            viewCase(caseId);
        });
    });
}

// View case details
async function viewCase(caseId) {
    try {
        // Show loading state in modal
        const modalBody = document.querySelector('#viewCaseModal .modal-body');
        modalBody.innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border text-primary" role="status"></div>
            </div>
        `;
        
        const response = await fetch(`/api/police-cases/${caseId}/`);
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const caseData = await response.json();
        
        // Reconstruct modal content
        modalBody.innerHTML = `
            <div class="case-header mb-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4>${caseData.title || caseData.case_type}</h4>
                </div>
                <div class="d-flex justify-content-between">
                    <div>
                        <span class="badge ${getStatusBadgeClass(caseData.status)} me-2">${caseData.status}</span>
                        <span class="text-muted">Case ID: ${caseData.case_id}</span>
                    </div>
                    <div>
                        <span class="text-muted">Reported: ${formatDate(caseData.date)}</span>
                    </div>
                </div>
            </div>

            <div class="case-info mb-4">
                <h5>Case Information</h5>
                <div class="card">
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-4 text-muted">Case Type:</div>
                            <div class="col-md-8">${caseData.case_type}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4 text-muted">Location:</div>
                            <div class="col-md-8">${caseData.location || 'N/A'}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-4 text-muted">Assigned Officer:</div>
                            <div class="col-md-8">${caseData.assigned_officer || 'Unassigned'}</div>
                        </div>
                        <div class="row">
                            <div class="col-md-4 text-muted">Description:</div>
                            <div class="col-md-8">${caseData.description}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="case-evidence mb-4">
                <h5>Evidence</h5>
                <div class="card">
                    <div class="card-body">
                        ${getEvidenceHTML(caseData.evidence)}
                    </div>
                </div>
            </div>

            <div class="case-timeline">
                <h5>Case Timeline</h5>
                <div class="card">
                    <div class="card-body">
                        <ul class="timeline">
                            ${getTimelineHTML(caseData.timeline, caseData.date)}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading case details:', error);
        // Show error in modal
        const modalBody = document.querySelector('#viewCaseModal .modal-body');
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading case details. Please try again later.
            </div>
        `;
    }
}

// Create new case
async function createNewCase() {
    const title = document.getElementById('caseTitle').value;
    const type = document.getElementById('caseType').value;
    const description = document.getElementById('caseDescription').value;
    
    // Validate form
    if (!title || !type || !description) {
        alert('Please fill out all required fields');
        return;
    }
    
    try {
        // Create form data for file uploads
        const formData = new FormData();
        formData.append('title', title);
        formData.append('case_type', type);
        formData.append('description', description);
        
        // Handle file uploads
        const fileInput = document.getElementById('evidenceFiles');
        if (fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('evidence_files', fileInput.files[i]);
            }
        }
        
        // Submit the form
        const response = await fetch('/api/police-cases/', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Close modal and show success message
        const modal = bootstrap.Modal.getInstance(document.getElementById('newCaseModal'));
        modal.hide();
        
        // Show success alert
        const alertHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                Case created successfully with ID: ${result.case_id}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        const container = document.querySelector('.dashboard-grid');
        container.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Reload cases - go back to first page
        loadCases('', '', 1);
        
        // Reset form
        document.getElementById('newCaseForm').reset();
        
    } catch (error) {
        console.error('Error creating case:', error);
        alert('Error creating case. Please try again later.');
    }
}

// Helper functions
function getEvidenceHTML(evidence) {
    if (!evidence || evidence.length === 0) {
        return '<p class="text-muted">No evidence attached to this case.</p>';
    }
    
    return evidence.map(item => `
        <div class="evidence-item mb-2">
            <i class="fas ${getEvidenceTypeIcon(item.type)} me-2"></i>
            <a href="${item.url || '#'}">${item.name}</a>
        </div>
    `).join('');
}

function getTimelineHTML(timeline, caseDate) {
    if (!timeline || timeline.length === 0) {
        return `
            <li class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <h6 class="mb-0">Case Created</h6>
                    <small class="text-muted">${formatDate(caseDate)} - ${formatTime(caseDate)}</small>
                    <p>Case was created and entered into the system.</p>
                </div>
            </li>
        `;
    }
    
    return timeline.map(item => `
        <li class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <h6 class="mb-0">${item.title}</h6>
                <small class="text-muted">${formatDate(item.date)} - ${formatTime(item.date)}</small>
                <p>${item.description}</p>
            </div>
        </li>
    `).join('');
}

function getStatusBadgeClass(status) {
    const classes = {
        'Open': 'bg-success',
        'Pending': 'bg-warning text-dark',
        'In Progress': 'bg-info',
        'Closed': 'bg-secondary',
        'Resolved': 'bg-primary'
    };
    
    return classes[status] || 'bg-secondary';
}

function getEvidenceTypeIcon(type) {
    const icons = {
        'image': 'fa-image',
        'video': 'fa-video',
        'document': 'fa-file-alt',
        'audio': 'fa-volume-up'
    };
    
    return icons[type] || 'fa-file';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}