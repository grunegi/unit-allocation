"use client";

import { useState } from "react";
import Qrscanner from "./Qrscanner";

const BUILDINGS = { A1: 40, A2: 40, A3: 40, C1: 40, C2: 40, C3: 40, B1: 22 };
const ALL_UNITS = Object.entries(BUILDINGS).flatMap(([building, count]) =>
  Array.from({ length: count }, (_, index) => `${building}-${index + 1}`),
);

export default function UnitStatusScanner({
  assignments = {},
  people = [],
  showPersonInfo = false,
}) {
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedNumber, setSelectedNumber] = useState("");

  const buildingUnits = selectedBuilding
    ? Array.from(
        { length: BUILDINGS[selectedBuilding] || 0 },
        (_, i) => `${selectedBuilding}-${i + 1}`,
      )
    : [];

  function checkUnit(rawCode) {
    const normalizedCode = String(rawCode || "")
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      setScanResult({
        ok: false,
        error: "لطفاً ابتدا کد واحد را وارد کنید (مثلاً A1-15).",
      });
      return;
    }

    const unitExists = ALL_UNITS.includes(normalizedCode);

    if (!unitExists) {
      setScanResult({
        ok: false,
        error: `کد «${normalizedCode}» در سیستم وجود ندارد.`,
      });
      return;
    }

    const assignment = assignments[normalizedCode];

    if (!assignment) {
      setScanResult({
        ok: true,
        unit: normalizedCode,
        status: "free",
        person: null,
      });
      return;
    }

    // اگر showPersonInfo فعال باشه، اطلاعات شخص رو پیدا کن
    let person = null;
    if (showPersonInfo && people.length) {
      person = people.find((p) => p.id === assignment.personId) || null;
    }

    setScanResult({
      ok: true,
      unit: normalizedCode,
      status: "taken",
      person,
    });
  }

  function handleScan(code) {
    checkUnit(code);
  }

  function handleManualSearch(event) {
    event.preventDefault();
    checkUnit(manualCode);
    setManualCode("");
  }

  function handleBuildingChange(e) {
    setSelectedBuilding(e.target.value);
    setSelectedNumber("");
  }

  function handleNumberChange(e) {
    const value = e.target.value;
    setSelectedNumber(value);
    if (value) {
      checkUnit(`${selectedBuilding}-${value}`);
    }
  }

  function resetAll() {
    setScanResult(null);
    setManualCode("");
    setSelectedBuilding("");
    setSelectedNumber("");
  }

  return (
    <div className="unit-status-scanner">
      {/* === ۱. تایپ دستی === */}
      <form onSubmit={handleManualSearch} className="manual-search-form">
        <label htmlFor="manual-code">⌨️ کد واحد را وارد کنید:</label>
        <div className="manual-search-row">
          <input
            id="manual-code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="مثلاً A1-15"
            dir="ltr"
            autoComplete="off"
          />
          <button type="submit" className="manual-search-btn">
            بررسی
          </button>
        </div>
      </form>

      {/* === ۲. انتخاب از لیست === */}
      <div className="list-search-form">
        <label>📋 یا از لیست انتخاب کنید:</label>
        <div className="list-search-row">
          <select value={selectedBuilding} onChange={handleBuildingChange}>
            <option value="">-- ساختمان --</option>
            {Object.keys(BUILDINGS).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedNumber}
            onChange={handleNumberChange}
            disabled={!selectedBuilding}
          >
            <option value="">-- واحد --</option>
            {buildingUnits.map((code) => {
              const number = code.split("-")[1];
              return (
                <option key={code} value={number}>
                  {code}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="scanner-divider">
        <span>یا</span>
      </div>

      {/* === ۳. اسکنر === */}
      <Qrscanner onScan={handleScan} onError={() => {}} />

      {/* === نتیجه === */}
      {scanResult && (
        <div
          className={`scan-result ${
            scanResult.ok ? scanResult.status : "error"
          }`}
        >
          {scanResult.ok ? (
            scanResult.status === "free" ? (
              <>
                <div className="scan-icon">✅</div>
                <h3>واحد آزاد است</h3>
                <p className="scan-unit">{scanResult.unit}</p>
                <p className="scan-message">
                  این واحد هنوز تخصیص داده نشده است.
                </p>
              </>
            ) : (
              <>
                <div className="scan-icon">🔒</div>
                <h3>این واحد قبلاً تخصیص داده شده است</h3>
                <p className="scan-unit">{scanResult.unit}</p>

                {/* اطلاعات شخص — فقط برای ادمین */}
                {showPersonInfo && scanResult.person && (
                  <div className="scan-person">
                    <p>
                      <strong>نام:</strong> {scanResult.person.name}
                    </p>
                    {scanResult.person.national_id && (
                      <p>
                        <strong>کد ملی:</strong> {scanResult.person.national_id}
                      </p>
                    )}
                    {scanResult.person.phone && (
                      <p>
                        <strong>تلفن:</strong> {scanResult.person.phone}
                      </p>
                    )}
                    {scanResult.person.address && (
                      <p>
                        <strong>آدرس:</strong> {scanResult.person.address}
                      </p>
                    )}
                  </div>
                )}
              </>
            )
          ) : (
            <>
              <div className="scan-icon">❌</div>
              <h3>کد نامعتبر</h3>
              <p className="scan-message">{scanResult.error}</p>
            </>
          )}

          <div>
            <button type="button" className="gray small" onClick={resetAll}>
              بررسی بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
