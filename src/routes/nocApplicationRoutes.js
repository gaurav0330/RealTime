const express = require('express');
const router = express.Router();
const nocApplicationController = require('../controllers/nocApplicationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// File upload route
router.post('/upload', verifyToken, nocApplicationController.uploadFile);

// Submit NOC application
router.post('/submit', verifyToken, nocApplicationController.submit);

// Get all submitted applications
router.get('/submitted', verifyToken, nocApplicationController.getAllSubmittedApplications);

// Save draft
router.post('/draft', verifyToken, nocApplicationController.saveDraft);

// Get all drafts
router.get('/drafts', verifyToken, nocApplicationController.getSavedDrafts);

// Add new renewal endpoint
router.post('/renew', verifyToken, nocApplicationController.renewNOC);

//submit provisional noc
router.post('/submit-provisional', verifyToken, nocApplicationController.submitProvisional);

//submit to local Authority
router.post('/submit-local-authority', verifyToken, nocApplicationController.localAuthoritysubmit);

// New route for emergency NOC application
router.post('/emergency-application', verifyToken, nocApplicationController.submitEmergencyApplication);


module.exports = router;
