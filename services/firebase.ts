import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlrdWjSC0GETvt0Ev6kWx8zadahUthU80",
  authDomain: "cuaderno-de-campo-c7f4a.firebaseapp.com",
  projectId: "cuaderno-de-campo-c7f4a",
  storageBucket: "cuaderno-de-campo-c7f4a.appspot.com",
  messagingSenderId: "221780213541",
  appId: "1:221780213541:web:9d474d91aacb354868e4cc",
  measurementId: "G-VELZ20G1GL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);