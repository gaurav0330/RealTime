const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// User signup route
router.post('/signup', authController.signup);

// User login route
router.post('/login', authController.login);

//send otp
router.post('/send-otp', authController.sendOtp);


//verify otp    
router.post('/verify-otp', authController.verifyOtp);
// Get user age route
//router.get('/age', verifyToken, authController.getUserAge);

// Get user's NOC applications
router.get('/my-applications', verifyToken, authController.getUserNOCApplications);

// Check if a NOC application exists
router.get('/check-noc-application', verifyToken, authController.checkExistingNOCApplication);

// Get user info route
router.get('/status', verifyToken, authController.getUserInfo);

// Get user profile route
router.get('/profile', verifyToken, authController.getUserProfile);

//get static profile
router.get('/static-profile',  authController.getstaticUserProfile);


// Get signed download URL route
router.post('/geturl', authController.getUrl);

// Add new route for NOC renewal check
router.get('/check-renewal', verifyToken, authController.checkNOCRenewal);

// Simplified location data route
router.get('/locations/pincode/:pincode', authController.getLocationByPincode);

// // Add new route for login notification
// router.post('/send-login-notification', verifyToken, authController.sendLoginNotification);

// Export the router
module.exports = router;
