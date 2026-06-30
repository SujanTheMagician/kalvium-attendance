export default function Toasts({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.icon || "✓"}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
