"use client";

import "../css/clearbtn.css";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getRecentLogs } from "../Js/actions";

export default function DataTab({
  onExportJSON,
  onExportCSV,
  onResetAll,
  busy,
  logsClearedAt,
  setLogsClearedAt,
}) {
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [logsAutoRefresh, setLogsAutoRefresh] = useState(true);
  const [logsFilter, setLogsFilter] = useState("all");

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const result = await getRecentLogs(50);
      if (result.ok) {
        setLogs(result.data);
      } else {
        setLogsError(result.error);
      }
    } catch (error) {
      setLogsError(error.message);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!logsAutoRefresh) return;
    const interval = setInterval(loadLogs, 20000);
    return () => clearInterval(interval);
  }, [logsAutoRefresh, loadLogs]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (logsClearedAt) {
      result = result.filter(
        (log) => new Date(log.created_at) > new Date(logsClearedAt),
      );
    }

    if (logsFilter !== "all") {
      result = result.filter((log) => {
        const info = getActionInfo(log.action);
        return info.color === logsFilter;
      });
    }

    return result;
  }, [logs, logsFilter, logsClearedAt]);

  function clearLogsDisplay() {
    setLogsClearedAt(new Date().toISOString());
  }

  return (
    <section className="card">
      <h2>💾 گزارش‌گیری و پشتیبان</h2>

      {/* خروجی‌ها */}
      <div className="data-section">
        <h3 className="data-section-title">📤 خروجی داده‌ها</h3>
        <div className="actions">
          <button onClick={onExportJSON}>📤 خروجی JSON</button>
          <button onClick={onExportCSV}>📄 خروجی Excel (تاریخچه)</button>
        </div>
      </div>

      {/* لاگ‌ها */}
      <div className="data-section">
        <div className="logs-header">
          <h3 className="data-section-title">
            📜 لاگ‌های اخیر
            {logsAutoRefresh && (
              <span className="live-indicator">
                <span className="live-dot" />
                زنده
              </span>
            )}
            {logsClearedAt && (
              <span
                className="live-indicator"
                style={{
                  color: "#fcd34d",
                  background: "rgba(245, 158, 11, 0.12)",
                  borderColor: "rgba(245, 158, 11, 0.3)",
                }}
              >
                🧹 فقط لاگ‌های جدید
              </span>
            )}
          </h3>

          <div className="logs-controls">
            <select
              value={logsFilter}
              onChange={(e) => setLogsFilter(e.target.value)}
            >
              <option value="all">همه عملیات</option>
              <option value="success">تخصیص واحد</option>
              <option value="warning">آزادسازی</option>
            </select>

            <button
              type="button"
              className="gray small"
              onClick={() => setLogsAutoRefresh((prev) => !prev)}
            >
              {logsAutoRefresh ? "⏸" : "▶️"}
            </button>

            <button
              type="button"
              className="gray small"
              onClick={loadLogs}
              disabled={logsLoading}
            >
              {logsLoading ? "⏳" : "🔄"}
            </button>

            <button
              type="button"
              className="gray small"
              onClick={clearLogsDisplay}
              disabled={!filteredLogs.length}
              title="پاک کردن نمایش (لاگ‌ها در دیتابیس می‌مونن)"
            >
              🧹
            </button>
          </div>
        </div>

        {logsError && (
          <p className="modal-error" role="alert">
            ❌ خطا: {logsError}
          </p>
        )}

        {logsLoading && logs.length === 0 ? (
          <p className="stats">⏳ در حال بارگذاری...</p>
        ) : logsClearedAt && filteredLogs.length === 0 ? (
          <p className="stats">
            🧹 لاگ‌های قبلی پاک شدند. لاگ جدیدی ثبت نشده است.
            <br />
            <small style={{ color: "#94a3b8" }}>
              برای مشاهده‌ی لاگ‌های قبلی، از «📄 خروجی Excel» استفاده کنید.
            </small>
          </p>
        ) : logs.length === 0 ? (
          <p className="stats">هیچ لاگی برای نمایش وجود ندارد.</p>
        ) : filteredLogs.length === 0 ? (
          <p className="stats">هیچ لاگی با این فیلتر پیدا نشد.</p>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log) => {
              const info = getActionInfo(log.action);
              return (
                <div className={`log-item log-item-${info.color}`} key={log.id}>
                  <div className="log-icon">{info.icon}</div>
                  <div className="log-content">
                    <div className="log-action">{info.label}</div>
                    <div className="log-details">
                      {log.person_name && (
                        <span className="log-person">{log.person_name}</span>
                      )}
                      {log.person_national_id && (
                        <span className="log-national">
                          {log.person_national_id}
                        </span>
                      )}
                      {log.unit_code && (
                        <span className="log-unit">{log.unit_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="log-time">
                    {formatLogDate(log.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredLogs.length > 0 && (
          <p className="logs-footer">
            نمایش {filteredLogs.length} لاگ
            {logsClearedAt
              ? " (بعد از پاک کردن)"
              : ` از ${logs.length} لاگ آخر`}
          </p>
        )}
      </div>

      {/* پاک کردن */}
      <div className="data-section">
        <h3 className="data-section-title">⚠️ عملیات خطرناک</h3>
        <button className="danger" disabled={busy} onClick={onResetAll}>
          🗑 پاک کردن همه داده‌ها
        </button>
      </div>
    </section>
  );
}

function getActionInfo(action) {
  const actionMap = {
    "تخصیص واحد": { icon: "✅", label: "تخصیص واحد", color: "success" },
    "آزاد سازی واحد": { icon: "🔓", label: "آزادسازی واحد", color: "warning" },
    "آزادسازی واحد": { icon: "🔓", label: "آزادسازی واحد", color: "warning" },
  };
  return (
    actionMap[action] || {
      icon: "📝",
      label: action || "نامشخص",
      color: "default",
    }
  );
}

function formatLogDate(dateString) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleString("fa-IR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}