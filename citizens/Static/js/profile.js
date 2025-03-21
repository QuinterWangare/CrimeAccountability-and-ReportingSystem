// Initialize tooltips
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

        // Profile avatar upload
        document.querySelector('.profile-avatar').addEventListener('click', function() {
            document.getElementById('profile-picture').click();
        });

        // Save profile changes
        document.getElementById('saveProfileChanges').addEventListener('click', function() {
            // Simulate saving profile data
            document.getElementById('user-fullname').textContent = document.getElementById('edit-fullname').value;
            document.getElementById('user-email').textContent = document.getElementById('edit-email').value;
            document.getElementById('user-phone').textContent = document.getElementById('edit-phone').value;
            document.getElementById('user-address').textContent = document.getElementById('edit-address').value;

            // Close modal
            var modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            modal.hide();

            // Show success notification
            alert('Profile updated successfully');
        });

document.addEventListener("DOMContentLoaded", function () {
    fetchUserReportStats(); // Fetch report stats on page load
});

// Function to fetch and update user report statistics
function fetchUserReportStats() {
    fetch('/api/user-report-stats/')
        .then(response => response.json())
        .then(stats => {
            document.getElementById('reports-total').textContent = stats.total_reports;
            document.getElementById('reports-pending').textContent = stats.pending_cases;
            document.getElementById('reports-resolved').textContent = stats.resolved_cases;
        })
        .catch(error => console.error("Error fetching user report stats:", error));
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("saveProfileChanges").addEventListener("click", updateProfile);
    document.getElementById("savePasswordChanges").addEventListener("click", changePassword);
});

function updateProfile() {
    const fullName = document.getElementById("edit-fullname").value.trim();
    const email = document.getElementById("edit-email").value.trim();

    if (!fullName || !email) {
        alert("Please fill in all required fields.");
        return;
    }

    const [first_name, last_name] = fullName.split(" ");  // Split full name

    fetch("/api/update-profile/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value
        },
        body: JSON.stringify({ first_name, last_name, email })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        document.getElementById("user-fullname").textContent = fullName;
        document.getElementById("user-email").textContent = email;
        bootstrap.Modal.getInstance(document.getElementById("editProfileModal")).hide();
    })
    .catch(error => console.error("Error updating profile:", error));
}

function changePassword() {
    const currentPassword = document.getElementById("current-password").value.trim();
    const newPassword = document.getElementById("new-password").value.trim();
    const confirmPassword = document.getElementById("confirm-password").value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("All fields are required.");
        return;
    }

    fetch("/api/change-password/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            bootstrap.Modal.getInstance(document.getElementById("changePasswordModal")).hide();
        }
    })
    .catch(error => console.error("Error changing password:", error));
}

