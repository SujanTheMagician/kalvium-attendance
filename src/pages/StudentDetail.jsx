import { jsPDF } from "jspdf";
import Icon from "../components/Icon";
import { initials, generatePDF } from "../lib/utils";
import { SCHEDULE, TODAY_KEY } from "../lib/schedule";

export default function StudentDetail({ students, activeStudentId, pcts, attendance, assignments, sendWA, setPage }) {
  const s = students.find((x) => x.id === activeStudentId) || students[0];
  if (!s) return null;
  const pct = pcts[s.id], rec = attendance[s.id] || {};

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: "var(--text3)", cursor: "pointer", marginBottom: 6, fontWeight: 600 }} onClick={() => setPage("students")}>← Back</div>
          <h2 className="page-title">{s.name}</h2>
          <p className="page-sub">{s.id}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => sendWA(s)}><Icon name="send" size={13} />Alert parent</button>
          <button className="btn btn-primary" onClick={() => generatePDF(s, rec, assignments, jsPDF)}><Icon name="download" size={13} />PDF</button>
        </div>
      </div>
      <div className="content">
        <div className="student-hero">
          <div className="student-avatar" style={{ background: s.color }}>{initials(s.name)}</div>
          <div style={{ flex: 1 }}>
            <div className="student-name">{s.name}</div>
            <div className="student-meta"><span>📧 {s.email}</span><span>📱 {s.parent}</span></div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="big-pct" style={{ color: pct >= 75 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#f87171" }}>{pct}%</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>overall</div>
            {pct < 75 && <span className="badge badge-red" style={{ marginTop: 8 }}>⚠ Below 75%</span>}
          </div>
        </div>
        <div className="stats-row">
          {[
            { label: "Days recorded", value: Object.keys(rec).length, color: "blue" },
            { label: "Attendance %", value: `${pct}%`, color: pct >= 75 ? "green" : "red" },
          ].map((c, i) => (
            <div key={i} className={`stat-card ${c.color}`}><div className="stat-label">{c.label}</div><div className="stat-value" style={{ fontSize: 22 }}>{c.value}</div></div>
          ))}
        </div>
        {Object.keys(rec).length > 0 && (
          <div className="table-card">
            <div className="table-head"><div className="table-title">Session records</div></div>
            <div className="grid-scroll">
              <table className="data-table">
                <thead><tr><th>Date</th>{(SCHEDULE[TODAY_KEY] || []).map((_, i) => <th key={i}>S{i + 1}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(rec).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14).map(([date, dayRec]) => (
                    <tr key={date}>
                      <td style={{ fontSize: 12 }}>{date}</td>
                      {(SCHEDULE[TODAY_KEY] || []).map((_, i) => {
                        const v = dayRec[i];
                        return <td key={i}>{v === "P" ? <span className="badge badge-green">P</span> : v === "A" ? <span className="badge badge-red">A</span> : <span style={{ color: "var(--text3)" }}>—</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
