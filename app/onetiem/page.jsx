"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { seedSuperAdminAction } from "../Js/adminActions";

export default function SeedAdminPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nationalId: "",
    fullName: "",
    phone: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSuccess("");
    setLoading(true);

    const result = await seedSuperAdminAction(form);
    setLoading(false);

    if (result.ok) {
      setSuccess(result.message + " — این صفحه را می‌توانید حذف کنید.");
      setTimeout(() => router.push("/login"), 2500);
    } else {
      setMessage(result.error);
    }
  }

  return (
    <main className="login-container">
      <section className="card login-card" style={{ maxWidth: "420px" }}>
        <h1>⚡ ایجاد ادمین اصلی</h1>
        <p>این صفحه فقط یک بار برای ساخت ادمین اصلی استفاده می‌شود.</p>

        <form onSubmit={handleSubmit} className="admin-request-form">
          <div className="form-row">
            <label htmlFor="nationalId">کد ملی</label>
            <input
              id="nationalId"
              name="nationalId"
              value={form.nationalId}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={10}
              placeholder="۱۰ رقم"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="fullName">نام و نام خانوادگی</label>
            <input
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="مثلاً علی رضایی"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="phone">شماره موبایل</label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={11}
              dir="ltr"
              placeholder="09xxxxxxxxx"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="password">رمز عبور</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="حداقل ۶ کاراکتر"
              required
            />
          </div>

          {message && <p className="login-message">{message}</p>}
          {success && <p className="login-success">{success}</p>}

          <div className="login-actions">
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "در حال ایجاد..." : "ایجاد ادمین اصلی"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}