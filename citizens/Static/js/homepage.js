document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();
    initializeDropdowns();
    fetchAndRenderStats();
    fetchAndRenderReports();
    fetchAndRenderNotifications(); // Fetch notifications on page load
    setupEventListeners();
});


// Initialize Bootstrap tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

// Initialize Bootstrap dropdowns
function initializeDropdowns() {
    const dropdownTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
    dropdownTriggerList.map(dropdownTriggerEl => new bootstrap.Dropdown(dropdownTriggerEl));
}

// Fetch and render stats cards
function fetchAndRenderStats() {
    fetch("/api/stats/")
        .then(response => response.json())
        .then(stats => {
            const statsGrid = document.getElementById("statsGrid");
            if (!statsGrid) return;

            statsGrid.innerHTML = `
                <div class="stat-card">
                    <h6>Total Reports</h6>
                    <h3>${stats.total_reports}</h3>
                </div>
                <div class="stat-card">
                    <h6>Active Cases</h6>
                    <h3>${stats.active_cases}</h3>
                </div>
                <div class="stat-card">
                    <h6>Resolved Cases</h6>
                    <h3>${stats.resolved_cases}</h3>
                </div>
                <div class="stat-card">
                    <h6>Pending Cases</h6>
                    <h3>${stats.pending_cases}</h3>
                </div>
            `;
        })
        .catch(error => console.error("Error fetching stats:", error));
}

// Handle "View All" button click
document.addEventListener("DOMContentLoaded", function () {
    const viewAllBtn = document.getElementById('viewAllReports');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function () {
            window.location.href = "/all-reports/"; // Redirect to the all reports page
        });
    }
});

// Fetch and display report details in modal
function viewReport(reportId) {
    fetch(`/report-detail/${reportId}/`)
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

// Attach event listeners for "View" buttons
function attachViewButtons() {
    document.querySelectorAll('.view-report-btn').forEach(button => {
        button.addEventListener('click', function () {
            const reportId = this.getAttribute('data-id');
            viewReport(reportId);
        });
    });
}

// Fetch and render reports
function fetchAndRenderReports() {
    fetch('/api/recent-reports/')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#reportsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = "";

            if (data.reports.length === 0) {
                tbody.innerHTML = "<tr><td colspan='6'>No reports available.</td></tr>";
                return;
            }

            tbody.innerHTML = data.reports.map(report => `
                <tr>
                    <td>${report.tracking_number}</td>
                    <td>${report.type}</td>
                    <td>${report.location}</td>
                    <td>${report.status}</td>
                    <td>${report.date}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-report-btn" data-id="${report.tracking_number}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `).join('');

            attachViewButtons(); // Attach event listeners dynamically
        })
        .catch(error => console.error('Error fetching reports:', error));
}


// Fetch and render notifications
function fetchAndRenderNotifications() {
    fetch('/api/notifications/')
        .then(response => response.json())
        .then(data => {
            const dropdown = document.querySelector('.notifications-dropdown');
            const badge = document.querySelector('.notification-badge');
            if (!dropdown || !badge) return; // Avoid errors if elements are missing

            dropdown.innerHTML = "";  // Clear existing notifications

            if (data.notifications.length === 0) {
                dropdown.innerHTML = "<p class='dropdown-item text-muted'>No new notifications</p>";
                badge.style.display = "none"; // Hide badge if no notifications
                return;
            }

            badge.style.display = "block"; // Show badge if notifications exist
            badge.textContent = data.notifications.length; // Update badge count

            data.notifications.forEach(notification => {
                const notificationItem = document.createElement('a');
                notificationItem.href = "#";  // Change to actual report link if needed
                notificationItem.className = "dropdown-item";
                notificationItem.innerHTML = `
                    <i class="fas fa-info-circle text-primary"></i>
                    ${notification.message}
                    <small class="text-muted d-block">${notification.date}</small>
                `;
                dropdown.appendChild(notificationItem);
            });
        })
        .catch(error => console.error('Error fetching notifications:', error));
}

// Setup event listeners
function setupEventListeners() {
    // Handle active navigation state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Handle notifications dropdown click
    const notificationsIcon = document.querySelector('.notifications');
    if (notificationsIcon) {
        notificationsIcon.addEventListener('click', function() {
            fetchAndRenderNotifications();  // Refresh notifications when clicked
        });
    }

    // Handle "View All" button click
    const viewAllBtn = document.querySelector('.view-all-reports');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            window.location.href = "/all-reports/"; // Redirect to all reports page
        });
    }
}

// Function to view a single report
function viewReport(reportId) {
    window.location.href = `/report-detail/${reportId}/`; // Redirect to report details page
}
