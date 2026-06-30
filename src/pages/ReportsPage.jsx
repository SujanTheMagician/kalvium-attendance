import { jsPDF } from "jspdf";
import Icon from "../components/Icon";
import { initials, generatePDF } from "../lib/utils";

export default function ReportsPage({ students, role, pcts, attendance, assignments, sendWA }) {
  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">PDF Reports</h2><p className="page-sub">Monthly report cards</p></div>
        {role !== "student" && students.length > 0 && (
          <button className="btn btn-primary" onClick={() => students.forEach((s) => generatePDF(s, attendance[s.id] || {}, assignments, jsPDF))}>
            <Icon name="download" size={13} />Export all
          </button>
        )}
      </div>
      <div className="content">
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: 50, color: "var(--text3)" }}>Add students first</div>
        ) : (
          <div className="cards-row">
            {students.map((s) => {
              const pct = pcts[s.id];
              return (
                <div key={s.id} className="info-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 13 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{initials(s.name)}</div>
                    <div><div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>{s.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{s.id}</div></div>
                    <div style={{ marginLeft: "auto" }}>{pct >= 75 ? <span className="badge badge-green">Eligible</span> : <span className="badge badge-red">At risk</span>}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text2)", marginBottom: 7 }}>
                    <span>Attendance</span><span style={{ fontWeight: 700, color: pct >= 75 ? "#4ade80" : "#f87171" }}>{pct}%</span>
                  </div>
                  <div className="progress-wrap" style={{ marginBottom: 13 }}><div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 75 ? "var(--green)" : "var(--red)" }} /></div>
                  <div style={{ display: "flex", gap: 7 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => generatePDF(s, attendance[s.id] || {}, assignments, jsPDF)}><Icon name="download" size={11} />Download PDF</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => sendWA(s)}><Icon name="send" size={11} />Send WA</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
