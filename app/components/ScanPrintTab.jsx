"use client";

import { useState } from "react";
import UnitStatusScanner from "./UnitStatusScanner";

const BUILDINGS = {
  A1: 40, A2: 40, A3: 40, A4: 40, A5: 40, A6: 40,
  B1: 22, B2: 40, B3: 40, B4: 40,
  C1: 40, C2: 40, C3: 40,
};

const ALL_UNITS = Object.entries(BUILDINGS).flatMap(([building, count]) =>
  Array.from({ length: count }, (_, index) => `${building}-${index + 1}`),
);

const TOTAL_UNITS = ALL_UNITS.length;

export default function ScanPrintTab({ assignments, people }) {
  const [activeSection, setActiveSection] = useState("scan");
  const [qrCodes, setQrCodes] = useState([]);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrProgress, setQrProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("all");

  // واحدهای فیلترشده بر اساس بلوک انتخاب‌شده
  const filteredUnits =
    selectedBuilding === "all"
      ? ALL_UNITS
      : ALL_UNITS.filter((code) => code.startsWith(`${selectedBuilding}-`));

  const targetCount = filteredUnits.length;

  async function generateQRCodes() {
    if (isGeneratingQR) return;

    setIsGeneratingQR(true);
    setQrProgress(0);
    setQrCodes([]);
    setMessage("");

    try {
      const qrModule = await import("qrcode");
      const QRCode = qrModule.default ?? qrModule;

      const generated = [];
      const batchSize = 20;

      for (let start = 0; start < filteredUnits.length; start += batchSize) {
        const batch = filteredUnits.slice(start, start + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (code) => ({
            code,
            src: await QRCode.toDataURL(code, {
              errorCorrectionLevel: "H",
              margin: 2,
              width: 240,
              color: { dark: "#000000", light: "#FFFFFF" },
            }),
          })),
        );
        generated.push(...batchResults);
        setQrProgress(generated.length);
      }

      setQrCodes(generated);
      const filterLabel =
        selectedBuilding === "all"
          ? "همه بلوک‌ها"
          : `بلوک ${selectedBuilding}`;
      setMessage(
        `ساخت ${generated.length} کد QR (${filterLabel}) با موفقیت انجام شد.`,
      );
    } catch (error) {
      console.error("QR generation failed:", error);
      setMessage(
        "ساخت QR کدها ناموفق بود. مطمئن شوید کتابخانه qrcode نصب شده است.",
      );
    } finally {
      setIsGeneratingQR(false);
    }
  }

  function printBarcodes() {
    if (!qrCodes.length) {
      setMessage("ابتدا روی «ساخت QR کدها» کلیک کنید.");
      return;
    }
    window.print();
  }

  function handleBuildingChange(e) {
    setSelectedBuilding(e.target.value);
    setQrCodes([]);
    setMessage("");
  }

  return (
    <section className="card">
      <h2>📷 اسکن و چاپ QR</h2>

      {/* تب داخلی */}
      <div className="scan-print-toggle">
        <button
          type="button"
          className={activeSection === "scan" ? "active" : ""}
          onClick={() => setActiveSection("scan")}
        >
          📷 اسکن
        </button>
        <button
          type="button"
          className={activeSection === "print" ? "active" : ""}
          onClick={() => setActiveSection("print")}
        >
          🖨 چاپ
        </button>
      </div>

      {message && (
        <div className="notice" role="status">
          {message}
          <button className="small gray" onClick={() => setMessage("")}>
            بستن
          </button>
        </div>
      )}

      {/* بخش اسکن */}
      {activeSection === "scan" && (
        <div>
          <p>
            می‌توانید QR را اسکن کنید، کد را تایپ کنید، یا از لیست انتخاب کنید.
          </p>
          <UnitStatusScanner
            assignments={assignments}
            people={people}
            showPersonInfo={true}
          />
        </div>
      )}

      {/* بخش چاپ */}
      {activeSection === "print" && (
        <div>
          {/* هشدار مهم */}
          <div className="print-notice">
            <div className="print-notice-header">
              <span className="print-notice-icon">⚠️</span>
              <strong className="print-notice-title">توجه مهم</strong>
            </div>
            <div className="print-notice-body">
              <p>
                محتوای هر QR کد <strong>ثابت</strong> است و به کد واحد مربوط
                می‌شود (مثلاً <code>A1-15</code>).
              </p>
              <p>
                QR ها هر بار <strong>عیناً یکسان</strong> ساخته می‌شوند.
                بنابراین:
              </p>
              <ul className="print-notice-list">
                <li>
                  <span className="print-notice-check">✅</span>
                  <span>
                    کافی است <strong>فقط یک بار</strong> چاپ کنید و به واحدها
                    بزنید.
                  </span>
                </li>
                <li>
                  <span className="print-notice-check">❌</span>
                  <span>ساخت دوباره نیاز به چاپ و جایگزینی فیزیکی ندارد.</span>
                </li>
                <li>
                  <span className="print-notice-check">💡</span>
                  <span>QR های چاپ‌شده و QR های جدید، با هم سازگارند.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* توضیح عملکرد */}
          <div className="print-info-box">
            <div className="print-info-icon">💡</div>
            <div className="print-info-content">
              <strong>چطور کار می‌کند؟</strong>
              <p>
                ابتدا بلوک مورد نظر را انتخاب کنید، سپس روی دکمه{" "}
                <strong>«ساخت QR کدها»</strong> کلیک کنید. برای هر واحد یک QR
                کد ساخته می‌شود که محتوای آن، کد همان واحد است؛ مثلاً{" "}
                <code>A1-15</code>.
              </p>
            </div>
          </div>

          {/* فیلتر بلوک */}
          <div className="print-filter">
            <label
              htmlFor="print-building-filter"
              className="print-filter-label"
            >
              🏢 انتخاب بلوک:
            </label>
            <select
              id="print-building-filter"
              className="print-filter-select"
              value={selectedBuilding}
              onChange={handleBuildingChange}
              disabled={isGeneratingQR}
            >
              <option value="all">همه بلوک‌ها ({TOTAL_UNITS} واحد)</option>
              {Object.entries(BUILDINGS).map(([building, count]) => (
                <option key={building} value={building}>
                  {building} ({count} واحد)
                </option>
              ))}
            </select>

            <div className="print-filter-info">
              {selectedBuilding === "all" ? (
                <span>
                  📊 مجموع: <strong>{TOTAL_UNITS}</strong> واحد
                </span>
              ) : (
                <span>
                  📊 بلوک <strong>{selectedBuilding}</strong>:{" "}
                  <strong>{BUILDINGS[selectedBuilding]}</strong> واحد
                </span>
              )}
            </div>
          </div>

          {/* دکمه‌ها */}
          <div className="print-actions">
            <button
              className="print-btn-primary"
              onClick={generateQRCodes}
              disabled={isGeneratingQR}
            >
              {isGeneratingQR
                ? `⏳ در حال ساخت... ${qrProgress} از ${targetCount}`
                : selectedBuilding === "all"
                  ? `🎯 ساخت QR همه بلوک‌ها (${TOTAL_UNITS})`
                  : `🎯 ساخت QR بلوک ${selectedBuilding} (${BUILDINGS[selectedBuilding]})`}
            </button>
            <button
              className="print-btn-secondary"
              onClick={printBarcodes}
              disabled={!qrCodes.length || isGeneratingQR}
            >
              🖨 چاپ QR کدها
            </button>
          </div>

          {/* وضعیت پیشرفت */}
          {isGeneratingQR && (
            <div className="print-progress" role="status">
              <div className="print-progress-bar">
                <div
                  className="print-progress-fill"
                  style={{
                    width: `${(qrProgress / targetCount) * 100}%`,
                  }}
                />
              </div>
              <p className="print-progress-text">
                ساخت {qrProgress} از {targetCount} کد...
              </p>
            </div>
          )}

          {/* آماده چاپ */}
          {!isGeneratingQR && qrCodes.length > 0 && (
            <div className="print-ready">
              <span className="print-ready-icon">✅</span>
              <span>
                <strong>{qrCodes.length}</strong> کد QR آماده چاپ است
                {selectedBuilding !== "all" && ` (بلوک ${selectedBuilding})`}.
              </span>
            </div>
          )}

          {/* گرید QR */}
          <div className="barcode-grid">
            {qrCodes.map(({ code, src }) => (
              <div className="barcode-item" key={code}>
                <img
                  src={src}
                  alt={`QR code for unit ${code}`}
                  loading="lazy"
                />
                <strong>{code}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}