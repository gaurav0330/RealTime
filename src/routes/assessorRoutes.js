const express = require('express');
const router = express.Router();
const assessorController = require('../controllers/assessorController');
const {verifyAssessor} = require('../middlewares/authMiddleware');

router.get('/applications', verifyAssessor, assessorController.getApplications);
router.get('/applications/:id', assessorController.getApplicationById);
router.post('/update',verifyAssessor, assessorController.updateApplication);
router.post('/mark-for-payment', assessorController.markForPayment);
router.get('/renew-applications', verifyAssessor, assessorController.getRenewApplications);
router.get('/renew-applications/:id',  assessorController.getRenewalApplicationById);
router.post('/updateRenewal',verifyAssessor,assessorController.updateRenewalApplication);
router.get('/provisional-applications',verifyAssessor ,  assessorController.getProvisionalApplications);
router.get('/provisional-applications/:id',  assessorController.provisionalApplicationById);
router.post('/updateProvisional',assessorController.generateAndStoreNOC);
router.get('/local-authority-applications',  assessorController.getLocalAuthorityApplications);
router.get('/local-authority-applications/:id',  assessorController.getLocalAuthorityApplicationById);

module.exports = router;
