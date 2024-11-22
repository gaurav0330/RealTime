import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyApX9zXZG140ANsm1fkbT5r_FjFIbmly6c",
    authDomain: "instragramclone-d2c6f.firebaseapp.com",
    projectId: "instragramclone-d2c6f",
    storageBucket: "instragramclone-d2c6f.appspot.com",
    messagingSenderId: "1061159564800",
    appId: "1:1061159564800:web:f93e205642bd9bad2a4ae5",
    measurementId: "G-7F3Z899CL3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;