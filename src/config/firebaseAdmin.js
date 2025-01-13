const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // Path to your Firebase service account JSON file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://instragramclone-d2c6f-default-rtdb.firebaseio.com'
});

module.exports = admin;
