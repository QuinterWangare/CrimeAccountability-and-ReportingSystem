document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('anonymousReportForm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    let currentStep = 1;

    // Initialize form navigation
    function initializeFormNavigation() {
        nextBtn.addEventListener('click', () => {
            if (validateCurrentSection()) {
                goToStep(currentStep + 1);
            }
        });

        prevBtn.addEventListener('click', () => {
            goToStep(currentStep - 1);
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (validateCurrentSection()) {
                await submitForm();
            }
        });
    }

    // Validate Current Section
    function validateCurrentSection() {
        const currentSection = document.querySelector(`.form-section[data-section="${currentStep}"]`);
        const requiredFields = currentSection.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('is-invalid');

                if (!field.nextElementSibling?.classList.contains('invalid-feedback')) {
                    const feedback = document.createElement('div');
                    feedback.className = 'invalid-feedback';
                    feedback.textContent = 'This field is required';
                    field.parentNode.appendChild(feedback);
                }
            } else {
                field.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    // Navigate Between Steps
    function goToStep(step) {
        if (step < 1 || step > 3) return; // Only 3 steps for anonymous reporting

        const sections = document.querySelectorAll('.form-section');
        const steps = document.querySelectorAll('.step');

        sections.forEach(section => section.classList.remove('active'));
        steps.forEach(s => s.classList.remove('active'));

        const targetSection = document.querySelector(`[data-section="${step}"]`);
        const targetStep = document.querySelector(`[data-step="${step}"]`);

        targetSection.classList.add('active');
        targetStep.classList.add('active');

        // Mark previous steps as completed
        steps.forEach(s => {
            const stepNum = parseInt(s.dataset.step);
            if (stepNum < step) {
                s.classList.add('completed');
            } else {
                s.classList.remove('completed');
            }
        });

        currentStep = step;
        updateNavigation();
    }

    // Update Navigation Buttons
    function updateNavigation() {
        prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
        nextBtn.style.display = currentStep === 3 ? 'none' : 'block';
        submitBtn.classList.toggle('d-none', currentStep !== 3);
    }

    // Initialize Evidence Upload
    function initializeEvidenceUpload() {
        const dropZone = document.getElementById('dropZone');
        const input = dropZone.querySelector('input[type="file"]');
        const preview = document.getElementById('previewContainer');

        dropZone.addEventListener('click', () => input.click());
        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        input.addEventListener('change', () => handleFiles(input.files));

        function handleFiles(files) {
            if (files.length > 5) {
                showNotification('Maximum 5 files allowed', 'warning');
                return;
            }

            Array.from(files).forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    showNotification('File size should not exceed 10MB', 'warning');
                    return;
                }

                const reader = new FileReader();
                reader.onload = e => {
                    preview.innerHTML += `
                        <div class="preview-item">
                            <img src="${e.target.result}" alt="Preview">
                            <button type="button" class="remove-btn">&times;</button>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // Show Notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} notification`;
        notification.innerHTML = message;
        document.querySelector('.content-wrapper').appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // Initialize all components
    initializeFormNavigation();
    initializeEvidenceUpload();

    // Override form submission
    async function submitForm() {
        try {
            const formData = new FormData(document.getElementById('anonymousReportForm'));

            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Report submitted successfully! Your tracking number: ${result.tracking_number}`);
                form.reset();
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Error submitting report.');
            }
        } catch (error) {
            alert('Error submitting report.');
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
    const reportForm = document.getElementById("anonymousReportForm");
    const submitButton = document.getElementById("submitBtn");

    if (reportForm && submitButton) {
        // Ensure the submit button is visible
        submitButton.classList.remove("d-none");

        reportForm.addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent default form submission

            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";

            const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;
            const formData = new FormData(reportForm);

            fetch("/anonymousreport/", {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken  // Ensure CSRF token is included
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.tracking_number) {
                    alert(`Report submitted successfully! Tracking Number: ${data.tracking_number}`);
                    reportForm.reset();
                } else {
                    alert("Error submitting report. Please try again.");
                }

                submitButton.disabled = false;
                submitButton.textContent = "Submit Report";
            })
            .catch(() => {
                alert("An error occurred. Please try again.");
                submitButton.disabled = false;
                submitButton.textContent = "Submit Report";
            });
        });
    }
});
});
