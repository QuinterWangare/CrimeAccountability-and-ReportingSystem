document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });
    
    // Cases Chart
    const casesCtx = document.getElementById('casesChart').getContext('2d');
    new Chart(casesCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'Total Cases',
                    data: [210, 195, 225, 240, 225, 243],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Solved Cases',
                    data: [150, 145, 172, 178, 168, 186],
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
    
    // Case Types Chart
    const caseTypesCtx = document.getElementById('caseTypesChart').getContext('2d');
    new Chart(caseTypesCtx, {
        type: 'doughnut',
        data: {
            labels: ['Theft', 'Assault', 'Fraud', 'Vandalism', 'Others'],
            datasets: [{
                data: [38, 24, 18, 12, 8],
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