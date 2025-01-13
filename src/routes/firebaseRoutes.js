const express = require('express');
const { fetchData } = require('../controllers/firebaseController.js');

const router = express.Router();

// Route to fetch data from Firebase Realtime Database
router.get('/firebase-data', fetchData);

module.exports = router;