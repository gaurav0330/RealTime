const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Get all applications
router.get('/applications', verifyToken, agencyController.getAllApplications);

// Get application by ID
router.get('/applications/:id', verifyToken, agencyController.getApplicationById);

// Update application status
router.post('/applications/update', verifyToken, agencyController.updateApplication);

module.exports = router;
