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
        if (!validateCurrentStep(step)) {
            showMessage(`Please complete all required fields in step ${step}`, 'error');
            showStep(step);
            return;
        }
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-spin">↻</span> Submitting...';

    try {
        // Handle file uploads first
        const fileInputs = document.querySelectorAll('input[type="file"]');
        const uploadedFiles = {};
        
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
                    const urlKey = input.name + 'Url';
                    uploadedFiles[urlKey] = data.fileUrl;
                } else {
                    throw new Error(`Failed to upload ${input.name}`);
                }
            }
        }

        // Collect form data
        const form = document.getElementById('nocApplicationForm');
        const formData = new FormData(form);
        
        // Create application data object
        const applicationData = {
            // Applicant Details
            
            applicantName: formData.get('applicantName'),
            contactNumber: formData.get('contactNumber'),
            email: formData.get('email'),
            state: formData.get('state'),
            city: formData.get('city'),
            applicantType: formData.get('applicantType'),
            
            // Building Specifications
            buildingName: formData.get('buildingName'),
            plotNumber: formData.get('plotNumber'),
            buildingAddress: formData.get('buildingAddress'),
            landmark: formData.get('landmark'),
            buildingType: formData.get('buildingType'),
            priority: formData.get('priority'),
            buildingHeight: parseFloat(formData.get('buildingHeight')),
            totalCoverdArea: parseFloat(formData.get('builtUpArea')),
            numBasements: parseInt(formData.get('numBasements')),
            numFloors: parseInt(formData.get('numFloors')),
            maxOccupancy: parseInt(formData.get('maxOccupancy')),
            
            
            // Document URLs from uploaded files
            ...uploadedFiles,
            
            // Compliance Declarations
            buildingCodeCompliance: formData.get('buildingCodeCompliance') ,
            equipmentCompliance: formData.get('equipmentCompliance') ,
            documentCompliance: formData.get('documentCompliance') ,
            
            // Payment Information
            paymentReference: formData.get('paymentReference'),

            // Add latitude and longitude from the hidden input
    buildingLatitude: parseFloat(document.getElementById('buildingLocation').value.split(',')[0]),
    buildingLongitude: parseFloat(document.getElementById('buildingLocation').value.split(',')[1]),


            // Step 2 Details
            division: formData.get('division'),
            occupancyType: formData.get('buildingType'),
            groundFloorArea: formData.get('groundFloorArea'),
            typicalFloorArea: formData.get('typicalFloorArea'),
            basementArea: formData.get('basementArea'),
            travelDistance: formData.get('travelDistance'),
            deadEndDistance: formData.get('deadEndDistance'),
            upperFloorStaircases: formData.get('upperFloorStaircases'),
            fireCheckDoor: formData.get('fireCheckDoor'),
            pressurization: formData.get('pressurization'),
            undergroundCapacity: formData.get('undergroundCapacity'),
            overheadCapacity: formData.get('overheadCapacity'),
            fireServiceInlet: formData.get('fireServiceInlet'),
            specialProtectionDetails: formData.get('specialProtectionDetails'),
            compartmentSize: formData.get('compartmentSize'),
            upperFloorCompartments: formData.get('upperFloorCompartments'),
            basementFloorCompartments: formData.get('basementFloorCompartments'),
            fireExtinguishersCount: parseInt(formData.get('fireExtinguishersCount')),
            hoseReelLocation: formData.get('hoseReelLocation'),
            hoseReelCount: formData.get('hoseReelCount'),
            detectorType: formData.get('detectorType'),
            detectorAboveCeiling: formData.get('detectorAboveCeiling') ,
            detectorInDuct: formData.get('detectorInDuct'),
            moefa: formData.get('moefa') ,
            publicAddress: formData.get('publicAddress') ,
            basementSprinklers: formData.get('basementSprinklers'),
            upperFloorSprinklers: formData.get('upperFloorSprinklers'),
            sprinklerAboveCeiling: formData.get('sprinklerAboveCeiling') ,
            sprinklerCalculations: formData.get('sprinklerCalculations') ,
            riserSize: formData.get('riserSize'),
            hydrantsPerFloor: formData.get('hydrantsPerFloor'),
            hydrantLocation: formData.get('hydrantLocation'),
            hoseBoxes: formData.get('hoseBoxes'),
            pumpRoomLocation: formData.get('pumpRoomLocation'),
            mainPumpDischarge: formData.get('mainPumpDischarge'),
            mainPumpHead: formData.get('mainPumpHead'),
            mainPumpCount: formData.get('mainPumpCount'),
            jockeyPumpOutput: formData.get('jockeyPumpOutput'),
            jockeyPumpHead: formData.get('jockeyPumpHead'),
            jockeyPumpCount: formData.get('jockeyPumpCount'),
            standbyPumpOutput: formData.get('standbyPumpOutput'),
            standbyPumpHead: formData.get('standbyPumpHead'),
            pumpHouseAccess: formData.get('pumpHouseAccess'),
            terracePumpDischarge: formData.get('terracePumpDischarge'),
            terracePumpHead: formData.get('terracePumpHead'),
            tankLocation: formData.get('tankLocation'),
            waterStorageFireInlet: formData.get('waterStorageFireInlet'),
            tankAccess: formData.get('tankAccess') ,
            inspectionLadder: formData.get('inspectionLadder') ,
            crossSectionDrawing: formData.get('crossSectionDrawing') ,
            exitSignage: formData.get('exitSignage') ,
            passengerLiftCount: formData.get('passengerLiftCount'),
            firemanSwitch: formData.get('firemanSwitch') ,
            liftShaftPressure: formData.get('liftShaftPressure') ,
            liftLobbyPressure: formData.get('liftLobbyPressure') ,
            standbyPower: formData.get('standbyPower') ,
            refugeLevels: formData.get('refugeLevels'),
            refugeArea: formData.get('refugeArea'),
            refugeStairCaseAccess: formData.get('refugeStairCaseAccess') ,
            fireCheckFloor: formData.get('fireCheckFloor') ,
            controlRoomLocation: formData.get('controlRoomLocation') 
        };

        console.log("Application data:", applicationData);

        // Submit to backend
        const response = await fetch('/api/noc-application/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(applicationData)
        });

        const data = await response.json();
        console.log("Server response:", data);

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
        { label: 'Name of Applicant', value: formData.get('applicantName') },
        { label: 'Contact Number', value: formData.get('contactNumber') },
        { label: 'Email Address', value: formData.get('email') },
        { label: 'State', value: formData.get('state') },
        { label: 'City', value: formData.get('city') },
        { label: 'Applicant Type', value: formData.get('applicantType') },
        { label: 'Building/Premises Name', value: formData.get('buildingName') },
        { label: 'Plot Number', value: formData.get('plotNumber') },
        { label: 'Complete Address', value: formData.get('buildingAddress') },
        { label: 'Landmark', value: formData.get('landmark') },
        { label: 'Type of Building', value: formData.get('buildingType') },
        { label: 'Building Height (meters)', value: formData.get('buildingHeight') },
        { label: 'Total Built-up Area (sq. meters)', value: formData.get('builtUpArea') },
        { label: 'Number of Basements', value: formData.get('numBasements') },
        { label: 'Number of Floors', value: formData.get('numFloors') },
        { label: 'Maximum Occupancy (persons)', value: formData.get('maxOccupancy') },
        { label: 'Ground Floor Covered Area (sq mt)', value: formData.get('groundFloorArea') },
        { label: 'Typical Floor Area (sq mt)', value: formData.get('typicalFloorArea') },
        { label: 'Basement Floor Area (sq mt)', value: formData.get('basementArea') },
        { label: 'Travel Distance (meters)', value: formData.get('travelDistance') },
        { label: 'Dead End Travel Distance (meters)', value: formData.get('deadEndDistance') },
        { label: 'Upper Floor Staircases Count', value: formData.get('upperFloorStaircases') },
        { label: 'Upper Floor Staircase Width (meters)', value: formData.get('upperFloorStaircaseWidth') },
        { label: 'Fire Check Door', value: formData.get('fireCheckDoor') },
        { label: 'Pressurization System', value: formData.get('pressurization') },
        { label: 'Underground Tank Capacity (Liters)', value: formData.get('undergroundCapacity') },
        { label: 'Overhead Tank Capacity (Liters)', value: formData.get('overheadCapacity') },
        { label: 'Fire Service Inlet', value: formData.get('fireServiceInlet') },
        { label: 'Special Risks Protection Details', value: formData.get('specialProtectionDetails') },
        { label: 'Compartment Size (sq mt)', value: formData.get('compartmentSize') },
        { label: 'Fire Compartments (Upper Floor)', value: formData.get('upperFloorCompartments') },
        { label: 'Fire Compartments (Basement)', value: formData.get('basementFloorCompartments') },
        { label: 'Total Numbers of Fire Extinguishers on Each Floor', value: formData.get('fireExtinguishersCount') },
        { label: 'Location of First-aid Hose Reels Near Stairs', value: formData.get('hoseReelLocation') },
        { label: 'Total Number of First-aid Hose Reels on Each Floor', value: formData.get('hoseReelCount') },
        { label: 'Type of Detectors', value: formData.get('detectorType') },
        { label: 'Detector Above False Ceiling', value: formData.get('detectorAboveCeiling') },
        { label: 'Provision of Detectors in Duct, Shaft etc.', value: formData.get('detectorInDuct') }
    ];

    // Create HTML content with a table layout
    previewContent.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; font-size: 12px;">
            <h2 style="text-align: center; margin-bottom: 20px; font-size: 18px;">Fire NOC Application Preview</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 8px; text-align: left; background-color: #f2f2f2; width: 30%;">Key</th>
                        <th style="border: 1px solid #000; padding: 8px; text-align: left; background-color: #f2f2f2; width: 70%;">Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${fieldsToShow.map(item => `
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${item.label}</td>
                            <td style="border: 1px solid #000; padding: 8px;">${item.value || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// PDF Download Functionality

// PDF Download Functionality
document.getElementById('downloadPdfBtn').addEventListener('click', function() {
    const element = document.getElementById('previewContent');

    // Check if the preview content is empty
    if (element.innerHTML.trim() === '') {
        alert('No content to download. Please fill out the form first.');
        return;
    }

    // Generate and download PDF with custom styles
    html2pdf().from(element).set({
        margin: [20, 20, 20, 20], // Adjust margins
        filename: 'fire-noc-application.pdf',
        html2canvas: {
            scale: 2 // Improve PDF image quality
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    }).save();
});

