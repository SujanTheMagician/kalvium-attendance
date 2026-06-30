export default function AddStudentModal({ form, setForm, onClose, onSubmit }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add student to Squad 92</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" placeholder="Arjun Sharma" value={form.name}
              onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Kalvium email</label>
            <input className="form-input" placeholder="arjun.s@kalvium.community" value={form.email}
              onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Parent WhatsApp number</label>
            <input className="form-input" placeholder="+91 9876543210" value={form.parent}
              onChange={(e) => setForm((x) => ({ ...x, parent: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onSubmit}>Add to Firebase</button>
        </div>
      </div>
    </div>
  );
}
