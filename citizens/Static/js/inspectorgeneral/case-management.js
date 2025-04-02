document.addEventListener('DOMContentLoaded', function() {
    // Global variables for pagination and filtering
    let currentPage = 1;
    const casesPerPage = 10;

    // Filter Elements
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const searchInput = document.getElementById('caseSearch');
    const resetButton = document.getElementById('resetFilters');

    // Attach event listeners to filters
    if (statusFilter) statusFilter.addEventListener('change', () => loadCases(1));
    if (typeFilter) typeFilter.addEventListener('change', () => loadCases(1));
    if (startDateFilter) startDateFilter.addEventListener('change', () => loadCases(1));
    if (endDateFilter) endDateFilter.addEventListener('change', () => loadCases(1));
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') loadCases(1);
        });
    }
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (statusFilter) statusFilter.value = 'all';
            if (typeFilter) typeFilter.value = 'all';
            if (startDateFilter) startDateFilter.value = '';
            if (endDateFilter) endDateFilter.value = '';
            if (searchInput) searchInput.value = '';
            loadCases(1);
        });
    }

    // Load cases initially
    loadCases(currentPage);

    // Load cases from the IG API endpoint
    async function loadCases(page = 1) {
        currentPage = page;
        const tableBody = document.getElementById('caseTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2">Loading cases...</p>
                </td>
            </tr>
        `;

        let url = '/api/ig-cases/';
        const params = new URLSearchParams();
        if (statusFilter && statusFilter.value !== 'all') params.append('status', statusFilter.value);
        if (typeFilter && typeFilter.value !== 'all') params.append('type', typeFilter.value);
        if (startDateFilter && startDateFilter.value) params.append('start_date', startDateFilter.value);
        if (endDateFilter && endDateFilter.value) params.append('end_date', endDateFilter.value);
        if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
        params.append('page', currentPage);
        params.append('per_page', casesPerPage);
        url += '?' + params.toString();

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            const data = await response.json();

            if (!data.cases || data.cases.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4">
                            <div class="alert alert-info mb-0">
                                <i class="fas fa-info-circle me-2"></i>
                                No cases found matching your criteria
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = data.cases.map(caseData => `
                    <tr>
                        <td>${caseData.case_id}</td>
                        <td>${caseData.case_type}</td>
                        <td>${caseData.location}</td>
                        <td>${formatDate(caseData.reported_on)}</td>
                        <td>${caseData.assigned_officer || 'Unassigned'}</td>
                        <td><span class="badge ${getStatusBadgeClass(caseData.status)}">${caseData.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-link" onclick="viewCase('${caseData.case_id}')">View</button>
                            ${caseData.status.toLowerCase() === 'unassigned' ? 
                                `<button class="btn btn-sm btn-primary" onclick="openAssignModal('${caseData.case_id}')">Assign</button>` : ''
                            }
                        </td>
                    </tr>
                `).join('');
            }
            updatePagination(data.pagination);
        } catch (error) {
            console.error('Error loading cases:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Error loading cases. Please try again later.
                            <br>
                            <small class="text-muted">${error.message}</small>
                        </div>
                    </td>
                </tr>
            `;
            updatePagination(null);
        }
    }

    // Update pagination controls
    function updatePagination(pagination) {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        if (!pagination || pagination.total_pages <= 1) return;

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        prevLink.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) loadCases(currentPage - 1);
        });
        prevLi.appendChild(prevLink);
        paginationContainer.appendChild(prevLi);

        for (let i = 1; i <= pagination.total_pages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.addEventListener('click', e => {
                e.preventDefault();
                loadCases(i);
            });
            li.appendChild(a);
            paginationContainer.appendChild(li);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === pagination.total_pages ? 'disabled' : ''}`;
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        nextLink.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < pagination.total_pages) loadCases(currentPage + 1);
        });
        nextLi.appendChild(nextLink);
        paginationContainer.appendChild(nextLi);
    }

    // viewCase function with inline assignment and no edit button or cancel button.
    window.viewCase = function(caseId) {
        const viewModal = document.getElementById('viewCaseModal');
        const modalBody = viewModal && viewModal.querySelector('.modal-body');
        if (!viewModal || !modalBody) {
            console.error("Modal elements not found");
            return;
        }
        modalBody.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-3">Loading case details...</p>
            </div>
        `;
        let bsModal;
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            bsModal = new bootstrap.Modal(viewModal);
            bsModal.show();
        } else {
            viewModal.classList.add('show');
            viewModal.style.display = 'block';
            document.body.classList.add('modal-open');
        }
        fetch(`/api/ig-cases/${caseId}/`)
            .then(response => {
                if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
                return response.json();
            })
            .then(caseData => {
                const statusClass = getStatusBadgeClass(caseData.status);
                let assignSection = '';
                if (!caseData.assigned_officer || 
                    (typeof caseData.assigned_officer === 'string' && caseData.assigned_officer.trim().toLowerCase() === 'unassigned')) {
                    assignSection = `
                        <hr>
                        <div id="assignContainer">
                            <h6 class="fw-bold">Assign Case</h6>
                            <div class="mb-3">
                                <label for="inlineOfficerSelect" class="form-label">Officer</label>
                                <select id="inlineOfficerSelect" class="form-select">
                                    <option value="" selected disabled>Select an officer</option>
                                </select>
                            </div>
                            <div class="mb-3 d-flex justify-content-end">
                                <button id="inlineAssignBtn" class="btn btn-primary">Assign Case</button>
                            </div>
                            <div id="inlineFeedback"></div>
                        </div>
                    `;
                }
                modalBody.innerHTML = `
                    <div class="case-details">
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-2">Case Information</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td class="fw-bold">Case ID:</td>
                                        <td>${caseData.case_id}</td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">Type:</td>
                                        <td>${caseData.case_type}</td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">Status:</td>
                                        <td><span class="badge ${statusClass}">${caseData.status}</span></td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">Reported On:</td>
                                        <td>${formatDate(caseData.reported_on)}</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6 class="fw-bold mb-2">Location Information</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td class="fw-bold">Location:</td>
                                        <td>${caseData.location}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div class="row mb-4">
                            <div class="col-12">
                                <h6 class="fw-bold mb-2">Case Description</h6>
                                <div class="card">
                                    <div class="card-body bg-light">
                                        <p class="mb-0">${caseData.description || 'No description available.'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${assignSection}
                    </div>
                `;
                if (assignSection) {
                    const officerSelect = document.getElementById('inlineOfficerSelect');
                    const assignBtn = document.getElementById('inlineAssignBtn');
                    const feedbackEl = document.getElementById('inlineFeedback');
                    fetch('/api/ig-available-officers/')
                        .then(response => {
                            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            data.officers.forEach(officer => {
                                const option = document.createElement('option');
                                option.value = officer.id;
                                option.textContent = `${officer.name} (${officer.badge_number}) - ${officer.specialization}`;
                                officerSelect.appendChild(option);
                            });
                        })
                        .catch(error => {
                            console.error('Error loading officers:', error);
                            officerSelect.innerHTML = '<option value="" selected disabled>Error loading officers</option>';
                        });
                    assignBtn.onclick = function() {
                        const selectedOfficerId = officerSelect.value;
                        if (!selectedOfficerId) {
                            if (feedbackEl) {
                                feedbackEl.innerHTML = `
                                    <div class="alert alert-warning py-2 px-3 mb-0 small">
                                        <i class="fas fa-exclamation-triangle me-1"></i>
                                        Please select an officer
                                    </div>
                                `;
                            }
                            return;
                        }
                        assignBtn.disabled = true;
                        assignBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Assigning...';
                        fetch('/api/ig-assign-case/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken()
                            },
                            body: JSON.stringify({
                                case_id: caseId,
                                officer_id: selectedOfficerId,
                            })
                        })
                        .then(response => {
                            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                if (feedbackEl) {
                                    feedbackEl.innerHTML = `
                                        <div class="alert alert-success py-2 px-3 mb-0 small">
                                            <i class="fas fa-check-circle me-1"></i>
                                            ${data.message || 'Case successfully assigned'}
                                        </div>
                                    `;
                                }
                                setTimeout(() => {
                                    bsModal && bsModal.hide();
                                    loadCases(currentPage);
                                }, 1500);
                            } else {
                                throw new Error(data.message || 'Failed to assign case');
                            }
                        })
                        .catch(error => {
                            console.error('Error assigning case:', error);
                            if (feedbackEl) {
                                feedbackEl.innerHTML = `
                                    <div class="alert alert-danger py-2 px-3 mb-0 small">
                                        <i class="fas fa-times-circle me-1"></i>
                                        ${error.message || 'Failed to assign case. Please try again.'}
                                    </div>
                                `;
                            }
                            assignBtn.disabled = false;
                            assignBtn.innerHTML = 'Assign Case';
                        });
                    };
                }
            })
            .catch(error => {
                console.error('Error loading case details:', error);
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Unable to load case details. Please try again later.
                        <br><small class="text-muted">${error.message}</small>
                    </div>
                `;
            });
    };

    // Helper: Get CSRF token from cookies
    function getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') return value;
        }
        return '';
    }

    // Helper: Format date string into locale date
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString();
    }

    // Helper: Return Bootstrap badge class based on case status
    function getStatusBadgeClass(status) {
        switch (status.toLowerCase()){
            case 'active': return 'bg-success';
            case 'resolved': return 'bg-success';
            case 'pending': return 'bg-warning text-dark'; 
            case 'closed': return 'bg-dark';
            case 'unassigned': return 'bg-info';
            default: return 'bg-info';
        }
    }
});