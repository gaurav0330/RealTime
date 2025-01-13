const { db, storage } = require('../config/firebase');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { doc, updateDoc, collection, query, getDocs, where, getDoc, writeBatch, arrayUnion, setDoc, orderBy, limit } = require('firebase/firestore');
// const { sendEmail, verifyTransporter, sendSingleEmail } = require('../utils/emailHelper');
const PDFDocument = require('pdfkit');
const { sendEmail } = require('./emailController');

exports.getAllApplications = async (req, res) => {
    try {
        // Fetch from nocApplicationList
        const nocRef = collection(db, 'nocApplicationList');
        const nocSnapshot = await getDocs(nocRef);
        const nocApplications = nocSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'nocApplicationList',
            applicationType: doc.data().applicationType || 'new',
            previousNOCNumber: doc.data().previousNOCNumber || null,
            previousNOCCertificateUrl: doc.data().previousNOCCertificateUrl || null,
            ...doc.data()
        }));

        // Fetch from inspectionList
        const inspectionRef = collection(db, 'inspectionList');
        const inspectionSnapshot = await getDocs(inspectionRef);
        const inspectionApplications = inspectionSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'inspectionList',
            applicationType: doc.data().applicationType || 'new',
            previousNOCNumber: doc.data().previousNOCNumber || null,
            previousNOCCertificateUrl: doc.data().previousNOCCertificateUrl || null,
            ...doc.data()
        }));

        // Fetch from cfoList
        const cfoRef = collection(db, 'cfoList');
        const cfoSnapshot = await getDocs(cfoRef);
        const cfoApplications = cfoSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'cfoList',
            applicationType: doc.data().applicationType || 'new',
            previousNOCNumber: doc.data().previousNOCNumber || null,
            previousNOCCertificateUrl: doc.data().previousNOCCertificateUrl || null,
            ...doc.data()
        }));

        // Combine all applications
        const allApplications = [
            ...nocApplications,
            ...inspectionApplications,
            ...cfoApplications
        ];

        // Remove duplicates based on applicationId
        const uniqueApplications = Array.from(
            new Map(
                allApplications.map(app => [app.applicationId || app.id, app])
            ).values()
        );

        // Sort applications by date (newest first)
        uniqueApplications.sort((a, b) => {
            const dateA = new Date(a.submittedAt || a.createdAt || a.lastUpdated || 0);
            const dateB = new Date(b.submittedAt || b.createdAt || b.lastUpdated || 0);
            return dateB - dateA;
        });

        if (uniqueApplications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No applications found in any collection.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Applications fetched successfully!',
            applications: uniqueApplications,
            stats: {
                total: uniqueApplications.length,
                noc: nocApplications.length,
                inspection: inspectionApplications.length,
                cfo: cfoApplications.length
            }
        });

    } catch (error) {
        console.error('Error fetching all applications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message
        });
    }
};

exports.getPendingApplications = async (req, res) => {
    try {
        // Check if user and state exist
        if (!req.user || !req.user.state) {
            return res.status(400).json({
                success: false,
                message: 'User state not found. Please ensure user state is properly set.'
            });
        }

        let cfoState = req.user.state;

        if (cfoState === "TAMIL NADU") {
            cfoState = "TN";
        } else if (cfoState === "MAHARASHTRA") {
            cfoState = "MH";
        } else if (cfoState === "DELHI") {
            cfoState = "DL";
        }
        // Fetch applications from nocApplicationList
        const nocRef = collection(db, 'nocApplicationList');
        const nocQuery = query(
            nocRef, 
            where('inspectionStatus', '==', 'Completed'),
            where('state', '==', cfoState) // Add state filter
        );
        const nocSnapshot = await getDocs(nocQuery);
        const nocApplications = nocSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'nocApplicationList',
            ...doc.data()
        }));

        // Fetch applications from cfoList
        const cfoRef = collection(db, 'cfoList');
        const cfoQuery = query(
            cfoRef,
            where('state', '==', cfoState) // Add state filter
        );
        const cfoSnapshot = await getDocs(cfoQuery);
        const cfoApplications = cfoSnapshot.docs.map(doc => ({
            id: doc.id,
            source: 'cfoList',
            ...doc.data()
        }));

        // Combine and remove duplicates
        const allApplications = [...nocApplications, ...cfoApplications];
        const uniqueApplications = Array.from(
            new Map(
                allApplications.map(app => [app.applicationId || app.id, app])
            ).values()
        );

        // Filter out approved, rejected, and pending review applications
        const pendingApplications = uniqueApplications.filter(app => 
            app.status !== 'Approved' && 
            app.status !== 'Rejected' && 
            app.status !== 'Pending_Review' &&
            app.state === cfoState // Additional state check
        );

        if (pendingApplications.length === 0) {
            return res.status(200).json({ 
                success: true,
                message: `No pending applications found for state: ${cfoState}`,
                applications: [] 
            });
        }

        res.status(200).json({
            success: true,
            message: 'Pending applications fetched successfully!',
            applications: pendingApplications,
            stats: {
                total: pendingApplications.length,
                noc: nocApplications.length,
                cfo: cfoApplications.length
            },
            state: cfoState // Include CFO's state in response
        });

    } catch (error) {
        console.error('Error fetching pending applications:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching applications',
            error: error.message 
        });
    }
};

exports.reviewApplication = async (req, res) => {
    try {
        const { applicationId, cfoStatus, cfoRemarks } = req.body;

        // Validate required fields
        if (!applicationId || !cfoStatus || !cfoRemarks) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate status
        if (!['Approved', 'Rejected'].includes(cfoStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be Approved or Rejected.'
            });
        }

        // Get application reference
        const applicationRef = doc(db, 'cfoList', applicationId);
        const applicationDoc = await getDoc(applicationRef);

        if (!applicationDoc.exists()) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Query to find the user with this application ID
        const userQuery = query(
            collection(db, 'users'),
            where('applicationId', '==', applicationId)
        );
        const userSnapshot = await getDocs(userQuery);

        // Start a batch write
        const batch = writeBatch(db);

        // Update application status
        batch.update(applicationRef, {
            status: cfoStatus,
            remarks: cfoRemarks,
            reviewedAt: new Date().toISOString(),
            reviewedBy: 'CFO'
        });

        // Update user document if exists
        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            batch.update(doc(db, 'users', userDoc.id), {
                cfoStatus: cfoStatus,
                progress: cfoStatus === 'Approved' ? 4 : 0,
                notifications: arrayUnion({
                    type: 'CFO_REVIEW',
                    message: cfoStatus === 'Approved' 
                        ? 'Your application has been approved by the CFO.'
                        : 'Your application has been rejected by the CFO. Please check the remarks.',
                    applicationId: applicationId,
                    status: cfoStatus,
                    remarks: cfoRemarks,
                    timestamp: new Date().toISOString()
                })
            });
        }

        // Commit the batch
        await batch.commit();

        res.status(200).json({
            success: true,
            message: `Application ${cfoStatus.toLowerCase()} successfully!`,
            data: {
                applicationId,
                status: cfoStatus,
                remarks: cfoRemarks
            }
        });

    } catch (error) {
        console.error('Error reviewing application:', error);
        res.status(500).json({
            success: false,
            message: 'Error reviewing application',
            error: error.message
        });
    }
};

exports.getApplicationDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Application ID is required'
            });
        }

        // First check in cfoList
        const cfoRef = collection(db, 'cfoList');
        const cfoQuery = query(cfoRef, where('applicationId', '==', id));
        const cfoSnapshot = await getDocs(cfoQuery);
        
        let cfoData = null;
        if (!cfoSnapshot.empty) {
            cfoData = cfoSnapshot.docs[0].data();
        }

        // Get application details from nocApplicationList
        const nocRef = collection(db, 'nocApplicationList');
        const nocQuery = query(nocRef, where('applicationId', '==', id));
        let nocSnapshot = await getDocs(nocQuery);

        // If not found by applicationId, try direct document ID
        if (nocSnapshot.empty) {
            const directNocDoc = await getDoc(doc(db, 'nocApplicationList', id));
            if (directNocDoc.exists()) {
                nocSnapshot = {
                    docs: [{ 
                        id: directNocDoc.id,
                        data: () => directNocDoc.data()
                    }]
                };
            }
        }

        if (nocSnapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const applicationData = nocSnapshot.docs[0].data();
        const applicationId = nocSnapshot.docs[0].id;

        // If it's a renewal application, get the previous NOC details
        let previousNOCDetails = {};
        if (applicationData.applicationType === 'renewal') {
            try {
                // Get user's profile
                const userRef = collection(db, 'users');
                const userQuery = query(userRef, where('uid', '==', applicationData.userId));
                const userSnapshot = await getDocs(userQuery);
                
                if (!userSnapshot.empty) {
                    const userData = userSnapshot.docs[0].data();
                    
                    // Get previous NOC details from user profile
                    previousNOCDetails = {
                        previousNOCNumber: userData.nocNumber,
                        previousNOCIssueDate: userData.IssuanceDate,
                        previousNOCExpiryDate: userData.ValidityPeriod,
                        previousNOCCertificateUrl: userData.certificateUrl,
                        previousBuildingType: userData.buildingType,
                        previousBuildingHeight: userData.buildingHeight,
                        previousBuildingArea: userData.builtUpArea,
                        previousNOCStatus: userData.nocStatus
                    };
                }

                if (!previousNOCDetails.previousNOCNumber) {
                    console.warn(`Warning: No previous NOC details found for user ${applicationData.userId}`);
                }
            } catch (error) {
                console.error('Error fetching previous NOC details from user profile:', error);
            }
        }

        // Add validation to ensure we have the required fields
        if (applicationData.applicationType === 'renewal' && !previousNOCDetails.previousNOCNumber) {
            console.warn(`Warning: Renewal application ${applicationId} has no previous NOC details`);
        }

        // Get inspection details
        const inspectionRef = collection(db, 'inspectionList');
        const inspectionQuery = query(inspectionRef, where('applicationId', '==', id));
        const inspectionSnapshot = await getDocs(inspectionQuery);
        let inspectionData = null;

        if (!inspectionSnapshot.empty) {
            inspectionData = inspectionSnapshot.docs[0].data();
        }

        // Combine all data
        const completeApplicationData = {
            id: applicationId,
            ...applicationData,
            inspectionDetails: inspectionData,
            cfoReviewDetails: cfoData,
            previousNOCDetails: previousNOCDetails
        };

        return res.status(200).json({
            success: true,
            message: 'Application details fetched successfully',
            data: completeApplicationData
        });

    } catch (error) {
        console.error('Error fetching application details:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching application details',
            error: error.message
        });
    }
};

// exports.generateAndStoreNOC = async (req, res) => {
//     try {
//         console.log('Request body:', req.body);
//         console.log('Request files:', req.files);

//         const { applicationId, nocNumber, validityPeriod, issuanceDate } = req.body;

//         // Generate PDF data
//         const pdfData = {
//             nocNumber,
//             validityPeriod,
//             issuanceDate,
//             applicationId
//         };

//         // Create PDF buffer
//         const pdfDoc = new PDFDocument();
//         const chunks = [];
//         pdfDoc.on('data', chunk => chunks.push(chunk));
//         pdfDoc.on('end', () => {});

//         // Add content to PDF
//         pdfDoc.fontSize(25).text('NOC Certificate', 100, 100);
//         pdfDoc.fontSize(15).text(`NOC Number: ${nocNumber}`, 100, 150);
//         pdfDoc.fontSize(15).text(`Validity Period: ${validityPeriod} years`, 100, 180);
//         pdfDoc.fontSize(15).text(`Issuance Date: ${issuanceDate}`, 100, 210);
//         pdfDoc.fontSize(15).text(`Application ID: ${applicationId}`, 100, 240);
//         pdfDoc.end();

//         // Convert PDF chunks to Buffer
//         const pdfBuffer = Buffer.concat(chunks);

//         // Upload PDF buffer to storage
//         const timestamp = new Date().getTime();
//         const fileName = `noccertificates/${applicationId}_${nocNumber}_${timestamp}.pdf`;
//         const storageRef = ref(storage, fileName);

//         await uploadBytes(storageRef, pdfBuffer);
//         const downloadURL = await getDownloadURL(storageRef);

//         // Find user's email from the application
//         const usersRef = collection(db, 'users');
//         const userQuery = query(usersRef, where('applicationId', '==', applicationId));
//         const userSnapshot = await getDocs(userQuery);

//         if (!userSnapshot.empty) {
//             const userDoc = userSnapshot.docs[0];
//             const userData = userDoc.data();
//             const userEmail = userData.email;

//             // Update user document
//             await updateDoc(doc(db, 'users', userDoc.id), {
//                 nocStatus: 'Generated',
//                 progress: 4,
//                 certificateUrl: downloadURL,
//                 issuanceDate,
//                 validityPeriod,
//                 nocNumber,
//                 notifications: arrayUnion({
//                     type: 'NOC_GENERATED',
//                     message: 'Your NOC Certificate has been generated successfully.',
//                     applicationId,
//                     nocNumber,
//                     status: 'Generated',
//                     certificateUrl: downloadURL,
//                     timestamp: new Date().toISOString()
//                 })
//             });

//             // Send email notification
//             const emailSubject = 'NOC Certificate Generated';
//             const emailBody = `
//                 Dear ${userData.applicantName || 'User'},\n\n
//                 Your NOC Certificate has been successfully generated.\n
//                 NOC Number: ${nocNumber}\n
//                 Issuance Date: ${issuanceDate}\n
//                 Validity Period: ${validityPeriod} years\n\n
//                 Download your certificate here: ${downloadURL}\n\n
//                 If you did not request this, please contact support immediately.\n\n
//                 Best regards,\n
//                 Fire NOC Department
//             `;
//             await sendEmail(userEmail, emailSubject, emailBody);
//         }

//         res.status(200).json({
//             success: true,
//             message: 'NOC generated and stored successfully',
//             nocNumber,
//             certificateUrl: downloadURL
//         });

//     } catch (error) {
//         console.error('Error generating and storing NOC:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error generating and storing NOC',
//             error: error.message
//         });
//     }
// };

exports.generateAndStoreNOC = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request files:', req.files); // Access the uploaded file

        const { applicationId, nocNumber, validityPeriod, issuanceDate } = req.body;
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
        console.log(downloadURL);

        // Find user's email from the application
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('applicationId', '==', applicationId));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            const userEmail = userData.email;

            // Update user document
            await updateDoc(doc(db, 'users', userDoc.id), {
                nocStatus: 'Generated',
                progress: 4,
                certificateUrl: downloadURL,
                issuanceDate,
                validityPeriod,
                nocNumber,
                notifications: arrayUnion({
                    type: 'NOC_GENERATED',
                    message: 'Your NOC Certificate has been generated successfully.',
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
                Your NOC Certificate has been successfully generated.\n
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