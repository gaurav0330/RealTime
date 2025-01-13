const express = require('express');
const { verifyCFO } = require('../middlewares/authMiddleware');
const { 
    getPendingApplications, 
    reviewApplication, 
    getAllApplications, 
    getApplicationDetails, 
    generateAndStoreNOC ,
    // sendCustomEmail
    testEmail
} = require('../controllers/cfoController');

const router = express.Router();

// Get applications from all collections
router.get('/all-applications', getAllApplications);

// Get pending applications for CFO review
router.get('/pending', verifyCFO, getPendingApplications);

// Review and approve/reject an application
router.post('/review', reviewApplication);

// Add this new route
router.get('/application/:id', getApplicationDetails);

// Add this new route
router.post('/generate-noc', generateAndStoreNOC);

// // router.post('/send-email', sendCustomEmail);

// router.post('/test-email', testEmail);

module.exports = router;   
