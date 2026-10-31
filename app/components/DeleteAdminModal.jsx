"use client";

import { useEffect } from "react";

export default function DeleteAdminModal({
  open,
  admin,
  onConfirm,
  onCancel,
  loading,
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  if (!open || !admin) return null;

  return (
    <div className="modal-overlay" onClick={() => !loading && onCancel()}>
      <div
        className="modal delete-admin-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header delete-admin-header">
          <h2>🗑️ حذف ادمین</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            disabled={loading}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* هشدار */}
          <div className="delete-warning-box">
            <span className="delete-warning-icon">⚠️</span>
            <div>
              <strong>این عملیات قابل بازگشت نیست</strong>
              <p>
                با حذف این ادمین، دسترسی او به‌طور کامل قطع می‌شود و
                نمی‌تواند وارد سیستم شود.
              </p>
            </div>
          </div>

          {/* اطلاعات ادمین */}
          <div className="delete-admin-info">
            <div className="delete-admin-avatar">
              {admin.full_name?.charAt(0) || "?"}
            </div>
            <div className="delete-admin-details">
              <strong>{admin.full_name}</strong>
              <span>🆔 {admin.national_id}</span>
              <span>📱 {admin.phone}</span>
            </div>
            <div
              className={`delete-admin-access ${
                admin.access_level === "full" ? "full" : "limited"
              }`}
            >
              {admin.access_level === "full" ? "🔓 کامل" : "🔒 محدود"}
            </div>
          </div>

          <p className="delete-confirm-text">
            آیا از حذف این ادمین مطمئن هستید؟
          </p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-reject"
            onClick={onCancel}
            disabled={loading}
          >
            انصراف
          </button>
          <button
            type="button"
            className="btn-delete-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "⏳ در حال حذف..." : "🗑️ حذف ادمین"}
          </button>
        </div>
      </div>
    </div>
  );
}