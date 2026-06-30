export default function AddAssignModal({ form, setForm, onClose, onSubmit, subjects }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add assignment</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="DSA Lab – Sorting" value={form.title}
              onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-input form-select" value={form.subject}
              onChange={(e) => setForm((x) => ({ ...x, subject: e.target.value }))}>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input form-select" value={form.type}
              onChange={(e) => setForm((x) => ({ ...x, type: e.target.value }))}>
              {["Assignment", "Lab", "Project", "Quiz", "Document", "Presentation"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Due date</label>
            <input className="form-input" type="date" value={form.due}
              onChange={(e) => setForm((x) => ({ ...x, due: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>Save to Firebase</button>
        </div>
      </div>
    </div>
  );
}
