"use client";

import { useState, useEffect } from "react";

export default function PasswordChangeModal({
  open,
  currentPassword,
  onClose,
  onSuccess,
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // ریست فرم وقتی modal باز می‌شه
  useEffect(() => {
    if (open) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (oldPassword !== currentPassword) {
      return setError("❌ رمز فعلی اشتباه است.");
    }

    if (newPassword.length < 4) {
      return setError("❌ رمز جدید باید حداقل ۴ کاراکتر باشد.");
    }

    if (newPassword !== confirmPassword) {
      return setError("❌ رمز جدید و تکرار آن مطابقت ندارند.");
    }

    if (newPassword === oldPassword) {
      return setError("❌ رمز جدید با رمز فعلی یکسان است.");
    }

    onSuccess(newPassword);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 تغییر رمز عبور</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <label htmlFor="old-password">رمز فعلی *</label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="رمز فعلی"
                inputMode="numeric"
                autoFocus
              />
            </div>

            <div className="form-row">
              <label htmlFor="new-password">رمز جدید *</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="حداقل ۴ کاراکتر"
                inputMode="numeric"
              />
            </div>

            <div className="form-row">
              <label htmlFor="confirm-password">تکرار رمز جدید *</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز جدید"
                inputMode="numeric"
              />
            </div>

            {error && (
              <p className="modal-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="gray" onClick={onClose}>
              انصراف
            </button>
            <button type="submit">✅ ذخیره</button>
          </div>
        </form>
      </div>
    </div>
  );
}