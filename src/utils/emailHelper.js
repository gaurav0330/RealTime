const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Function to send a single email
const sendSingleEmail = async (to, subject, message) => {
    try {
        console.log('Starting email send process...');
        console.log('Email configuration:', {
            to,
            subject,
            from: process.env.EMAIL_USER,
            // Don't log the actual message as it might be too long
            messageLength: message.length
        });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: message
        };

        console.log('Attempting to send email with nodemailer...');
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', {
            messageId: info.messageId,
            response: info.response
        });
        return info;
    } catch (error) {
        console.error('Detailed email sending error:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        });
        throw error;
    }
};

module.exports = { sendSingleEmail }; 