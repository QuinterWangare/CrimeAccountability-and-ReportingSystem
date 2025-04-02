document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentPage = 1;
    const officersPerPage = 10;
    let allOfficers = [];
    
    // Initialize the page
    loadDashboardStats();
    loadOfficers();
    
    // Event listeners for search and filter
    document.getElementById('searchButton').addEventListener('click', () => {
        filterAndDisplayOfficers();
    });
    
    document.getElementById('officerSearch').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterAndDisplayOfficers();
        }
    });
    
    document.getElementById('departmentFilter').addEventListener('change', () => {
        filterAndDisplayOfficers();
    });
    
    // Add officer form submission
    document.getElementById('submitAddOfficer').addEventListener('click', () => {
        addNewOfficer();
    });
    
    // Confirm officer removal
    document.getElementById('confirmRemoveOfficer').addEventListener('click', () => {
        const officerId = document.getElementById('officerToRemove').value;
        removeOfficer(officerId);
    });
    
    // Load dashboard stats and charts
    async function loadDashboardStats() {
        try {
            const response = await fetch('/api/ig-officer-stats/');
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            
            const data = await response.json();
            
            // Update officer counts
            document.getElementById('totalOfficers').textContent = data.total_officers || 0;
            document.getElementById('activeOfficers').textContent = data.active_officers || 0;
            document.getElementById('inactiveOfficers').textContent = data.inactive_officers || 0;
            
            // Update case assignment stats
            document.getElementById('assignedCases').textContent = data.assigned_cases || 0;
            document.getElementById('unassignedCases').textContent = data.unassigned_cases || 0;
            document.getElementById('averageCaseload').textContent = data.average_caseload || '0';
            
            // Generate department distribution chart
            if (data.department_distribution) {
                generateDepartmentChart(data.department_distribution);
            }
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Show error message in stats sections
            document.querySelectorAll('.stats-grid .stat-item h3').forEach(el => {
                el.innerHTML = '<i class="fas fa-exclamation-circle text-danger"></i>';
            });
        }
    }
    
    // Generate department distribution chart using ApexCharts
    function generateDepartmentChart(departmentData) {
        const labels = [];
        const values = [];
        
        for (const [dept, count] of Object.entries(departmentData)) {
            labels.push(dept);
            values.push(count);
        }
        
        const options = {
            series: values,
            chart: {
                height: 300,
                type: 'donut',
                fontFamily: '"Segoe UI", Arial, sans-serif'
            },
            labels: labels,
            colors: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'],
            legend: {
                position: 'bottom'
            },
            dataLabels: {
                enabled: false
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '60%',
                        background: 'transparent',
                        labels: {
                            show: false,
                            name: {
                                show: false,
                            },
                            value: {
                                show: false
                            },
                            total: {
                                show: false
                            }
                        }
                    }
                }
            }
        };
        
        const chart = new ApexCharts(document.getElementById('departmentChart'), options);
        chart.render();
    }
    // Load officers from API
    async function loadOfficers() {
        const tableBody = document.getElementById('officerTableBody');
        
        try {
            const response = await fetch('/api/ig-officers/');
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            
            const data = await response.json();
            allOfficers = data.officers;
            
            // Display officers and update pagination
            displayOfficers(allOfficers, currentPage);
            updatePagination(allOfficers.length);
            
        } catch (error) {
            console.error('Error loading officers:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Unable to load officers. Please try again later.
                            <br><small class="text-muted">${error.message}</small>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    // Filter and display officers
    function filterAndDisplayOfficers() {
        const searchTerm = document.getElementById('officerSearch').value.toLowerCase();
        const departmentFilter = document.getElementById('departmentFilter').value;
        
        let filteredOfficers = allOfficers;
        
        // Apply department filter
        if (departmentFilter && departmentFilter !== 'all') {
            filteredOfficers = filteredOfficers.filter(officer => 
                officer.specialization === departmentFilter
            );
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredOfficers = filteredOfficers.filter(officer => 
                officer.name.toLowerCase().includes(searchTerm) ||
                officer.badge_number.toLowerCase().includes(searchTerm) ||
                (officer.specialization && officer.specialization.toLowerCase().includes(searchTerm))
            );
        }
        
        // Reset to first page and display results
        currentPage = 1;
        displayOfficers(filteredOfficers, currentPage);
        updatePagination(filteredOfficers.length);
    }
    
    // Display officers in the table
    function displayOfficers(officers, page) {
        const tableBody = document.getElementById('officerTableBody');
        const startIndex = (page - 1) * officersPerPage;
        const endIndex = Math.min(startIndex + officersPerPage, officers.length);
        const pageOfficers = officers.slice(startIndex, endIndex);
        
        if (pageOfficers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="alert alert-info mb-0">
                            <i class="fas fa-info-circle me-2"></i>
                            No officers found matching your criteria
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = pageOfficers.map(officer => `
            <tr>
                <td>${officer.badge_number}</td>
                <td>${officer.name}</td>
                <td>${officer.specialization}</td>
                <td>${officer.cases_assigned}</td>
                <td>
                    <span class="badge ${officer.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${officer.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-link" onclick="viewOfficer('${officer.badge_number}')">View</button>
                    <button class="btn btn-sm btn-link text-danger" onclick="confirmRemoveOfficer('${officer.badge_number}')">Remove</button>
                </td>
            </tr>
        `).join('');
    }
    
    // Update pagination controls
    function updatePagination(totalOfficers) {
        const paginationContainer = document.getElementById('officerPagination');
        paginationContainer.innerHTML = '';
        
        const totalPages = Math.ceil(totalOfficers / officersPerPage);
        if (totalPages <= 1) return;
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        prevLink.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                filterAndDisplayOfficers();
            }
        });
        prevLi.appendChild(prevLink);
        paginationContainer.appendChild(prevLi);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.addEventListener('click', e => {
                e.preventDefault();
                currentPage = i;
                filterAndDisplayOfficers();
            });
            li.appendChild(a);
            paginationContainer.appendChild(li);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        nextLink.addEventListener('click', e => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                filterAndDisplayOfficers();
            }
        });
        nextLi.appendChild(nextLink);
        paginationContainer.appendChild(nextLi);
    }
    
    // Remove officer
    async function removeOfficer(badgeNumber) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('removeOfficerModal'));
        const confirmBtn = document.getElementById('confirmRemoveOfficer');
        
        // Disable button and show loading state
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Removing...';
        
        try {
            const response = await fetch('/api/ig-remove-officer/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({
                    badge_number: badgeNumber
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server responded with status ${response.status}`);
            }
            
            // Hide modal and reload data
            modal.hide();
            loadOfficers();
            loadDashboardStats();
            
            // Show temporary success notification
            showNotification('Officer removed successfully', 'success');
            
        } catch (error) {
            console.error('Error removing officer:', error);
            modal.hide();
            showNotification(error.message || 'Failed to remove officer', 'danger');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Remove Officer';
        }
    }
    
    // View officer details
    window.viewOfficer = function(badgeNumber) {
        const modal = new bootstrap.Modal(document.getElementById('viewOfficerModal'));
        const modalBody = document.querySelector('#viewOfficerModal .modal-body');
        
        // Show loading state
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2">Loading officer details...</p>
            </div>
        `;
        
        modal.show();
        
        fetch(`/api/ig-officer-detail/${badgeNumber}/`)
            .then(response => {
                if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
                return response.json();
            })
            .then(officer => {
                modalBody.innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h6 class="mb-0">Officer Information</h6>
                                </div>
                                <div class="card-body">
                                    <table class="table table-sm">
                                        <tr>
                                            <td class="fw-bold">Badge Number</td>
                                            <td>${officer.badge_number}</td>
                                        </tr>
                                        <tr>
                                            <td class="fw-bold">Name</td>
                                            <td>${officer.name}</td>
                                        </tr>
                                        <tr>
                                            <td class="fw-bold">Email</td>
                                            <td>${officer.email}</td>
                                        </tr>
                                        <tr>
                                            <td class="fw-bold">Specialization</td>
                                            <td>${officer.specialization}</td>
                                        </tr>
                                        <tr>
                                            <td class="fw-bold">Rank</td>
                                            <td>${officer.rank}</td>
                                        </tr>
                                        <tr>
                                            <td class="fw-bold">Status</td>
                                            <td>
                                                <span class="badge ${officer.is_active ? 'bg-success' : 'bg-secondary'}">
                                                    ${officer.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-header">
                                    <h6 class="mb-0">Case Assignment</h6>
                                </div>
                                <div class="card-body">
                                    <div class="officer-stats mb-3">
                                        <div class="row">
                                            <div class="col-6">
                                                <div class="stat-item text-center">
                                                    <h3>${officer.cases_assigned}</h3>
                                                    <p>Cases Assigned</p>
                                                </div>
                                            </div>
                                            <div class="col-6">
                                                <div class="stat-item text-center">
                                                    <h3>${officer.cases_resolved || 0}</h3>
                                                    <p>Cases Resolved</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    ${officer.cases_assigned > 0 ? `
                                        <h6 class="mb-2">Current Assignments</h6>
                                        <ul class="list-group">
                                            ${officer.current_cases.map(c => `
                                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span class="badge ${getStatusBadgeClass(c.status)} me-2">${c.status}</span>
                                                        ${c.case_id}
                                                    </div>
                                                    <small class="text-muted">${c.case_type}</small>
                                                </li>
                                            `).join('') || '<li class="list-group-item text-center">No cases assigned</li>'}
                                        </ul>
                                    ` : '<div class="alert alert-info">No cases currently assigned to this officer</div>'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            })
            .catch(error => {
                console.error('Error loading officer details:', error);
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Unable to load officer details. Please try again later.
                        <br><small class="text-muted">${error.message}</small>
                    </div>
                `;
            });
    };
    
    // Confirm officer removal
    window.confirmRemoveOfficer = function(badgeNumber) {
        document.getElementById('officerToRemove').value = badgeNumber;
        const modal = new bootstrap.Modal(document.getElementById('removeOfficerModal'));
        modal.show();
    };
    
    // Helper: Get CSRF token
    function getCSRFToken() {
        const tokenElement = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (tokenElement) return tokenElement.value;
        
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') return value;
        }
        return '';
    }
    
    // Helper: Show notification
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `toast align-items-center text-white bg-${type} border-0`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.setAttribute('aria-atomic', 'true');
        
        notification.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        // Add to document if container exists, otherwise create it
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(notification);
        
        // Initialize and show toast
        const toast = new bootstrap.Toast(notification);
        toast.show();
        
        // Remove after it's hidden
        notification.addEventListener('hidden.bs.toast', function() {
            notification.remove();
        });
    }
    
    // Helper: Return Bootstrap badge class based on case status
    function getStatusBadgeClass(status) {
        status = status.toLowerCase();
        switch (status) {
            case 'active': return 'bg-primary';
            case 'resolved': return 'bg-success';
            case 'pending': return 'bg-warning text-dark'; 
            case 'closed': return 'bg-dark';
            case 'unassigned': return 'bg-info';
            default: return 'bg-secondary';
        }
    }
});