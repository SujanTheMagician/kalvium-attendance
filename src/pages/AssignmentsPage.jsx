import Icon from "../components/Icon";
import { daysUntil, dueDateLabel } from "../lib/utils";

export default function AssignmentsPage({ assignments, role, setModal }) {
  return (
    <>
      <div className="page-header">
        <div><h2 className="page-title">Assignments</h2><p className="page-sub">Squad 92 deadlines</p></div>
        {role !== "student" && <button className="btn btn-primary" onClick={() => setModal("addAssign")}><Icon name="plus" size={13} />Add</button>}
      </div>
      <div className="content">
        <div className="stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div className="stat-card red"><div className="stat-label">Overdue</div><div className="stat-value" style={{ color: "#f87171" }}>{assignments.filter((a) => daysUntil(a.due) < 0).length}</div></div>
          <div className="stat-card amber"><div className="stat-label">This week</div><div className="stat-value" style={{ color: "#fbbf24" }}>{assignments.filter((a) => daysUntil(a.due) >= 0 && daysUntil(a.due) <= 7).length}</div></div>
          <div className="stat-card green"><div className="stat-label">Upcoming</div><div className="stat-value" style={{ color: "#4ade80" }}>{assignments.filter((a) => daysUntil(a.due) > 7).length}</div></div>
        </div>
        <div className="table-card">
          <div className="table-head"><div className="table-title">All assignments — live from Firebase</div></div>
          {assignments.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--text3)" }}>No assignments yet</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {[...assignments].sort((a, b) => new Date(a.due) - new Date(b.due)).map((a) => {
                  const d = daysUntil(a.due), dl = dueDateLabel(d);
                  return (
                    <tr key={a.id}>
                      <td className="name">{a.title}</td>
                      <td style={{ fontSize: 12.5 }}>{a.subject.length > 35 ? a.subject.slice(0, 33) + "…" : a.subject}</td>
                      <td><span className="badge badge-accent">{a.type}</span></td>
                      <td>{a.due}</td>
                      <td><span className={dl.cls} style={{ fontSize: 12, fontWeight: 600 }}>{dl.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
