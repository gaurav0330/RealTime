const express = require("express");
const path = require("path");
const router = express.Router();
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("../config/firebase-adminsdk.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const auth = admin.auth();

// Signup Endpoint
router.post("/signup", async (req, res) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const user = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Save role to custom claims (for access control)
        await auth.setCustomUserClaims(user.uid, { role });

        return res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// Login Endpoint
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and Password are required" });
    }
    try {
        const user = await auth.getUserByEmail(email);

        // If login is successful, redirect to the home page
        return res.redirect(""); // Redirect to home.html after successful login
    } catch (error) {
        return res.status(500).json({ message: "Invalid credentials or user not found" });
    }
});




module.exports = router;
