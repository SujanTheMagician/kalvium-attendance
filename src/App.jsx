import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "./lib/firebase";
import {
  fbSaveStudent, fbGetAttendance, fbSaveAttendance, fbSaveAssignment,
  fbSubscribeStudents, fbSubscribeAssignments,
  fbAddMentor, fbRemoveMentor, fbSubscribeMentors,
  sendWhatsAppAlert, sendBulkWhatsAppAlerts,
} from "./lib/db";
import { SCHEDULE, TODAY_KEY } from "./lib/schedule";
import { calcPct, initials } from "./lib/utils";

import Icon from "./components/Icon";
import Toasts from "./components/Toasts";
import LoginScreen from "./components/LoginScreen";
import AddStudentModal from "./components/AddStudentModal";
import AddAssignModal from "./components/AddAssignModal";

import Dashboard from "./pages/Dashboard";
import MarkAttendance from "./pages/MarkAttendance";
import StudentDetail from "./pages/StudentDetail";
import StudentsPage from "./pages/StudentsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import ReportsPage from "./pages/ReportsPage";
import AlertsPage from "./pages/AlertsPage";
import TeamPage from "./pages/TeamPage";
import QRPage from "./pages/QRPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [todayMarks, setTodayMarks] = useState({});
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [addStudentForm, setAddStudentForm] = useState({ name: "", email: "", parent: "" });
  const [addAssignForm, setAddAssignForm] = useState({ title: "", subject: SCHEDULE.Mon[0].subject, due: "", type: "Assignment" });
  const [loginLoading, setLoginLoading] = useState(false);

  const addToast = useCallback((msg, icon = "✓") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // Mentors subscription
  useEffect(() => {
    const unsub = fbSubscribeMentors(setMentors);
    return unsub;
  }, []);

  // Role detection — dynamic, no hardcoded emails.
  // First-ever sign-in auto-bootstraps as founding mentor.
  useEffect(() => {
    if (!user) { setRole(null); return; }
    const email = (user.email || "").toLowerCase();
    const isListedMentor = mentors.some((m) => m.id === email);
    if (isListedMentor) { setRole("mentor"); return; }
    if (mentors.length === 0) {
      fbAddMentor(email, user.displayName || "", "mentor", "self-bootstrap");
      setRole("mentor");
      return;
    }
    setRole("student");
  }, [user, mentors]);

  // Data subscriptions when logged in
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const unsubS = fbSubscribeStudents(async (ns) => {
      setStudents(ns);
      const a = {};
      await Promise.all(ns.map(async (s) => { a[s.id] = await fbGetAttendance(s.id); }));
      setAttendance(a);
      setDataLoading(false);
    });
    const unsubA = fbSubscribeAssignments(setAssignments);
    return () => { unsubS(); unsubA(); };
  }, [user]);

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      addToast("Sign in failed: " + e.message, "❌");
    }
    setLoginLoading(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null); setRole(null); setPage("dashboard");
  };

  const handleAddMentor = async (email, name, mrole) => {
    try { await fbAddMentor(email, name, mrole, user?.email || ""); addToast(`${email} added to team ✓`, "👤"); }
    catch (e) { addToast("Failed: " + e.message, "❌"); }
  };
  const handleRemoveMentor = async (email) => {
    try { await fbRemoveMentor(email); addToast("Removed from team", "🗑️"); }
    catch (e) { addToast("Failed: " + e.message, "❌"); }
  };

  const pcts = {};
  students.forEach((s) => { pcts[s.id] = calcPct(attendance[s.id] || {}); });
  const dangerStudents = students.filter((s) => pcts[s.id] < 75);
  const warningStudents = students.filter((s) => pcts[s.id] >= 75 && pcts[s.id] < 80);
  const todaySessions = SCHEDULE[TODAY_KEY] || [];
  const myStudent = user ? students.find((s) => s.email === user.email) : null;

  const handleSaveAttendance = async (sid) => {
    if (!Object.keys(todayMarks).length) { addToast("Nothing to save", "⚠️"); return; }
    try {
      await fbSaveAttendance(sid, new Date().toISOString().slice(0, 10), todayMarks);
      const u = await fbGetAttendance(sid);
      setAttendance((p) => ({ ...p, [sid]: u }));
      addToast("Saved ✓", "📋");
      setTodayMarks({});
    } catch (e) { addToast("Save failed: " + e.message, "❌"); }
  };

  const handleAddStudent = async () => {
    const { name, email, parent } = addStudentForm;
    if (!name || !email) { addToast("Fill name and email", "⚠️"); return; }
    const COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#22c55e", "#f97316", "#38bdf8", "#a78bfa", "#84cc16", "#fb7185", "#34d399", "#fbbf24"];
    const id = "KV" + String(students.length + 1).padStart(3, "0");
    const color = COLORS[students.length % COLORS.length];
    try {
      await fbSaveStudent({ id, name, email, parent, squad: "Squad 92", color });
      addToast(`${name} added ✓`, "👤"); setModal(null);
      setAddStudentForm({ name: "", email: "", parent: "" });
    } catch (e) { addToast("Failed: " + e.message, "❌"); }
  };

  const handleAddAssignment = async () => {
    const { title, subject, due, type } = addAssignForm;
    if (!title || !due) { addToast("Fill title and due date", "⚠️"); return; }
    try {
      await fbSaveAssignment({ title, subject, due, type });
      addToast(`"${title}" added ✓`, "📝"); setModal(null);
      setAddAssignForm({ title: "", subject: SCHEDULE.Mon[0].subject, due: "", type: "Assignment" });
    } catch (e) { addToast("Failed: " + e.message, "❌"); }
  };

  const sendWA = async (s) => {
    if (!s.parent) { addToast(`No parent number on file for ${s.name}`, "⚠️"); return; }
    addToast(`Sending WhatsApp to ${s.parent}…`, "📱");
    try {
      const result = await sendWhatsAppAlert(s.id);
      addToast(result.message || `WhatsApp sent to ${s.name}'s parent ✓`, "✅");
    } catch (e) {
      addToast(`WhatsApp failed: ${e.message}`, "❌");
    }
  };

  const sendBulkWA = async (studentList) => {
    const ids = studentList.map((s) => s.id);
    if (ids.length === 0) return;
    addToast(`Sending ${ids.length} WhatsApp alert${ids.length > 1 ? "s" : ""}…`, "📱");
    try {
      const { results } = await sendBulkWhatsAppAlerts(ids);
      const ok = results.filter((r) => r.ok).length;
      const failed = results.length - ok;
      addToast(`Sent ${ok}/${results.length}${failed ? ` · ${failed} failed` : ""}`, ok === results.length ? "✅" : "⚠️");
    } catch (e) {
      addToast(`Bulk send failed: ${e.message}`, "❌");
    }
  };

  const subjects = [...new Set(Object.values(SCHEDULE).flat().map((s) => s.subject))];
  const mentorNav = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "mark", label: "Mark attendance", icon: "mark" },
    { key: "students", label: "Students", icon: "students" },
    { key: "alerts", label: "Alerts", icon: "alerts", badge: dangerStudents.length },
    { key: "assignments", label: "Assignments", icon: "assign", badge: assignments.filter((a) => { const d = Math.ceil((new Date(a.due) - new Date()) / 86400000); return d <= 2 && d >= 0; }).length },
    { key: "reports", label: "PDF Reports", icon: "report" },
    { key: "qr", label: "QR Attendance", icon: "qr" },
    { key: "team", label: "Team access", icon: "team" },
  ];
  const studentNav = [
    { key: "dashboard", label: "My overview", icon: "dashboard" },
    { key: "assignments", label: "Deadlines", icon: "assign" },
    { key: "qr", label: "Scan QR", icon: "qr" },
  ];
  const nav = role === "mentor" ? mentorNav : studentNav;

  const renderPage = () => {
    if (page === "dashboard") return <Dashboard role={role} students={students} attendance={attendance} assignments={assignments} pcts={pcts} dangerStudents={dangerStudents} warningStudents={warningStudents} setModal={setModal} setPage={setPage} sendWA={sendWA} sendBulkWA={sendBulkWA} setActiveStudentId={setActiveStudentId} dataLoading={dataLoading} />;
    if (page === "mark") return <MarkAttendance students={students} todaySessions={todaySessions} todayKey={TODAY_KEY} activeStudentId={activeStudentId} setActiveStudentId={setActiveStudentId} todayMarks={todayMarks} setTodayMarks={setTodayMarks} handleSaveAttendance={handleSaveAttendance} setPage={setPage} />;
    if (page === "students") return <StudentsPage students={students} role={role} pcts={pcts} attendance={attendance} assignments={assignments} sendWA={sendWA} setModal={setModal} setActiveStudentId={setActiveStudentId} setPage={setPage} />;
    if (page === "studentDetail") return <StudentDetail students={students} activeStudentId={activeStudentId} pcts={pcts} attendance={attendance} assignments={assignments} sendWA={sendWA} setPage={setPage} />;
    if (page === "alerts") return <AlertsPage dangerStudents={dangerStudents} warningStudents={warningStudents} assignments={assignments} attendance={attendance} sendWA={sendWA} sendBulkWA={sendBulkWA} addToast={addToast} />;
    if (page === "assignments") return <AssignmentsPage assignments={assignments} role={role} setModal={setModal} />;
    if (page === "reports") return <ReportsPage students={students} role={role} pcts={pcts} attendance={attendance} assignments={assignments} sendWA={sendWA} />;
    if (page === "team") return <TeamPage mentors={mentors} currentUserEmail={user?.email} onAdd={handleAddMentor} onRemove={handleRemoveMentor} addToast={addToast} />;
    if (page === "qr") return <QRPage students={students} role={role} currentStudentId={myStudent?.id} addToast={addToast} />;
    return null;
  };

  if (authLoading) return <div className="loading-screen"><div className="loading-spinner" /><div style={{ color: "var(--text2)", fontSize: 13 }}>Loading…</div></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} loading={loginLoading} />;
  if (role === null) return <div className="loading-screen"><div className="loading-spinner" /><div style={{ color: "var(--text2)", fontSize: 13 }}>Setting up your access…</div></div>;

  return (
    <div id="app" style={{ display: "flex", minHeight: "100vh" }}>
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-badge"><div className="logo-icon">K</div><div><div className="logo-text">Kalvium</div></div></div>
          <div className="logo-sub">Attendance · Squad 92</div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Navigation</div>
          {nav.map((item) => (
            <div key={item.key} className={`nav-item ${page === item.key || (page === "studentDetail" && item.key === "students") ? "active" : ""}`} onClick={() => setPage(item.key)}>
              <span className="nav-icon"><Icon name={item.icon} size={15} /></span>
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="role-pill">
            <div className="role-avatar" style={{ background: role === "mentor" ? "var(--accent)" : "var(--green)" }}>
              {user.photoURL ? <img src={user.photoURL} alt="" /> : initials(user.displayName)}
            </div>
            <div><div className="role-name">{user.displayName?.split(" ")[0]}</div><div className="role-tag">{role === "mentor" ? "Mentor · Admin" : "Student"}</div></div>
            <button className="role-switch" onClick={handleSignOut} title="Sign out"><Icon name="logout" size={14} /></button>
          </div>
        </div>
      </div>
      <div className="main">{renderPage()}</div>
      {modal === "addStudent" && <AddStudentModal form={addStudentForm} setForm={setAddStudentForm} onClose={() => setModal(null)} onSubmit={handleAddStudent} />}
      {modal === "addAssign" && <AddAssignModal form={addAssignForm} setForm={setAddAssignForm} onClose={() => setModal(null)} onSubmit={handleAddAssignment} subjects={subjects} />}
      <Toasts toasts={toasts} />
    </div>
  );
}
