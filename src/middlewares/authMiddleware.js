const { auth } = require('../config/firebase');
const admin = require('../config/firebaseAdmin'); // Firebase Admin SDK
const {doc,getDoc} = require('firebase/firestore');
const {db} = require('../config/firebase');
//  assessor verification
const verifyAssessor = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'No authorization token provided' 
            });
        }

        // Verify token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Get assessor document
        const assessorRef = doc(db, 'assessors', decodedToken.uid);
        const assessorDoc = await getDoc(assessorRef);

        if (!assessorDoc.exists()) {
            return res.status(403).json({ 
                success: false,
                message: 'Unauthorized: Not an assessor' 
            });
        }

        // Add user and assessor data to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            state: assessorDoc.data().state,
            role: 'assessor'
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            success: false,
            message: 'Authentication failed',
            error: error.message 
        });
    }
}; 

//cfo verification
const verifyCFO = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'No authorization token provided' 
            });
        }

        // Verify token
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Get assessor document
        const cfoRef = doc(db, 'chiefFireOfficers', decodedToken.uid);
        const cfoDoc = await getDoc(cfoRef);

        if (!cfoDoc.exists()) {
            return res.status(403).json({ 
                success: false,
                message: 'Unauthorized: Not an CFO' 
            });
        }

        // Add user and assessor data to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            state: cfoDoc.data().state,
            role: 'chief-fire-officer'
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            success: false,
            message: 'Authentication failed',
            error: error.message 
        });
    }
}; 


// Validation middleware for Signup
const validateSignup = (req, res, next) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    // Password length validation
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Role validation (ensure only valid roles)
    const validRoles = ['citizen', 'assessor', 'chief-fire-officer', 'agency'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role selected" });
    }

    next();
};

// Validation middleware for Login
const validateLogin = (req, res, next) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Role validation
    const validRoles = ['citizen', 'assessor', 'chief-fire-officer', 'agency'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role selected" });
    }

    next();
};

// Token verification middleware (using Firebase Admin SDK)


const verifyToken = async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // Extract the token (remove 'Bearer ' from the header)
    const token = authHeader.split(' ')[1];

    try {
        // Verify the token
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;  // Attach decoded user information to the request
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = {  validateSignup,
    
    verifyAssessor ,validateLogin,
    verifyToken,
    verifyCFO
    };  // Ensure you export this updated middleware



