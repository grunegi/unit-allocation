"use client";

import { useState, useMemo } from "react";

import "../css/blocksummery.css";
import Qrscanner from "./Qrscanner";
import {
  getUnitsSummaryByBuilding,
  getBuildingsWithUnitsMeta,
} from "../Js/actions";

const DEFAULT_BUILDINGS = {
  A1: 40, A2: 40, A3: 40, A4: 40, A5: 40, A6: 40,
  B1: 22, B2: 40, B3: 40, B4: 40,
  C1: 40, C2: 40, C3: 40,
};

const PART_EAST = "راست";
const PART_WEST = "چپ";

export default function UnitStatusScanner({
  assignments = {},
  people = [],
  showPersonInfo = false,
  initialSummary = null,
}) {
  // === state خلاصه ===
  const [blockSummary, setBlockSummary] = useState(
    initialSummary?.summary || [],
  );
  const [totals, setTotals] = useState(
    initialSummary?.totals || { total: 0, taken: 0, free: 0 },
  );
  const [buildings, setBuildings] = useState(
    initialSummary?.buildings || DEFAULT_BUILDINGS,
  );
  const [unitsMeta, setUnitsMeta] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // === state اسکنر ===
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedNumber, setSelectedNumber] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  // === state باز/بسته بودن بلوک‌ها ===
  const [expandedBuildings, setExpandedBuildings] = useState({});

  async function loadSummary() {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const [summaryResult, metaResult] = await Promise.all([
        getUnitsSummaryByBuilding(),
        getBuildingsWithUnitsMeta(),
      ]);

      if (!summaryResult.ok) {
        setSummaryError(summaryResult.error);
        return;
      }

      setBlockSummary(summaryResult.summary);
      setTotals(summaryResult.totals);
      setBuildings(summaryResult.buildings);

      if (metaResult.ok) {
        setUnitsMeta(metaResult.unitsByBuilding);
      }
    } catch (err) {
      setSummaryError(err.message || "بارگذاری خلاصه ناموفق بود.");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleToggleSummary() {
    const next = !showSummary;
    setShowSummary(next);
    if (next && blockSummary.length === 0) {
      await loadSummary();
    }
    if (!next) {
      setExpandedBuildings({});
    }
  }

  function toggleBuilding(building) {
    setExpandedBuildings((prev) => ({
      ...prev,
      [building]: !prev[building],
    }));
  }

  const allUnits = useMemo(
    () =>
      Object.entries(buildings).flatMap(([building, count]) =>
        Array.from({ length: count }, (_, i) => `${building}-${i + 1}`),
      ),
    [buildings],
  );

  const buildingUnits = selectedBuilding
    ? Array.from(
        { length: buildings[selectedBuilding] || 0 },
        (_, i) => `${selectedBuilding}-${i + 1}`,
      )
    : [];

  function checkUnit(rawCode) {
    const normalizedCode = String(rawCode || "").trim().toUpperCase();

    if (!normalizedCode) {
      setScanResult({
        ok: false,
        error: "لطفاً ابتدا کد واحد را وارد کنید (مثلاً A1-15).",
      });
      return;
    }

    if (!allUnits.includes(normalizedCode)) {
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

  // === رندر ستون پارت (شرقی/غربی) از دیتابیس ===
  function renderPartColumn(building, partSide, partName) {
    const units = (unitsMeta[building] || []).filter(
      (u) => u.part === partSide,
    );

    if (!units.length) return null;

    const partClass = partSide === PART_EAST ? "part-right" : "part-left";
    const icon = partSide === PART_EAST ? "➡️" : "⬅️";
    const floorNames = ["اول", "دوم", "سوم", "چهارم", "پنجم", "ششم"];

    // گروه‌بندی بر اساس floor (دقیق از دیتابیس)
    const floorGroups = {};
    units.forEach((u) => {
      const floor = u.floor || 1;
      if (!floorGroups[floor]) floorGroups[floor] = [];
      floorGroups[floor].push(u.code);
    });

    return (
      <div className={`part-column ${partClass}`}>
        <div className="part-title">
          {icon} پارت {partName} ({partSide})
        </div>
        {Object.keys(floorGroups)
          .sort((a, b) => a - b)
          .map((floor) => {
            const floorName = floorNames[floor - 1] || `طبقه ${floor}`;
            return (
              <div className="floor-group" key={floor}>
                <div className="floor-title">طبقه {floorName}</div>
                <div className="unit-grid">
                  {floorGroups[floor].map((code) => (
                    <div
                      key={code}
                      className={`unit ${assignments[code] ? "taken" : ""}`}
                    >
                      <strong>{code}</strong>
                      <small>{assignments[code]?.name || "آزاد"}</small>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    );
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
            {Object.keys(buildings).map((b) => (
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

      {/* === ۴. خلاصه تخصیص به تفکیک بلوک === */}
      <div className="block-summary">
        <button
          type="button"
          className="summary-toggle small"
          onClick={handleToggleSummary}
          disabled={loadingSummary}
        >
          {loadingSummary
            ? "⏳ در حال بارگذاری..."
            : showSummary
              ? "🔽 بستن خلاصه بلوک‌ها"
              : "📊 نمایش خلاصه تخصیص بلوک‌ها"}
        </button>

        {summaryError && (
          <p className="scan-message" style={{ color: "red" }}>
            {summaryError}
          </p>
        )}

        {showSummary && (
          <div className="block-summary-list">
            {blockSummary.map((row) => {
              const percent = row.total
                ? Math.round((row.taken / row.total) * 100)
                : 0;

              const status =
                percent === 0
                  ? "empty"
                  : percent === 100
                    ? "full"
                    : percent >= 70
                      ? "warning"
                      : "normal";

              const isOpen = expandedBuildings[row.building] || false;

              return (
                <div className="building-section" key={row.building}>
                  {/* نوار وظیفه (هدر بلوک) */}
                  <div
                    className={`building-header status-${status}`}
                    onClick={() => toggleBuilding(row.building)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleBuilding(row.building);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="building-title">
                      <span className="building-caret">
                        {isOpen ? "▼" : "▶"}
                      </span>
                      🏢 {row.building}
                    </div>

                    <div className="building-header-right">
                      <span className="building-stats">
                        {row.taken} از {row.total}
                      </span>
                      <span className={`building-percent percent-${status}`}>
                        {percent}%
                        {status === "full" && " ●"}
                        {status === "warning" && " ⚠"}
                      </span>
                    </div>
                  </div>

                  {/* نوار پیشرفت */}
                  <div className="block-progress">
                    <div
                      className={`block-progress-fill fill-${status}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* محتوا (وقتی باز شد) — از دیتابیس */}
                  {isOpen && (
                    <div className="parts-container">
                      {renderPartColumn(row.building, PART_EAST, "شرقی")}
                      {renderPartColumn(row.building, PART_WEST, "غربی")}
                    </div>
                  )}
                </div>
              );
            })}

            {/* آمار کلی */}
            <div className="block-total-footer">
              <span>
                🏢 جمع کل: <strong>{totals.total}</strong> واحد
              </span>
              <span className="taken-cell">
                ✅ تخصیص‌یافته: <strong>{totals.taken}</strong>
              </span>
              <span className="free-cell">
                ⚪ آزاد: <strong>{totals.free}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}