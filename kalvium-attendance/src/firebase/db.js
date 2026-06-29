// src/firebase/db.js
// All Firestore read/write operations for the attendance system
// Drop-in replacements for the mock data functions in the HTML prototype

import {
  doc, collection, getDocs, getDoc,
  setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { db } from "./config";

// ── COLLECTIONS ──────────────────────────────────────────────────────────────
// students/{studentId}           → student profile
// attendance/{studentId}/records/{date}  → { sessionIndex: "P"|"A"|"L" }
// assignments/{assignmentId}     → assignment + deadline
// alerts/{alertId}               → sent alert log
// qrTokens/{token}               → { sessionId, expiresAt, date }

// ── STUDENTS ─────────────────────────────────────────────────────────────────

export async function getAllStudents() {
  const snap = await getDocs(collection(db, "students"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getStudent(studentId) {
  const snap = await getDoc(doc(db, "students", studentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addStudent(student) {
  // student = { name, email, parent, squad, color }
  // Use Kalvium ID as document ID (e.g. KV001)
  const id = student.id || generateKalviumId();
  await setDoc(doc(db, "students", id), {
    ...student,
    id,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function updateStudent(studentId, updates) {
  await updateDoc(doc(db, "students", studentId), updates);
}

export function subscribeToStudents(callback) {
  // Real-time listener — updates UI instantly when mentor adds a student
  return onSnapshot(collection(db, "students"), snap => {
    const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(students);
  });
}

// ── ATTENDANCE ────────────────────────────────────────────────────────────────

export async function getAttendanceForStudent(studentId) {
  // Returns { "2026-03-10": { 0: "P", 1: "A", ... }, ... }
  const snap = await getDocs(
    collection(db, "students", studentId, "records")
  );
  const result = {};
  snap.docs.forEach(d => {
    result[d.id] = d.data(); // document ID is the date string
  });
  return result;
}

export async function saveAttendance(studentId, date, sessionMarks) {
  // sessionMarks = { 0: "P", 1: "A", 2: "P", ... }
  await setDoc(
    doc(db, "students", studentId, "records", date),
    { ...sessionMarks, savedAt: serverTimestamp() },
    { merge: true } // merge so partial saves don't overwrite existing
  );
}

export async function markSingleSession(studentId, date, sessionIndex, status) {
  // status = "P" | "A" | "L"
  await setDoc(
    doc(db, "students", studentId, "records", date),
    { [sessionIndex]: status, savedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getAllAttendance(studentIds) {
  // Batch-fetch attendance for all students (for mentor dashboard)
  const result = {};
  await Promise.all(
    studentIds.map(async id => {
      result[id] = await getAttendanceForStudent(id);
    })
  );
  return result;
}

export function subscribeToStudentAttendance(studentId, callback) {
  // Live listener for a student's attendance records
  return onSnapshot(
    collection(db, "students", studentId, "records"),
    snap => {
      const records = {};
      snap.docs.forEach(d => { records[d.id] = d.data(); });
      callback(records);
    }
  );
}

// ── ASSIGNMENTS ───────────────────────────────────────────────────────────────

export async function getAllAssignments() {
  const snap = await getDocs(
    query(collection(db, "assignments"), orderBy("due", "asc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addAssignment(assignment) {
  // assignment = { title, subject, due (YYYY-MM-DD), type }
  const ref = await addDoc(collection(db, "assignments"), {
    ...assignment,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssignment(assignmentId, updates) {
  await updateDoc(doc(db, "assignments", assignmentId), updates);
}

export async function deleteAssignment(assignmentId) {
  await deleteDoc(doc(db, "assignments", assignmentId));
}

export function subscribeToAssignments(callback) {
  return onSnapshot(
    query(collection(db, "assignments"), orderBy("due", "asc")),
    snap => {
      const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(assignments);
    }
  );
}

// ── ALERT LOG ─────────────────────────────────────────────────────────────────

export async function logAlert(studentId, type, message, channel) {
  // Log every WhatsApp/SMS alert sent, for audit
  await addDoc(collection(db, "alerts"), {
    studentId,
    type,       // "danger_threshold" | "assignment_reminder" | "monthly_report"
    message,
    channel,    // "whatsapp" | "sms" | "email"
    sentAt: serverTimestamp(),
  });
}

export async function getAlertsForStudent(studentId) {
  const snap = await getDocs(
    query(
      collection(db, "alerts"),
      where("studentId", "==", studentId),
      orderBy("sentAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── QR TOKENS ─────────────────────────────────────────────────────────────────

export async function createQRToken(sessionId, date, durationMinutes = 10) {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  await setDoc(doc(db, "qrTokens", token), {
    token,
    sessionId,
    date,
    expiresAt: expiresAt.toISOString(),
    createdAt: serverTimestamp(),
    scans: [],  // array of studentIds who scanned
  });
  return token;
}

export async function validateAndUseQRToken(token, studentId) {
  const snap = await getDoc(doc(db, "qrTokens", token));
  if (!snap.exists()) return { valid: false, reason: "Token not found" };

  const data = snap.data();
  if (new Date(data.expiresAt) < new Date()) {
    return { valid: false, reason: "QR code has expired" };
  }
  if (data.scans.includes(studentId)) {
    return { valid: false, reason: "Already marked for this session" };
  }

  // Mark student as present
  await markSingleSession(studentId, data.date, data.sessionId, "P");

  // Record the scan
  await updateDoc(doc(db, "qrTokens", token), {
    scans: [...data.scans, studentId],
  });

  return { valid: true, sessionId: data.sessionId, date: data.date };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function generateSecureToken() {
  // Generates a random 8-char uppercase token like "K7X2M9QR"
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function generateKalviumId() {
  return "KV" + String(Date.now()).slice(-4);
}

// ── ATTENDANCE CALCULATION ────────────────────────────────────────────────────

export function calculateAttendancePercent(records) {
  let total = 0, present = 0;
  Object.values(records || {}).forEach(day => {
    Object.entries(day).forEach(([key, val]) => {
      if (key === "savedAt") return; // skip metadata field
      total++;
      if (val === "P" || val === "L") present++;
    });
  });
  return total === 0 ? 100 : Math.round((present / total) * 100);
}
