const admin = require('../config/firebaseAdmin');
const { sendEmail } = require('./emailController'); // Ensure sendEmail is correctly implemented

const fetchData = (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const db = admin.database();
        const ref = db.ref('sensorData');

        let emailSent = false;

        // Listen for changes in Firebase Realtime Database
        ref.on('value', async (snapshot) => {
            const data = snapshot.val();
            console.log('Real-time sensor data:', data.temperature, data.humidity, data.gasSensor, data.irSensor);

            const alert = {
                temperature: data.temperature,
                humidity: data.humidity,
                timestamp: new Date().toISOString(),
                location: [20.745319, 78.602386], // Replace with dynamic location if available
                type: 'Temperature Alert',
                status: data.temperature > 28 ? 'Active' : 'Normal',
            };

            // Check for alert conditions
            if (data.temperature > 29 && !emailSent) {
                alert.message = `The current temperature is ${data.temperature}°C, which exceeds the safe threshold. Immediate action is required.`;

                // Send email notification
                try {
                    await sendEmail(
                        'ayushwaghale777@gmail.com',
                        'Temperature Alert',
                        alert.message
                    );
                    console.log('Alert email sent successfully.');
                    emailSent = true;
                } catch (emailError) {
                    console.error('Error sending alert email:', emailError);
                }
            }

            // Reset emailSent when temperature returns to normal
            if (data.temperature < 28) {
                emailSent = false;
            }

            // Stream alert data to the frontend
            res.write(`data: ${JSON.stringify(alert)}\n\n`);
        });

        // Handle client disconnection
        req.on('close', () => {
            console.log('Client disconnected');
            ref.off(); // Remove listener
        });
    } catch (error) {
        console.error('Error setting up real-time updates:', error);
        res.status(500).send('Error setting up real-time updates');
    }
};

module.exports = { fetchData };
