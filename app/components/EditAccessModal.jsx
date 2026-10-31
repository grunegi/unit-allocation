"use client";

import { useEffect, useRef, useState } from "react";
import { updateAdminInfoAction } from "../Js/adminActions";

export default function EditAccessModal({
  open,
  request,
  editAccess,
  setEditAccess,
  editPassword,
  setEditPassword,
  editMessage,
  onSave,
  onCancel,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("access"); // access | info
  const inputRef = useRef(null);

  // state تب اطلاعات
  const [editFullName, setEditFullName] = useState("");
  const [editNationalId, setEditNationalId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [infoPassword, setInfoPassword] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  // مقداردهی اولیه وقتی مودال باز می‌شود
  useEffect(() => {
    if (open && request) {
      setActiveTab("access");
      setEditFullName(request.full_name || "");
      setEditNationalId(request.national_id || "");
      setEditPhone(request.phone || "");
      setEditNewPassword("");
      setInfoMessage("");
      setInfoPassword("");
    }
  }, [open, request]);

  // فوکوس روی فیلد رمز تب فعال
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [open, activeTab]);

  // بستن با Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open || !request) return null;

  // ذخیره تب اطلاعات
  async function saveInfo() {
    setInfoMessage("");

    if (!editFullName.trim() || editFullName.trim().length < 3) {
      setInfoMessage("نام باید حداقل ۳ حرف باشد.");
      return;
    }
    if (!/^\d{10}$/.test(editNationalId)) {
      setInfoMessage("کد ملی باید ۱۰ رقم باشد.");
      return;
    }
    if (!/^09\d{9}$/.test(editPhone)) {
      setInfoMessage("شماره موبایل نامعتبر است.");
      return;
    }
    if (editNewPassword && editNewPassword.length < 6) {
      setInfoMessage("رمز جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (!infoPassword) {
      setInfoMessage("رمز خود را وارد کنید.");
      return;
    }

    setInfoSaving(true);
    const result = await updateAdminInfoAction({
      requestId: request.id,
      fullName: editFullName,
      nationalId: editNationalId,
      phone: editPhone,
      newPassword: editNewPassword,
      superAdminPassword: infoPassword,
    });
    setInfoSaving(false);

    if (result.ok) {
      setInfoMessage("✅ " + result.message);
      onSuccess?.();
      setTimeout(() => onCancel(), 1500);
    } else {
      setInfoMessage("❌ " + result.error);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal edit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header edit-modal-header">
          <h2>✏️ ویرایش </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="بستن"
          >
            ×
          </button>
        </div>

        {/* تب‌ها */}
        <div className="modal-tabs">
          <button
            type="button"
            className={activeTab === "access" ? "active" : ""}
            onClick={() => setActiveTab("access")}
          >
            🔐 ویرایش سطح دسترسی
          </button>
          <button
            type="button"
            className={activeTab === "info" ? "active" : ""}
            onClick={() => setActiveTab("info")}
          >
            👤 ویرایش اطلاعات
          </button>
        </div>

        <div className="modal-body">
          {/* اطلاعات شخص */}
          <div className="edit-person-info">
            <div className="edit-person-avatar">
              {request.full_name?.charAt(0) || "?"}
            </div>
            <div className="edit-person-details">
              <strong>{request.full_name}</strong>
              <span>🆔 {request.national_id}</span>
              <span>📱 {request.phone}</span>
            </div>
          </div>

          {/* === تب ۱: سطح دسترسی === */}
          {activeTab === "access" && (
            <>
              <div className="edit-notice">
                <span className="edit-notice-icon">💡</span>
                <p>
                  برای تغییر سطح دسترسی، یکی از گزینه‌ها را انتخاب کنید و رمز
                  خود را وارد کنید.
                </p>
              </div>

              <div className="edit-field">
                <label className="edit-label">سطح دسترسی جدید</label>
                <div className="edit-access-radios">
                  <label
                    className={`edit-access-card ${
                      editAccess === "limited" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-access-level"
                      value="limited"
                      checked={editAccess === "limited"}
                      onChange={() => setEditAccess("limited")}
                    />
                    <span className="edit-access-icon">🔒</span>
                    <div>
                      <strong>محدود</strong>
                      <small>دسترسی به بخشی از قابلیت‌ها</small>
                    </div>
                  </label>

                  <label
                    className={`edit-access-card ${
                      editAccess === "full" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-access-level"
                      value="full"
                      checked={editAccess === "full"}
                      onChange={() => setEditAccess("full")}
                    />
                    <span className="edit-access-icon">🔓</span>
                    <div>
                      <strong>کامل</strong>
                      <small>دسترسی به تمام قابلیت‌ها</small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="edit-field">
                <label className="edit-label" htmlFor="edit-password-access">
                  رمز  
                </label>
                <input
                  id="edit-password-access"
                  ref={activeTab === "access" ? inputRef : null}
                  type="password"
                  className="edit-password-input"
                  placeholder="••••••"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              {editMessage && (
                <div className="edit-message" role="alert">
                  ⚠️ {editMessage}
                </div>
              )}
            </>
          )}

          {/* === تب ۲: اطلاعات ادمین === */}
          {activeTab === "info" && (
            <>
              <div className="edit-notice">
                <span className="edit-notice-icon">💡</span>
                <p>
                  اطلاعات شخص را ویرایش کنید. برای تغییر رمز، فیلد «رمز جدید»
                  را پر کنید (اختیاری). برای ذخیره، رمز ادمین اصلی را وارد
                  کنید.
                </p>
              </div>

              <div className="edit-field">
                <label className="edit-label" htmlFor="edit-fullname">
                  نام و نام خانوادگی
                </label>
                <input
                  id="edit-fullname"
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="مثلاً علی رضایی"
                />
              </div>

              <div className="edit-field">
                <label className="edit-label" htmlFor="edit-national-id">
                  کد ملی
                </label>
                <input
                  id="edit-national-id"
                  type="text"
                  value={editNationalId}
                  onChange={(e) => setEditNationalId(e.target.value)}
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>

              <div className="edit-field">
                <label className="edit-label" htmlFor="edit-phone">
                  شماره موبایل
                </label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  inputMode="numeric"
                  maxLength={11}
                  dir="rtl"
                />
              </div>

              <div className="edit-field">
                <label className="edit-label" htmlFor="edit-new-password">
                  رمز جدید (اختیاری)
                </label>
                <input
                  id="edit-new-password"
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="خالی بگذارید تا تغییر نکند"
                  autoComplete="new-password"
                />
              </div>

              <div className="edit-field">
                <label className="edit-label" htmlFor="edit-password-info">
                  رمز
                </label>
                <input
                  id="edit-password-info"
                  ref={activeTab === "info" ? inputRef : null}
                  type="password"
                  className="edit-password-input"
                  placeholder="••••••"
                  value={infoPassword}
                  onChange={(e) => setInfoPassword(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              {infoMessage && (
                <div className="edit-message" role="alert">
                  {infoMessage}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-reject" onClick={onCancel}>
            انصراف
          </button>
          {activeTab === "access" ? (
            <button type="button" className="btn-approve" onClick={onSave}>
              💾 ذخیره سطح دسترسی
            </button>
          ) : (
            <button
              type="button"
              className="btn-approve"
              onClick={saveInfo}
              disabled={infoSaving}
            >
              {infoSaving ? "در حال ذخیره..." : "💾 ذخیره اطلاعات"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}