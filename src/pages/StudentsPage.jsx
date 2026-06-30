import { jsPDF } from "jspdf";
import Icon from "../components/Icon";
import { initials, generatePDF } from "../lib/utils";

export default function StudentsPage({ students, role, pcts, attendance, assignments, sendWA, setModal, setActiveStudentId, setPage }) {
  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Students</h2><p className="page-sub">Squad 92 · {students.length} enrolled</p></div>
        {role !== "student" && <button className="btn btn-primary" onClick={() => setModal("addStudent")}><Icon name="plus" size={13} />Add student</button>}
      </div>
      <div className="content">
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: 70, color: "var(--text3)" }}>No students yet. Add your first student!</div>
        ) : (
          <div className="cards-row">
            {students.map((s) => {
              const pct = pcts[s.id];
              return (
                <div key={s.id} className="info-card" style={{ cursor: "pointer" }} onClick={() => { setActiveStudentId(s.id); setPage("studentDetail"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 13 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>{initials(s.name)}</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>{s.name}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{s.id}</div></div>
                    {pct >= 80 ? <span className="badge badge-green">{pct}%</span> : pct >= 75 ? <span className="badge badge-amber">{pct}%</span> : <span className="badge badge-red">{pct}%</span>}
                  </div>
                  <div className="progress-wrap" style={{ marginBottom: 9 }}><div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 80 ? "var(--green)" : pct >= 75 ? "var(--amber)" : "var(--red)" }} /></div>
                  <div style={{ fontSize: 11.5, color: "var(--text3)", marginBottom: 2 }}>{s.email}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text3)" }}>Parent: {s.parent || "—"}</div>
                  <div style={{ display: "flex", gap: 7, marginTop: 14 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); generatePDF(s, attendance[s.id] || {}, assignments, jsPDF); }}><Icon name="download" size={11} />PDF</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); sendWA(s); }}><Icon name="send" size={11} />WA</button>
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
