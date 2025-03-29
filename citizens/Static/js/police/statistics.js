document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });

    loadDashboardSummaryStats()
    
    // Fetch data from backend for charts
    fetch('/api/case-analytics/')
        .then(response => response.json())
        .then(data => {
            // Cases Chart
            const casesCtx = document.getElementById('casesChart').getContext('2d');
            new Chart(casesCtx, {
                type: 'line',
                data: {
                    labels: data.dates,
                    datasets: [
                        {
                            label: 'New Cases',
                            data: data.new_cases,
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'Resolved Cases',
                            data: data.resolved_cases,
                            borderColor: '#198754',
                            backgroundColor: 'transparent',
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        });

    // Fetch crime type statistics
    fetch('/api/crime-stats')
        .then(response => response.json())
        .then(data => {
            // Case Types Chart
            const caseTypesCtx = document.getElementById('caseTypesChart').getContext('2d');
            new Chart(caseTypesCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        data: Object.values(data),
                        backgroundColor: [
                            '#0d6efd',
                            '#dc3545',
                            '#ffc107',
                            '#0dcaf0',
                            '#6c757d'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    cutout: '65%'
                }
            });
        });
        
    // Fetch county statistics
    fetch('/api/county-stats')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('.card-body.p-0 tbody');
            tableBody.innerHTML = ''; // Clear existing data
            
            data.forEach(county => {
                // Determine progress bar class based on clearance rate
                let progressClass = 'bg-danger';
                if (county.clearance_rate >= 70) {
                    progressClass = 'bg-success';
                } else if (county.clearance_rate >= 50) {
                    progressClass = 'bg-warning';
                }
                
                // Create table row
                const row = `
                    <tr>
                        <td>${county.county}</td>
                        <td>${county.total_cases}</td>
                        <td>${county.solved_cases}</td>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="progress flex-grow-1" style="height: 6px;">
                                    <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${county.clearance_rate}%"></div>
                                </div>
                                <span class="ms-2">${county.clearance_rate}%</span>
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        })
        .catch(error => {
            console.error('Error fetching county statistics:', error);
        });

        async function loadDashboardSummaryStats() {
            try {
                const response = await fetch('/api/dashboard-summary-stats/');
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Update UI with the retrieved data
                document.getElementById('totalCasesCount').textContent = data.total_cases.count;
                document.getElementById('solvedCasesCount').textContent = data.solved_cases.count;
                document.getElementById('clearanceRateValue').textContent = `${data.clearance_rate.value}%`;
                
            } catch (error) {
                console.error('Error loading dashboard summary statistics:', error);
                // Show error state in the UI
            }
        }
});