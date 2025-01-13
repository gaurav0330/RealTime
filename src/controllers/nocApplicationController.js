const { db, storage } = require('../config/firebase'); // Firestore instance
const { doc, collection, addDoc, setDoc, query, where, getDocs, updateDoc, arrayUnion, orderBy, limit } = require('firebase/firestore');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { v4: uuidv4 } = require('uuid');
const Tesseract = require('tesseract.js');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');

let count = 0;

exports.submit = async (req, res) => {
    try {
        const userId = req.user.uid;

        // Updated required fields to match the form structure
        const requiredFields = [
            // Applicant Details
            'applicantName', 'contactNumber', 'email', 'state', 'city', 'applicantType',

            // Building Specifications
            'buildingName', 'plotNumber', 'buildingAddress', 'buildingType',
            'buildingHeight', 'totalCoverdArea', 'numBasements', 'numFloors', 'maxOccupancy',

            // Required Documents
            'idProofUrl', 'ownershipProofUrl', 'buildingBlueprintUrl', 'planApprovalCertUrl',
            'fireSafetyPlanUrl', 'equipmentBillsUrl',

            // Payment Details
             'paymentReference',

            // Building Location
    'buildingLatitude', 'buildingLongitude' // Added latitude and longitude

        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    message: field.replace(/([A-Z])/g, ' $1').toLowerCase() + ' is required.'
                });
            }
        }

        // Create application data with all form fields
        // Create application data with all form fields
        const applicationData = {
            // Applicant Details
            applicantName: req.body.applicantName,
            contactNumber: req.body.contactNumber,
            email: req.body.email,
            state: req.body.state,
            city: req.body.city,
            applicantType: req.body.applicantType,


             // Add latitude and longitude from the request body
    buildingLatitude: parseFloat(req.body.buildingLatitude), // Assuming latitude is sent in the request
    buildingLongitude: parseFloat(req.body.buildingLongitude), // Assuming longitude is sent in the request

            // Building Specifications
            buildingName: req.body.buildingName,
            plotNumber: req.body.plotNumber,
            buildingAddress: req.body.buildingAddress,
            landmark: req.body.landmark || '',
            buildingType: req.body.buildingType,
            priority: req.body.priority,
            buildingHeight: parseFloat(req.body.buildingHeight),
            totalCoverdArea: parseFloat(req.body.builtUpArea),
            numBasements: parseInt(req.body.numBasements),
            numFloors: parseInt(req.body.numFloors),
            maxOccupancy: parseInt(req.body.maxOccupancy),

            // Document URLs
            idProofUrl: req.body.idProofUrl,
            ownershipProofUrl: req.body.ownershipProofUrl,
            buildingBlueprintUrl: req.body.buildingBlueprintUrl,
            planApprovalCertUrl: req.body.planApprovalCertUrl,
            fireSafetyPlanUrl: req.body.fireSafetyPlanUrl,
            equipmentBillsUrl: req.body.equipmentBillsUrl,
            localAuthorityApprovalUrl: req.body.localAuthorityApprovalUrl || '',

            // Compliance Declarations
            buildingCodeCompliance: req.body.buildingCodeCompliance,
            equipmentCompliance: req.body.equipmentCompliance,
            documentCompliance: req.body.documentCompliance,

            // Payment Information
            
            paymentReference: req.body.paymentReference,

            //step 2 deatils 
            division: req.body.division || '',
            occupancyType: req.body.buildingType || '',
            groundFloorArea: req.body.groundFloorArea || '',
            typicalFloorArea: req.body.typicalFloorArea || '',
            basementArea: req.body.basementArea || '',
            travelDistance: req.body.travelDistance || '',
            deadEndDistance: req.body.deadEndDistance || '',
            upperFloorStaircases: req.body.upperFloorStaircases || '',
            fireCheckDoor: req.body.fireCheckDoor || '',
            pressurization: req.body.pressurization || '',

            undergroundCapacity: req.body.undergroundCapacity || '',

            overheadCapacity: req.body.overheadCapacity || '',
            fireServiceInlet: req.body.fireServiceInlet || '',
            specialProtectionDetails: req.body.specialProtectionDetails || '',
            compartmentSize: req.body.compartmentSize || '',
            upperFloorCompartments: req.body.upperFloorCompartments || '',
            basementFloorCompartments: req.body.basementFloorCompartments || '',

            fireExtinguishersCount: parseInt(req.body.fireExtinguishersCount) || '',

            hoseReelLocation: req.body.hoseReelLocation || '',
            hoseReelCount: req.body.hoseReelCount || '',

            detectorType: req.body.detectorType || '',
            detectorAboveCeiling: req.body.detectorAboveCeiling || '',
            detectorInDuct: req.body.detectorInDuct || '',
            moefa: req.body.moefa || '',
            publicAddress: req.body.publicAddress || '',
            basementSprinklers: req.body.basementSprinklers || '',
            upperFloorSprinklers: req.body.upperFloorSprinklers || '',
            sprinklerAboveCeiling: req.body.sprinklerAboveCeiling || '',
            sprinklerCalculations: req.body.sprinklerCalculations || '',

            riserSize: req.body.riserSize || '',
            hydrantsPerFloor: req.body.hydrantsPerFloor || '',
            hydrantLocation: req.body.hydrantLocation || '',
            hoseBoxes: req.body.hoseBoxes || '',
            pumpRoomLocation: req.body.pumpRoomLocation || '',
            mainPumpDischarge: req.body.mainPumpDischarge || '',
            mainPumpHead: req.body.mainPumpHead || '',
            mainPumpCount: req.body.mainPumpCount || '',
            jockeyPumpOutput: req.body.jockeyPumpOutput || '',
            jockeyPumpHead: req.body.jockeyPumpHead || '',
            jockeyPumpCount: req.body.jockeyPumpCount || '',
            standbyPumpOutput: req.body.standbyPumpOutput || '',
            standbyPumpHead: req.body.standbyPumpHead || '',

            pumpHouseAccess: req.body.pumpHouseAccess || '',

            terracePumpDischarge: req.body.terracePumpDischarge || '',
            terracePumpHead: req.body.terracePumpHead || '',

            tankLocation: req.body.tankLocation || '',
            waterStorageFireInlet: req.body.waterStorageFireInlet || '',

            tankAccess: req.body.tankAccess || '',
            inspectionLadder: req.body.inspectionLadder || '',
            crossSectionDrawing: req.body.crossSectionDrawing || '',

            exitSignage: req.body.exitSignage || '',
            passengerLiftCount: req.body.passengerLiftCount || '',

            firemanSwitch: req.body.firemanSwitch || '',

            liftShaftPressure: req.body.liftShaftPressure || '',
            liftLobbyPressure: req.body.liftLobbyPressure || '',
            pumpHouseAccess: req.body.pumpHouseAccess || '',

            standbyPower: req.body.standbyPower || '',

            refugeLevels: req.body.refugeLevels || '',
            refugeArea: req.body.refugeArea || '',
            refugeStairCaseAccess: req.body.refugeStairCaseAccess || '',

            fireCheckFloor: req.body.fireCheckFloor || '',
            controlRoomLocation: req.body.controlRoomLocation || '',

            // Metadata
            applicationStatus: 'submitted',
            createdAt: new Date().toISOString(),
            userId,
            submissionDate: new Date().toISOString()
        };
        // Save to Firestore
        const userDocRef = doc(db, 'users', userId);
        const applicationsRef = collection(userDocRef, 'nocApplications');

        if (applicationData.state.toLowerCase() === "mh") {
            const agencyApplicationsRef = collection(db, 'agencyApplications');
            const docRef = await addDoc(agencyApplicationsRef, applicationData);
            res.status(201).json({
                message: 'NOC Application submitted successfully to agency!',
                applicationId: docRef.id
            });
        } else {
            const docRef = await addDoc(applicationsRef, applicationData);
            const nocApplicationListRef = collection(db, 'nocApplicationList');
            await addDoc(nocApplicationListRef, {
                ...applicationData,
                applicationId: docRef.id,
                applicationStatus: 'submitted',
                submissionDate: new Date().toISOString(),
                applicationType: 'new'
            });

            if (userId) {
                const usersRef = collection(db, 'users');
                const userQuery = query(usersRef, where('uid', '==', userId));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        applicationStatus: 'Accepted',
                        progress: 1,
                        applicationId: docRef.id,
                        notifications: arrayUnion({
                            type: 'Application Successfully Submitted',
                            message: 'Your Appliation submitted successfully.',
                        })
                    });
                }
            }

            res.status(201).json({
                message: 'NOC Application submitted successfully!',
                applicationId: docRef.id
            });
        }
    } catch (error) {
        console.error('Error submitting NOC application:', error);
        res.status(500).json({
            message: 'Error submitting NOC application',
            error: error.message
        });
    }
};

//submit to local Authority

exports.localAuthoritysubmit = async (req, res) => {
    try {
        const userId = req.user.uid;


        const requiredFields = [
            'applicantName',
            'contactNumber',
            'emailAddress',
            'propertyAddress',
            'plotSize',
            'zoneClassification',
            'buildingType',
            'numberOfFloors',
            'plotMapUrl',    // Add 'plotMapUrl' here
            'designPlanUrl', // Ensure this matches frontend data (or update to 'designPlansUrl' if needed)
            'ownershipUrl'   // Same for this field
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    message: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required.`
                });
            }
        }

        // Create application data with all form fields
        const applicationData = {
            applicantName: req.body.applicantName,
            contactNumber: req.body.contactNumber,
            emailAddress: req.body.emailAddress,
            propertyAddress: req.body.propertyAddress,
            plotSize: req.body.plotSize,
            zoneClassification: req.body.zoneClassification,
            buildingType: req.body.buildingType,
            numberOfFloors: req.body.numberOfFloors,
            plotMapUrl: req.body.plotMapUrl,      // File URL
            designPlanUrl: req.body.designPlanUrl,  // File URL
            ownershipUrl: req.body.ownershipUrl    // File URL
        };

        // for (const field of requiredFields) {
        //     if (!req.body[field]) {
        //         return res.status(400).json({
        //             message: field.replace(/([A-Z])/g, ' $1').toLowerCase() + ' is required.'
        //         });
        //     }
        // }

        // Create application data with all form fields
        // Create application data with all form fields
        
        // Save to Firestore
        const userDocRef = doc(db, 'users', userId);
        const applicationsRef = collection(userDocRef, 'localAuthorityApplications');

        {
            const docRef = await addDoc(applicationsRef, applicationData);
            const localAuthorityListRef = collection(db, 'localAuthorityList');
            await addDoc(localAuthorityListRef, {
                ...applicationData,
                applicationId: docRef.id,
                applicationStatus: 'submitted',
                submissionDate: new Date().toISOString(),
                applicationType: 'new'
            });

            // if (userId) {
            //     const usersRef = collection(db, 'users');
            //     const userQuery = query(usersRef, where('uid', '==', userId));
            //     const userSnapshot = await getDocs(userQuery);

            //     // if (!userSnapshot.empty) {
            //     //     const userDoc = userSnapshot.docs[0];
            //     //     await updateDoc(doc(db, 'users', userDoc.id), {
            //     //         applicationStatus: 'Accepted',
            //     //         progress: 1,
            //     //         applicationId: docRef.id,
            //     //         notifications: arrayUnion({
            //     //             type: 'Application Successfully Submitted',
            //     //             message: 'Your Appliation submitted successfully.',
            //     //         })
            //     //     });
            //     // }
            // }

            res.status(201).json({
                message: 'building plan approval application submitted successfully!',
                applicationId: docRef.id
            });
        }
    } catch (error) {
        console.error('Error submitting building plan approval application:', error);
        res.status(500).json({
            message: 'Error submitting building plan approval application',
            error: error.message
        });
    }
};
//Submit Provisional
exports.submitProvisional = async (req, res) => {
    try {
        const userId = req.user.uid;


        // Updated required fields to match the form structure
        const requiredFields = [
            // Applicant Details
            'applicantName', 'contactNumber', 'email', 'state', 'city', 'applicantType',

            // Building Specifications
            'buildingName', 'plotNumber', 'buildingAddress', 'buildingType',
            'buildingHeight', 'builtUpArea', 'numBasements', 'numFloors', 'maxOccupancy',

            // Fire Safety Details
            'undergroundTankCapacity', 'terraceWaterTank', 'firePumpCapacity', 'hydrantPoints',
            'emergencyExits', 'assemblyPoint',

            // Required Documents
            'idProofUrl', 'ownershipProofUrl', 'buildingBlueprintUrl',
            'fireSafetyPlanUrl'


        ];


        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    message: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required.` // Fixed syntax
                });
            }
        }


        // Create application data with all form fields
        const applicationData = {
            // Applicant Details
            applicantName: req.body.applicantName,
            contactNumber: req.body.contactNumber,
            email: req.body.email,
            state: req.body.state,
            city: req.body.city,
            applicantType: req.body.applicantType,

            // Building Specifications
            buildingName: req.body.buildingName,
            plotNumber: req.body.plotNumber,
            buildingAddress: req.body.buildingAddress,
            landmark: req.body.landmark || '',
            buildingType: req.body.buildingType,
            priority: req.body.priority,
            buildingHeight: parseFloat(req.body.buildingHeight),
            builtUpArea: parseFloat(req.body.builtUpArea),
            numBasements: parseInt(req.body.numBasements),
            numFloors: parseInt(req.body.numFloors),
            maxOccupancy: parseInt(req.body.maxOccupancy),

            // Fire Safety Equipment
            fireExtinguishers: req.body.fireExtinguishers === 'on',
            smokeDetectors: req.body.smokeDetectors === 'on',
            sprinklerSystem: req.body.sprinklerSystem === 'on',
            fireHydrants: req.body.fireHydrants === 'on',
            fireAlarmSystem: req.body.fireAlarmSystem === 'on',
            emergencyLights: req.body.emergencyLights === 'on',

            // Water Supply and Storage
            undergroundTankCapacity: parseInt(req.body.undergroundTankCapacity),
            terraceWaterTank: parseInt(req.body.terraceWaterTank),
            firePumpCapacity: parseFloat(req.body.firePumpCapacity),
            hydrantPoints: parseInt(req.body.hydrantPoints),

            // Emergency Evacuation
            emergencyExits: parseInt(req.body.emergencyExits),
            assemblyPoint: req.body.assemblyPoint,

            // Document URLs
            idProofUrl: req.body.idProofUrl,
            ownershipProofUrl: req.body.ownershipProofUrl,
            buildingBlueprintUrl: req.body.buildingBlueprintUrl,
            fireSafetyPlanUrl: req.body.fireSafetyPlanUrl,

            // Compliance Declarations
            buildingCodeCompliance: req.body.buildingCodeCompliance === 'on',
            equipmentCompliance: req.body.equipmentCompliance === 'on',
            documentCompliance: req.body.documentCompliance === 'on',


            // Metadata
            status: 'Pending',
            createdAt: new Date().toISOString(),
            userId,
            submissionDate: new Date().toISOString()
        };


        // Save to Firestore
        const userDocRef = doc(db, 'users', userId);
        const applicationsRef = collection(userDocRef, 'ProvisionalApplications');
        let id = "";

        // Fix the state validation logic
        if (applicationData.state.toLowerCase() === "mh") {
            // Save to the agencyApplications collection
            const agencyApplicationsRef = collection(db, 'agencyApplications');
            const docRef = await addDoc(agencyApplicationsRef, applicationData);
            res.status(201).json({
                message: 'NOC Application submitted successfully to agency!',
                applicationId: docRef.id
            });
        } else {
            // Save to both user's applications and nocApplicationList
            const docRef = await addDoc(applicationsRef, applicationData);

            // Add to nocApplicationList collection
            const nocApplicationListRef = collection(db, 'ProvisionalApplicationList');
            await addDoc(nocApplicationListRef, {
                ...applicationData,
                applicationId: docRef.id,
                status: 'Pending',
                nocType: 'Provisional',
                userId,
                submissionDate: new Date().toISOString()
            });

            id = docRef.id;


            if (userId) {
                const usersRef = collection(db, 'users');
                const userQuery = query(usersRef, where('uid', '==', userId));
                const userSnapshot = await getDocs(userQuery);


                if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    await updateDoc(doc(db, 'users', userDoc.id), {
                        applicationStatus: "Accepted",
                        progress: 1
                    });
                }
            }

            res.status(201).json({
                message: 'NOC Application submitted successfully!',
                applicationId: docRef.id
            });


            // Send email notification
            try {
                const status = 'Submitted';
                const statusMessage =  'Accepted'
                    ? `Your Provisional NOC application has been Submitted successfully`
                    : 'Your Provisional NOC application is not been Submitted successfully';

                const emailMessage = `
NOC Application Status Update

Hello,

Status: ${status}

${statusMessage}

Application Details:
- Application ID: ${id}
- Time: ${new Date().toLocaleString()}

If you have any questions, please contact our support team.

Best regards,
Fire Department Team
            `;

                await sendEmail(applicationData.email, `NOC Application ${status}`, emailMessage);
            } catch (emailError) {
                console.error('Failed to send application status notification:', emailError.message);
            }
        }
    } catch (error) {
        console.error('Error submitting NOC application:', error);
        res.status(500).json({
            message: 'Error submitting NOC application',
            error: error.message
        });
    }
};






// Fetch all submitted NOC applications for the user
exports.getAllSubmittedApplications = async (req, res) => {
    try {
        const applicationsRef = collection(db, 'nocApplicationList'); // Root-level collection

        // Fetch all documents from the collection
        const applicationsSnapshot = await getDocs(applicationsRef);

        if (applicationsSnapshot.empty) {
            return res.status(404).json({ message: 'No submitted applications found.' });
        }

        const applications = applicationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json({
            message: 'Applications fetched successfully!',
            applications,
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Error fetching applications' });
    }
};
// Save an NOC application as a draft
exports.saveDraft = async (req, res) => {
    try {
        const userId = req.user.uid;
        const draftData = req.body;

        // Validate required fields
        if (!draftData.applicantName || !draftData.email) {
            return res.status(400).json({ message: 'Applicant name and email are required.' });
        }

        // Reference the user's `drafts` subcollection
        const userDocRef = doc(db, 'users', userId);
        const draftsRef = collection(userDocRef, 'drafts');

        // Check if user already has a draft
        const draftsSnapshot = await getDocs(draftsRef);
        let existingDraftId = null;

        if (!draftsSnapshot.empty) {
            existingDraftId = draftsSnapshot.docs[0].id;
        }

        // Reference to the draft document (either existing or new)
        const draftDocRef = existingDraftId
            ? doc(draftsRef, existingDraftId)
            : doc(draftsRef, 'current_draft'); // Use a fixed ID for the single draft

        // Save or update the draft
        await setDoc(draftDocRef, {
            ...draftData,
            updatedAt: new Date().toISOString(),
            userId
        });

        res.status(200).json({
            message: existingDraftId ? 'Draft updated successfully!' : 'Draft saved successfully!',
            draftId: draftDocRef.id
        });

    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ message: 'Error saving draft' });
    }
};

// Fetch saved draft for the user
exports.getSavedDrafts = async (req, res) => {
    try {
        const userId = req.user.uid;

        // Reference to the user's `drafts` subcollection
        const userDocRef = doc(db, 'users', userId);
        const draftsRef = collection(userDocRef, 'drafts');

        // Get the single draft document
        const draftsSnapshot = await getDocs(draftsRef);

        if (draftsSnapshot.empty) {
            return res.status(404).json({ message: 'No draft found.' });
        }

        // Get the first (and only) draft
        const draftDoc = draftsSnapshot.docs[0];
        const draft = {
            id: draftDoc.id,
            ...draftDoc.data()
        };

        res.status(200).json({
            message: 'Draft fetched successfully!',
            drafts: [draft] // Keep the same response structure for compatibility
        });
    } catch (error) {
        console.error('Error fetching draft:', error);
        res.status(500).json({ message: 'Error fetching draft' });
    }
};

// Handle file uploads
// Handle file uploads
exports.uploadFile = async (req, res) => {
    try {
        let name = "Ayush";
        console.log('Files received:', req.files);

        if (!req.files) {
            return res.status(400).json({ message: 'No files uploaded' });
        }


        const file = req.files[Object.keys(req.files)[0]];
        const userId = req.user.uid;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                message: 'Invalid file type. Only JPG, PNG and PDF files are allowed.'
            });
        }


        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        try {
            // OCR Processing
            if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
                extractedText = await extractTextFromImage(file.data);
            } else if (file.mimetype === 'application/pdf') {
                extractedText = await extractTextFromPdf(file.data);
            }


            console.log('Extracted Text:', extractedText);
            // Check if the value is present in the text of File 1
            const checkResult1 = checkValueInText(extractedText, name);
            if (checkResult1 === 1) {
                count++;
            }
            console.log(count);
            // Generate unique filename with timestamp
            const timestamp = new Date().getTime();
            const fileExtension = file.name.split('.').pop();
            const fileName = `noc_documents/${userId}_${timestamp}_${uuidv4()}.${fileExtension}`;

            // Create storage reference in single folder
            const storageRef = ref(storage, fileName);

            // Upload file
            const snapshot = await uploadBytes(storageRef, file.data);

            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);


            res.status(200).json({
                message: 'File uploaded successfully',
                fileUrl: downloadURL,
                fileName: fileName
            });
        } catch (firebaseError) {
            console.error('Firebase upload error:', firebaseError);
            throw new Error('Failed to upload to storage');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            message: error.message || 'Error uploading file',
            error: error.toString()
        });
    }
};
// Function to extract text from images using OCR
const extractTextFromImage = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(fileBuffer, 'eng', {
            logger: (m) => console.log(m),
        })
            .then((result) => resolve(result.data.text))
            .catch((err) => reject(err));
    });
};
// Function to extract text from PDFs (basic implementation for now)const  pdfParse = require('pdf-parse');
const extractTextFromPdf = async (fileBuffer) => {
    try {
        const pdfData = await pdfParse(fileBuffer);
        return pdfData.text || 'No extractable text found in the PDF.';
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Error processing PDF file for OCR.');
    }
};

const checkValueInText = (text, value) => {
    return text.includes(value) ? 1 : 0;
};


//renewal 
exports.renewNOC = async (req, res) => {
    try {
        const userId = req.user?.uid;  // Use optional chaining
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is missing.' });
        }

        // Fetch the user's document reference
        const userDocRef = doc(db, 'users', userId);
        const applicationsRef = collection(userDocRef, 'nocApplications');  // Get the 'nocApplications' subcollection
        // Fetch all NOC applications for the user (no query filtering)
        const querySnapshot = await getDocs(applicationsRef);
        if (querySnapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No NOC applications found for this user.'
            });
        }

        // Directly get the first application (or the most recent if sorted by Firestore or application data logic)
        const previousApplication = querySnapshot.docs[0].data();  // Use the first document fetched

        // If no previous application exists, return an error
        if (!previousApplication) {
            return res.status(404).json({
                success: false,
                message: 'No previous NOC application found for renewal.'
            });
        }

        //for previous noc applications
        const USERREF = collection(db, 'users');

        // Create query to find user by uid
        const q = query(USERREF, where('uid', '==', userId));
        const QUERYSNAPSHOT = await getDocs(q);

        if (QUERYSNAPSHOT.empty) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get the user document
        const USERDOC = QUERYSNAPSHOT.docs[0];
        const userData = USERDOC.data();
        // Prepare renewal data using existing NOC details
        const renewalData = {
            ...previousApplication,
            status: 'Pending',
            nocNumber: userData.nocNumber || 'N/A',
            issueDate: userData.issuanceDate || 'N/A',
            //    / expiryDate: userDocRef.expiryDate || 'N/A',
            certificateUrl: userData.certificateUrl || '',
            renewalSubmissionDate: new Date().toISOString(),
            createdAt: new Date().toISOString() // Ensure timestamp consistency
        };

        // Add the renewal application to the 'renewList' collection
        const renewRef = doc(collection(db, 'renewList'));
        await setDoc(renewRef, { ...renewalData, applicationId: renewRef.id });

        // Update the user's status
        await updateDoc(userDocRef, {
            applicationStatus: 'Pending',
            progress: 1,
            hasActiveRenewal: true,
            lastRenewalDate: new Date().toISOString(),
            notifications: arrayUnion({
                type: 'NOC_RENEWAL',
                message: 'Your NOC renewal application has been submitted successfully.',
                timestamp: new Date().toISOString(),
                applicationId: renewRef.id,
                status: 'Pending'
            })
        });

        res.status(201).json({
            success: true,
            message: 'NOC renewal application submitted successfully!',
            applicationId: renewRef.id,
            previousNOCDetails: {
                nocNumber: previousApplication.nocNumber || 'N/A',
                issueDate: previousApplication.issueDate || 'N/A',
                expiryDate: previousApplication.expiryDate || 'N/A',
                certificateUrl: previousApplication.nocCertificateUrl || ''
            }
        });

    } catch (error) {
        console.error('Error submitting NOC renewal:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting NOC renewal application',
            error: error.message
        });
    }
};



exports.submitEmergencyApplication = async (req, res) => {
    try {
        // Get user ID from the verified token
        const userId = req.user.uid; // Assuming verifyToken middleware adds user to req

        // Validate required fields
        const requiredFields = [
            'fullName', 
            'contactNumber', 
            'email', 
            'address', 
            'reason', 
            'purpose', 
            'requiredBy', 
            'emergency', 
            'applicantName', 
            'signature', 
            'submissionDate'
        ];

        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    message: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required.`
                });
            }
        }

        // Prepare emergency application data
        const emergencyApplicationData = {
            // Applicant Details
            fullName: req.body.fullName,
            contactNumber: req.body.contactNumber,
            email: req.body.email,
            address: req.body.address,

            // NOC Details
            reason: req.body.reason,
            purpose: req.body.purpose,
            requiredBy: req.body.requiredBy,

            // Emergency Justification
            emergency: req.body.emergency,

            // Declaration Details
            applicantName: req.body.applicantName,
            signature: req.body.signature,
            submissionDate: req.body.submissionDate,

            // Metadata
            userId,
            applicationStatus: 'emergency_submitted',
            createdAt: new Date().toISOString(),
            priority: 'high' // Emergency applications are high priority
        };

        // Save to Firestore
        const userDocRef = doc(db, 'li', userId);
        const emergencyApplicationsRef = collection(userDocRef, 'emergencyApplications');

        // Add to user's emergency applications
        const docRef = await addDoc(emergencyApplicationsRef, emergencyApplicationData);

        // Add to global emergency applications list
        const emergencyApplicationListRef = collection(db, 'emergencyApplicationList');
        await addDoc(emergencyApplicationListRef, {
            ...emergencyApplicationData,
            applicationId: docRef.id
        });

        // Update user document with notification
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('uid', '==', userId));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
                applicationStatus: 'Emergency Application Submitted',
                progress: 1,
                notifications: arrayUnion({
                    type: 'Emergency Application',
                    message: 'Your emergency NOC application has been submitted successfully.',
                    timestamp: new Date().toISOString(),
                    applicationId: docRef.id
                })
            });
        }

        // Optional: Send email notification
        try {
            const emailMessage = `
Emergency NOC Application Submitted

Dear ${emergencyApplicationData.fullName},

Your emergency NOC application has been received and is being processed on a priority basis.

Application Details:
- Application ID: ${docRef.id}
- Submission Date: ${emergencyApplicationData.submissionDate}
- Purpose: ${emergencyApplicationData.purpose}

Our team will review your application immediately and contact you soon.

Best regards,
Fire Department Team
            `;

            await sendEmail(emergencyApplicationData.email, 'Emergency NOC Application Submitted', emailMessage);
        } catch (emailError) {
            console.error('Failed to send emergency application notification:', emailError.message);
        }

        res.status(201).json({
            message: 'Emergency NOC application submitted successfully!',
            applicationId: docRef.id
        });

    } catch (error) {
        console.error('Error submitting emergency NOC application:', error);
        res.status(500).json({
            message: 'Error submitting emergency NOC application',
            error: error.message
        });
    }
};