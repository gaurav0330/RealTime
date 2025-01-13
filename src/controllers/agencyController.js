const { db } = require('../config/firebase');
const { collection, query, where, arrayUnion, getDocs, doc, getDoc, updateDoc, addDoc } = require('firebase/firestore');

const getAllApplications = async (req, res) => {
    try {
        // Reference to the agencyList collection
        const agencyListRef = collection(db, 'agencyApplications');
        
        // Fetch all documents from the collection
        const snapshot = await getDocs(agencyListRef);
        
        // Map documents to an array of data
        const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        res.status(200).json({
            success: true,
            data: applications,
            message: 'Applications fetched successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message
        });
    }
};

// New method to get application details by ID
const getApplicationById = async (req, res) => {
    try {
        const { id } = req.params;

        // Reference to the specific document
        const applicationRef = doc(db, 'agencyApplications', id);
        
        // Get the document
        const applicationDoc = await getDoc(applicationRef);

        if (!applicationDoc.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Get the application data
        const applicationData = {
            id: applicationDoc.id,
            ...applicationDoc.data()
        };

        res.status(200).json({
            success: true,
            data: applicationData,
            message: 'Application details fetched successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching application details',
            error: error.message
        });
    }
};

// Accept/Reject application and add remarks from agency perspective
const updateApplication = async (req, res) => {
    try {
        const { id, status, remarks } = req.body;

        // Validate inputs
        if (!id || !status || !remarks) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields' 
            });
        }

        // Get the application
        const applicationRef = doc(db, 'agencyApplications', id);
        const applicationSnapshot = await getDoc(applicationRef);
        
        if (!applicationSnapshot.exists()) {
            return res.status(404).json({ 
                success: false,
                message: 'Application not found' 
            });
        }
 
        const applicationData = applicationSnapshot.data();

        // Update application status
        const updateData = {
            agencyStatus: status,
            agencyRemarks: remarks,
            updatedAt: new Date().toISOString(),
            status: status === 'Accepted' ? 'In Inspection Phase' : 'Rejected',
            agencyUpdateTimestamp: new Date().toISOString(),
            lastUpdatedBy: 'agency'
        };

        await updateDoc(applicationRef, updateData);

        // If accepted, create inspection record
        if (status === 'Accepted') {
            const inspectionListRef = collection(db, 'agencyInspectionList');
            
            // Create inspection record with relevant data and handle missing values
            const inspectionData = {
                applicationId: id,
                buildingDetails: {
                    name: applicationData.buildingName || 'Not Specified',
                    type: applicationData.buildingType || 'Not Specified',
                    address: applicationData.buildingAddress || 'Not Specified',
                    totalArea: applicationData.totalArea || '0',
                    numFloors: applicationData.numFloors || '0',
                    constructionYear: applicationData.constructionYear || 'Not Specified'
                },
                applicantDetails: {
                    name: applicationData.applicantName || 'Not Specified',
                    email: applicationData.email || 'Not Specified',
                    contact: applicationData.contactNumber || 'Not Specified',
                    address: applicationData.correspondenceAddress || 'Not Specified'
                },
                documents: applicationData.documents || {},
                inspectionStatus: 'Pending',
                createdAt: new Date().toISOString(),
                agencyRemarks: remarks,
                scheduledDate: null,
                inspectorAssigned: null,
                inspectionChecklist: {
                    fireExtinguishers: false,
                    emergencyExits: false,
                    sprinklerSystem: false,
                    fireAlarms: false,
                    evacuationPlan: false
                }
            };

            // Log the inspection data for debugging
            console.log('Creating inspection with data:', inspectionData);

            await addDoc(inspectionListRef, inspectionData);

            // Update user notifications
            if (applicationData.userId) {
                const usersRef = collection(db, 'users');
                const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        status: "In Inspection Phase",
                        progress: 2,
                        notifications: arrayUnion({
                            type: 'INSPECTION_SCHEDULED',
                            message: 'Your application has been approved and moved to the inspection phase. An inspector will be assigned soon.',
                            applicationId: id,
                            status: 'In Inspection Phase',
                            timestamp: new Date().toISOString()
                        })
                    });
                }
            }
        } else {
            // If rejected, update user notifications
            if (applicationData.userId) {
                const usersRef = collection(db, 'users');
                const userQuery = query(usersRef, where('uid', '==', applicationData.userId));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        status: "Rejected",
                        notifications: arrayUnion({
                            type: 'APPLICATION_REJECTED',
                            message: 'Your application has been rejected. Please review the remarks and reapply if necessary.',
                            applicationId: id,
                            status: 'Rejected',
                            timestamp: new Date().toISOString()
                        })
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: status === 'Accepted' 
                ? 'Application approved and moved to inspection phase'
                : 'Application rejected successfully',
            data: {
                id,
                status,
                remarks
            }
        });

    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating application',
            error: error.message 
        });
    }
};


module.exports = {
    getAllApplications,
    getApplicationById,
    updateApplication
};