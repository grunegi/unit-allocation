"use client";

import Link from "next/link";
import "../css/publicpage.css";

export default function WelcomePage() {
  return (
    <main className="public-home">
      <header className="public-hero">
        <div className="public-logo" aria-hidden="true">
          🏢
        </div>

        <h1>سامانه بررسی وضعیت واحدها</h1>

        <p>
          مشاهده وضعیت واحدها، بررسی تخصیص‌ها و دسترسی سریع به امکانات سامانه
        </p>
      </header>

      <section className="public-card">
        <div className="public-scan-icon" aria-hidden="true">
          ⌗
        </div>

        <h2>به سامانه خوش آمدید</h2>

        <p>برای ادامه، نوع دسترسی خود را انتخاب کنید.</p>

        <div>
          <h3>👤 کاربر معمولی</h3>

          <p>مشاهده وضعیت واحدها و اسکن بارکد</p>

          <Link
            href="/Scanner"
            className="public-primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              textDecoration: "none",
              borderRadius: 12,
              padding: "14px",
            }}
          >
            <span>⌗</span>
            <span>شروع اسکن</span>
            <span>←</span>
          </Link>
        </div>

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            marginTop: 24,
            paddingTop: 22,
          }}
        >
          <h3>🔐 دسترسی مدیران و ناظران</h3>

          <p>مدیریت افراد، تخصیص واحدها و اطلاعات سامانه</p>

          <Link
            href="/Manager"
            className="public-admin-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: 14,
              textDecoration: "none",
              marginTop: 12,
            }}
          >
            <span>ورود به بخش مدیریت</span>
            <span>←</span>
          </Link>
        </div>
      </section>

      <footer>سامانه بررسی وضعیت واحدها · دسترسی آسان و سریع</footer>
    </main>
  );
}
