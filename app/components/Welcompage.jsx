"use client";

import { useState } from "react";
import Link from "next/link";
import "../css/publicpage.css";

const TABS = [
  { id: "user", label: "👤 کاربران " },
  { id: "admin", label: "🔐 پنل مدیریت" },
];

export default function WelcomePage() {
  const [activeTab, setActiveTab] = useState("user");

  return (
    <main className="public-home">
      <section className="public-card glass-panel">
        {/* هدر باکس */}
        <header className="public-hero">
          <div className="public-logo" aria-hidden="true">
            🏢
          </div>
          <h1>سامانه انتخاب واحد پروژه 502 واحدی مسکن ملی شهرستان ملایر</h1>
          <p>
            مشاهده وضعیت واحدها، بررسی تخصیص‌ها و دسترسی سریع به امکانات سامانه
          </p>
        </header>

        {/* تب‌ها */}
        <div className="public-tabs" role="tablist" aria-label="نوع دسترسی">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`public-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* محتوای تب کاربر معمولی */}
        {activeTab === "user" && (
          <div
            className="public-tab-content"
            role="tabpanel"
            id="panel-user"
            aria-labelledby="tab-user"
          >
            <div className="public-scan-icon" aria-hidden="true">
              ⌗
            </div>

            <h2>به سامانه خوش آمدید</h2>
            <p>مشاهده وضعیت واحدها و اسکن بارکد</p>

            <Link href="/Scanner" className="public-primary">
              <span>⌗</span>
              <span>شروع جست و جو</span>
              <span>←</span>
            </Link>
          </div>
        )}

        {/* محتوای تب مدیریت */}
        {activeTab === "admin" && (
          <div
            className="public-tab-content"
            role="tabpanel"
            id="panel-admin"
            aria-labelledby="tab-admin"
          >
            <div className="public-scan-icon" aria-hidden="true">
              🔐
            </div>

            <h2>دسترسی مدیران و ناظران</h2>
            <p>مدیریت افراد، تخصیص واحدها و اطلاعات سامانه</p>

            <Link href="/Manager" className="public-admin-link">
              <span>ورود به بخش مدیریت</span>
              <span>←</span>
            </Link>
          </div>
        )}

        <footer className="public-footer">
          سامانه بررسی وضعیت واحدها · دسترسی آسان و سریع
        </footer>
      </section>
    </main>
  );
}