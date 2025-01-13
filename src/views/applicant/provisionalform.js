let currentStep = 1;
const totalSteps = 4;
let uploadedFiles = {};
let drafts = [];


// Initialize form when document is ready
// Ensure DOM is ready before execution
document.addEventListener('DOMContentLoaded', function() {
    // Initialize progress bar and steps
    updateProgress(currentStep);
    showStep(currentStep);
    updateNavigationButtons(currentStep);


    // Navigation button listeners
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const form = document.getElementById('nocApplicationForm');


    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateCurrentStep(currentStep)) {
                nextStep();
            }
        });
    }


    if (prevBtn) {
        prevBtn.addEventListener('click', prevStep);
    }


    if (form) {
        form.addEventListener('submit', submitForm);
    }


    // PDF Download Button Listener
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', function() {
            const element = document.getElementById('previewContent');
            html2pdf().from(element).save('fire-noc-application.pdf');
        });
    }


    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const draftsList = document.getElementById('draftsList');


    // Load drafts when the page loads
    loadDrafts();


    // Save draft event
    saveDraftBtn.addEventListener('click', async function() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());


        try {
            const response = await fetch('/api/noc-application/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data)
            });


            if (response.ok) {
                const result = await response.json();
                showMessage(result.message, 'success');
                loadDrafts(); // Reload the draft
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save draft');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            showMessage('Failed to save draft: ' + error.message, 'error');
        }
    });


    // Load drafts function
    async function loadDrafts() {
        try {
            const response = await fetch('/api/noc-application/drafts', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });


            if (response.ok) {
                const data = await response.json();
                drafts = data.drafts;
                displayDrafts(drafts);
            } else {
                console.error('Failed to load drafts');
            }
        } catch (error) {
            console.error('Error loading drafts:', error);
        }
    }


    // Display drafts in the list
    function displayDrafts(drafts) {
        draftsList.innerHTML = '';
        drafts.forEach(draft => {
            const listItem = document.createElement('li');
            listItem.className = 'p-4 bg-white rounded-lg shadow-md flex justify-between items-center';
            listItem.innerHTML = `
                <div>
                    <p class="font-semibold">${draft.applicantName || 'Unnamed Draft'}</p>
                    <p class="text-sm text-gray-500">
                        ${draft.buildingName ? `Building: ${draft.buildingName}` : ''}
                        ${draft.updatedAt ? `<br>Last updated: ${new Date(draft.updatedAt).toLocaleDateString()}` : ''}
                    </p>
                </div>
                <button class="px-4 py-2 bg-indigo-400 text-white rounded-lg hover:bg-indigo-500"
                    onclick="loadDraft('${draft.id}')">
                    Load Draft
                </button>
            `;
            draftsList.appendChild(listItem);
        });


        // Show message if no drafts
        if (drafts.length === 0) {
            draftsList.innerHTML = `
                <li class="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    No saved drafts found
                </li>
            `;
        }
    }


    // Load a specific draft into the form
    window.loadDraft = function(draftId) {
        const draft = drafts.find(d => d.id === draftId);
        if (draft) {
            for (const key in draft) {
                const element = form.elements[key];
                if (element) {
                    // Skip file inputs but store their URLs
                    if (element.type === 'file') {
                        // Store the file URL in a data attribute
                        element.dataset.fileUrl = draft[key];
                       
                        // Optional: Display the filename or a message next to the input
                        const fileLabel = element.parentElement.querySelector('.file-status') ||
                            createFileStatus(element);
                        fileLabel.textContent = draft[key] ? 'File previously uploaded' : 'No file uploaded';
                    } else {
                        // Handle all other input types normally
                        element.value = draft[key];
                    }
                }
            }
            // Show success message
            showMessage('Draft loaded successfully', 'success');
        }
    };


    // Helper function to create file status element
    function createFileStatus(fileInput) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'file-status text-sm text-gray-600 mt-1';
        fileInput.parentElement.appendChild(statusDiv);
        return statusDiv;
    }
});


function updateProgress(step) {
    const progress = ((step - 1) / (totalSteps - 1)) * 100;
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }


    // Update step indicators
    for (let i = 1; i <= totalSteps; i++) {
        const indicator = document.getElementById(`step${i}-indicator`);
        if (indicator) {
            if (i < step) {
                indicator.classList.remove('bg-gray-300');
                indicator.classList.add('bg-green-500');
            } else if (i === step) {
                indicator.classList.remove('bg-gray-300', 'bg-green-500');
                indicator.classList.add('bg-indigo-400');
            } else {
                indicator.classList.remove('bg-green-500', 'bg-indigo-400');
                indicator.classList.add('bg-gray-300');
            }
        }
    }
}


function nextStep() {
    if (currentStep < totalSteps && validateCurrentStep(currentStep)) {
        currentStep++;
        showStep(currentStep);
        updateProgress(currentStep);
        updateNavigationButtons(currentStep);
    }
}


function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        updateProgress(currentStep);
        updateNavigationButtons(currentStep);
    }
}


function showStep(step) {
    const steps = document.querySelectorAll('.form-step');
    steps.forEach(s => s.classList.add('hidden'));
   
    const currentStepElement = document.getElementById(`step${step}`);
    if (currentStepElement) {
        currentStepElement.classList.remove('hidden');
    }


    if (step === totalSteps) {
        populatePreview();
    }
}


function updateNavigationButtons(step) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');


    if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'block';
    if (nextBtn) nextBtn.style.display = step === totalSteps ? 'none' : 'block';
    if (submitBtn) submitBtn.style.display = step === totalSteps ? 'block' : 'none';
}


function validateCurrentStep(step) {
    const currentStepElement = document.getElementById(`step${step}`);
    if (!currentStepElement) return false;


    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;


    requiredFields.forEach(field => {
        field.classList.remove('border-red-500');
       
        if (field.type === 'file') {
            if (!field.files.length) {
                field.parentElement.classList.add('border-red-500');
                isValid = false;
            }
        } else if (field.type === 'checkbox' && !field.checked) {
            field.parentElement.classList.add('border-red-500');
            isValid = false;
        } else if (!field.value.trim()) {
            field.classList.add('border-red-500');
            isValid = false;
        }
    });


    return isValid;
}




// Function to determine NOC priority based on building type
function getNOCPriority(buildingType) {
    const priorityMapping = {
        high: ["hazardous", "assembly", "industrial"],
        medium: ["institutional", "commercial", "storage", "mixed"],
        low: ["residential"]
    };


    for (const [priority, types] of Object.entries(priorityMapping)) {
        if (types.includes(buildingType.toLowerCase())) {
            return priority.charAt(0).toUpperCase() + priority.slice(1); // Returns "High", "Medium", or "Low"
        }
    }
    return "Unknown";  // Default value if no match is found
}




// Form Submission Logic
async function submitForm(event) {
    event.preventDefault();
    console.log("Form submission initiated");


    // Validate all steps before submission
    for (let step = 1; step <= totalSteps; step++) {
        console.log(`Validating step ${step}`);
        if (!validateCurrentStep(step)) {
            console.log(`Validation failed at step ${step}`);
            showMessage(`Please complete all required fields in step ${step}`, 'error');
            showStep(step);
            return;
        }
    }


    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-spin">↻</span> Submitting...';


    try {
        // Handle file uploads (remains unchanged)
        const fileInputs = document.querySelectorAll('input[type="file"]');
        for (const input of fileInputs) {
            if (input.files.length > 0) {
                const file = input.files[0];
                console.log(`Uploading file: ${file.name}`);
               
                const formData = new FormData();
                formData.append('file', file);


                const response = await fetch('/api/noc-application/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });


                const data = await response.json();
                if (response.ok) {
                    console.log(`File uploaded successfully: ${data.fileUrl}`);
                    const urlKey = input.name + 'Url';  // Match backend field names
                    uploadedFiles[urlKey] = data.fileUrl;
                } else {
                    throw new Error(`Failed to upload ${input.name}`);
                }
            }
        }


        // Collect all form data
        const form = document.getElementById('nocApplicationForm');
        const formData = new FormData(form);
       
        // Determine the building priority
        const buildingType = formData.get('buildingType');
        const buildingPriority = getNOCPriority(buildingType);  // Apply priority function


        // Collect form data into applicationData object
        const applicationData = {
            // Applicant Details
            applicantName: formData.get('applicantName'),
            contactNumber: formData.get('contactNumber'),
            email: formData.get('email'),
            state: formData.get('state'),
            city: formData.get('city'),
            applicantType: formData.get('applicantType'),


            // Building Details
            buildingName: formData.get('buildingName'),
            plotNumber: formData.get('plotNumber'),
            buildingAddress: formData.get('buildingAddress'),
            landmark: formData.get('landmark'),
            buildingType: buildingType,
            priority: getNOCPriority(formData.get('buildingType')),  // Add the priority here
            buildingHeight: parseFloat(formData.get('buildingHeight')),
            builtUpArea: parseFloat(formData.get('builtUpArea')),
            numBasements: parseInt(formData.get('numBasements')),
            numFloors: parseInt(formData.get('numFloors')),
            maxOccupancy: parseInt(formData.get('maxOccupancy')),


            // Fire Safety Equipment
            fireExtinguishers: formData.get('fireExtinguishers') === 'on',
            smokeDetectors: formData.get('smokeDetectors') === 'on',
            sprinklerSystem: formData.get('sprinklerSystem') === 'on',
            fireHydrants: formData.get('fireHydrants') === 'on',
            fireAlarmSystem: formData.get('fireAlarmSystem') === 'on',
            emergencyLights: formData.get('emergencyLights') === 'on',


            // Water Supply and Storage
            undergroundTankCapacity: parseInt(formData.get('undergroundTankCapacity')),
            terraceWaterTank: parseInt(formData.get('terraceWaterTank')),
            firePumpCapacity: parseFloat(formData.get('firePumpCapacity')),
            hydrantPoints: parseInt(formData.get('hydrantPoints')),


            // Emergency Evacuation
            emergencyExits: parseInt(formData.get('emergencyExits')),
            assemblyPoint: formData.get('assemblyPoint'),


            // Compliance Declarations
            buildingCodeCompliance: formData.get('buildingCodeCompliance') === 'on',
            equipmentCompliance: formData.get('equipmentCompliance') === 'on',
            documentCompliance: formData.get('documentCompliance') === 'on',
            // Include uploaded file URLs
            ...uploadedFiles
        };


        console.log("Final application data: ", applicationData);


        // Submit applicationData to backend
        const response = await fetch('/api/noc-application/submit-provisional', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(applicationData)
        });


        const data = await response.json();
        console.log("Server response: ", data);


        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit application');
        }


        showMessage('Application submitted successfully!', 'success');
        setTimeout(() => {
            window.location.href = '/applicant/dashboard.html';
        }, 2000);


    } catch (error) {
        console.error('Submission error:', error);
        showMessage(error.message || 'Failed to submit application', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Application';
    }
}






// Utility function to show messages
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}


function populatePreview() {
    const formData = new FormData(document.getElementById('nocApplicationForm'));
    const previewContent = document.getElementById('previewContent');


    const fieldsToShow = [
        { label: 'Applicant Name', value: formData.get('applicantName') },
        { label: 'Contact Number', value: formData.get('contactNumber') },
        { label: 'Email Address', value: formData.get('email') },
        { label: 'Building Name', value: formData.get('buildingName') },
        { label: 'Building Address', value: formData.get('buildingAddress') },
        { label: 'Building Type', value: formData.get('buildingType') },
        // { label: 'Total Area (sq. ft.)', value: formData.get('totalArea') },
        { label: 'Number of Floors', value: formData.get('numFloors') },
        // { label: 'Year of Construction', value: formData.get('constructionYear') },
        { label: 'Fire Pump Capacity', value: formData.get('firePumpCapacity') },
        { label: 'Hydrant Points', value: formData.get('hydrantPoints') },
        { label: 'Emergency Exits', value: formData.get('emergencyExits') },
        { label: 'Assembly Point', value: formData.get('assemblyPoint') }
    ];


    previewContent.innerHTML = fieldsToShow.map(item => `
        <div class="flex justify-between border-b py-2">
            <span class="font-semibold">${item.label}:</span>
            <span>${item.value || '-'}</span>
        </div>
    `).join('');
}


// PDF Download Functionality
document.getElementById('downloadPdfBtn').addEventListener('click', function() {
    const element = document.getElementById('previewContent');
    html2pdf().from(element).save('fire-noc-application.pdf');
});




