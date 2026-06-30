import { jsPDF } from "jspdf";
import Icon from "../components/Icon";
import { initials, daysUntil, dueDateLabel, generatePDF } from "../lib/utils";

export default function Dashboard({
  role, students, attendance, assignments, pcts, dangerStudents, warningStudents,
  setModal, setPage, sendWA, sendBulkWA, setActiveStudentId, dataLoading,
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Welcome back 👋</h2>
          <p className="page-sub">{new Date().toDateString()} · Squad 92 · B.Tech CSE AI&ML</p>
        </div>
        <div className="header-actions">
          {role !== "student" && (
            <>
              <button className="btn btn-ghost" onClick={() => setModal("addStudent")}><Icon name="plus" size={13} />Add student</button>
              <button className="btn btn-primary" onClick={() => setPage("mark")}><Icon name="mark" size={13} />Mark today</button>
            </>
          )}
        </div>
      </div>
      <div className="content">
        {dataLoading ? (
          <div style={{ padding: 50, textAlign: "center", color: "var(--text3)" }}>⏳ Loading from Firebase…</div>
        ) : students.length === 0 && role !== "student" ? (
          <div style={{ textAlign: "center", padding: 70 }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>👥</div>
            <h3 style={{ marginBottom: 8 }}>No students yet</h3>
            <p style={{ color: "var(--text2)", marginBottom: 22 }}>Add your Squad 92 students to get started</p>
            <button className="btn btn-primary" onClick={() => setModal("addStudent")}><Icon name="plus" size={13} />Add first student</button>
          </div>
        ) : (
          <>
            <div className="stats-row">
              <div className="stat-card blue">
                <div className="stat-top"><span className="stat-label">Total students</span><div className="stat-icon-wrap" style={{ background: "var(--bluebg)" }}>👥</div></div>
                <div className="stat-value">{students.length}</div><div className="stat-sub">Squad 92</div>
              </div>
              <div className="stat-card green">
                <div className="stat-top"><span className="stat-label">Avg attendance</span><div className="stat-icon-wrap" style={{ background: "var(--greenbg)" }}>📊</div></div>
                <div className="stat-value">{students.length ? Math.round(students.reduce((a, s) => a + pcts[s.id], 0) / students.length) : 0}%</div><div className="stat-sub">All students</div>
              </div>
              <div className="stat-card red">
                <div className="stat-top"><span className="stat-label">Danger zone</span><div className="stat-icon-wrap" style={{ background: "var(--redbg)" }}>⚠️</div></div>
                <div className="stat-value" style={{ color: "#f87171" }}>{dangerStudents.length}</div><div className="stat-sub">Below 75%</div>
              </div>
              <div className="stat-card amber">
                <div className="stat-top"><span className="stat-label">Due soon</span><div className="stat-icon-wrap" style={{ background: "var(--amberbg)" }}>📝</div></div>
                <div className="stat-value" style={{ color: "#fbbf24" }}>{assignments.filter((a) => daysUntil(a.due) <= 3 && daysUntil(a.due) >= 0).length}</div><div className="stat-sub">Next 3 days</div>
              </div>
            </div>

            <div className="two-col">
              <div className="table-card">
                <div className="table-head">
                  <div><div className="table-title">⚠ Danger threshold</div><div className="table-sub">Students below 75%</div></div>
                  {dangerStudents.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => sendBulkWA(dangerStudents)}><Icon name="send" size={12} />Alert all</button>}
                </div>
                <div className="scroll-section">
                  {dangerStudents.length === 0 ? (
                    <div style={{ padding: 28, textAlign: "center", color: "var(--text3)" }}>🎉 All students above 75%!</div>
                  ) : (
                    dangerStudents.map((s) => {
                      const pct = pcts[s.id];
                      return (
                        <div key={s.id} className="alert-row" style={{ borderLeft: "3px solid var(--red)" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", flexShrink: 0, marginTop: 5 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                              <div style={{ width: 25, height: 25, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "#fff" }}>{initials(s.name)}</div>
                              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                              <span className="badge badge-red">{pct}%</span>
                            </div>
                            <div className="progress-wrap" style={{ marginBottom: 8 }}><div className="progress-bar progress-red" style={{ width: `${pct}%` }} /></div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.email} · {s.parent}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <button className="btn btn-danger btn-sm" onClick={() => sendWA(s)}><Icon name="send" size={11} />WA</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(s, attendance[s.id] || {}, assignments, jsPDF)}><Icon name="download" size={11} />PDF</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {warningStudents.map((s) => {
                    const pct = pcts[s.id];
                    return (
                      <div key={s.id} className="alert-row" style={{ borderLeft: "3px solid var(--amber)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", flexShrink: 0, marginTop: 5 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                            <div style={{ width: 25, height: 25, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: "#fff" }}>{initials(s.name)}</div>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.name}</span>
                            <span className="badge badge-amber">{pct}%</span>
                          </div>
                          <div className="progress-wrap"><div className="progress-bar progress-amber" style={{ width: `${pct}%` }} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="table-card">
                <div className="table-head">
                  <div><div className="table-title">📚 Assignments</div><div className="table-sub">Upcoming deadlines</div></div>
                  {role !== "student" && <button className="btn btn-ghost btn-sm" onClick={() => setModal("addAssign")}><Icon name="plus" size={12} />Add</button>}
                </div>
                <div className="scroll-section">
                  {assignments.length === 0 ? (
                    <div style={{ padding: 28, textAlign: "center", color: "var(--text3)" }}>No assignments yet</div>
                  ) : (
                    [...assignments].sort((a, b) => new Date(a.due) - new Date(b.due)).map((a) => {
                      const d = daysUntil(a.due), dl = dueDateLabel(d);
                      return (
                        <div key={a.id} className="assign-card">
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: d <= 2 ? "var(--red)" : d <= 5 ? "var(--amber)" : "var(--green)", flexShrink: 0, marginTop: 4 }} />
                          <div className="assign-left">
                            <div className="assign-title">{a.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{a.subject}</div>
                            <div className={dl.cls} style={{ fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{dl.label} · {a.due}</div>
                          </div>
                          <span className="badge badge-accent" style={{ fontSize: 10 }}>{a.type}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {role !== "student" && students.length > 0 && (
              <div className="table-card">
                <div className="table-head">
                  <div><div className="table-title">All students</div><div className="table-sub">Live from Firebase · Click a row to view details</div></div>
                </div>
                <div className="grid-scroll">
                  <table className="data-table attendance-matrix">
                    <thead><tr><th>Student</th><th>ID</th><th>Attendance %</th><th style={{ minWidth: 140 }}>Progress</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {students.map((s) => {
                        const pct = pcts[s.id], bc = pct >= 80 ? "progress-green" : pct >= 75 ? "progress-amber" : "progress-red";
                        return (
                          <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => { setActiveStudentId(s.id); setPage("studentDetail"); }}>
                            <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 29, height: 29, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "#fff" }}>{initials(s.name)}</div><span className="name">{s.name}</span></div></td>
                            <td><code style={{ fontSize: 12, color: "var(--text3)" }}>{s.id}</code></td>
                            <td><span style={{ fontSize: 14.5, fontWeight: 700, color: pct >= 75 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#f87171" }}>{pct}%</span></td>
                            <td><div className="progress-wrap"><div className={`progress-bar ${bc}`} style={{ width: `${pct}%` }} /></div></td>
                            <td>{pct >= 80 ? <span className="badge badge-green">Good</span> : pct >= 75 ? <span className="badge badge-amber">Warning</span> : <span className="badge badge-red">Danger</span>}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 5 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => generatePDF(s, attendance[s.id] || {}, assignments, jsPDF)}><Icon name="download" size={11} />PDF</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => sendWA(s)}><Icon name="send" size={11} />WA</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
