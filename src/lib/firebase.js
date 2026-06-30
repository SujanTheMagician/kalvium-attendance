import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC27O3R98VemJw-1TZU8hrqtFSnP-DjYxY",
  authDomain: "kalvium-attendance.firebaseapp.com",
  projectId: "kalvium-attendance",
  storageBucket: "kalvium-attendance.firebasestorage.app",
  messagingSenderId: "965569445341",
  appId: "1:965569445341:web:ff9a389439f01ce59bca34",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
