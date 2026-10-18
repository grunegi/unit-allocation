"use client";

import { useState, useEffect, useRef } from "react";
import "../css/dashboard.css";

const BLOCK_GROUPS = {
  A: ["A1", "A2", "A3", "A4", "A5", "A6"],
  B: ["B1", "B2", "B3", "B4"],
  C: ["C1", "C2", "C3"],
};

export default function DashboardPlan({ stats, onGoToBlock }) {
  const [highlightedBlock, setHighlightedBlock] = useState(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [qrSrc, setQrSrc] = useState("");
  const qrGeneratedRef = useRef(false);

  function handleBlockClick(block) {
    setHighlightedBlock(block);
    setTimeout(() => setHighlightedBlock(null), 2000);

    if (onGoToBlock) {
      onGoToBlock(block);
    }
  }

  const total = stats?.totalUnits || 0;

  // گرفتن آدرس سایت از مرورگر
  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const publicUrl = `${origin}/Scanner`;
      setSiteUrl(publicUrl);
    }
  }, []);

  // ساخت QR بعد از گرفتن URL
  useEffect(() => {
    if (!siteUrl || qrGeneratedRef.current) return;
    qrGeneratedRef.current = true;

    (async () => {
      try {
        const qrModule = await import("qrcode");
        const QRCode = qrModule.default ?? qrModule;
        const src = await QRCode.toDataURL(siteUrl, {
          errorCorrectionLevel: "H",
          margin: 2,
          width: 300,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        setQrSrc(src);
      } catch (error) {
        console.error("QR generation failed:", error);
      }
    })();
  }, [siteUrl]);

  function copyLink() {
    if (!siteUrl) return;
    navigator.clipboard.writeText(siteUrl).then(() => {
      // یه افکت کوچیک برای تأیید
      const el = document.getElementById("site-link-copy");
      if (el) {
        el.classList.add("copied");
        setTimeout(() => el.classList.remove("copied"), 1500);
      }
    });
  }

  function downloadQR() {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `site-qr-${Date.now()}.png`;
    a.click();
  }

  return (
    <div className="dashboard-plan">
      <h3>پلان موقعیت بلوک‌ها</h3>
      <p className="dashboard-hint">
        برای رفتن به بخش انتخاب واحد هر بلوک، روی آن کلیک کنید.
      </p>

      <div className="site-plan-container">
        <div className="plan-label">لاین اول: بلوک‌های A</div>
        <div className="plan-row">
          {BLOCK_GROUPS.A.map((block) => (
            <button
              key={block}
              className={`plan-block block-A ${
                highlightedBlock === block ? "highlight" : ""
              }`}
              onClick={() => handleBlockClick(block)}
            >
              {block}
            </button>
          ))}
        </div>

        <div className="plan-label">لاین دوم: بلوک‌های B</div>
        <div className="plan-row">
          {BLOCK_GROUPS.B.map((block) => (
            <button
              key={block}
              className={`plan-block block-B ${
                highlightedBlock === block ? "highlight" : ""
              }`}
              onClick={() => handleBlockClick(block)}
            >
              {block}
            </button>
          ))}
        </div>

        <div className="plan-label">لاین سوم: بلوک‌های C</div>
        <div className="plan-row">
          {BLOCK_GROUPS.C.map((block) => (
            <button
              key={block}
              className={`plan-block block-C ${
                highlightedBlock === block ? "highlight" : ""
              }`}
              onClick={() => handleBlockClick(block)}
            >
              {block}
            </button>
          ))}
        </div>

        <div className="plan-total">مجموع: {total} واحد</div>
      </div>

      {/* ===== لینک سایت + QR ===== */}
      <div className="site-qr-section">
        <h3 className="site-qr-title">🔗 لینک سایت و QR Code</h3>
        <p className="site-qr-hint">
          این QR را چاپ کنید و در اختیار متقاضیان قرار دهید تا با اسکن آن،
          وارد صفحه‌ی بررسی واحد شوند.
        </p>

        <div className="site-qr-content">
          <div className="site-qr-left">
            <label className="site-url-label">آدرس سایت:</label>
            <div className="site-url-row">
              <input
                type="text"
                className="site-url-input"
                value={siteUrl}
                readOnly
                dir="ltr"
              />
              <button
                id="site-link-copy"
                type="button"
                className="site-copy-btn"
                onClick={copyLink}
                disabled={!siteUrl}
              >
                📋 کپی
              </button>
            </div>
            <p className="site-qr-note">
              💡 این لینک به صفحه‌ی کاربر معمولی (Scanner) اشاره می‌کند که
              کاربر بدون رمز می‌تواند وضعیت واحد را ببیند.
            </p>
          </div>

          <div className="site-qr-right">
            <div className="site-qr-image-wrap">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="QR Code سایت"
                  className="site-qr-image"
                />
              ) : (
                <div className="site-qr-loading">در حال ساخت QR...</div>
              )}
            </div>
            {qrSrc && (
              <button
                type="button"
                className="gray small"
                onClick={downloadQR}
              >
                ⬇️ دانلود QR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}