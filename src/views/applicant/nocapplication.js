// Assuming you have a form with id="nocApplicationForm"
document.getElementById('nocApplicationForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Prevent default form submission

    // Create form data object
    const formData = {
        applicantName: this.applicantName.value,
        contactNumber: this.contactNumber.value,
        email: this.email.value,
        correspondenceAddress: this.correspondenceAddress.value,
        buildingName: this.buildingName.value,
        buildingAddress: this.buildingAddress.value,
        buildingType: this.buildingType.value,
        totalArea: this.totalArea.value,
        numFloors: this.numFloors.value,
        constructionYear: this.constructionYear.value
    };

    try {
        const response = await fetch('/api/noc-application/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        
        // Handle successful submission
        alert('Application submitted successfully!');
        // Optionally redirect to a success page
        window.location.href = '/views/applicant/dashboard.html';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to submit application. Please try again.');
    }
}); 