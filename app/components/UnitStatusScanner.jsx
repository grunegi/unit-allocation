"use client";

import { useState } from "react";
import Qrscanner from "./Qrscanner";

const BUILDINGS = { A1: 40, A2: 40, A3: 40, C1: 40, C2: 40, C3: 40, B1: 22 };
const ALL_UNITS = Object.entries(BUILDINGS).flatMap(([building, count]) =>
  Array.from({ length: count }, (_, index) => `${building}-${index + 1}`),
);

export default function UnitStatusScanner({ assignments = {} }) {
  const [scanResult, setScanResult] = useState(null);

  function handleScan(code) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    const unitExists = ALL_UNITS.includes(normalizedCode);

    if (!unitExists) {
      setScanResult({
        ok: false,
        error: `کد «${normalizedCode}» در سیستم وجود ندارد.`,
      });
      return;
    }

    const isTaken = Boolean(assignments[normalizedCode]);

    setScanResult({
      ok: true,
      unit: normalizedCode,
      status: isTaken ? "taken" : "free",
    });
  }

  return (
    <div className="unit-status-scanner">
      <Qrscanner onScan={handleScan} onError={() => {}} />

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
                  این واحد هنوز به کسی تخصیص داده نشده است.
                </p>
              </>
            ) : (
              <>
                <div className="scan-icon">🔒</div>
                <h3>این واحد قبلاً تخصیص داده شده است</h3>
                <p className="scan-unit">{scanResult.unit}</p>
                <p className="scan-message">
                  برای اطلاعات بیشتر با مدیریت تماس بگیرید.
                </p>
              </>
            )
          ) : (
            <>
              <div className="scan-icon">❌</div>
              <h3>کد نامعتبر</h3>
              <p className="scan-message">{scanResult.error}</p>
            </>
          )}

          <button
            type="button"
            className="gray small"
            onClick={() => setScanResult(null)}
          >
            اسکن بعدی
          </button>
        </div>
      )}
    </div>
  );
}