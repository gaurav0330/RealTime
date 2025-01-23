const { auth, db } = require('../config/firebase');
const { getStorage } = require('firebase-admin/storage');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs ,setDoc } = require('firebase/firestore');
const { sendEmail } = require('./emailController');
const axios = require('axios');
const pincodeDirectory = require('india-pincode-search');
const validator = require('aadhaar-validator');
const e = require('express');


// District to Division mapping
const districtToDivisionMap = {
    // Maharashtra Divisions (6 Administrative Divisions)
    // 1. Konkan Division
    'Mumbai City': 'Konkan',
    'Mumbai Suburban': 'Konkan',
    'Thane': 'Konkan',
    'Palghar': 'Konkan',
    'Raigad': 'Konkan',
    'Ratnagiri': 'Konkan',
    'Sindhudurg': 'Konkan',

    // 2. Pune Division
    'Pune': 'Pune',
    'Satara': 'Pune',
    'Sangli': 'Pune',
    'Solapur': 'Pune',
    'Kolhapur': 'Pune',

    // 3. Nashik Division
    'Nashik': 'Nashik',
    'Dhule': 'Nashik',
    'Jalgaon': 'Nashik',
    'Ahmednagar': 'Nashik',
    'Nandurbar': 'Nashik',

    // 4. Aurangabad Division
    'Aurangabad': 'Aurangabad',
    'Jalna': 'Aurangabad',
    'Beed': 'Aurangabad',
    'Latur': 'Aurangabad',
    'Osmanabad': 'Aurangabad',
    'Nanded': 'Aurangabad',
    'Parbhani': 'Aurangabad',
    'Hingoli': 'Aurangabad',

    // 5. Amravati Division
    'Amravati': 'Amravati',
    'Akola': 'Amravati',
    'Buldhana': 'Amravati',
    'Yavatmal': 'Amravati',
    'Washim': 'Amravati',

    // 6. Nagpur Division
    'Nagpur': 'Nagpur',
    'Wardha': 'Nagpur',
    'Bhandara': 'Nagpur',
    'Gondia': 'Nagpur',
    'Chandrapur': 'Nagpur',
    'Gadchiroli': 'Nagpur',

    // Tamil Nadu Divisions (6 Revenue Divisions)
    // 1. Chennai Division
    'Chennai': 'Chennai',
    'Tiruvallur': 'Chennai',
    'Kancheepuram': 'Chennai',
    'Chengalpattu': 'Chennai',

    // 2. Coimbatore Division
    'Coimbatore': 'Coimbatore',
    'Tiruppur': 'Coimbatore',
    'Erode': 'Coimbatore',
    'Nilgiris': 'Coimbatore',

    // 3. Madurai Division
    'Madurai': 'Madurai',
    'Theni': 'Madurai',
    'Dindigul': 'Madurai',
    'Ramanathapuram': 'Madurai',
    'Sivaganga': 'Madurai',
    'Virudhunagar': 'Madurai',

    // 4. Trichy Division
    'Tiruchirappalli': 'Trichy',
    'Karur': 'Trichy',
    'Ariyalur': 'Trichy',
    'Perambalur': 'Trichy',
    'Pudukkottai': 'Trichy',
    'Thanjavur': 'Trichy',
    'Tiruvarur': 'Trichy',
    'Nagapattinam': 'Trichy',

    // 5. Salem Division
    'Salem': 'Salem',
    'Namakkal': 'Salem',
    'Dharmapuri': 'Salem',
    'Krishnagiri': 'Salem',

    // 6. Tirunelveli Division
    'Tirunelveli': 'Tirunelveli',
    'Tenkasi': 'Tirunelveli',
    'Thoothukudi': 'Tirunelveli',
    'Kanyakumari': 'Tirunelveli',

    // Delhi Districts (11 Revenue Districts)
    'Central Delhi': 'Central Delhi',
    'East Delhi': 'East Delhi',
    'New Delhi': 'New Delhi',
    'North Delhi': 'North Delhi',
    'North East Delhi': 'North East Delhi',
    'North West Delhi': 'North West Delhi',
    'Shahdara': 'Shahdara',
    'South Delhi': 'South Delhi',
    'South East Delhi': 'South East Delhi',
    'South West Delhi': 'South West Delhi',
    'West Delhi': 'West Delhi'
};

// Helper function to get division from district
function getDivisionFromDistrict(district, state) {
    // Try to get the mapped division
    const division = districtToDivisionMap[district];
    
    if (!division) {
        // If no mapping found, handle special cases based on state
        switch(state) {
            case 'Maharashtra':
                return 'Other Maharashtra Division';
            case 'Tamil Nadu':
                return 'Other Tamil Nadu Division';
            case 'Delhi':
                return 'Delhi';
            default:
                // Remove 'District' or 'dist' from the name if present
                const cleanDistrict = district.replace(/(District|dist\.?)/gi, '').trim();
                return `${cleanDistrict} Division`;
        }
    }
    
    return division;
}

// Add this validation function
function isValidAadhaar(aadhaarNumber) {
    try {
        return validator.isValidNumber(aadhaarNumber);
    } catch (error) {
        console.error('Aadhaar validation error:', error);
        return false;
    }
}

const authController = {
    // Signup controller
    signup: async (req, res) => {
        try {
            const { 
                email, 
                password, 
                name, 
                role, 
                state,
                division,    // New field
                district,    // New field
                city,       // New field
                // Role-specific fields
                nationalId,  // For citizens
                badgeNumber, // For assessors and chief fire officers
                department,  // For assessors and chief fire officers
                companyName  // For agencies
            } = req.body;
    
            // Validate role
            const allowedRoles = ['citizen', 'assessor', 'chief-fire-officer', 'agency','station-officer','assistant-divisional-officer','divisional-officer','local-authority'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role specified' });
            }
    
            // Validate required location fields
            if (!state || !division || !district || !city) {
                return res.status(400).json({ message: 'All location fields are required' });
            }
    
            // Validate Aadhaar number for citizens
            if (role === 'citizen') {
                if (!nationalId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Aadhaar number is required for citizens'
                    });
                }

                if (!isValidAadhaar(nationalId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid Aadhaar number'
                    });
                }
            }
    
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
    
            // Define common user data
            const userData = {
                uid: user.uid,
                name,
                email,
                role,
                // Location data
                state,
                division,
                district,
                city,
                createdAt: new Date().toISOString(),
            };
    
            // Add role-specific data
            if (role === 'citizen' && nationalId) {
                userData.nationalId = nationalId;
            } else if ((role === 'assessor' || role === 'chief-fire-officer') && badgeNumber && department) {
                userData.badgeNumber = badgeNumber;
                userData.department = department;
            } else if (role === 'agency' && companyName) {
                userData.companyName = companyName;
            }else if (role === 'station-officer') {
                userData.badgeNumber = badgeNumber;
                userData.department = department;    
            }else if (role === 'assistant-divisional-officer') {
                userData.badgeNumber = badgeNumber;
                userData.department = department;    
            }else if (role === 'divisional-officer') {
                userData.badgeNumber = badgeNumber;
                userData.department = department;                                
            }
            
            
    
            // Update the roleCollectionMap to match the role values
            const roleCollectionMap = {
                'citizen': 'users',
                'assessor': 'assessors',
                'chief-fire-officer': 'chiefFireOfficers',
                'agency': 'agencies',
                'station-officer': 'stationOfficers',
                'assistant-divisional-officer': 'assistantDivisionalOfficers',
                'divisional-officer': 'divisionalOfficers',
                'local-authority': 'localAuthorities'
            };
            const collectionName = roleCollectionMap[role];
    
            // Store user data in the specific role-based collection
            await setDoc(doc(db, collectionName, user.uid), userData);
    
            res.status(201).json({
                message: "User created successfully",
                user: {
                    uid: user.uid,
                    email: user.email,
                    role,
                    state,
                    division,
                    district,
                    city,
                },
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(400).json({
                message: error.message || "Error creating user",
            });
        }
    },
    

    sendOtp: async (req, res) => {
        let { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Add +91 to the phone number if it's not already included
    if (!phoneNumber.startsWith('+91')) {
        phoneNumber = '+91' + phoneNumber;
    }

    try {
        const verification = await client.verify.v2.services(serviceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });

        res.status(200).json({ message: 'OTP sent successfully.', sid: verification.sid });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
    },

    verifyOtp: async (req, res) => {
        let { phoneNumber, code } = req.body;  // Use 'let' instead of 'const'
    
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required.' });
        }
    
        // Add +91 to the phone number if it's not already included
        if (!phoneNumber.startsWith('+91')) {
            phoneNumber = '+91' + phoneNumber;  // Modify the phoneNumber variable
        }
    
        try {
            const verificationCheck = await client.verify.v2.services(serviceSid)
                .verificationChecks
                .create({ to: phoneNumber, code });
    
            if (verificationCheck.status === 'approved') {
                // Generate a random UID for Firestore document
                const uid = Math.random().toString(36).substring(2, 15); // Simple random UID generation
    
                // Save the phone number and code to Firestore in the 'li' collection
                await setDoc(doc(db, 'li', uid), {
                    uid: uid,
                    phoneNumber: phoneNumber,
                    code: code,
                    verifiedAt: new Date().toISOString() // Optional: timestamp of verification
                });
    
                res.status(200).json({ message: 'OTP verified successfully.' });
            } else {
                res.status(400).json({ error: 'Invalid OTP. Please try again.' });
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            res.status(500).json({ error: 'Failed to verify OTP.' });
        }
    },

    // Login controller
    login: async (req, res) => {
        try {
            const { email, password, role, state } = req.body;

            // Sign in user with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password , role);
            const user = userCredential.user;

            // Get custom token for frontend
            const token = await user.getIdToken();

            // Send login notification email
            try {
                const loginMessage = `
            Hello,
            
            A new login was detected for your account.
            
            Details:
            - Email: ${user.email}
            - Time: ${new Date().toLocaleString()}
            - Role: ${role}
            
            If this wasn't you, please contact support immediately.
            
            Best regards,  
            Your Application Team
                `;
            
                await sendEmail(
                    email,
                    'Account Login Notification',
                    loginMessage
                );
            } catch (emailError) {
                console.error('Failed to send login notification:', emailError);
                // Continue with login process even if email fails
            }
            
            res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    uid: user.uid,
                    email: user.email,
                    role,
                    state,
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({
                message: error.message || "Invalid credentials"
            });
        }
    },

    // Update user age function
    // notification , status update about checklist , 
    updateUserAge: async (req, res) => {
        try {
            const { uid, age } = req.body;

            // Validate inputs
            if (!uid) {
                return res.status(400).json({ message: 'User ID is required' });
            }
            
            if (!age || isNaN(age) || age < 18 || age > 120) {
                return res.status(400).json({ 
                    message: 'Please provide a valid age between 18 and 120' 
                });
            }

            // First, find the user document by uid field
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get the first matching document (there should only be one)
            const userDoc = querySnapshot.docs[0];
            
            // Update the user document with age
            await updateDoc(doc(db, 'users', userDoc.id), {
                age: parseInt(age),
                updatedAt: new Date().toISOString()
            });

            res.status(200).json({
                message: 'User age updated successfully',
                data: {
                    uid,
                    age: parseInt(age)
                }
            });

        } catch (error) {
            console.error('Error updating user age:', error);
            res.status(500).json({ 
                message: 'Error updating user age',
                error: error.message 
            });
        }
    },

    // Add this new method to get user's age
    getUserInfo: async (req, res) => {
        try {
            const userId = req.user.uid; // Get user ID from authenticated request

            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }
            // Reference to users collection
            const usersRef = collection(db, 'users');
            
            // Create query to find user by uid
            const q = query(usersRef, where('uid', '==', userId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get the user document
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            res.status(200).json({
                message: 'User notifications fetched successfully',
                data: {
                    accessorStatus : userData.assessorStatus, 
                    notifications : userData.notifications,
                    uid: userId,
                    updatedAt: userData.updatedAt || null,
                    progress : userData.progress
                }
            });

        } catch (error) {
            console.error('Error fetching user age:', error);
            res.status(500).json({ 
                message: 'Error fetching user age',
                error: error.message 
            });
        }
    },

    // Update the getUserNOCApplications method
    
    getUserNOCApplications: async (req, res) => {
        try {
            const userId = req.user.uid;  // Get user ID from the authenticated request
    
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }
    
            // Reference to the user's document and the nocApplications subcollection
            const userDocRef = doc(db, 'users', userId);
            const nocApplicationsRef = collection(userDocRef, 'nocApplications');
    
            // Fetch all documents from the nocApplications subcollection
            const applicationsSnapshot = await getDocs(nocApplicationsRef);
    
            if (applicationsSnapshot.empty) {
                return res.status(200).json({
                    message: 'No applications found for this user',
                    applications: []
                });
            }
    
            // Map the documents to a more readable format
            const applications = applicationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submissionDate: doc.data().submissionDate || doc.data().createdAt, // Fallback to createdAt if submissionDate doesn't exist
            }));
    
            // Sort applications by submission date (newest first)
            applications.sort((a, b) => {
                const dateA = a.submissionDate ? new Date(a.submissionDate) : new Date(0);  // Default to epoch if no submissionDate
                const dateB = b.submissionDate ? new Date(b.submissionDate) : new Date(0);  // Default to epoch if no submissionDate
                return dateB - dateA;
            });
    
            res.status(200).json({
                message: 'Applications fetched successfully',
                applications,
                totalApplications: applications.length
            });
    
        } catch (error) {
            console.error('Error fetching user NOC applications:', error);
            res.status(500).json({
                message: 'Error fetching applications',
                error: error.message
            });
        }
    },
    

    // // Add this method to get specific NOC application details from subcollection
    // getUserNOCApplicationById: async (req, res) => {
    //     try {
    //         const userId = req.user.uid;
    //         const { applicationId } = req.params;

    //         if (!userId || !applicationId) {
    //             return res.status(400).json({ 
    //                 message: 'Both User ID and Application ID are required' 
    //             });
    //         }

    //         // Reference to specific application in user's nocApplications subcollection
    //         const userDocRef = doc(db, 'users', userId);
    //         const applicationRef = doc(collection(userDocRef, 'nocApplications'), applicationId);

    //         // Get the application document
    //         const applicationDoc = await getDoc(applicationRef);

    //         if (!applicationDoc.exists()) {
    //             return res.status(404).json({ 
    //                 message: 'Application not found' 
    //             });
    //         }

    //         // Return the application data
    //         res.status(200).json({
    //             message: 'Application fetched successfully',
    //             application: {
    //                 id: applicationDoc.id,
    //                 ...applicationDoc.data()
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Error fetching NOC application details:', error);
    //         res.status(500).json({ 
    //             message: 'Error fetching application details',
    //             error: error.message 
    //         });
    //     }
    // }

    // Add this new method
    checkExistingNOCApplication: async (req, res) => {
        try {
            const userId = req.user.uid;

            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            // Reference to user's NOC applications
            const userDocRef = doc(db, 'users', userId);
            const nocApplicationsRef = collection(userDocRef, 'nocApplications');
            
            // Query for any active applications
            const applicationsSnapshot = await getDocs(nocApplicationsRef);
            
            const activeApplications = applicationsSnapshot.docs
                .filter(doc => {
                    const status = doc.data().status;
                    return status === 'Pending' || status === 'In Review';
                });

            if (activeApplications.length > 0) {
                return res.status(400).json({
                    message: 'You already have an active NOC application. Please wait for it to be processed.',
                    existingApplication: {
                        id: activeApplications[0].id,
                        ...activeApplications[0].data()
                    }
                });
            }
            
            res.status(200).json({ canApply: true });
        } catch (error) {
            console.error('Error checking existing application:', error);
            res.status(500).json({
                message: 'Error checking application status',
                error: error.message
            });
        }
    },

    // Add this new method to get user profile
    getUserProfile: async (req, res) => {
        try {
            const userId = req.user.uid;  // Extract user ID from the request object (set by verifyToken)
    
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }
    
            // Reference to the 'users' collection in Firestore
            const userDocRef = doc(db, 'users', userId);  // Ensure 'users' is a string representing the collection name
            const userDoc = await getDoc(userDocRef);
    
            // Check if the user document exists
            if (!userDoc.exists()) {
                return res.status(404).json({ message: 'User profile not found' });
            }
    
            // Extract user data
            const userData = userDoc.data();
    
            // Optionally remove sensitive information
            delete userData.password;
    
            // Send the user data as the response
            res.status(200).json(userData);
    
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }
    ,
    getstaticUserProfile: async (req, res) => {
        try {
            const userId = "keJXJYDa6tUmRKf5ZcZEPUv08tn1";  // Extract user ID from the request object (set by verifyToken)
    
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }
    
            // Reference to the 'users' collection in Firestore
            const userDocRef = doc(db, 'users', userId);  // Ensure 'users' is a string representing the collection name
            const userDoc = await getDoc(userDocRef);
    
            // Check if the user document exists
            if (!userDoc.exists()) {
                return res.status(404).json({ message: 'User profile not found' });
            }
    
            // Extract user data
            const userData = userDoc.data();
    
            // Optionally remove sensitive information
            delete userData.password;
    
            // Send the user data as the response
            res.status(200).json(userData);
    
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }
    ,


    getCertificateUrl: async (req, res) => {
        try {
            const userId = req.user.uid; // Get user ID from authenticated request
    
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }
    
            // Reference to users collection
            const usersRef = collection(db, 'users');
            
            // Create query to find user by uid
            const q = query(usersRef, where('uid', '==', userId));
            const querySnapshot = await getDocs(q);
    
            if (querySnapshot.empty) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            // Get the user document
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
    
            // Check if user has notifications and find NOC certificate
            const nocNotification = userData.notifications?.find(
                notification => notification.type === 'NOC_GENERATED'
            );
    
            if (!nocNotification || !nocNotification.certificateUrl) {
                return res.status(404).json({ 
                    message: 'Certificate URL not found',
                    success: false
                });
            }
    
            res.status(200).json({
                message: 'Certificate URL fetched successfully',
                success: true,
                data: {
                    certificateUrl: nocNotification.certificateUrl,
                    generatedAt: nocNotification.timestamp || null,
                    applicationId: nocNotification.applicationId || null
                }
            });
    
        } catch (error) {
            console.error('Error fetching certificate URL:', error);
            res.status(500).json({ 
                message: 'Error fetching certificate URL',
                error: error.message,
                success: false
            });
        }
    },


    getSignedDownloadUrl: async (req, res) => {
        try {
            const { certificateUrl } = req.body;
            
            if (!certificateUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Certificate URL is required'
                });
            }
    
            // Get admin storage instance
            const adminStorage = getStorage();
            const bucket = adminStorage.bucket();
            const file = bucket.file(certificateUrl);
    
            // Check if file exists
            const [exists] = await file.exists();
            if (!exists) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate file not found'
                });
            }
    
            // Generate signed URL that expires in 1 hour
            const [signedUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
                version: 'v4'
            });
    
            res.status(200).json({
                success: true,
                downloadUrl: signedUrl
            });
    
        } catch (error) {
            console.error('Error generating signed URL:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating download URL',
                error: error.message
            });
        }
    },
    // Server-side route handler
    getUrl: async (req, res) => {
    try {
        const userId = req.user.uid;

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: 'User ID is required' 
            });
        }

        // Reference to users collection
        const usersRef = collection(db, 'users');
        
        // Create query to find user by uid
        const q = query(usersRef, where('uid', '==', userId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Get the user document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Find the NOC_GENERATED notification with the certificate URL
        const nocNotification = userData.notifications?.find(
            notification => notification.type === 'NOC_GENERATED' && notification.certificateUrl
        );

        if (!nocNotification?.certificateUrl) {
            return res.status(404).json({ 
                success: false,
                message: 'Certificate URL not found' 
            });
        }

        res.status(200).json({
            success: true,
            message: 'URL fetched successfully',
            data: {
                url: nocNotification.certificateUrl
            }
        });

    } catch (error) {
        console.error('Error fetching URL:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching URL',
            error: error.message 
        });
        }
    },
    // Add this new method to the authController
    checkNOCRenewal: async (req, res) => {
        try {
            const userId = req.user?.uid;
    
            // Validate user ID
            if (!userId) {
                return res.status(400).json({ message: 'User ID is missing' });
            }
    
            // Reference to the users collection in Firestore
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', userId));
            const querySnapshot = await getDocs(q);
    
            // Check if user data exists
            if (querySnapshot.empty) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            const userData = querySnapshot.docs[0].data();
    
            // Ensure issuanceDate is present and valid
            const issuanceDate = new Date(userData.issuanceDate);
            if (isNaN(issuanceDate)) {
                return res.status(400).json({ message: 'Invalid or missing issuance date' });
            }
    
            // Calculate the expiry date based on validity period (default to 1 year if not specified)
            const validityPeriod = parseInt(userData.validityPeriod, 10) || 1;
            const expiryDate = new Date(issuanceDate);
            expiryDate.setFullYear(issuanceDate.getFullYear() + validityPeriod);
    
            // Check if today is on or after the expiry date
            const canRenew = new Date() >= expiryDate;
    
            // Return the renewal status as a boolean value
            res.status(200).json({ canRenew });
    
        } catch (error) {
            console.error('Error checking NOC renewal:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
    
    ,
    
    getLocationByPincode: async (req, res) => {
        try {
            const { pincode } = req.params;

            if (!pincode || pincode.length !== 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pincode format'
                });
            }

            const locations = pincodeDirectory.search(pincode);

            if (!locations || locations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No location found for this pincode'
                });
            }

            // Get the first location (most accurate)
            const location = locations[0];

            // Get division based on district and state
            const division = getDivisionFromDistrict(location.district, location.state);

            return res.json({
                success: true,
                data: {
                    state: location.state,
                    division: division,
                    district: location.district,
                    city: location.office,
                    pincode: location.pincode
                }
            });

        } catch (error) {
            console.error('Pincode Search Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error searching pincode',
                error: error.message
            });
        }
    }
};

module.exports = authController; 
