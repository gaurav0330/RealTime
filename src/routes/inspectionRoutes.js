const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Get all applications from inspection list
router.get('/inspection-list',  inspectionController.getInspectionList);

// Complete inspection and add to CFO list
router.post('/complete',  inspectionController.markInspectionCompleted);

module.exports = router;
