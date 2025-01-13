const { db ,storage} = require('../config/firebase');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { doc,collection,getDoc, getDocs, addDoc, updateDoc, query, where, arrayUnion } = require('firebase/firestore');
const { sendEmail } = require('./emailController');

// // Fetch all submitted NOC applications for the assessor
// exports.getApplications = async (req, res) => {
//     try {
//         const nocApplicationsRef = collection(db, 'nocApplicationList');
//         const snapshot = await getDocs(nocApplicationsRef);

//         if (snapshot.empty) {
//             return res.status(404).json({ message: 'No applications found.' });
//         }

//         const applications = snapshot.docs.map(doc => ({
//             id: doc.id,
//             applicantName: doc.data().applicantName,
//             state: doc.data().state,
//             submissionDate: doc.data().submissionDate,
//             status: doc.data().status
//         }));

//         res.status(200).json({
//             message: 'Applications fetched successfully!',
//             applications,
//         });
//     } catch (error) {
//         console.error('Error fetching applications:', error);
//         res.status(500).json({ message: 'Error fetching applications' });
//     }
// };

//get applicatins by state


// Add this new method
exports.getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const applicationRef = doc(db, 'nocApplicationList', id);
        const applicationSnap = await getDoc(applicationRef);

        if (!applicationSnap.exists()) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const applicationData = {
            id: applicationSnap.id,
            ...applicationSnap.data()
        };

        res.status(200).json({
            message: 'Application fetched successfully!',
            application: applicationData
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ message: 'Error fetching application details' });
    }
};


// Accept/Reject application and add remarks
exports.updateApplication = async (req, res) => {
    try {
        const { id, assessorStatus, assessorRemarks } = req.body;

        // Enhanced input validation
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Application ID is required'
            });
        }
        if (!assessorStatus) {
            return res.status(400).json({
                success: false,
                message: 'Assessor status is required'
            });
        }
        if (!assessorRemarks) {
            return res.status(400).json({
                success: false,
                message: 'Assessor remarks are required'
            });
        }

        // Validate assessorStatus value
        if (!['Accepted', 'Rejected'].includes(assessorStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assessor status. Must be either "Accepted" or "Rejected"'
            });
        }

        // Get the application
        const applicationRef = doc(db, 'nocApplicationList', id);
        const applicationSnapshot = await getDoc(applicationRef);

        if (!applicationSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const applicationData = applicationSnapshot.data();

        // Determine priority based on building type from database
        let priority = 'normal';
        const buildingType = applicationData.buildingType?.toLowerCase() || '';

        // Priority mapping based on the specific building types
        switch (buildingType) {
            // High Priority Buildings (Critical and High-Risk)
            case 'hazardous':
            case 'institutional':
            case 'assembly':
                priority = 'high';
                break;

            // Medium Priority Buildings
            case 'industrial':
            case 'commercial':
            case 'mixed':
            case 'storage':
                priority = 'medium';
                break;

            // Low Priority Buildings
            case 'residential':
            default:
                priority = 'low';
                break;
        }

        // Update application status with priority
        await updateDoc(applicationRef, {
            assessorStatus,
            assessorRemarks,
            priority,
            updatedAt: new Date().toISOString(),
            status: assessorStatus === 'Accepted' ? 'In Inspection Phase' : 'Rejected',
        });

        // If accepted, schedule inspection and add to inspectionList
        let inspectionDetails = null;
        if (assessorStatus === 'Accepted') {
            try {
                // Create mock request with proper user object
                const mockReq = {
                    body: {
                        applicationId: id,
                        priority: priority
                    },
                    user: {
                        uid: req.user.uid,  // Pass through the original user's uid
                        // Include any other necessary user properties
                        state: req.user.state,
                        role: req.user.role
                    }
                };

                const mockRes = {
                    status: (code) => ({
                        json: (data) => {
                            inspectionDetails = data;
                            return data;
                        }
                    })
                };

                await exports.scheduleInspection(mockReq, mockRes);

                // Add to inspectionList collection
                const inspectionListRef = collection(db, 'inspectionList');
                await addDoc(inspectionListRef, {
                    ...applicationData,                    // All application data
                    applicationId: applicationData.applicationId,                     // Original application ID
                    assessorRemarks,                      // Assessor's remarks
                    assessorStatus,
                    priority,
                    inspectionDate: inspectionDetails.inspectionDate,  // Scheduled date
                    queuePosition: inspectionDetails.queuePosition,    // Queue position
                    inspectionStatus: 'Pending',          // Initial inspection status
                    createdAt: new Date().toISOString(), // When added to inspection list
                    updatedAt: new Date().toISOString()  // Last update timestamp
                });

                // Update user's notifications
                if (applicationData.userId) {
                    const usersRef = collection(db, 'users');
                    const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
                    const userSnapshot = await getDocs(userQuery);

                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        await updateDoc(doc(db, 'users', userDoc.id), {
                            assessorStatus: "Accepted",
                            progress: 2,
                            notifications: arrayUnion({
                                type: 'NOC_APPLICATION',
                                message: `Your NOC application has been accepted. Inspection scheduled for ${inspectionDetails.inspectionDate}`,
                                applicationId: id,
                                status: 'Accepted',
                                inspectionDate: inspectionDetails.inspectionDate,
                                timestamp: new Date().toISOString()
                            }),
                        });
                    }
                }
            } catch (error) {
                console.error('Error scheduling inspection:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error scheduling inspection',
                    error: error.message
                });
            }
        }else  if (assessorStatus === 'Rejected') {
            try {
                  // Update user's notifications
                if (applicationData.userId) {
                    const usersRef = collection(db, 'users');
                    const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
                    const userSnapshot = await getDocs(userQuery);

                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        await updateDoc(doc(db, 'users', userDoc.id), {
                            assessorStatus: "Rejected",
                            progress: 0,
                            notifications: arrayUnion({
                                type: 'NOC_APPLICATION',
                                message: `Your NOC application has been rejected. For more information, please contact the assessment administration team.`,
                                applicationId: id,
                                status: 'Rejected',
                                inspectionDate: inspectionDetails.inspectionDate,
                                timestamp: new Date().toISOString()
                            }),
                        });
                    }
                }
            } catch (error) {
                console.error('Error scheduling inspection:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error scheduling inspection',
                    error: error.message
                });
            }
        }

        // Send email notification
        try {
            const status = assessorStatus === 'Accepted' ? 'Approved' : 'Rejected';
            const statusMessage = assessorStatus === 'Accepted'
                ? `Your NOC application has been accepted and moved to the inspection phase.\nInspection Date: ${inspectionDetails.inspectionDate}`
                : 'Your NOC application has been rejected. For more information, please contact the assessment administration team.';

            const emailMessage = `
NOC Application Status Update

Hello,

Status: ${status}

${statusMessage}

Application Details:
- Application ID: ${id}
- Time: ${new Date().toLocaleString()}
- Assessor Remarks: ${assessorRemarks}
${assessorStatus === 'Accepted' ? `- Inspection Date: ${inspectionDetails.inspectionDate}` : ''}

If you have any questions, please contact our support team.

Best regards,
Fire Department Team
            `;

            await sendEmail(applicationData.email, `NOC Application ${status}`, emailMessage);
        } catch (emailError) {
            console.error('Failed to send application status notification:', emailError.message);
        }

        res.status(200).json({
            success: true,
            message: assessorStatus === 'Accepted'
                ? `Application accepted and inspection scheduled for ${inspectionDetails.inspectionDate}`
                : 'Application rejected successfully',
            applicationId: id,
            inspectionDetails: inspectionDetails
        });

    } catch (error) {
        console.error('Error updating application:', error);
        // Enhanced error response
        res.status(500).json({
            success: false,
            message: 'Error updating application: ' + (error.message || 'Unknown error'),
            errorCode: error.code || 'UNKNOWN_ERROR',
            errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Mark application as ready for payment
exports.markForPayment = async (req, res) => {
    try {
        const { applicationId, paymentStatus } = req.body;

        // Reference to the application in the global `nocApplicationList`
        const applicationRef = doc(db, 'nocApplicationList', applicationId);

        if (paymentStatus === 'Successful') {
            // Fetch the application data to save in the `inspectionList` collection
            const applicationSnapshot = await getDoc(applicationRef);

            if (!applicationSnapshot.exists()) {
                return res.status(404).json({ message: 'Application not found' });
            }

            const applicationData = applicationSnapshot.data();

            // Add the application to the `inspectionList` collection
            const inspectionListRef = collection(db, 'inspectionList');
            await addDoc(inspectionListRef, {
                ...applicationData,
                paymentStatus: 'Successful',
                inspectionStatus: 'Pending', // Initial status for inspections
                inspectionCreatedAt: new Date().toISOString(),
            });
        }

        // Update the payment status in the `nocApplicationList`
        await updateDoc(applicationRef, { paymentStatus });

        res.status(200).json({
            message:
                paymentStatus === 'Successful'
                    ? 'Payment successful and application added to inspection list!'
                    : 'Application marked for payment successfully!',
        });
    } catch (error) {
        console.error('Error handling payment:', error);
        res.status(500).json({ message: 'Error processing payment status' });
    }
};


// Fetch all applications
exports.getApplications = async (req, res) => {
    try {
        // Query all applications from nocApplicationList
        const nocApplicationsRef = collection(db, 'nocApplicationList');
        const snapshot = await getDocs(nocApplicationsRef);

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No applications found.'
            });
        }

        const applications = snapshot.docs.map(doc => ({
            id: doc.id,
            applicantName: doc.data().applicantName,
            state: doc.data().state,
            submissionDate: doc.data().submissionDate,
            status: doc.data().status
        }));

        res.status(200).json({
            success: true,
            message: 'All applications fetched successfully!',
            applications,
            totalApplications: applications.length
        });

    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message
        });
    }
};

// Schedule inspection function
exports.scheduleInspection = async (req, res) => {
    try {
        const { applicationId } = req.body;

        // Get application details
        const applicationRef = doc(db, 'nocApplicationList', applicationId);
        const applicationSnap = await getDoc(applicationRef);

        if (!applicationSnap.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const applicationData = applicationSnap.data();

        // Get assessor's state
        const assessorId = req.user.uid;
        const assessorRef = doc(db, 'assessors', assessorId);
        const assessorDoc = await getDoc(assessorRef);

        if (!assessorDoc.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Assessor not found'
            });
        }

        let assessorState = assessorDoc.data().state;
        // Normalize state codes
        if (assessorState === "TAMIL NADU") assessorState = "TN";
        else if (assessorState === "MAHARASHTRA") assessorState = "MH";
        else if (assessorState === "UTTAR PRADESH") assessorState = "UP";

        // Get all pending inspections from the same state
        const nocApplicationsRef = collection(db, 'nocApplicationList');
        const pendingQuery = query(nocApplicationsRef,
            where('state', '==', assessorState),
            // Removed the inspectionDate check as it might be causing issues
        );

        const pendingSnapshot = await getDocs(pendingQuery);
        const pendingApplications = pendingSnapshot.docs.map(doc => ({
            id: doc.id,
            submissionDate: doc.data().submissionDate || new Date().toISOString(),
            ...doc.data()
        }));

        // Sort applications by submission date (FIFO)
        pendingApplications.sort((a, b) =>
            new Date(a.submissionDate) - new Date(b.submissionDate)
        );

        // Calculate position without checking existing queue
        const currentAppIndex = pendingApplications.length; // Put at the end of queue

        // Calculate inspection date based on position and 3 inspections per day limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate days needed based on position in queue and 3 inspections per day
        const daysNeeded = Math.floor(currentAppIndex / 3);
        let inspectionDate = new Date(today);
        inspectionDate.setDate(today.getDate() + daysNeeded + 1); // +1 to start from tomorrow

        // Skip weekends
        while (inspectionDate.getDay() === 0 || inspectionDate.getDay() === 6) {
            inspectionDate.setDate(inspectionDate.getDate() + 1);
        }

        // Format date for storage
        const formattedDate = inspectionDate.toISOString().split('T')[0];

        // Update application with inspection date
        await updateDoc(applicationRef, {
            inspectionDate: formattedDate,
            queuePosition: currentAppIndex + 1,
            updatedAt: new Date().toISOString()
        });

        // Update user's notifications if userId exists
        if (applicationData.userId) {
            const usersRef = collection(db, 'users');
            const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                await updateDoc(doc(db, 'users', userDoc.id), {
                    notifications: arrayUnion({
                        type: 'INSPECTION_SCHEDULED',
                        message: `Your inspection has been scheduled for ${formattedDate}`,
                        applicationId: applicationId,
                        inspectionDate: formattedDate,
                        timestamp: new Date().toISOString()
                    })
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Inspection scheduled successfully',
            inspectionDate: formattedDate,
            queuePosition: currentAppIndex + 1,
            totalPending: pendingApplications.length
        });

    } catch (error) {
        console.error('Error scheduling inspection:', error);
        return res.status(500).json({
            success: false,
            message: 'Error scheduling inspection',
            error: error.message
        });
    }
};

exports.getRenewApplications = async (req, res) => {
    try {
        // Query all applications from renewList
        const renewApplicationsRef = collection(db, 'renewList');
        const snapshot = await getDocs(renewApplicationsRef);

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No applications found in renew list.'
            });
        }

        const applications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            message: 'All renew applications fetched successfully!',
            applications
        });

    } catch (error) {
        console.error('Error fetching renew applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching renew applications',
            error: error.message
        });
    }
};

// Fetch renewal application details by ID
exports.getRenewalApplicationById = async (req, res) => {
    try {
        const { id } = req.params; // Get application ID from request parameters
        const applicationRef = doc(db, 'renewList', id); // Reference to the specific application
        const applicationSnap = await getDoc(applicationRef); // Fetch the application

        if (!applicationSnap.exists()) {
            return res.status(404).json({ message: 'Renewal application not found' });
        }

        const applicationData = {
            id: applicationSnap.id,
            ...applicationSnap.data()
        };

        res.status(200).json({
            message: 'Renewal application fetched successfully!',
            application: applicationData
        });
    } catch (error) {
        console.error('Error fetching renewal application:', error);
        res.status(500).json({ message: 'Error fetching renewal application details' });
    }
};


// Accept/Reject application and add remarks
exports.updateRenewalApplication = async (req, res) => {
    try {
        const { id, assessorStatus, assessorRemarks } = req.body;

        // Enhanced input validation
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Application ID is required'
            });
        }
        if (!assessorStatus) {
            return res.status(400).json({
                success: false,
                message: 'Assessor status is required'
            });
        }
        if (!assessorRemarks) {
            return res.status(400).json({
                success: false,
                message: 'Assessor remarks are required'
            });
        }

        // Validate assessorStatus value
        if (!['Accepted', 'Rejected'].includes(assessorStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assessor status. Must be either "Accepted" or "Rejected"'
            });
        }

        // Get the application
        const applicationRef = doc(db, 'renewList', id);
        const applicationSnapshot = await getDoc(applicationRef);

        if (!applicationSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const applicationData = applicationSnapshot.data();

        // Determine priority based on building type from database
        let priority = 'normal';
        const buildingType = applicationData.buildingType?.toLowerCase() || '';

        // Priority mapping based on the specific building types
        switch (buildingType) {
            // High Priority Buildings (Critical and High-Risk)
            case 'hazardous':
            case 'institutional':
            case 'assembly':
                priority = 'high';
                break;

            // Medium Priority Buildings
            case 'industrial':
            case 'commercial':
            case 'mixed':
            case 'storage':
                priority = 'medium';
                break;

            // Low Priority Buildings
            case 'residential':
            default:
                priority = 'low';
                break;
        }

        // Update application status with priority
        await updateDoc(applicationRef, {
            assessorStatus,
            assessorRemarks,
            priority,
            updatedAt: new Date().toISOString(),
            status: assessorStatus === 'Accepted' ? 'In Inspection Phase' : 'Rejected',
        });

        // If accepted, schedule inspection and add to inspectionList
        let inspectionDetails = null;
        if (assessorStatus === 'Accepted') {
            try {
                // Create mock request with proper user object
                const mockReq = {
                    body: {
                        applicationId: id,
                        priority: priority
                    },
                    user: {
                        uid: req.user.uid,  // Pass through the original user's uid
                        // Include any other necessary user properties
                        state: req.user.state,
                        role: req.user.role
                    }
                };

                const mockRes = {
                    status: (code) => ({
                        json: (data) => {
                            inspectionDetails = data;
                            return data;
                        }
                    })
                };

                await exports.scheduleInspectionforRenewal(mockReq, mockRes);

                // Add to inspectionList collection
                const inspectionListRef = collection(db, 'inspectionList');
                await addDoc(inspectionListRef, {
                    ...applicationData,                    // All application data
                    applicationId: applicationData.applicationId,                     // Original application ID
                    assessorRemarks,                      // Assessor's remarks
                    assessorStatus,
                    applicationType : 'renewal',
                    priority,
                    inspectionDate: inspectionDetails.inspectionDate,  // Scheduled date
                    queuePosition: inspectionDetails.queuePosition,    // Queue position
                    inspectionStatus: 'Pending',          // Initial inspection status
                    createdAt: new Date().toISOString(), // When added to inspection list
                    updatedAt: new Date().toISOString()  // Last update timestamp
                });

                // Update user's notifications
                if (applicationData.userId) {
                    const usersRef = collection(db, 'users');
                    const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
                    const userSnapshot = await getDocs(userQuery);

                    if (!userSnapshot.empty) {
                        const userDoc = userSnapshot.docs[0];
                        await updateDoc(doc(db, 'users', userDoc.id), {
                            assessorStatus: "Accepted",
                            progress: 2,
                            notifications: arrayUnion({
                                type: 'NOC_APPLICATION',
                                message: `Your renewal of NOC application has been accepted. Inspection scheduled for ${inspectionDetails.inspectionDate}`,
                                applicationId: id,
                                status: 'Accepted',
                                inspectionDate: inspectionDetails.inspectionDate,
                                timestamp: new Date().toISOString()
                            }),
                        });
                    }
                }
            } catch (error) {
                console.error('Error scheduling inspection:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error scheduling inspection',
                    error: error.message
                });
            }
        }

        // Send email notification
        try {
            const status = assessorStatus === 'Accepted' ? 'Approved' : 'Rejected';
            const statusMessage = assessorStatus === 'Accepted'
                ? `Your renewal of NOC application has been accepted and moved to the inspection phase.\nInspection Date: ${inspectionDetails.inspectionDate}`
                : 'Your renewal of NOC application has been rejected. For more information, please contact the assessment administration team.';

            const emailMessage = `
NOC Application Status Update

Hello,

Status: ${status}

${statusMessage}

Application Details:
- Application ID: ${id}
- Time: ${new Date().toLocaleString()}
- Assessor Remarks: ${assessorRemarks}
${assessorStatus === 'Accepted' ? `- Inspection Date: ${inspectionDetails.inspectionDate}` : ''}

If you have any questions, please contact our support team.

Best regards,
Fire Department Team
            `;

            await sendEmail(applicationData.email, `NOC Application ${status}`, emailMessage);
        } catch (emailError) {
            console.error('Failed to send application status notification:', emailError.message);
        }

        res.status(200).json({
            success: true,
            message: assessorStatus === 'Accepted'
                ? `Application accepted and inspection scheduled for ${inspectionDetails.inspectionDate}`
                : 'Application rejected successfully',
            applicationId: id,
            inspectionDetails: inspectionDetails
        });

    } catch (error) {
        console.error('Error updating application:', error);
        // Enhanced error response
        res.status(500).json({
            success: false,
            message: 'Error updating application: ' + (error.message || 'Unknown error'),
            errorCode: error.code || 'UNKNOWN_ERROR',
            errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


// Schedule inspection function
exports.scheduleInspectionforRenewal = async (req, res) => {
    try {
        const { applicationId } = req.body;

        // Get application details
        const applicationRef = doc(db, 'renewList', applicationId);
        const applicationSnap = await getDoc(applicationRef);

        if (!applicationSnap.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const applicationData = applicationSnap.data();

        // Get assessor's state
        const assessorId = req.user.uid;
        const assessorRef = doc(db, 'assessors', assessorId);
        const assessorDoc = await getDoc(assessorRef);

        if (!assessorDoc.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Assessor not found'
            });
        }

        let assessorState = assessorDoc.data().state;
        // Normalize state codes
        if (assessorState === "TAMIL NADU") assessorState = "TN";
        else if (assessorState === "MAHARASHTRA") assessorState = "MH";
        else if (assessorState === "UTTAR PRADESH") assessorState = "UP";

        // Get all pending inspections from the same state
        const nocApplicationsRef = collection(db, 'nocApplicationList');
        const pendingQuery = query(nocApplicationsRef,
            where('state', '==', assessorState),
            // Removed the inspectionDate check as it might be causing issues
        );

        const pendingSnapshot = await getDocs(pendingQuery);
        const pendingApplications = pendingSnapshot.docs.map(doc => ({
            id: doc.id,
            submissionDate: doc.data().submissionDate || new Date().toISOString(),
            ...doc.data()
        }));

        // Sort applications by submission date (FIFO)
        pendingApplications.sort((a, b) =>
            new Date(a.submissionDate) - new Date(b.submissionDate)
        );

        // Calculate position without checking existing queue
        const currentAppIndex = pendingApplications.length; // Put at the end of queue

        // Calculate inspection date based on position and 3 inspections per day limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate days needed based on position in queue and 3 inspections per day
        const daysNeeded = Math.floor(currentAppIndex / 3);
        let inspectionDate = new Date(today);
        inspectionDate.setDate(today.getDate() + daysNeeded + 1); // +1 to start from tomorrow

        // Skip weekends
        while (inspectionDate.getDay() === 0 || inspectionDate.getDay() === 6) {
            inspectionDate.setDate(inspectionDate.getDate() + 1);
        }

        // Format date for storage
        const formattedDate = inspectionDate.toISOString().split('T')[0];

        // Update application with inspection date
        await updateDoc(applicationRef, {
            inspectionDate: formattedDate,
            queuePosition: currentAppIndex + 1,
            updatedAt: new Date().toISOString()
        });

        // Update user's notifications if userId exists
        if (applicationData.userId) {
            const usersRef = collection(db, 'users');
            const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                await updateDoc(doc(db, 'users', userDoc.id), {
                    notifications: arrayUnion({
                        type: 'INSPECTION_SCHEDULED',
                        message: `Your renewal inspection has been scheduled for ${formattedDate}`,
                        applicationId: applicationId,
                        inspectionDate: formattedDate,
                        timestamp: new Date().toISOString()
                    })
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Inspection scheduled successfully',
            inspectionDate: formattedDate,
            queuePosition: currentAppIndex + 1,
            totalPending: pendingApplications.length
        });

    } catch (error) {
        console.error('Error scheduling inspection:', error);
        return res.status(500).json({
            success: false,
            message: 'Error scheduling inspection',
            error: error.message
        });
    }
};

// Fetch provisional applications based on assessor's state
// Fetch applications based on assessor's state
exports.getProvisionalApplications = async (req, res) => {
    try {
        // Fetch all applications from the ProvisionalApplicationList collection
        const nocApplicationsRef = collection(db, 'ProvisionalApplicationList');
        const snapshot = await getDocs(nocApplicationsRef);

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No applications found.',
            });
        }

        // Map through the documents and return the application data
        const applications = snapshot.docs.map(doc => ({
            id: doc.id,
            applicantName: doc.data().applicantName,
            state: doc.data().state,
            submissionDate: doc.data().submissionDate,
            status: doc.data().status,
        }));

        res.status(200).json({
            success: true,
            message: 'All applications fetched successfully!',
            applications,
        });

    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message,
        });
    }
};


// get prrovisional application by id
exports.provisionalApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const applicationRef = doc(db, 'ProvisionalApplicationList', id);
        const applicationSnap = await getDoc(applicationRef);

        if (!applicationSnap.exists()) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const applicationData = {
            id: applicationSnap.id,
            ...applicationSnap.data()
        };

        res.status(200).json({
            message: 'Application fetched successfully!',
            application: applicationData
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ message: 'Error fetching application details' });
    }
};



exports.generateAndStoreNOC = async (req, res) => {
    try {
        const { userId,applicationId, nocNumber, validityPeriod, issuanceDate } = req.body;
        const nocFile = req.files.nocFile; // Access the uploaded file
        // Validate required fields
        
        if (!applicationId || !nocNumber || !validityPeriod || !issuanceDate || !nocFile) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields or NOC file'
            });
        }

        // Generate a unique filename for the uploaded file
        const timestamp = new Date().getTime();
        const fileName = `noccertificates/${applicationId}_${nocNumber}_${timestamp}_${nocFile.name}`;
        const storageRef = ref(storage, fileName);

        // Upload the uploaded file directly to storage
        await uploadBytes(storageRef, nocFile.data); // Use nocFile.data for the uploaded file
        const downloadURL = await getDownloadURL(storageRef);


        // Find user's email from the application
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('uid', '==', userId));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            const userEmail = userData.email;
            
            // Update user document
            await updateDoc(doc(db, 'users',userId ), {
                nocType: 'Provisional',
                nocStatus: 'Generated',
                progress: 2,
                certificateUrl: downloadURL,
                issuanceDate,
                validityPeriod,
                nocNumber,
                notifications: arrayUnion({
                    type: 'Provisional NOC_GENERATED',
                    message: 'Your Provisional NOC Certificate has been generated successfully.',
                    applicationId,
                    nocNumber,
                    status: 'Generated',
                    certificateUrl: downloadURL,
                    timestamp: new Date().toISOString()
                })
            });


            // Send email notification
            const emailSubject = 'NOC Certificate Generated';
            const emailBody = `
                Dear ${userData.applicantName || 'User'},\n\n
                Your Provisional NOC Certificate has been successfully generated.\n
                NOC Number: ${nocNumber}\n
                Issuance Date: ${issuanceDate}\n
                Validity Period: ${validityPeriod} years\n\n
                Download your certificate here: ${downloadURL}\n\n
                If you did not request this, please contact support immediately.\n\n
                Best regards,\n
                Fire NOC Department
            `;
            await sendEmail(userEmail, emailSubject, emailBody);
        }
    
        
        res.status(200).json({
            success: true,
            message: 'NOC generated and stored successfully',
            nocNumber,
            certificateUrl: downloadURL
        });

    } catch (error) {
        console.error('Error generating and storing NOC:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating and storing NOC',
            error: error.message
        });
    }
};

//get local authority applicatioins

// Fetch all applications from localAuthorityList
exports.getLocalAuthorityApplications = async (req, res) => {
    try {
        const localAuthorityApplicationsRef = collection(db, 'localAuthorityList');
        const snapshot = await getDocs(localAuthorityApplicationsRef);

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No applications found in local authority list.'
            });
        }

        const applications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            message: 'Local authority applications fetched successfully!',
            applications
        });

    } catch (error) {
        console.error('Error fetching local authority applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching local authority applications',
            error: error.message
        });
    }
};

// Fetch a specific application by ID from localAuthorityList
exports.getLocalAuthorityApplicationById = async (req, res) => {
    try {
        const { id } = req.params; // Get the application ID from the request parameters
        const applicationRef = doc(db, 'localAuthorityList', id); // Reference to the specific application
        const applicationSnap = await getDoc(applicationRef); // Fetch the application document

        if (!applicationSnap.exists()) {
            return res.status(404).json({ message: 'Application not found' }); // Handle case where application does not exist
        }

        const applicationData = {
            id: applicationSnap.id,
            ...applicationSnap.data() // Spread the application data
        };

        res.status(200).json({
            message: 'Application fetched successfully!',
            application: applicationData // Return the application data
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ message: 'Error fetching application details' }); // Handle errors
    }
};


