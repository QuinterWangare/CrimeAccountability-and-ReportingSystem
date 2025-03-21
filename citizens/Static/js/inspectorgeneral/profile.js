document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Make the Change Password button activate the Security tab
    document.getElementById('changePasswordBtn').addEventListener('click', function() {
        // Find the security tab and activate it
        let securityTab = new bootstrap.Tab(document.getElementById('security-tab'));
        securityTab.show();
        
        //Scroll to password section
        setTimeout(function() {
            document.querySelector('#security .card').scrollIntoView({ behavior: 'smooth' });
        }, 300);
    });
    
    
    // Handle profile save
    document.getElementById('saveProfileChanges').addEventListener('click', function() {
        
        // Close the modal
        let modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        modal.hide();
        
        
    });
});