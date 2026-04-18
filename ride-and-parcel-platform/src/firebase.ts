import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace these with your actual Firebase config if you have one
// For this demo, we'll use placeholder values that you can replace
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "ride-share-parcel.firebaseapp.com",
  projectId: "ride-share-parcel",
  storageBucket: "ride-share-parcel.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
