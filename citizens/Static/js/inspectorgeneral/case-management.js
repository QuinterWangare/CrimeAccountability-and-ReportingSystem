document.addEventListener('DOMContentLoaded', function() {
    // Get filter elements
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    
    // Get the cases table and rows
    const casesTable = document.querySelector('.table-responsive table');
    const tableBody = casesTable.querySelector('tbody');
    const allRows = Array.from(tableBody.querySelectorAll('tr'));
    
    // Add event listeners to all filters
    statusFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    locationFilter.addEventListener('change', applyFilters);
    startDateFilter.addEventListener('change', applyFilters);
    endDateFilter.addEventListener('change', applyFilters);
    
    // Apply all active filters and update table
    function applyFilters() {
        const statusValue = statusFilter.value;
        const typeValue = typeFilter.value;
        const locationValue = locationFilter.value;
        const startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
        const endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;
        
        // Reset table first
        tableBody.innerHTML = '';
        
        // Filter rows
        const filteredRows = allRows.filter(row => {
            const status = row.querySelector('td:nth-child(6) .badge').textContent.trim().toLowerCase();
            const type = row.querySelector('td:nth-child(2)').textContent.trim().toLowerCase();
            const location = row.querySelector('td:nth-child(3)').textContent.trim().toLowerCase();
            const reportedDateStr = row.querySelector('td:nth-child(4)').textContent.trim();
            const reportedDate = new Date(reportedDateStr);
            
            // Check each filter
            if (statusValue !== 'all' && status !== statusValue) return false;
            if (typeValue !== 'all' && !type.includes(typeValue.toLowerCase())) return false;
            if (locationValue !== 'all' && !location.includes(locationValue.toLowerCase())) return false;
            
            // Date filtering
            if (startDate && reportedDate < startDate) return false;
            if (endDate && reportedDate > endDate) return false;
            
            return true;
        });
        
        // Add filtered rows back to table
        filteredRows.forEach(row => {
            tableBody.appendChild(row.cloneNode(true));
        });
        
        // Show "no results" message if no matches
        if (filteredRows.length === 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = '<td colspan="7" class="text-center py-3">No cases match the selected filters</td>';
            tableBody.appendChild(noResultsRow);
        }
        
        // Update the results count display
        updateResultsCount(filteredRows.length);
    }
    
    // Update the count of displayed results
    function updateResultsCount(count) {
        const resultsCountElement = document.getElementById('resultsCount');
        if (resultsCountElement) {
            resultsCountElement.textContent = `Showing ${count} of ${allRows.length} cases`;
        }
    }
    
    // Add reset filters button functionality
    const resetButton = document.getElementById('resetFilters');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            statusFilter.value = 'all';
            typeFilter.value = 'all';
            locationFilter.value = 'all';
            startDateFilter.value = '';
            endDateFilter.value = '';
            applyFilters();
        });
    }
});