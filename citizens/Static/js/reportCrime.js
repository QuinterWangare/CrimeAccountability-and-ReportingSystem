document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const form = document.getElementById('crimeReportForm');
    const sections = document.querySelectorAll('.form-section');
    const steps = document.querySelectorAll('.step');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    let currentStep = 1;

    // Map variables
    let map;
    let marker;
    let addressField = document.querySelector('[data-section="2"] textarea');

    // Initialize tooltips for mobile sidebar
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

    // Initialize form navigation
    initializeFormNavigation();

    // Initialize evidence upload
    initializeEvidenceUpload();

    // Initialize location picker
    initializeLocationPicker();

    // Initialize map
    initializeMap();

    // Form Navigation
    function initializeFormNavigation() {
        nextBtn.addEventListener('click', () => {
            if (validateCurrentSection()) {
                goToStep(currentStep + 1);
                // If going to location step, refresh map
                if (currentStep === 2 && map) {
                    setTimeout(() => {
                        map.invalidateSize();
                    }, 100);
                }
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
        if (step < 1 || step > 4) return;

        sections.forEach(section => section.classList.remove('active'));
        document.querySelector(`[data-section="${step}"]`).classList.add('active');

        // Update steps styling
        steps.forEach(s => {
            const stepNumber = parseInt(s.dataset.step);
            s.classList.remove('active');
            // Mark previous steps as completed
            if (stepNumber < step) {
                s.classList.add('completed');
                s.classList.remove('active');
            } else if (stepNumber === step) {
                s.classList.add('active');
                s.classList.remove('completed');
            } else {
                s.classList.remove('completed', 'active');
            }
        });

        currentStep = step;
        updateNavigation();
    }

    // Update Navigation Buttons
    function updateNavigation() {
        prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
        nextBtn.style.display = currentStep === 4 ? 'none' : 'block';
        submitBtn.classList.toggle('d-none', currentStep !== 4);
    }

    // Evidence Upload
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
                alert('Maximum 5 files allowed');
                return;
            }

            Array.from(files).forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    alert('File size should not exceed 10MB');
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

                    // Add remove functionality to the newly added button
                    const removeButtons = preview.querySelectorAll('.remove-btn');
                    removeButtons.forEach(btn => {
                        btn.addEventListener('click', function() {
                            this.parentNode.remove();
                        });
                    });
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // Initialize Map with Leaflet.js (free)
    function initializeMap() {
        // Add Leaflet CSS to head
        if (!document.querySelector('link[href*="leaflet.css"]')) {
            const leafletCSS = document.createElement('link');
            leafletCSS.rel = 'stylesheet';
            leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            leafletCSS.crossOrigin = '';
            document.head.appendChild(leafletCSS);
        }

        // Add Leaflet JS
        loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
            .then(() => {
                // Initialize map once Leaflet is loaded
                const mapContainer = document.getElementById('map');
                if (!mapContainer) return;

                // Default coordinates (can be adjusted)
                const defaultLat = 12.9714;  // Default to Manila
                const defaultLng = 77.5946;   // Default to Bangalore

                map = L.map('map').setView([defaultLat, defaultLng], 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                // Add a marker at default location
                marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

                // Update address when marker is dragged
                marker.on('dragend', function(e) {
                    const position = marker.getLatLng();
                    getAddressFromCoordinates(position.lat, position.lng);
                });

                // Make map refresh when the location tab becomes visible
                nextBtn.addEventListener('click', function() {
                    if (currentStep === 2) {
                        setTimeout(() => map.invalidateSize(), 100);
                    }
                });

                // Load search control
                loadSearchControl();
            })
            .catch(error => console.error('Error loading Leaflet:', error));
    }

    // Load Search Control for the map
    function loadSearchControl() {
        // Add Leaflet Control Geocoder (for search functionality)
        loadScript('https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js')
            .then(() => {
                // Initialize search control
                const geocoder = L.Control.geocoder({
                    defaultMarkGeocode: false
                }).addTo(map);

                geocoder.on('markgeocode', function(e) {
                    const { center, name } = e.geocode;

                    // Update map view
                    map.setView(center, 16);

                    // Update marker position
                    marker.setLatLng(center);

                    // Get full address
                    getAddressFromCoordinates(center.lat, center.lng);
                });

                // Connect search button to open geocoder
                const searchBtn = document.querySelector('.map-controls .btn-outline-primary');
                if (searchBtn) {
                    searchBtn.addEventListener('click', function() {
                        // Simulate click on the geocoder control
                        document.querySelector('.leaflet-control-geocoder-icon').click();
                    });
                }
            })
            .catch(error => console.error('Error loading geocoder:', error));
    }

    // Get address from coordinates using Nominatim API (free)
    function getAddressFromCoordinates(lat, lng) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
                const address = data.display_name || 'Address not found';
                addressField.value = address;

                // Store coordinates for form submission
                addressField.dataset.lat = lat;
                addressField.dataset.lng = lng;
            })
            .catch(error => {
                console.error('Error fetching address:', error);
                addressField.value = `Coordinates: ${lat}, ${lng}`;
            });
    }

    // Location Picker
    function initializeLocationPicker() {
        const locationBtn = document.getElementById('currentLocation');
        locationBtn.addEventListener('click', () => {
            // Show loading state
            locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
            locationBtn.disabled = true;

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        const { latitude, longitude } = position.coords;

                        // Update map and marker if map is initialized
                        if (map && marker) {
                            map.setView([latitude, longitude], 16);
                            marker.setLatLng([latitude, longitude]);
                            getAddressFromCoordinates(latitude, longitude);
                        } else {
                            // If map isn't loaded yet, just update the textarea
                            addressField.value = `Coordinates: ${latitude}, ${longitude}`;
                            addressField.dataset.lat = latitude;
                            addressField.dataset.lng = longitude;
                        }

                        // Reset button
                        locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location';
                        locationBtn.disabled = false;
                    },
                    error => {
                        console.error('Error getting location:', error);
                        showNotification('Could not get your location. Please check your permissions.', 'warning');

                        // Reset button
                        locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location';
                        locationBtn.disabled = false;
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                showNotification('Geolocation is not supported by this browser.', 'error');
                locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Use Current Location';
                locationBtn.disabled = false;
            }
        });
    }

    // Helper function to load scripts dynamically
    function loadScript(url) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    // Form Submission
    async function submitForm() {
    try {
        const formData = new FormData(document.getElementById('crimeReportForm'));

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

    const reportForm = document.getElementById("crimeReportForm"); // Replace with actual form ID
    const submitButton = document.getElementById("submitReport"); // Replace with actual button ID

    if (reportForm && submitButton) {
        reportForm.addEventListener("submit", function () {
            // Disable button after click
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        });
    }
});