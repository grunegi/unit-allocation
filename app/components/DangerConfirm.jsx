"use client";

import { useState, useEffect } from "react";

export default function DangerConfirm({
  open,
  title = "⚠️ عملیات خطرناک",
  message,
  warning = "این عملیات برگشت‌پذیر نیست.",
  confirmText = "DELETE",
  confirmLabel = "🗑️ تایید و حذف",
  cancelLabel = "انصراف",
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("");

  // هر بار باز شد، فیلد خالی بشه
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!open) return null;

  const isReady = typed === confirmText;

  function handleClose() {
    setTyped("");
    onCancel?.();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal danger-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header danger-modal-header">
          <h2>{title}</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="danger-warning-box">
            <div className="danger-warning-icon">🚨</div>
            <div>
              <strong>هشدار!</strong>
              <p>{message}</p>
              <p>{warning}</p>
            </div>
          </div>

          <div className="danger-confirm-section">
            <label htmlFor="danger-confirm-input">
              برای تایید، عبارت <code>{confirmText}</code> را تایپ کنید:
            </label>
            <input
              id="danger-confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              placeholder={confirmText}
              dir="ltr"
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="gray" onClick={handleClose}>
            {cancelLabel}
          </button>
          <button
            className="danger"
            disabled={!isReady}
            onClick={() => {
              setTyped("");
              onConfirm?.();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}