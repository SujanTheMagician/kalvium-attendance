import { useState, useEffect, useRef } from "react";
import { SCHEDULE, DAYS, TODAY_KEY, TODAY_DATE } from "../lib/schedule";
import { fbCreateQR, fbGetQR, fbValidateQR } from "../lib/db";

export default function QRPage({ students, role, currentStudentId, addToast }) {
  const [selDay, setSelDay] = useState(TODAY_KEY);
  const [selIdx, setSelIdx] = useState(0);
  const [token, setToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scans, setScans] = useState([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [scanStatus, setScanStatus] = useState(null);
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef();
  const pollRef = useRef();
  const DURATION = 10 * 60;
  const sessions = SCHEDULE[selDay] || [];

  const generate = async () => {
    setGenerating(true);
    try {
      const t = await fbCreateQR(selIdx, selDay, TODAY_DATE, 10);
      setToken(t); setTimeLeft(DURATION); setScans([]);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((x) => {
          if (x <= 1) { clearInterval(timerRef.current); setToken(null); return 0; }
          return x - 1;
        });
      }, 1000);
      clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const data = await fbGetQR(t);
        if (data) {
          const s = data.scans || [];
          setScans(s.map((id) => {
            const st = students.find((x) => x.id === id);
            return st ? st.name.split(" ")[0] : id;
          }));
        }
      }, 3000);
      addToast("QR generated — 10 min window", "🔲");
    } catch (e) {
      addToast("Failed: " + e.message, "❌");
    }
    setGenerating(false);
  };

  const validate = async () => {
    if (!manualToken.trim() || !currentStudentId) { addToast("Enter a code", "⚠️"); return; }
    setScanStatus("loading");
    const r = await fbValidateQR(manualToken.trim().toUpperCase(), currentStudentId);
    setScanStatus(r.valid ? "success" : "error");
    addToast(r.valid ? `✅ Marked present for ${r.session}` : `❌ ${r.reason}`, r.valid ? "✅" : "❌");
  };

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(pollRef.current); }, []);

  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60, prog = (timeLeft / DURATION) * 100;

  if (role === "student") return (
    <div style={{ padding: "30px 32px" }}>
      <h2 className="page-title" style={{ marginBottom: 4 }}>Scan QR</h2>
      <p className="page-sub" style={{ marginBottom: 24 }}>Enter the 8-character code from your mentor's screen</p>
      <div style={{ maxWidth: 380 }}>
        <div className="table-card" style={{ padding: 24 }}>
          {scanStatus === "success" && (
            <div style={{ background: "var(--greenbg)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 10, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
              <div style={{ color: "#4ade80", fontWeight: 600 }}>Attendance marked!</div>
            </div>
          )}
          {scanStatus === "error" && (
            <div style={{ background: "var(--redbg)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ color: "#f87171", fontSize: 13 }}>Invalid or expired code</div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Session code</label>
            <input className="form-input" placeholder="K7X2M9QR" maxLength={8} value={manualToken}
              onChange={(e) => setManualToken(e.target.value.toUpperCase())}
              style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.2em", textAlign: "center" }}
              onKeyDown={(e) => e.key === "Enter" && validate()} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={validate} disabled={scanStatus === "loading"}>
            {scanStatus === "loading" ? "Checking…" : "Mark present"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "30px 32px" }}>
      <h2 className="page-title" style={{ marginBottom: 4 }}>QR attendance</h2>
      <p className="page-sub" style={{ marginBottom: 24 }}>Generate a QR — students enter the code to mark present</p>
      <div className="table-card" style={{ marginBottom: 20 }}>
        <div className="table-head"><div className="table-title">Select session</div></div>
        <div style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {DAYS.map((d) => (
              <button key={d} onClick={() => { setSelDay(d); setSelIdx(0); }}
                style={{ padding: "7px 15px", borderRadius: 9, border: "1px solid", borderColor: selDay === d ? "var(--accent)" : "var(--border)", background: selDay === d ? "var(--accentbg)" : "var(--surface2)", color: selDay === d ? "#a5b4fc" : "var(--text2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {d}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 9, marginBottom: 16 }}>
            {sessions.map((s, i) => (
              <div key={i} onClick={() => setSelIdx(i)} style={{ padding: "11px 14px", borderRadius: 11, cursor: "pointer", border: `1.5px solid ${selIdx === i ? "var(--accent)" : "var(--border)"}`, background: selIdx === i ? "var(--accentbg)" : "var(--surface2)" }}>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 3, fontWeight: 600 }}>{s.time}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: selIdx === i ? "#a5b4fc" : "var(--text)" }}>{s.subject.length > 30 ? s.subject.slice(0, 28) + "…" : s.subject}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={generate} disabled={generating}>
            {generating ? "Generating…" : token ? "↻ New QR (reset 10 min)" : "Generate QR code"}
          </button>
        </div>
      </div>
      {token && (
        <div className="table-card">
          <div className="table-head">
            <div><div className="table-title">{sessions[selIdx]?.subject}</div><div className="table-sub">{selDay} · {TODAY_DATE}</div></div>
            <span className="badge badge-green">{scans.length} scanned</span>
          </div>
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 14, display: "inline-block", cursor: "pointer", marginBottom: 14 }} onClick={() => setFullscreen(true)}>
              <svg width={180} height={180} viewBox="0 0 180 180">
                <rect width={180} height={180} fill="white" />
                <text x="90" y="70" textAnchor="middle" fontSize="13" fontFamily="monospace" fill="#555">Session code</text>
                <text x="90" y="108" textAnchor="middle" fontSize="36" fontFamily="monospace" fontWeight="900" fill="#0d0f14" letterSpacing="4">{token.slice(0, 4)}</text>
                <text x="90" y="140" textAnchor="middle" fontSize="36" fontFamily="monospace" fontWeight="900" fill="#6366f1" letterSpacing="4">{token.slice(4)}</text>
                <rect x="8" y="8" width="28" height="28" rx="4" fill="none" stroke="#0d0f14" strokeWidth="2.5" /><rect x="13" y="13" width="18" height="18" rx="2" fill="#0d0f14" />
                <rect x="144" y="8" width="28" height="28" rx="4" fill="none" stroke="#0d0f14" strokeWidth="2.5" /><rect x="149" y="13" width="18" height="18" rx="2" fill="#0d0f14" />
                <rect x="8" y="144" width="28" height="28" rx="4" fill="none" stroke="#0d0f14" strokeWidth="2.5" /><rect x="13" y="149" width="18" height="18" rx="2" fill="#0d0f14" />
              </svg>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text3)", marginBottom: 18 }}>Students enter this code on the Scan QR page · Click to fullscreen</div>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text2)" }}>
              <span>Time remaining</span>
              <span style={{ fontWeight: 700, color: timeLeft < 60 ? "#f87171" : timeLeft < 180 ? "#fbbf24" : "#4ade80" }}>{mins}:{String(secs).padStart(2, "0")}</span>
            </div>
            <div style={{ background: "var(--surface3)", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 18 }}>
              <div style={{ width: `${prog}%`, height: "100%", borderRadius: 99, background: timeLeft < 60 ? "var(--red)" : timeLeft < 180 ? "var(--amber)" : "var(--green)", transition: "width 1s linear" }} />
            </div>
            {scans.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
                {scans.map((n, i) => <span key={i} className="badge badge-green">✓ {n}</span>)}
              </div>
            )}
          </div>
        </div>
      )}
      {fullscreen && token && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setFullscreen(false)}>
          <div style={{ color: "#333", fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{sessions[selIdx]?.subject} · Enter this code in the app</div>
          <div style={{ background: "#f8f8ff", border: "3px solid #6366f1", borderRadius: 20, padding: "32px 48px", marginBottom: 16 }}>
            <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "monospace", color: "#0d0f14", letterSpacing: "0.15em", lineHeight: 1 }}>{token.slice(0, 4)}</div>
            <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "monospace", color: "#6366f1", letterSpacing: "0.15em", lineHeight: 1 }}>{token.slice(4)}</div>
          </div>
          <div style={{ color: timeLeft < 60 ? "#ef4444" : "#f59e0b", fontSize: 24, fontWeight: 700 }}>{mins}:{String(secs).padStart(2, "0")} remaining</div>
          <div style={{ color: "#999", fontSize: 14, marginTop: 8 }}>Tap anywhere to close</div>
        </div>
      )}
    </div>
  );
}
