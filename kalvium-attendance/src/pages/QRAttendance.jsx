// src/pages/QRAttendance.jsx
// QR Self-Marking System
//
// HOW IT WORKS:
// 1. Mentor opens this page and selects a session
// 2. A QR code with a time-limited token is generated and displayed fullscreen
// 3. Students open their phone, go to app.kalvium.community/scan
// 4. They scan the QR → attendance marked as Present automatically
// 5. Token expires after 10 minutes — can't be reused or shared
//
// INSTALL: npm install qrcode react-qr-reader

import React, { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { createQRToken, validateAndUseQRToken } from "../firebase/db";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

// ── SCHEDULE (same as the rest of the app) ────────────────────────────────────

const SCHEDULE = {
  Mon: [
    { time: "08:30–09:20", subject: "Object Oriented Programming" },
    { time: "09:20–10:10", subject: "Backend Web Development – SPC5" },
    { time: "10:25–11:15", subject: "Introduction to Artificial Intelligence" },
    { time: "11:15–12:05", subject: "NPTEL Open Elective" },
    { time: "13:05–13:55", subject: "Data Structures and Algorithms – 1" },
    { time: "13:55–14:45", subject: "Database Management Systems Theory" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Tue: [
    { time: "08:30–09:20", subject: "Career Planning & Resume Building" },
    { time: "09:20–10:10", subject: "Data Structures and Algorithms – 1" },
    { time: "10:25–11:15", subject: "Data Structures and Algorithms – 1" },
    { time: "11:15–12:05", subject: "Backend Web Development – SPC5" },
    { time: "13:05–13:55", subject: "Object Oriented Programming" },
    { time: "13:55–14:45", subject: "Introduction to Artificial Intelligence" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Wed: [
    { time: "08:30–09:20", subject: "Data Structures and Algorithms – 1" },
    { time: "09:20–10:10", subject: "Data Structures and Algorithms – 1" },
    { time: "10:25–11:15", subject: "Backend Web Development – SPC5" },
    { time: "11:15–12:05", subject: "Object Oriented Programming" },
    { time: "13:05–13:55", subject: "Introduction to Artificial Intelligence" },
    { time: "13:55–14:45", subject: "NPTEL Open Elective" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
  Thu: [
    { time: "08:30–09:20", subject: "Database Management Systems Theory" },
    { time: "09:20–10:10", subject: "Database Management Systems Theory" },
    { time: "10:25–11:15", subject: "Backend Web Development – SPC5" },
    { time: "11:15–12:05", subject: "Object Oriented Programming" },
    { time: "13:05–13:55", subject: "Introduction to Artificial Intelligence" },
    { time: "13:55–14:45", subject: "NPTEL Open Elective" },
    { time: "14:45–15:30", subject: "Growth Hour" },
  ],
};

const DAYS = ["Mon", "Tue", "Wed", "Thu"];
const TODAY_KEY = DAYS[new Date().getDay() - 1] || "Mon";

// ── MENTOR VIEW: Generate and display QR ─────────────────────────────────────

export function QRDisplay({ students = [] }) {
  const [selectedDay, setSelectedDay] = useState(TODAY_KEY);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [token, setToken] = useState(null);
  const [qrDataURL, setQRDataURL] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scannedStudents, setScannedStudents] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef();
  const timerRef = useRef();
  const pollRef = useRef();

  const sessions = SCHEDULE[selectedDay] || [];
  const selectedSession = sessions[selectedSessionIdx];
  const todayDate = new Date().toISOString().slice(0, 10);
  const DURATION = 10 * 60; // 10 minutes in seconds

  // Generate QR token
  const generateQR = useCallback(async () => {
    setGenerating(true);
    try {
      const newToken = await createQRToken(selectedSessionIdx, todayDate, 10);

      // The QR encodes a URL students open on their phones
      const scanURL = `${window.location.origin}/scan?token=${newToken}&day=${selectedDay}`;

      const dataURL = await QRCode.toDataURL(scanURL, {
        width: 400,
        margin: 2,
        color: { dark: "#0d0f14", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });

      setToken(newToken);
      setQRDataURL(dataURL);
      setTimeLeft(DURATION);
      setScannedStudents([]);

      // Countdown timer
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setToken(null);
            setQRDataURL(null);
            return 0;
          }
          return t - 1;
        });
      }, 1000);

      // Poll for scans every 3 seconds
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const { db } = await import("../firebase/config");
          const snap = await getDoc(doc(db, "qrTokens", newToken));
          if (snap.exists()) {
            const scans = snap.data().scans || [];
            const names = scans.map(id => {
              const s = students.find(st => st.id === id);
              return s ? s.name.split(" ")[0] : id;
            });
            setScannedStudents(names);
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 3000);

    } catch (err) {
      console.error("QR generation failed:", err);
      alert("Failed to generate QR. Check Firebase connection.");
    } finally {
      setGenerating(false);
    }
  }, [selectedDay, selectedSessionIdx, todayDate, students]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / DURATION) * 100;

  return (
    <div style={{ padding: "24px 28px" }}>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 4 }}>
        QR attendance
      </h2>
      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>
        Generate a QR code — students scan it to mark themselves present
      </p>

      {/* Session selector */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Select session</div>

        {/* Day tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => { setSelectedDay(d); setSelectedSessionIdx(0); }}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid",
                borderColor: selectedDay === d ? "var(--accent)" : "var(--border)",
                background: selectedDay === d ? "rgba(96,106,246,0.12)" : "var(--surface2)",
                color: selectedDay === d ? "var(--accent)" : "var(--text2)",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Session list */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
          {sessions.map((sess, i) => (
            <div
              key={i}
              onClick={() => setSelectedSessionIdx(i)}
              style={{
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                border: `1px solid ${selectedSessionIdx === i ? "var(--accent)" : "var(--border)"}`,
                background: selectedSessionIdx === i ? "rgba(96,106,246,0.1)" : "var(--surface2)",
                transition: "all .15s",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 3 }}>{sess.time}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: selectedSessionIdx === i ? "var(--accent)" : "var(--text)" }}>
                {sess.subject.length > 32 ? sess.subject.slice(0, 30) + "…" : sess.subject}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={generateQR}
          disabled={generating}
          style={{
            marginTop: 16, width: "100%", padding: "10px",
            background: generating ? "var(--surface3)" : "var(--accent)",
            color: "#fff", border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 500, cursor: generating ? "not-allowed" : "pointer",
            fontFamily: "'Inter',sans-serif", transition: "all .15s",
          }}
        >
          {generating ? "Generating…" : token ? "↻ Regenerate QR (new 10-min window)" : "Generate QR code"}
        </button>
      </div>

      {/* QR Display */}
      {qrDataURL && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {selectedSession?.subject}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20 }}>
            {selectedDay} · {todayDate} · Session {selectedSessionIdx + 1}
          </div>

          {/* QR Code */}
          <div
            style={{
              display: "inline-block", background: "#fff",
              padding: 16, borderRadius: 12, cursor: "pointer",
              boxShadow: "0 0 0 1px var(--border)",
            }}
            onClick={() => setFullscreen(true)}
            title="Click to fullscreen"
          >
            <img src={qrDataURL} alt="QR Code" width={200} height={200} style={{ display: "block" }} />
          </div>

          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 8 }}>
            Click QR to fullscreen · Students scan at <strong style={{ color: "var(--accent)" }}>app.kalvium.community/scan</strong>
          </div>

          {/* Timer */}
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
              <span>Time remaining</span>
              <span style={{ fontWeight: 600, color: timeLeft < 60 ? "var(--red)" : timeLeft < 180 ? "var(--amber)" : "var(--green)" }}>
                {minutes}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
            <div style={{ background: "var(--surface3)", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{
                width: `${progress}%`, height: "100%", borderRadius: 99, transition: "width 1s linear",
                background: timeLeft < 60 ? "var(--red)" : timeLeft < 180 ? "var(--amber)" : "var(--green)",
              }} />
            </div>
          </div>

          {/* Scanned students */}
          <div style={{ marginTop: 20, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>
              Scanned so far ({scannedStudents.length}/{students.length})
            </div>
            {scannedStudents.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)", padding: "12px 0" }}>
                Waiting for students to scan…
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {scannedStudents.map((name, i) => (
                  <span key={i} style={{
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                    color: "var(--green)", padding: "3px 10px", borderRadius: 99, fontSize: 12,
                  }}>
                    ✓ {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen modal */}
      {fullscreen && qrDataURL && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: "fixed", inset: 0, background: "#fff",
            zIndex: 1000, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <div style={{ color: "#0d0f14", fontSize: 16, fontWeight: 600, marginBottom: 16, fontFamily: "'Space Grotesk',sans-serif" }}>
            {selectedSession?.subject}
          </div>
          <img src={qrDataURL} alt="QR Code" style={{ width: "min(80vw,80vh)", height: "min(80vw,80vh)" }} />
          <div style={{ color: "#555", fontSize: 14, marginTop: 16 }}>
            Scan with your phone · Tap anywhere to close
          </div>
          <div style={{ color: timeLeft < 60 ? "#ef4444" : "#f59e0b", fontSize: 18, fontWeight: 700, marginTop: 8 }}>
            {minutes}:{String(seconds).padStart(2, "0")} remaining
          </div>
        </div>
      )}
    </div>
  );
}

// ── STUDENT VIEW: Scan and validate QR ───────────────────────────────────────

export function QRScanner({ currentUser }) {
  const [manualToken, setManualToken] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");
  const [cameraMode, setCameraMode] = useState(false);

  const validateToken = useCallback(async (token) => {
    if (!token.trim()) return;
    setStatus("loading");
    setMessage("Validating…");

    try {
      const validateQR = httpsCallable(functions, "validateQR");
      const result = await validateQR({ token: token.trim().toUpperCase() });

      setStatus("success");
      setMessage(`✅ Marked present!\n${result.data.session}\n${result.data.date}`);
    } catch (err) {
      setStatus("error");
      const code = err.code?.replace("functions/", "");
      if (code === "deadline-exceeded") setMessage("❌ QR code has expired. Ask your mentor to generate a new one.");
      else if (code === "already-exists") setMessage("✅ Already marked! You are present for this session.");
      else if (code === "not-found") setMessage("❌ Invalid QR code. Make sure you typed it correctly.");
      else setMessage(`❌ Error: ${err.message}`);
    }
  }, []);

  // Handle URL token on page load (when student opens the scan link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setManualToken(urlToken);
      validateToken(urlToken);
    }
  }, [validateToken]);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 28, width: "100%", maxWidth: 400,
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: "rgba(96,106,246,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 12px",
          }}>📱</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 6 }}>
            Mark your attendance
          </h2>
          <p style={{ fontSize: 13, color: "var(--text2)" }}>
            Enter the code from your mentor's QR screen
          </p>
        </div>

        {status === "success" && (
          <div style={{
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 10, padding: "14px 16px", marginBottom: 16, textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", whiteSpace: "pre-line" }}>
              {message}
            </div>
          </div>
        )}

        {status === "error" && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10, padding: "14px 16px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, color: "var(--red)", whiteSpace: "pre-line" }}>{message}</div>
          </div>
        )}

        {status !== "success" && (
          <>
            {/* Manual token entry */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", display: "block", marginBottom: 6 }}>
                Session code (from QR screen)
              </label>
              <input
                style={{
                  width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)",
                  borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 20,
                  fontWeight: 700, letterSpacing: "0.2em", textAlign: "center",
                  fontFamily: "'Space Grotesk',sans-serif", outline: "none",
                  textTransform: "uppercase",
                }}
                placeholder="K7X2M9QR"
                value={manualToken}
                maxLength={8}
                onChange={e => setManualToken(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && validateToken(manualToken)}
              />
            </div>

            <button
              onClick={() => validateToken(manualToken)}
              disabled={status === "loading" || manualToken.length < 6}
              style={{
                width: "100%", padding: "11px",
                background: status === "loading" ? "var(--surface3)" : "var(--accent)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: "pointer",
                fontFamily: "'Inter',sans-serif",
              }}
            >
              {status === "loading" ? "Checking…" : "Mark present"}
            </button>

            <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
              Signed in as <strong style={{ color: "var(--text2)" }}>{currentUser?.email}</strong>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default QRDisplay;
