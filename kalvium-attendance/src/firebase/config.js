// src/firebase/config.js
// ─────────────────────────────────────────────────────────────
// STEP 1: Go to https://console.firebase.google.com
// STEP 2: Create project → "kalvium-attendance"
// STEP 3: Add Web App → copy the config values below
// STEP 4: Enable Firestore, Authentication (Google provider)
// STEP 5: Replace the placeholder values with your real values
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force Google to show account picker every time
googleProvider.setCustomParameters({ prompt: "select_account" });
