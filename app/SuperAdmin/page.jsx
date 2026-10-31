"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import EditAccessModal from "../components/EditAccessModal";
import DeleteAdminModal from "../components/DeleteAdminModal";
import "../css/superadmin.css";

import {
  getAdminRequestsAction,
  approveAdminRequestAction,
  rejectAdminRequestAction,
  deleteAdminAction,
  updateAdminAccessAction,
  recheckAdminRequestAction,
} from "../Js/adminActions";

export default function SuperAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [editAccess, setEditAccess] = useState("limited");
  const [editMessage, setEditMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // خواندن درخواست‌ها از دیتابیس
  async function loadRequests() {
    setLoading(true);
    const result = await getAdminRequestsAction();
    if (result.ok) {
      setRequests(result.data);
    } else {
      setActionMessage(result.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) => r.full_name.toLowerCase().includes(q) || r.national_id.includes(q),
    );
  }, [requests, search]);

  const pendingRequests = filtered.filter((r) => r.status === "pending");
  const approvedRequests = filtered.filter((r) => r.status === "approved");
  const rejectedRequests = filtered.filter((r) => r.status === "rejected");

  function handleAccessChange(id, level) {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, access_level: level } : r)),
    );
  }

  async function handleApprove(id) {
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    setActionLoading(true);
    setActionMessage("");

    const result = await approveAdminRequestAction({
      requestId: id,
      accessLevel: req.access_level,
    });

    if (result.ok) {
      setActionMessage(result.message);
      await loadRequests();
    } else {
      setActionMessage(result.error);
    }
    setActionLoading(false);
  }

  async function handleReject(id) {
    setActionLoading(true);
    setActionMessage("");

    const result = await rejectAdminRequestAction({ requestId: id });

    if (result.ok) {
      setActionMessage(result.message);
      await loadRequests();
    } else {
      setActionMessage(result.error);
    }
    setActionLoading(false);
  }

  async function handleRecheck(id) {
    setActionLoading(true);
    setActionMessage("");

    const result = await recheckAdminRequestAction({ requestId: id });

    if (result.ok) {
      setActionMessage(result.message);
      await loadRequests();
    } else {
      setActionMessage(result.error);
    }
    setActionLoading(false);
  }

  function handleDelete(req) {
    setDeletingAdmin(req);
  }

  async function confirmDelete() {
    if (!deletingAdmin) return;

    setDeleteLoading(true);

    const result = await deleteAdminAction(deletingAdmin.id);

    setDeleteLoading(false);

    if (result.ok) {
      setActionMessage(result.message);
      setDeletingAdmin(null);
      await loadRequests();
    } else {
      setActionMessage(result.error);
    }
  }

  function openEdit(req) {
    setEditingId(req.id);
    setEditAccess(req.access_level);
    setEditPassword("");
    setEditMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPassword("");
    setEditMessage("");
  }

  async function saveEdit() {
    if (!editPassword) {
      setEditMessage("رمز را وارد کنید.");
      return;
    }

    setEditMessage("");

    const result = await updateAdminAccessAction({
      requestId: editingId,
      accessLevel: editAccess,
      superAdminPassword: editPassword,
    });

    if (result.ok) {
      await loadRequests();
      cancelEdit();
    } else {
      setEditMessage(result.error);
    }
  }

  function renderRequest(req) {
    return (
      <div key={req.id} className={`admin-request-item status-${req.status}`}>
        <div className="request-main-row">
          <div className="admin-request-info">
            <strong>{req.full_name}</strong>
            <div className="admin-request-meta">
              <span>🆔 {req.national_id}</span>
              <span>📱 {req.phone}</span>
              <span>
                📅 {new Date(req.created_at).toLocaleDateString("fa-IR")}
              </span>
            </div>
          </div>

          {req.status === "pending" && (
            <div className="admin-request-access">
              <label className="access-option">
                <input
                  type="radio"
                  name={`access-${req.id}`}
                  value="limited"
                  checked={req.access_level === "limited"}
                  onChange={() => handleAccessChange(req.id, "limited")}
                  disabled={actionLoading}
                />
                <span>🔒 محدود</span>
              </label>
              <label className="access-option">
                <input
                  type="radio"
                  name={`access-${req.id}`}
                  value="full"
                  checked={req.access_level === "full"}
                  onChange={() => handleAccessChange(req.id, "full")}
                  disabled={actionLoading}
                />
                <span>🔓 کامل</span>
              </label>
            </div>
          )}

          <div className="admin-request-actions">
            {req.status === "pending" ? (
              <>
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(req.id)}
                  disabled={actionLoading}
                >
                  ✅ تأیید
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleReject(req.id)}
                  disabled={actionLoading}
                >
                  ❌ رد
                </button>
              </>
            ) : req.status === "approved" ? (
              <>
                <div className="status-block approved-block">
                  <span>✅ تأیید شده</span>
                  <span className="status-block-divider">•</span>
                  <span>
                    {req.access_level === "full" ? "🔓 کامل" : "🔒 محدود"}
                  </span>
                </div>
                <button
                  className="btn-edit-access"
                  onClick={() => openEdit(req)}
                  title="ویرایش دسترسی با رمز "
                  disabled={actionLoading}
                >
                  ✏️ ویرایش
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(req)}
                  title="حذف این ادمین"
                  disabled={actionLoading}
                >
                  🗑️ حذف
                </button>
              </>
            ) : (
              <>
                <span className="status-badge status-rejected">❌ رد شده</span>
                <button
                  className="btn-recheck"
                  onClick={() => handleRecheck(req.id)}
                  title="بررسی دوباره این درخواست"
                  disabled={actionLoading}
                >
                  🔄 بررسی دوباره
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <div className="card">
        <div className="header-top">
          <h1>👤 پنل مدیریت ادمین ها</h1>
          <div className="header-actions">
            <Link
              href="/AdminRegister"
              className="add-admin-btn"
              title="ثبت ادمین جدید"
            >
              ➕ ثبت ادمین جدید
            </Link>
            <Link
              href="/Manager"
              className="back-btn"
              title="بازگشت به پنل اصلی"
            >
              ↩️ بازگشت
            </Link>
            <Link href="/" className="logout-btn">
              🚪 خروج
            </Link>
          </div>
        </div>
        <p>
          درخواست‌های ثبت ادمین جدید را بررسی، سطح دسترسی را تعیین و تأیید کنید.
        </p>
        {actionMessage && (
          <p className="login-message" role="alert">
            {actionMessage}
          </p>
        )}
      </div>

      <div className="card">
        <div className="panel-header">
          <h2>📋 مدیریت درخواست‌ها</h2>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 جستجو با نام یا کد ملی..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="rtl"
          />
        </div>

        {loading ? (
          <p className="empty-state">⏳ در حال بارگذاری...</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {search ? "نتیجه‌ای برای جستجو پیدا نشد." : "درخواستی وجود ندارد."}
          </p>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <div className="request-section">
                <h3 className="request-section-title pending-title">
                  ⏳ در انتظار تأیید
                  <span className="request-section-count">
                    {pendingRequests.length}
                  </span>
                </h3>
                <div className="admin-requests-list">
                  {pendingRequests.map((req) => renderRequest(req))}
                </div>
              </div>
            )}

            {approvedRequests.length > 0 && (
              <div className="request-section">
                <h3 className="request-section-title approved-title">
                  ✅ تأیید شده
                  <span className="request-section-count">
                    {approvedRequests.length}
                  </span>
                </h3>
                <div className="admin-requests-list">
                  {approvedRequests.map((req) => renderRequest(req))}
                </div>
              </div>
            )}

            {rejectedRequests.length > 0 && (
              <div className="request-section">
                <h3 className="request-section-title rejected-title">
                  ❌ رد شده
                  <span className="request-section-count">
                    {rejectedRequests.length}
                  </span>
                </h3>
                <div className="admin-requests-list">
                  {rejectedRequests.map((req) => renderRequest(req))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <EditAccessModal
        open={editingId !== null}
        request={requests.find((r) => r.id === editingId)}
        editAccess={editAccess}
        setEditAccess={setEditAccess}
        editPassword={editPassword}
        setEditPassword={setEditPassword}
        editMessage={editMessage}
        onSave={saveEdit}
        onCancel={cancelEdit}
        onSuccess={loadRequests}
      />

      <DeleteAdminModal
        open={deletingAdmin !== null}
        admin={deletingAdmin}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingAdmin(null)}
        loading={deleteLoading}
      />
    </main>
  );
}
