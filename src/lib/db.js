import {
  collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import { SCHEDULE } from "./schedule";

// ── WHATSAPP (Twilio via Cloud Functions) ─────────────────────────────────────
export async function sendWhatsAppAlert(studentId) {
  const call = httpsCallable(functions, "sendWhatsAppAlert");
  const result = await call({ studentId });
  return result.data;
}
export async function sendBulkWhatsAppAlerts(studentIds) {
  const call = httpsCallable(functions, "sendBulkWhatsAppAlerts");
  const result = await call({ studentIds });
  return result.data;
}

// ── MENTORS (dynamic, no hardcoding) ──────────────────────────────────────────
export async function fbGetMentors() {
  const snap = await getDocs(collection(db, "mentors"));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}
export async function fbAddMentor(email, name, role, addedBy) {
  const id = email.trim().toLowerCase();
  await setDoc(doc(db, "mentors", id), {
    email: id,
    name: name || "",
    role: role || "mentor",
    addedBy: addedBy || "",
    createdAt: serverTimestamp(),
  });
}
export async function fbRemoveMentor(email) {
  await deleteDoc(doc(db, "mentors", email.trim().toLowerCase()));
}
export function fbSubscribeMentors(cb) {
  return onSnapshot(collection(db, "mentors"), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
  });
}

// ── STUDENTS ───────────────────────────────────────────────────────────────────
export async function fbSaveStudent(s) {
  await setDoc(doc(db, "students", s.id), { ...s, createdAt: serverTimestamp() });
}
export async function fbGetAttendance(studentId) {
  const snap = await getDocs(collection(db, "students", studentId, "records"));
  const r = {};
  snap.docs.forEach((d) => { r[d.id] = d.data(); });
  return r;
}
export async function fbSaveAttendance(studentId, date, marks) {
  await setDoc(
    doc(db, "students", studentId, "records", date),
    { ...marks, savedAt: serverTimestamp() },
    { merge: true }
  );
}
export function fbSubscribeStudents(cb) {
  return onSnapshot(collection(db, "students"), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
  });
}

// ── ASSIGNMENTS ────────────────────────────────────────────────────────────────
export async function fbSaveAssignment(a) {
  const ref = await addDoc(collection(db, "assignments"), {
    ...a,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
export function fbSubscribeAssignments(cb) {
  return onSnapshot(query(collection(db, "assignments"), orderBy("due", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
  });
}

// ── QR TOKENS ─────────────────────────────────────────────────────────────────
function genToken() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let t = "";
  for (let i = 0; i < 8; i++) t += c[Math.floor(Math.random() * c.length)];
  return t;
}
export async function fbCreateQR(sessionIdx, dayName, date, mins = 10) {
  const token = genToken();
  await setDoc(doc(db, "qrTokens", token), {
    token,
    sessionIdx,
    dayName,
    date,
    expiresAt: new Date(Date.now() + mins * 60000).toISOString(),
    scans: [],
    createdAt: serverTimestamp(),
  });
  return token;
}
export async function fbGetQR(token) {
  const snap = await getDoc(doc(db, "qrTokens", token));
  return snap.exists() ? snap.data() : null;
}
export async function fbValidateQR(token, studentId) {
  const snap = await getDoc(doc(db, "qrTokens", token));
  if (!snap.exists()) return { valid: false, reason: "Invalid QR code" };
  const d = snap.data();
  if (new Date(d.expiresAt) < new Date()) return { valid: false, reason: "QR code expired" };
  if (d.scans.includes(studentId)) return { valid: false, reason: "Already marked present" };
  await fbSaveAttendance(studentId, d.date, { [d.sessionIdx]: "P" });
  await updateDoc(doc(db, "qrTokens", token), { scans: [...d.scans, studentId] });
  return { valid: true, session: SCHEDULE[d.dayName]?.[d.sessionIdx]?.subject, date: d.date };
}
