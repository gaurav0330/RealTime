const nodemailer = require('nodemailer');

// Configure the email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'hotmail', 'yahoo', etc.
    auth: {
        user: "gbchannel777@gmail.com", // Your email address
        pass: "zrbp alkn ajnk vnhe", // Your email password or app password
    },
});

// Function to send an email
const sendEmail = (recipientEmail, subject, text) => {
    const mailOptions = {
        from: "gbchannel777@gmail.com", // Sender's email address
        to: recipientEmail, // Recipient's email address
        subject: subject,
        text: text,
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };