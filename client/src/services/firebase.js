/* File: client/src/services/firebase.js
  Purpose: To initialize the Firebase Client SDK.
*/
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
   apiKey: "AIzaSyCaVacJGiJz-X86Dm4w6E-mWlZyNcUe4ts",
  authDomain: "accord-1446c.firebaseapp.com",
  projectId: "accord-1446c",
  storageBucket: "accord-1446c.firebasestorage.app",
  messagingSenderId: "69251660941",
  appId: "1:69251660941:web:305de53e343ee0a28476c4",
  measurementId: "G-GBKW2W7331"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Export the Firestore database instance

