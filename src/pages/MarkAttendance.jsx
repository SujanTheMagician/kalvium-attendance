import { initials } from "../lib/utils";

export default function MarkAttendance({ students, todaySessions, todayKey, activeStudentId, setActiveStudentId, todayMarks, setTodayMarks, handleSaveAttendance, setPage }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Mark attendance</h2>
          <p className="page-sub">{new Date().toDateString()} · {todaySessions.length} sessions</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setPage("dashboard")}>← Back</button>
      </div>
      <div className="content">
        <div className="table-card" style={{ marginBottom: 18 }}>
          <div className="table-head"><div className="table-title">Select student</div></div>
          <div style={{ padding: "14px 20px", display: "flex", gap: 9, flexWrap: "wrap" }}>
            {students.map((s) => (
              <div key={s.id} onClick={() => { setActiveStudentId(s.id); setTodayMarks({}); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${activeStudentId === s.id ? s.color : "var(--border)"}`, background: activeStudentId === s.id ? s.color + "22" : "var(--surface2)", cursor: "pointer" }}>
                <div style={{ width: 23, height: 23, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "#fff" }}>{initials(s.name)}</div>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
        {activeStudentId && (
          <div className="table-card">
            <div className="table-head">
              <div><div className="table-title">{students.find((s) => s.id === activeStudentId)?.name}</div><div className="table-sub">Today · {todayKey}</div></div>
              <button className="btn btn-success" onClick={() => handleSaveAttendance(activeStudentId)}>💾 Save to Firebase</button>
            </div>
            <div className="session-grid">
              {todaySessions.map((sess, i) => {
                const m = todayMarks[i];
                return (
                  <div key={i} className={`session-slot ${m === "P" ? "marked" : m === "A" ? "absent-marked" : ""}`}>
                    <div className="session-time">{sess.time}</div>
                    <div className="session-name">{sess.subject}</div>
                    <div className="session-actions">
                      <button className={`mark-btn mark-present ${m === "P" ? "active" : ""}`} onClick={() => setTodayMarks((x) => ({ ...x, [i]: x[i] === "P" ? null : "P" }))}>P Present</button>
                      <button className={`mark-btn mark-absent ${m === "A" ? "active" : ""}`} onClick={() => setTodayMarks((x) => ({ ...x, [i]: x[i] === "A" ? null : "A" }))}>A Absent</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
