// src/firebase/auth.js
// Google Authentication — mentors and students sign in with their Kalvium email

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./config";

// ── SIGN IN ───────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Determine role from email domain
    // Mentor emails end with @kalvium.community but are pre-registered as admins
    // Students also use @kalvium.community
    const role = await getRoleForEmail(user.email);

    // Create/update user record in Firestore on first login
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role,
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );

    return { user, role };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async user => {
    if (!user) { callback(null, null); return; }
    const role = await getRoleForEmail(user.email);
    callback(user, role);
  });
}

// ── ROLE DETECTION ────────────────────────────────────────────────────────────

async function getRoleForEmail(email) {
  // Check the "mentors" collection first
  // Mentor emails are pre-added by the system admin (you, Sujan, for now)
  const mentorEmails = [
    "neelkanthraju@kalvium.community", // your mentor
    // add more mentor emails here
  ];
  if (mentorEmails.includes(email.toLowerCase())) return "mentor";

  // Check if the email is a registered student
  const studentSnap = await getDoc(doc(db, "studentEmails", email));
  if (studentSnap.exists()) return "student";

  // Default: student (anyone with a kalvium.community email)
  if (email.endsWith("@kalvium.community")) return "student";

  return "unauthorized";
}

export async function getCurrentUserRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().role : null;
}

// ── FIRESTORE SECURITY RULES (paste into Firebase console) ───────────────────
// Copy the string below into:
// Firebase Console → Firestore → Rules tab
export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: is the requester a signed-in user?
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper: is the requester a mentor?
    function isMentor() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "mentor";
    }

    // Helper: is the requester this specific student?
    function isOwner(studentId) {
      return isSignedIn() && request.auth.uid == studentId;
    }

    // Students collection: mentors can read/write; students can read their own
    match /students/{studentId} {
      allow read: if isSignedIn();
      allow write: if isMentor();

      // Attendance records: mentors write, students read their own
      match /records/{date} {
        allow read: if isMentor() || isOwner(studentId);
        allow write: if isMentor();
      }
    }

    // Assignments: mentors write, all signed-in users read
    match /assignments/{assignId} {
      allow read: if isSignedIn();
      allow write: if isMentor();
    }

    // QR Tokens: mentors create, any signed-in user can validate (for self-marking)
    match /qrTokens/{token} {
      allow read, update: if isSignedIn();
      allow create: if isMentor();
      allow delete: if isMentor();
    }

    // Alert log: mentors read/write
    match /alerts/{alertId} {
      allow read, write: if isMentor();
    }

    // User profiles: users can read/write their own
    match /users/{uid} {
      allow read, write: if isSignedIn() && request.auth.uid == uid;
      allow read: if isMentor();
    }
  }
}
`;
