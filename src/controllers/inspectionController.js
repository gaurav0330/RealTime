const { db } = require('../config/firebase');
const { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, arrayUnion } = require('firebase/firestore');

const inspectionController = {
    // Get all applications from InspectionList
    getInspectionList: async (req, res) => {
        try {
            // Reference to the InspectionList collection
            const inspectionListRef = collection(db, 'inspectionList');
            
            if (!inspectionListRef) {
                throw new Error('Failed to get reference to InspectionList collection');
            }

            // Get all applications from InspectionList
            const querySnapshot = await getDocs(inspectionListRef);
            
            if (!querySnapshot) {
                throw new Error('Failed to fetch documents from InspectionList');
            }

            const applications = [];

            // Process each application in InspectionList
            for (const inspectionDoc of querySnapshot.docs) {
                try {
                    const inspectionData = inspectionDoc.data();
                    
                    if (!inspectionData || !inspectionData.applicationId) {
                        console.warn('Skipping invalid inspection document:', inspectionDoc.id);
                        continue;
                    }

                    // Get the original NOC application details
                    const nocApplicationRef = doc(db, 'nocApplications', inspectionData.applicationId);
                    const nocApplicationDoc = await getDoc(nocApplicationRef);
                    const nocApplicationData = nocApplicationDoc.exists() ? nocApplicationDoc.data() : null;

                    // Get applicant details if applicantId exists
                    let applicantData = null;
                    if (nocApplicationData?.applicantId) {
                        const applicantRef = doc(db, 'users', nocApplicationData.applicantId);
                        const applicantDoc = await getDoc(applicantRef);
                        applicantData = applicantDoc.exists() ? applicantDoc.data() : null;
                    }

                    // Get assessor details if assignedAssessor exists
                    let assessorData = null;
                    if (inspectionData.assignedAssessor) {
                        const assessorRef = doc(db, 'assessors', inspectionData.assignedAssessor);
                        const assessorDoc = await getDoc(assessorRef);
                        assessorData = assessorDoc.exists() ? assessorDoc.data() : null;
                    }

                    // Prepare renewal specific data
                    const renewalData = inspectionData.applicationType === 'renewal' ? {
                        previousNOCNumber: inspectionData.previousNOCNumber || '',
                        previousNOCIssueDate: inspectionData.previousNOCIssueDate || '',
                        previousNOCExpiryDate: inspectionData.previousNOCExpiryDate || '',
                        previousNOCCertificateUrl: inspectionData.previousNOCCertificateUrl || ''
                    } : null;

                    // Combine all details with null checks
                    applications.push({
                        inspectionId: inspectionDoc.id || '',
                        applicationId: inspectionData.applicationId || '',
                        applicationType: inspectionData.applicationType || 'new',
                        status: inspectionData.status || 'Pending_Inspection',
                        assignedDate: inspectionData.assignedDate || null,
                        scheduledDate: inspectionData.scheduledDate || null,
                        inspectionStatus: inspectionData.inspectionStatus || 'Not Started',
                        remarks: inspectionData.remarks || '',
                        
                        // Add renewal specific data if it exists
                        ...(renewalData && {
                            previousNOCDetails: renewalData
                        }),

                        applicant: {
                            name: applicantData?.name || 'N/A',
                            email: applicantData?.email || 'N/A',
                            phone: applicantData?.phone || 'N/A'
                        },
                        assessor: {
                            name: assessorData?.name || 'N/A',
                            email: assessorData?.email || 'N/A',
                            phone: assessorData?.phone || 'N/A'
                        },
                        buildingDetails: {
                            name: nocApplicationData?.buildingName || 'N/A',
                            address: nocApplicationData?.buildingAddress || 'N/A',
                            type: nocApplicationData?.buildingType || 'N/A',
                            height: nocApplicationData?.buildingHeight || 'N/A',
                            area: nocApplicationData?.buildingArea || 'N/A',
                            floors: nocApplicationData?.numberOfFloors || 'N/A'
                        },
                        documents: Array.isArray(nocApplicationData?.documents) ? nocApplicationData.documents : [],
                        checklist: Array.isArray(inspectionData.checklist) ? inspectionData.checklist : [],
                        lastUpdated: inspectionData.updatedAt || inspectionData.assignedDate || new Date().toISOString()
                    });
                } catch (docError) {
                    console.error('Error processing document:', inspectionDoc.id, docError);
                    continue;
                }
            }

            // Sort by assigned date (newest first) with null check
            applications.sort((a, b) => {
                const dateA = a.assignedDate ? new Date(a.assignedDate) : new Date(0);
                const dateB = b.assignedDate ? new Date(b.assignedDate) : new Date(0);
                return dateB - dateA;
            });

            res.status(200).json({
                message: 'Inspection list fetched successfully',
                data: applications,
                total: applications.length
            });

        } catch (error) {
            console.error('Error fetching inspection list:', error);
            res.status(500).json({
                message: 'Error fetching inspection list',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    },

    // Complete inspection and move to CFO list
    markInspectionCompleted: async (req, res) => {
        try {
            const { applicationId, inspectionRemarks } = req.body;

            // Validate input
            if (!applicationId || !inspectionRemarks) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: applicationId and inspectionRemarks are required'
                });
            }

            // Find inspection document by applicationId
            const inspectionListRef = collection(db, 'inspectionList');
            const q = query(inspectionListRef, where('applicationId', '==', applicationId));
            const inspectionSnapshot = await getDocs(q);

            if (inspectionSnapshot.empty) {
                return res.status(404).json({
                    success: false,
                    message: 'Inspection not found for this application'
                });
            }

            // Get the latest inspection
            const latestInspection = inspectionSnapshot.docs[0].data();
            const inspectionId = inspectionSnapshot.docs[0].id;

            // Get application details from nocApplicationList
            const nocListRef = collection(db, 'nocApplicationList');
            const nocListQuery = query(nocListRef, where('applicationId', '==', applicationId));
            const nocListSnapshot = await getDocs(nocListQuery);

            let applicationType = 'new';
            let renewalDetails = {};

            if (!nocListSnapshot.empty) {
                const nocListDoc = nocListSnapshot.docs[0];
                const nocData = nocListDoc.data();
                applicationType = nocData.applicationType || 'new';

                if (applicationType === 'renewal') {
                    // Only include renewal details that are not undefined
                    if (nocData.previousNOCNumber) renewalDetails.previousNOCNumber = nocData.previousNOCNumber;
                    if (nocData.previousNOCIssueDate) renewalDetails.previousNOCIssueDate = nocData.previousNOCIssueDate;
                    if (nocData.previousNOCExpiryDate) renewalDetails.previousNOCExpiryDate = nocData.previousNOCExpiryDate;
                    if (nocData.previousNOCCertificateUrl) renewalDetails.previousNOCCertificateUrl = nocData.previousNOCCertificateUrl;
                    if (nocData.buildingType) renewalDetails.buildingType = nocData.buildingType;
                    if (nocData.buildingHeight) renewalDetails.buildingHeight = nocData.buildingHeight;
                    if (nocData.buildingArea) renewalDetails.buildingArea = nocData.buildingArea;
                }

                // Update nocApplicationList status
                await updateDoc(doc(db, 'nocApplicationList', nocListDoc.id), {
                    status: 'In CFO Review',
                    progress: 3,
                    lastUpdated: new Date().toISOString()
                });
            }

            // Update inspection document with application type
            const inspectionDocRef = doc(db, 'inspectionList', inspectionId);
            await updateDoc(inspectionDocRef, {
                inspectionStatus: 'Completed',
                progress: 3,
                status: 'Completed',
                remarks: inspectionRemarks,
                applicationType,
                ...(Object.keys(renewalDetails).length > 0 && renewalDetails),
                completedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });

            // Add to CFO list if not already exists
            const cfoListRef = collection(db, 'cfoList');
            const cfoQuery = query(cfoListRef, where('applicationId', '==', applicationId));
            const cfoSnapshot = await getDocs(cfoQuery);

            if (cfoSnapshot.empty) {
                await addDoc(cfoListRef, {
                    applicationId,
                    inspectionId,
                    status: 'Pending_CFO_Review',
                    inspectionRemarks,
                    applicationType,
                    ...(Object.keys(renewalDetails).length > 0 && renewalDetails),
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    inspectionCompletedAt: new Date().toISOString()
                });
            }

            // Update user's status if userId exists
            if (latestInspection.userId) {
                const userDocRef = doc(db, 'users', latestInspection.userId);
                await updateDoc(userDocRef, {
                    applicationStatus: 'In CFO Review',
                    progress: 3,
                    notifications: arrayUnion({
                        type: 'INSPECTION_COMPLETED',
                        message: `Your ${applicationType} application inspection has been completed and moved to CFO review.`,
                        timestamp: new Date().toISOString(),
                        applicationId: applicationId,
                        status: 'Completed',
                        applicationType,
                        ...(renewalDetails.previousNOCNumber && {
                            previousNOCNumber: renewalDetails.previousNOCNumber
                        })
                    })
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Inspection completed and moved to CFO review phase',
                data: {
                    applicationId,
                    inspectionId,
                    status: 'Completed',
                    nextStep: 'Pending_CFO_Review',
                    progress: 3,
                    applicationType,
                    ...(Object.keys(renewalDetails).length > 0 && renewalDetails)
                }
            });

        } catch (error) {
            console.error('Error completing inspection:', error);
            res.status(500).json({
                success: false,
                message: 'Error completing inspection',
                error: error.message,
                stack: error.stack
            });
        }
    }
};

module.exports = inspectionController;
