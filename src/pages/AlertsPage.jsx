import { jsPDF } from "jspdf";
import Icon from "../components/Icon";
import { daysUntil, generatePDF } from "../lib/utils";

export default function AlertsPage({ dangerStudents, warningStudents, assignments, attendance, sendWA, addToast }) {
  const all = [
    ...dangerStudents.map((s) => ({ type: "danger", title: `${s.name} below 75%`, msg: `Parent: ${s.parent || "no number"} · ${s.email}`, student: s })),
    ...warningStudents.map((s) => ({ type: "warning", title: `${s.name} in warning zone`, msg: "Approaching 75% threshold", student: s })),
    ...assignments.filter((a) => daysUntil(a.due) <= 2 && daysUntil(a.due) >= 0).map((a) => ({ type: "info", title: `"${a.title}" due ${daysUntil(a.due) === 0 ? "today" : "tomorrow"}`, msg: a.subject })),
  ];

  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Alerts</h2><p className="page-sub">{all.length} active</p></div>
        {dangerStudents.length > 0 && (
          <button className="btn btn-primary" onClick={() => { dangerStudents.forEach(sendWA); addToast("Alerts sent", "📱"); }}>
            <Icon name="send" size={13} />Alert all parents
          </button>
        )}
      </div>
      <div className="content">
        {all.length === 0 ? (
          <div style={{ textAlign: "center", padding: 70 }}><div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div><p style={{ color: "var(--text2)" }}>No alerts. All good!</p></div>
        ) : (
          all.map((a, i) => (
            <div key={i} className="alert-row" style={{ borderLeft: `3px solid ${a.type === "danger" ? "var(--red)" : a.type === "warning" ? "var(--amber)" : "var(--accent)"}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.type === "danger" ? "var(--red)" : a.type === "warning" ? "var(--amber)" : "var(--accent)", flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{a.title}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3 }}>{a.msg}</div>
              </div>
              {a.student && (
                <div style={{ display: "flex", gap: 5 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => sendWA(a.student)}><Icon name="send" size={11} />WA</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(a.student, attendance[a.student.id] || {}, assignments, jsPDF)}><Icon name="download" size={11} />PDF</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
