import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace these with your actual Firebase config if you have one
// For this demo, we'll use placeholder values that you can replace
const firebaseConfig = {
  apiKey: "AIzaSyCl1dwvVe--1DWK6jYExFJOBtQggiyvFxc",
  authDomain: "back-ride.firebaseapp.com",
  projectId: "back-ride",
  storageBucket: "back-ride.firebasestorage.app",
  messagingSenderId: "848393297300",
  appId: "1:848393297300:web:09319cab09aad796c2c381",
  measurementId: "G-NE0Q13YRMF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
