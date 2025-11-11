import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  // ATENCIÓN: Reemplaza "TU_API_KEY_DE_FIREBASE" con la clave de API real de tu proyecto de Firebase.
  // Puedes encontrarla en la configuración de tu proyecto en la consola de Firebase.
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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);