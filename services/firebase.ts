import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, setLogLevel } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Silenciar warnings benignos de transporte en consola
try {
  setLogLevel('error');
} catch (e) {
  // ignore if already set
}

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

// Initialize Firebase App safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore safely
let firestoreInstance;
try {
  firestoreInstance = getFirestore(app);
} catch (e) {
  try {
    firestoreInstance = initializeFirestore(app, {});
  } catch (err) {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);