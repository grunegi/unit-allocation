"use client";

import "../css/confirmmodal.css";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "تأیید",
  cancelText = "انصراف",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="modal-close"
            onClick={onCancel}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="modal-body confirm-modal-body">
          <div className={`confirm-icon ${danger ? "danger" : "info"}`}>
            {danger ? "🗑" : "❓"}
          </div>
          <p className="confirm-message">{message}</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="gray" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={danger ? "danger" : ""}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}