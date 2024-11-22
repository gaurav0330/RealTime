let currentStep = 1;
const totalSteps = 4;

// Initialize form steps
document.addEventListener('DOMContentLoaded', function() {
    showStep(currentStep);
    
    // Add event listeners to navigation buttons
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);
    
    // Initialize form submission
    document.getElementById('nocApplicationForm').addEventListener('submit', handleSubmit);
});

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show current step with fade-in animation
    const currentStepElement = document.getElementById(`step${step}`);
    currentStepElement.style.display = 'block';
    currentStepElement.style.opacity = '0';
    setTimeout(() => {
        currentStepElement.style.opacity = '1';
        currentStepElement.style.transition = 'opacity 0.3s ease-in-out';
    }, 0);

    // Update progress bar
    const progress = ((step - 1) / (totalSteps - 1)) * 100;
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.width = `${progress}%`;
    progressBar.style.transition = 'width 0.3s ease-in-out';

    // Update step indicators
    updateStepIndicators(step);

    // Update navigation buttons
    updateNavigationButtons(step);
}

function updateStepIndicators(currentStep) {
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById(`step${i}-indicator`);
        const indicatorText = indicator.nextElementSibling;

        if (i < currentStep) {
            // Completed steps
            indicator.className = 'w-10 h-10 mx-auto rounded-full bg-green-600 text-white flex items-center justify-center mb-2';
            indicator.innerHTML = '✓';
            indicatorText.classList.add('text-green-600');
        } else if (i === currentStep) {
            // Current step
            indicator.className = 'w-10 h-10 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center mb-2';
            indicator.innerHTML = i;
            indicatorText.classList.add('text-indigo-600');
        } else {
            // Upcoming steps
            indicator.className = 'w-10 h-10 mx-auto rounded-full bg-gray-300 text-white flex items-center justify-center mb-2';
            indicator.innerHTML = i;
            indicatorText.classList.remove('text-green-600', 'text-indigo-600');
        }
    }
}

function updateNavigationButtons(step) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Show/hide previous button
    prevBtn.style.display = step === 1 ? 'none' : 'block';

    // Show/hide next and submit buttons
    if (step === totalSteps) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

function nextStep() {
    if (validateCurrentStep()) {
        // Save current step data
        saveStepData(currentStep);
        
        // Animate step transition
        const currentStepElement = document.getElementById(`step${currentStep}`);
        currentStepElement.style.opacity = '0';
        
        setTimeout(() => {
            currentStep = Math.min(currentStep + 1, totalSteps);
            showStep(currentStep);
            
            // If moving to preview step, populate the preview
            if (currentStep === totalSteps) {
                populatePreview();
            }
        }, 300);
    } else {
        showValidationErrors();
    }
}

function prevStep() {
    // Animate step transition
    const currentStepElement = document.getElementById(`step${currentStep}`);
    currentStepElement.style.opacity = '0';
    
    setTimeout(() => {
        currentStep = Math.max(currentStep - 1, 1);
        showStep(currentStep);
    }, 300);
}

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;

    // Clear previous error messages
    clearValidationErrors();

    // Validate required fields
    requiredFields.forEach(field => {
        if (!field.value) {
            isValid = false;
            showFieldError(field, 'This field is required');
        }
    });

    // Step-specific validation
    switch(currentStep) {
        case 1:
            isValid = validateStep1() && isValid;
            break;
        case 2:
            isValid = validateStep2() && isValid;
            break;
        case 3:
            isValid = validateStep3() && isValid;
            break;
    }

    return isValid;
}

function showFieldError(field, message) {
    field.classList.add('border-red-500');
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-sm mt-1 error-message';
    errorDiv.textContent = message;
    
    // Insert error message after the field
    field.parentNode.appendChild(errorDiv);
}

function clearValidationErrors() {
    // Remove error classes
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500');
    });
    
    // Remove error messages
    document.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });
}

function showValidationErrors() {
    // Scroll to the first error
    const firstError = document.querySelector('.border-red-500');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Step-specific validation functions
function validateStep1() {
    let isValid = true;
    
    // Validate email format
    const emailField = document.querySelector('input[name="email"]');
    if (emailField && emailField.value && !isValidEmail(emailField.value)) {
        isValid = false;
        showFieldError(emailField, 'Please enter a valid email address');
    }
    
    // Validate phone number
    const phoneField = document.querySelector('input[name="contactNumber"]');
    if (phoneField && phoneField.value && !isValidPhone(phoneField.value)) {
        isValid = false;
        showFieldError(phoneField, 'Please enter a valid 10-digit phone number');
    }
    
    return isValid;
}

function validateStep2() {
    let isValid = true;
    
    // Validate at least one fire safety equipment is selected
    const equipmentChecked = document.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    if (!equipmentChecked) {
        isValid = false;
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-500 text-sm mt-2 error-message';
        errorDiv.textContent = 'Please select at least one fire safety equipment';
        document.querySelector('.fire-equipment-section').appendChild(errorDiv);
    }
    
    return isValid;
}

function validateStep3() {
    let isValid = true;
    
    // Validate declaration checkbox
    const declaration = document.querySelector('input[name="declaration"]');
    if (!declaration.checked) {
        isValid = false;
        showFieldError(declaration, 'Please accept the declaration');
    }
    
    return isValid;
}

// Helper functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{10}$/.test(phone);
}

function saveStepData(step) {
    // Save form data to sessionStorage or state management system
    const formData = new FormData(document.getElementById('nocApplicationForm'));
    sessionStorage.setItem(`step${step}Data`, JSON.stringify(Object.fromEntries(formData)));
}

function handleSubmit(e) {
    e.preventDefault();
    if (validateCurrentStep()) {
        // Show success message
        showSuccessMessage();
        
        // Here you would typically send the form data to your server
        const formData = new FormData(e.target);
        console.log('Form submitted:', Object.fromEntries(formData));
    }
}

function showSuccessMessage() {
    const successMessage = document.createElement('div');
    successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
    successMessage.textContent = 'Application submitted successfully!';
    document.body.appendChild(successMessage);
    
    setTimeout(() => {
        successMessage.remove();
    }, 3000);
}

// Initialize the form
showStep(1);

// Add file upload preview functionality
document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Create preview element
                const preview = document.createElement('div');
                preview.className = 'mt-2 p-2 bg-gray-50 rounded-lg';
                preview.innerHTML = `
                    <p class="text-sm text-gray-600">${file.name}</p>
                    <p class="text-xs text-gray-500">${(file.size/1024/1024).toFixed(2)} MB</p>
                `;
                
                // Remove existing preview if any
                const existingPreview = input.parentNode.querySelector('.preview');
                if (existingPreview) {
                    existingPreview.remove();
                }
                
                // Add new preview
                input.parentNode.appendChild(preview);
            };
            reader.readAsDataURL(file);
        }
    });
});

// Add this function to handle payment mode change
document.querySelector('select[name="paymentMode"]').addEventListener('change', function(e) {
    if (e.target.value === 'online') {
        // Show online payment gateway
        // Add your payment gateway integration code here
    }
});

function populatePreview() {
    const formData = new FormData(document.getElementById('nocApplicationForm'));
    let previewHTML = `
        <div class="space-y-8">
            <!-- Step 1 Preview -->
            <div class="border rounded-lg p-6">
                <h4 class="text-xl font-semibold text-indigo-600 mb-4">Applicant and Building Details</h4>
                
                <!-- Applicant Details -->
                <div class="mb-6">
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Applicant Details</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Name:</span>
                            <span class="ml-2 font-medium">${formData.get('applicantName')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Contact Number:</span>
                            <span class="ml-2 font-medium">${formData.get('contactNumber')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Email:</span>
                            <span class="ml-2 font-medium">${formData.get('email')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Address:</span>
                            <span class="ml-2 font-medium">${formData.get('correspondenceAddress')}</span>
                        </div>
                    </div>
                </div>

                <!-- Building Details -->
                <div>
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Building Details</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Building Name:</span>
                            <span class="ml-2 font-medium">${formData.get('buildingName')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Building Type:</span>
                            <span class="ml-2 font-medium">${formData.get('buildingType')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Total Area:</span>
                            <span class="ml-2 font-medium">${formData.get('totalArea')} sq. ft.</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Number of Floors:</span>
                            <span class="ml-2 font-medium">${formData.get('numFloors')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Year of Construction:</span>
                            <span class="ml-2 font-medium">${formData.get('constructionYear')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Building Address:</span>
                            <span class="ml-2 font-medium">${formData.get('buildingAddress')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 2 Preview -->
            <div class="border rounded-lg p-6">
                <h4 class="text-xl font-semibold text-indigo-600 mb-4">Fire Safety Measures</h4>
                
                <!-- Fire Equipment -->
                <div class="mb-6">
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Fire Safety Equipment</h5>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div class="flex items-center">
                            <svg class="h-5 w-5 ${formData.get('fireExtinguishers') ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="${formData.get('fireExtinguishers') ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}" />
                            </svg>
                            <span class="ml-2">Fire Extinguishers</span>
                        </div>
                        <div class="flex items-center">
                            <svg class="h-5 w-5 ${formData.get('smokeDetectors') ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="${formData.get('smokeDetectors') ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}" />
                            </svg>
                            <span class="ml-2">Smoke Detectors</span>
                        </div>
                        <!-- Add other fire equipment similarly -->
                    </div>
                </div>

                <!-- Emergency Provisions -->
                <div class="mb-6">
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Emergency Provisions</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Fire Exits:</span>
                            <span class="ml-2 font-medium">${formData.get('fireExits')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Number of Staircases:</span>
                            <span class="ml-2 font-medium">${formData.get('staircases')}</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Staircase Width:</span>
                            <span class="ml-2 font-medium">${formData.get('staircaseWidth')} meters</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Overhead Tank Capacity:</span>
                            <span class="ml-2 font-medium">${formData.get('overheadTankCapacity')} liters</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Underground Tank Capacity:</span>
                            <span class="ml-2 font-medium">${formData.get('undergroundTankCapacity')} liters</span>
                        </div>
                    </div>
                </div>

                <!-- Access for Firefighters -->
                <div>
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Access for Firefighters</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Distance from Main Road:</span>
                            <span class="ml-2 font-medium">${formData.get('distanceFromRoad')} meters</span>
                        </div>
                        <div>
                            <span class="text-gray-500">Open Spaces:</span>
                            <span class="ml-2 font-medium">${formData.get('openSpaces')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 3 Preview -->
            <div class="border rounded-lg p-6">
                <h4 class="text-xl font-semibold text-indigo-600 mb-4">Declaration and Payment</h4>
                
                <!-- Declaration -->
                <div class="mb-6">
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Declaration</h5>
                    <div class="flex items-center text-sm">
                        <svg class="h-5 w-5 ${formData.get('declaration') ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="${formData.get('declaration') ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}" />
                        </svg>
                        <span class="ml-2">Declaration Accepted</span>
                    </div>
                </div>

                <!-- Payment Details -->
                <div>
                    <h5 class="text-lg font-medium text-gray-700 mb-3">Payment Details</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-500">Payment Mode:</span>
                            <span class="ml-2 font-medium">${formData.get('paymentMode')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Uploaded Documents Summary -->
            <div class="border rounded-lg p-6">
                <h4 class="text-xl font-semibold text-indigo-600 mb-4">Uploaded Documents</h4>
                <div class="space-y-3 text-sm">
                    ${createDocumentsList(formData)}
                </div>
            </div>

            <!-- Confirmation Box -->
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-yellow-700">
                            Please review all information carefully before submitting. You cannot edit after submission.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('previewContent').innerHTML = previewHTML;
}

// Helper function to create documents list
function createDocumentsList(formData) {
    const documents = [
        { name: 'ownershipProof', label: 'Ownership Proof' },
        { name: 'identityProof', label: 'Identity Proof' },
        { name: 'buildingPlan', label: 'Building Plan' },
        { name: 'installationCertificate', label: 'Fire System Installation Certificate' },
        { name: 'maintenanceCertificates', label: 'Maintenance Certificates' }
    ];

    return documents.map(doc => {
        const file = formData.get(doc.name);
        const isUploaded = file && file.name;
        return `
            <div class="flex items-center">
                <svg class="h-5 w-5 ${isUploaded ? 'text-green-500' : 'text-red-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="${isUploaded ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}" />
                </svg>
                <span class="ml-2">${doc.label}</span>
                ${isUploaded ? `<span class="ml-2 text-gray-500">(${file.name})</span>` : ''}
            </div>
        `;
    }).join('');
} 