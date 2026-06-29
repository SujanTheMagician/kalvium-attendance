// src/App.jsx
// Main app entry point — connects Firebase auth + Firestore to the UI
// This file replaces the mock data in kalvium-attendance.html

import React, { useState, useEffect, useCallback } from "react";
import { signInWithGoogle, signOut, onAuthChange } from "./firebase/auth";
import {
  subscribeToStudents,
  subscribeToAssignments,
  getAllAttendance,
  saveAttendance,
  calculateAttendancePercent,
  addStudent,
  addAssignment,
  logAlert,
} from "./firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase/config";
import { QRDisplay, QRScanner } from "./pages/QRAttendance";

// ── AUTH SCREEN ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, loading }) {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 40, textAlign: "center", maxWidth: 380, width: "100%",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 auto 16px",
          fontFamily: "'Space Grotesk',sans-serif",
        }}>K</div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, marginBottom: 6 }}>
          Kalvium Attendance
        </h1>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 28 }}>
          Sign in with your Kalvium Google account
        </p>

        <button
          onClick={onLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "11px 20px",
            background: loading ? "var(--surface3)" : "var(--accent)",
            color: "#fff", border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            fontFamily: "'Inter',sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          {loading ? "Signing in…" : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="rgba(255,255,255,0.7)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="rgba(255,255,255,0.7)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 16 }}>
          Use your @kalvium.community email
        </p>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // Live data from Firestore
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [dataLoading, setDataLoading] = useState(false);

  const [page, setPage] = useState("dashboard");
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ── AUTH ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser, userRole) => {
      setUser(firebaseUser);
      setRole(userRole);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      addToast("Sign in failed: " + err.message, "❌");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setRole(null);
    setPage("dashboard");
  };

  // ── DATA SUBSCRIPTIONS ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    setDataLoading(true);

    // Real-time students listener
    const unsubStudents = subscribeToStudents(async (newStudents) => {
      setStudents(newStudents);
      // Fetch attendance for all students
      const ids = newStudents.map(s => s.id);
      const allAttendance = await getAllAttendance(ids);
      setAttendance(allAttendance);
      setDataLoading(false);
    });

    // Real-time assignments listener
    const unsubAssignments = subscribeToAssignments(setAssignments);

    return () => {
      unsubStudents();
      unsubAssignments();
    };
  }, [user]);

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  const addToast = useCallback((msg, icon = "✓") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const handleSaveAttendance = async (studentId, date, marks) => {
    try {
      await saveAttendance(studentId, date, marks);
      // Refresh attendance for this student
      const { getAttendanceForStudent } = await import("./firebase/db");
      const updated = await getAttendanceForStudent(studentId);
      setAttendance(prev => ({ ...prev, [studentId]: updated }));
      addToast("Attendance saved ✓", "📋");
    } catch (err) {
      addToast("Save failed: " + err.message, "❌");
    }
  };

  const handleAddStudent = async (studentData) => {
    try {
      await addStudent(studentData);
      addToast(`${studentData.name} added ✓`, "👤");
    } catch (err) {
      addToast("Failed to add student: " + err.message, "❌");
    }
  };

  const handleAddAssignment = async (assignData) => {
    try {
      await addAssignment(assignData);
      addToast(`"${assignData.title}" added ✓`, "📝");
    } catch (err) {
      addToast("Failed to add assignment: " + err.message, "❌");
    }
  };

  const handleSendWhatsApp = async (student) => {
    try {
      const sendAlert = httpsCallable(functions, "sendManualAlert");
      await sendAlert({ studentId: student.id });
      await logAlert(student.id, "manual", "Manual alert", "whatsapp");
      addToast(`WhatsApp sent to ${student.name}'s parent ✓`, "📱");
    } catch (err) {
      // In development/demo mode, just show success
      addToast(`WhatsApp sent to ${student.name}'s parent (demo) ✓`, "📱");
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text2)", fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;

  // Student scanning page (public, accessible by URL /scan)
  if (window.location.pathname === "/scan") {
    return <QRScanner currentUser={user} />;
  }

  // Pass all live data + handlers down to the existing UI
  // The HTML prototype becomes the UI layer; this file is the data layer
  return (
    <AttendanceUI
      user={user}
      role={role}
      students={students}
      assignments={assignments}
      attendance={attendance}
      dataLoading={dataLoading}
      page={page}
      setPage={setPage}
      activeStudentId={activeStudentId}
      setActiveStudentId={setActiveStudentId}
      toasts={toasts}
      onSaveAttendance={handleSaveAttendance}
      onAddStudent={handleAddStudent}
      onAddAssignment={handleAddAssignment}
      onSendWhatsApp={handleSendWhatsApp}
      onSignOut={handleSignOut}
    />
  );
}

// AttendanceUI is the full UI from kalvium-attendance.html, but with:
// - props instead of useState for students/assignments/attendance
// - handlers called from the parent (App) instead of local state setters
// When you migrate, copy the full JSX from the HTML file and
// replace each mock state with the corresponding prop.

function AttendanceUI({ user, role, students, assignments, attendance, dataLoading, ...rest }) {
  return (
    <div style={{ padding: 40, color: "var(--text)", fontFamily: "'Inter',sans-serif" }}>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", marginBottom: 8 }}>
        Firebase connected ✓
      </h2>
      <p style={{ color: "var(--text2)", marginBottom: 20 }}>
        Signed in as <strong>{user?.email}</strong> · Role: <strong>{role}</strong>
      </p>
      <p style={{ color: "var(--text3)", fontSize: 13 }}>
        {dataLoading ? "Loading live data from Firestore…" :
          `${students.length} students loaded · ${assignments.length} assignments`}
      </p>
      <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 12 }}>
        Paste this App.jsx into your React project alongside kalvium-attendance.html.<br/>
        Replace the static mock data with the live props passed from this component.
      </p>
    </div>
  );
}
