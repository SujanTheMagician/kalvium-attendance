import { useState } from "react";
import Icon from "../components/Icon";

export default function TeamPage({ mentors, currentUserEmail, onAdd, onRemove, addToast }) {
  const [form, setForm] = useState({ email: "", name: "", role: "mentor" });

  const handleAdd = () => {
    if (!form.email.trim()) { addToast("Enter an email", "⚠️"); return; }
    if (!form.email.includes("@")) { addToast("Enter a valid email", "⚠️"); return; }
    onAdd(form.email, form.name, form.role);
    setForm({ email: "", name: "", role: "mentor" });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Team access</h2>
          <p className="page-sub">Add mentors and campus managers who can access this dashboard</p>
        </div>
      </div>
      <div className="content">
        <div style={{ background: "var(--accentbg)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 12, padding: "14px 18px", marginBottom: 22, fontSize: 13, color: "var(--text2)" }}>
          💡 Anyone added here signs in with their <strong style={{ color: "var(--text)" }}>Kalvium Google account</strong> and gets full mentor access — no code changes or redeploys needed. Removing someone here instantly revokes their mentor view (they fall back to the student view).
        </div>
        <div className="table-card" style={{ marginBottom: 20 }}>
          <div className="table-head"><div className="table-title">Add a mentor or campus manager</div></div>
          <div style={{ padding: 20 }}>
            <div className="two-col" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" placeholder="manager@kalvium.community" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Name (optional)</label>
                <input className="form-input" placeholder="Siva Subramaniyan" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input form-select" value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="mentor">Mentor</option>
                <option value="campus_manager">Campus Manager</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAdd}><Icon name="plus" size={13} />Add to team</button>
          </div>
        </div>
        <div className="table-card">
          <div className="table-head">
            <div><div className="table-title">Current team ({mentors.length})</div><div className="table-sub">People with mentor-level access</div></div>
          </div>
          {mentors.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text3)" }}>No additional team members yet</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {mentors.map((m) => (
                  <tr key={m.id}>
                    <td className="name">
                      {m.name || "—"} {m.email === currentUserEmail && <span className="badge badge-accent" style={{ marginLeft: 6, fontSize: 10 }}>You</span>}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{m.email}</td>
                    <td><span className="badge badge-accent">{m.role === "campus_manager" ? "Campus Manager" : "Mentor"}</span></td>
                    <td>
                      {m.email !== currentUserEmail && (
                        <button className="btn btn-danger btn-sm" onClick={() => onRemove(m.email)}><Icon name="trash" size={11} />Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
