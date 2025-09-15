document.addEventListener('DOMContentLoaded', function() {

    // Initialize tooltips for mobile sidebar
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

    // Form elements
    const form = document.getElementById('crimeReportForm');
    const sections = document.querySelectorAll('.form-section');
    const steps = document.querySelectorAll('.step');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    let currentStep = 1;

    // Form Navigation
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
                showNotification('Maximum 5 files allowed');
                return;
            }

            Array.from(files).forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    showNotification('File size should not exceed 10MB');
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


    // Location Picker with complete search functionality
    function initializeLocationPicker() {
        // Get DOM elements
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        const selectOnMapBtn = document.getElementById('selectOnMapBtn');
        const searchLocationBtn = document.getElementById('searchLocationBtn');
        const searchContainer = document.getElementById('locationSearchContainer');
        const locationSearchInput = document.getElementById('locationSearchInput');
        const performSearchBtn = document.getElementById('performSearchBtn'); // Same ID as the main button - we'll fix this
        const closeSearchBtn = document.getElementById('closeSearchBtn');
        const simpleMap = document.getElementById('simpleMap');
        const mapContainer = document.getElementById('mapContainer');
        const closeMapBtn = document.getElementById('closeMapBtn');
        const locationStatus = document.getElementById('locationStatus');
        const addressField = document.getElementById('locationAddress');
        const latitudeField = document.getElementById('latitude');
        const longitudeField = document.getElementById('longitude');
        
        // Map variables
        let leafletMap = null;
        let marker = null;
        
        // Event listeners for primary buttons
        if (currentLocationBtn) currentLocationBtn.addEventListener('click', getCurrentLocation);
        if (selectOnMapBtn) selectOnMapBtn.addEventListener('click', showMap);
        if (closeMapBtn) closeMapBtn.addEventListener('click', hideMap);
        
        // SEARCH FUNCTIONALITY: Show search box when "Search for Area" is clicked
        if (searchLocationBtn) {
            searchLocationBtn.addEventListener('click', function() {
                // Hide map if it's visible
                if (simpleMap) simpleMap.classList.add('d-none');
                
                // Show search container
                if (searchContainer) searchContainer.classList.remove('d-none');
                
                // Focus on the input field
                if (locationSearchInput) locationSearchInput.focus();
                
                // Disable search button to prevent multiple clicks
                searchLocationBtn.disabled = true;
            });
        }
        
        // SEARCH FUNCTIONALITY: Close search when close button is clicked
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', function() {
                // Hide search container
                if (searchContainer) searchContainer.classList.add('d-none');
                
                // Re-enable search button
                if (searchLocationBtn) searchLocationBtn.disabled = false;
            });
        }
        
        // SEARCH FUNCTIONALITY: Perform search when search button is clicked
        if (performSearchBtn) {
            performSearchBtn.addEventListener('click', performSearch);
        }
        
        // SEARCH FUNCTIONALITY: Allow Enter key to trigger search
        if (locationSearchInput) {
            locationSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performSearch();
                }
            });
        }
        
        // SEARCH FUNCTIONALITY: Perform the actual search
        function performSearch() {
            const searchQuery = locationSearchInput.value.trim();
            if (!searchQuery) {
                showStatus('warning', '<i class="fas fa-info-circle me-2"></i>Please enter a location to search for.');
                return;
            }
            
            // Show loading status
            showStatus('info', '<i class="fas fa-spinner fa-spin me-2"></i>Searching for location...');
            
            // Call Nominatim API to search for the location
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    if (data && data.length > 0) {
                        // Get the first result
                        const result = data[0];
                        const lat = parseFloat(result.lat);
                        const lon = parseFloat(result.lon);
                        
                        // Update coordinates in hidden fields
                        if (latitudeField) latitudeField.value = lat.toFixed(6);
                        if (longitudeField) longitudeField.value = lon.toFixed(6);
                        
                        // Update address field with the search result
                        if (addressField) addressField.value = result.display_name;
                        
                        // Initialize and show map with the result
                        showMap();
                        
                        // Add a short delay to make sure the map is visible before setting marker
                        setTimeout(() => {
                            if (leafletMap) {
                                // Center and zoom the map on the result
                                leafletMap.setView([lat, lon], 15);
                                
                                // Add or move marker
                                setLocationMarker(lat, lon);
                            }
                        }, 300);
                        
                        // Hide search container
                        if (searchContainer) searchContainer.classList.add('d-none');
                        
                        // Re-enable search button
                        if (searchLocationBtn) searchLocationBtn.disabled = false;
                        
                        // Show success message
                        showStatus('success', `<i class="fas fa-check-circle me-2"></i>Location found: ${result.display_name}`);
                    } else {
                        // No results found
                        showStatus('warning', '<i class="fas fa-info-circle me-2"></i>No locations found for that search. Please try another term.');
                    }
                })
                .catch(error => {
                    console.error('Search error:', error);
                    showStatus('danger', '<i class="fas fa-exclamation-triangle me-2"></i>Error searching for location. Please try again.');
                    
                    // Re-enable search button on error
                    if (searchLocationBtn) searchLocationBtn.disabled = false;
                });
        }
        
        // Show and initialize map
        function showMap() {
            if (simpleMap) simpleMap.classList.remove('d-none');
            
            // Hide search container if it's visible
            if (searchContainer) searchContainer.classList.add('d-none');
            
            // Re-enable search button if it was disabled
            if (searchLocationBtn) searchLocationBtn.disabled = false;
            
            // Initialize map if it hasn't been already
            if (!leafletMap) {
                try {
                    initializeMap();
                } catch (error) {
                    console.error('Map initialization error:', error);
                    showStatus('danger', '<i class="fas fa-exclamation-triangle me-2"></i>Could not initialize map. Please try again.');
                    if (simpleMap) simpleMap.classList.add('d-none');
                    return;
                }
            } else {
                // Make sure map renders correctly if it already exists
                setTimeout(() => leafletMap.invalidateSize(), 100);
            }
        }
        
        // Hide map
        function hideMap() {
            if (simpleMap) simpleMap.classList.add('d-none');
        }
        
        // Initialize map
        function initializeMap() {
            // Default view (Nairobi, Kenya)
            const defaultPosition = [-1.286389, 36.817223];
            
            // Create map
            leafletMap = L.map(mapContainer).setView(defaultPosition, 13);
            
            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(leafletMap);
            
            // Add click handler to the map
            leafletMap.on('click', function(e) {
                setLocationMarker(e.latlng.lat, e.latlng.lng);
            });
            
            // Force a resize after a short delay to ensure proper rendering
            setTimeout(() => leafletMap.invalidateSize(), 200);
        }
        
        // Get current location
        function getCurrentLocation() {
            if (!navigator.geolocation) {
                showStatus('danger', '<i class="fas fa-exclamation-triangle me-2"></i>Geolocation is not supported by your browser.');
                return;
            }
            
            // Show loading status
            showStatus('info', '<i class="fas fa-spinner fa-spin me-2"></i>Getting your current location...');
            
            // Disable button while getting location
            if (currentLocationBtn) currentLocationBtn.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    showMap();
                    
                    // Add a short delay to ensure map is fully initialized
                    setTimeout(() => {
                        setLocationMarker(lat, lng);
                        
                        // Re-enable button
                        if (currentLocationBtn) currentLocationBtn.disabled = false;
                    }, 300);
                },
                // Error callback
                function(error) {
                    console.error('Geolocation error:', error);
                    
                    let message = 'Unable to get your location. ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message += 'Location permission was denied.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message += 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            message += 'Location request timed out.';
                            break;
                    }
                    
                    showStatus('danger', '<i class="fas fa-exclamation-triangle me-2"></i>' + message);
                    
                    // Re-enable button
                    if (currentLocationBtn) currentLocationBtn.disabled = false;
                },
                // Options
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }

        // Set location marker on map
        function setLocationMarker(lat, lng) {
            // Update coordinate fields
            if (latitudeField) latitudeField.value = lat.toFixed(6);
            if (longitudeField) longitudeField.value = lng.toFixed(6);
            
            // IMPORTANT: Check if leafletMap exists before trying to use it
            if (!leafletMap) {
                console.warn("Map not initialized yet.");
                return; // Exit function if map doesn't exist
            }
            
            // Update or create marker
            if (marker) {
                marker.setLatLng([lat, lng]);
            } else {
                marker = L.marker([lat, lng], {
                    draggable: true
                }).addTo(leafletMap);
                
                // Update coordinates when marker is dragged
                marker.on('dragend', function() {
                    const pos = marker.getLatLng();
                    setLocationMarker(pos.lat, pos.lng);
                });
            }
            
            // Center map on marker
            leafletMap.setView([lat, lng], leafletMap.getZoom());
            
            // Get address for the coordinates
            getAddressFromCoordinates(lat, lng);
        }
        
        // Get address from coordinates
        function getAddressFromCoordinates(lat, lng) {
            // Show loading in address field
            if (addressField) addressField.placeholder = "Getting address...";
            
            // Make request to Nominatim API
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    if (data && data.display_name) {
                        // Set the address in the field
                        if (addressField) addressField.value = data.display_name;
                        
                        // Show success status
                        showStatus('success', '<i class="fas fa-check-circle me-2"></i>Location and address captured successfully!');
                    } else {
                        // Address not found
                        if (addressField) {
                            addressField.value = "";
                            addressField.placeholder = "Please enter location details manually";
                        }
                        
                        showStatus('warning', '<i class="fas fa-info-circle me-2"></i>Could not retrieve address. Please enter location details manually.');
                    }
                })
                .catch(error => {
                    console.error('Error getting address:', error);
                    
                    // Clear address field on error
                    if (addressField) {
                        addressField.value = "";
                        addressField.placeholder = "Please enter location details manually";
                    }
                    
                    showStatus('warning', '<i class="fas fa-info-circle me-2"></i>Could not retrieve address. Please enter location details manually.');
                });
        }
        
        // Show status message
        function showStatus(type, message) {
            if (locationStatus) {
                locationStatus.innerHTML = message;
                locationStatus.className = `showNotification showNotification-${type} mb-3`;
                locationStatus.classList.remove('d-none');
            }
        }
    }


    // Initialize form navigation
    initializeFormNavigation();
    // Initialize evidence upload
    initializeEvidenceUpload();
    
    // Initialize location picker
    initializeLocationPicker();


    // Form submission
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
                showNotification(`Report submitted successfully! Your tracking number: ${result.tracking_number}`);
                form.reset();
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'Error submitting report.');
            }
        } catch (error) {
            showNotification('Error submitting report.');
        }
    }
    
    function showTrackingNumberModal(trackingNumber) {
    // Create modal elements
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop show';
    modalBackdrop.style.backgroundColor = 'var(--secondary-color)'; 
    document.body.appendChild(modalBackdrop);
    
    const modalHTML = `
        <div class="modal fade show" style="display: block;" tabindex="-1" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                    <div class="modal-header" style="background-color: var(--primary-color); color: var(--background-color);">
                        <h5 class="modal-title">Report Submitted Successfully!</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" onclick="closeTrackingModal()"></button>
                    </div>
                    <div class="modal-body text-center" style="color: var(--text-color);">
                        <div class="mb-4">
                            <i class="fas fa-check-circle" style="font-size: 64px; color: var(--primary-color);"></i>
                        </div>
                        <h4 style="color: var(--primary-color);">Your Report Has Been Received</h4>
                        <p class="mb-4">We've registered your report and it will be reviewed by our team.</p>
                        
                        <div class="alert py-3" style="background-color: var(--accent-color); color: var(--background-color); border: none;">
                            <strong>Your Tracking Number:</strong>
                            <div class="tracking-number">${trackingNumber}</div>
                            <div class="mt-2">
                                <button type="button" class="btn btn-sm" style="background-color: var(--primary-color); color: var(--background-color);" onclick="copyTrackingNumber('${trackingNumber}')">
                                    <i class="fas fa-copy me-1"></i> Copy to Clipboard
                                </button>
                            </div>
                            <small>Please save this number to check the status of your report later.</small>
                        </div>
                    </div>
                    <div class="modal-footer justify-content-between" style="border-top-color: rgba(52, 73, 94, 0.1);">
                        <button type="button" class="btn" style="background-color: var(--secondary-color); color: var(--background-color);" onclick="closeTrackingModal()">Close</button>
                        <a href="/track-report/?tracking=${trackingNumber}" class="btn" style="background-color: var(--primary-color); color: var(--background-color);">Track Your Report</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to document
    const modalContainer = document.createElement('div');
    modalContainer.id = 'trackingNumberModal';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Add style for tracking number with CSS variables
    const style = document.createElement('style');
    style.innerHTML = `
        .tracking-number {
            font-size: 24px;
            font-weight: bold;
            padding: 10px;
            margin: 10px 0;
            background-color: var(--background-color);
            border: 1px dashed var(--primary-color);
            border-radius: 5px;
            color: var(--primary-color);
        }
        
        .fade-out {
            opacity: 0;
            transition: opacity 0.8s ease-out;
        }
        
        .showNotification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            color: var(--background-color);
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out, fadeOut 0.5s ease-out 4.5s forwards;
        }
        
        .showNotification-success {
            background-color: var(--success-color);
        }
        
        .showNotification-info {
            background-color: var(--accent-color);
            color: var(--background-color);
        }
        
        .showNotification-warning {
            background-color: var(--warning-color);
            color: var(--text-color);
        }
        
        .showNotification-danger {
            background-color: var(--danger-color);
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; visibility: hidden; }
        }
    `;
    document.head.appendChild(style);

    // Copy tracking number function
    window.copyTrackingNumber = function(number) {
        navigator.clipboard.writeText(number)
            .then(() => {
                // Show inline confirmation instead of alert
                const copyBtn = document.querySelector('.btn-sm');
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
                copyBtn.style.backgroundColor = '#28a745';
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.backgroundColor = 'var(--primary-color)';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                alert("Please manually copy your tracking number: " + number);
            });
    };

    window.closeTrackingModal = function() {
        try {
            const hasConfirmed = confirm("Have you saved your tracking number? You won't be able to recover it later.");
            
            if (hasConfirmed) {
                // Get modal elements
                const modal = document.getElementById('trackingNumberModal');
                const backdrop = document.querySelector('.modal-backdrop');
                
                // Fade-out animation
                if (modal) {
                    modal.classList.add('fade-out');
                    if (backdrop) backdrop.classList.add('fade-out');
                    
                    // Remove elements after animation completes
                    setTimeout(() => {
                        if (modal) modal.remove();
                        if (backdrop) backdrop.remove();
                        
                        // Redirect to homepage
                        window.location.href = '/';
                    }, 800);
                } else {
                    // If modal element isn't found, redirect
                    window.location.href = '/';
                }
            }
            // If user hasn't saved the tracking number, do nothing and keep modal open
        } catch (error) {
            console.error('Error closing modal:', error);
            // Fallback - redirect anyway if there's an error
            window.location.href = '/';
        }
    }
    }

    // Show Notification
    function showNotification(message, type='info') {
        const notification = document.createElement('div');
        notification.className = `showNotification showNotification-${type} notification`;
        notification.innerHTML = message;
        document.querySelector('.content-wrapper').appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
});
