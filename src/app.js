const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const nocApplicationRoutes = require('./routes/nocApplicationRoutes');
const assessorRoutes = require('./routes/assessorRoutes');
const cfoRoutes = require('./routes/cfoRoutes');
const fileUpload = require('express-fileupload');
const inspectionRoutes = require('./routes/inspectionRoutes');
const agencyRoutes = require('./routes/agencyRoutes');
const inspectionController = require('./controllers/inspectionController');
const agencyController = require('./controllers/agencyController');
const firebaseRoutes = require('./routes/firebaseRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(cookieParser('secret'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File Upload Middleware
app.use(fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max-file-size
    createParentPath: true
}));



// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public/')));

// Serve files from src/views directory
app.use('/views', express.static(path.join(__dirname, 'views')));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/noc-application', nocApplicationRoutes);
app.use('/api/assessor', assessorRoutes);
app.use('/api/cfo', cfoRoutes);
app.use('/api/inspection',inspectionRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api', firebaseRoutes);

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;