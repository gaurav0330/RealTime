const express = require("express");
const path = require("path");
const app = express();
const authRouter = require("./auth"); // Assuming your login and signup logic is in auth.js

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "web-portal/public")));

// Use JSON middleware to parse request bodies
app.use(express.json());

// Use your authentication routes
app.use("/auth", authRouter);

// Add other routes if necessary

// Start the server
app.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
