// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Add this import for authentication
import { getAnalytics } from "firebase/analytics"; // Optional if you want analytics
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJ1SisHSsl0TO1I80GrfjfIkx6O_MnnlI",
  authDomain: "fikishwa-d07c9.firebaseapp.com",
  projectId: "fikishwa-d07c9",
  storageBucket: "fikishwa-d07c9.firebasestorage.app",
  messagingSenderId: "1011474116915",
  appId: "1:1011474116915:web:be3792b5abb675248ece46",
  measurementId: "G-H84W23Y077",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);  // Get the authentication instance
const db = getFirestore(app);
// Optional: Initialize Firebase Analytics
const analytics = getAnalytics(app);

// Export the app and auth instance
export { app, auth , db };
