// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "gridsheet",
  "appId": "1:724599118891:web:2c7ca7bca9219b023d5e6e",
  "storageBucket": "gridsheet.firebasestorage.app",
  "apiKey": "AIzaSyAGPb6xor81aijJ4WuudWpE-9kyT0hqWv4",
  "authDomain": "gridsheet-6e93b.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "724599118891"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
