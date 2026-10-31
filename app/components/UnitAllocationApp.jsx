"use client";

import DashboardPlan from "./DashboardPlan";
import DataTab from "./DataTab";
import ScanPrintTab from "./ScanPrintTab";
import PartColumn from "./PartColumn";
import ConfirmModal from "./ConfirmModal";
import DangerConfirm from "./DangerConfirm";
import SelectTab from "./SelectTab";
import { useAppData } from "../hooks/useAppData";
import { useAuth } from "./AuthProvider";

import { useRouter } from "next/navigation";
import { BUILDINGS, ALL_UNITS } from "../../lib/supabase/constants";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  addPersonAction,
  assignUnitAction,
  deletePersonAction,
  importPeopleAction,
  releaseUnitAction,
  resetAllAction,
  releaseSingleUnitAction,
  getAssignmentsHistory,
  updatePersonAction,
  getDashboardStats,
  exportFullBackup,
} from "../Js/actions";

export default function UnitAllocationApp({ initialData }) {
  const {
    people,
    setPeople,
    units,
    setUnits,
    assignments,
    setAssignments,
    dashboardStats,
    unitsMap,
    personUnitsMap,
  } = useAppData(initialData);

  const router = useRouter();
  const {
    isLoggedIn,
    accessLevel,
    adminInfo,
    sessionLoading,
    login: authLogin,
    logout: authLogout,
  } = useAuth();

  const tabs = [
    ["dashboard", "📊 داشبورد و پلان"],
    ["select", "📋 انتخاب واحد"],
    ["filter", "🔍 فیلتر و جستجو"],
    ["people", "👥 ثبت متقاضی"],
    ["scan", "📷 اسکن و چاپ QR"],
  ];

  if (accessLevel === "full") {
    tabs.push(["data", "💾 گزارش گیری"]);
  }

  const [tab, setTab] = useState("dashboard");
  const [password, setPassword] = useState("");
  const [personId, setPersonId] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [newName, setNewName] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [newNationalId, setNewNationalId] = useState("");
  const [newScore, setNewScore] = useState("");
  const [collapsedBuildings, setCollapsedBuildings] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [nationalId, setNationalId] = useState("");

  const [logsClearedAt, setLogsClearedAt] = useState(null);

  const [peopleSearch, setPeopleSearch] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState("text");
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState("");

  // ===== state ویرایش =====
  const [editModal, setEditModal] = useState(null);
  const [editName, setEditName] = useState("");
  const [editNationalId, setEditNationalId] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editError, setEditError] = useState("");

  const [message, setMessage] = useState(
    initialData.ok ? "" : `خطای اتصال به دیتابیس: ${initialData.error}`,
  );

  useEffect(() => {
    if (tab === "data" && accessLevel !== "full") {
      setTab("dashboard");
    }
  }, [tab, accessLevel]);

  const [busy, startTransition] = useTransition();

  const takenCount = Object.keys(assignments).length;
  const filteredUnits = useMemo(
    () =>
      ALL_UNITS.filter((code) => {
        if (filterBuilding !== "all" && !code.startsWith(`${filterBuilding}-`))
          return false;
        const taken = Boolean(assignments[code]);
        if (filterStatus === "taken" && !taken) return false;
        if (filterStatus === "free" && taken) return false;
        if (search) {
          const personName = (assignments[code]?.name || "").toLowerCase();
          if (
            !code.toLowerCase().includes(search.toLowerCase()) &&
            !personName.includes(search.toLowerCase())
          )
            return false;
        }
        return true;
      }),
    [filterBuilding, filterStatus, search, assignments],
  );

  function notify(text) {
    setMessage(text);
  }

  async function login(event) {
    event.preventDefault();
    setMessage("");

    if (!nationalId.trim() || !password.trim()) {
      setMessage("❌ کد ملی و رمز عبور را وارد کنید.");
      return;
    }

    const result = await authLogin(nationalId, password);
    if (!result.ok) {
      setMessage("❌ " + result.error);
      setPassword("");
      return;
    }

    setMessage("");
    setPassword("");
    setNationalId("");
  }

  if (sessionLoading) {
    return (
      <main className="login-container">
        <section className="card login-card">
          <h1>⏳ در حال بارگذاری...</h1>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="login-container">
        <section className="card login-card">
          <h1>🔐 ورود به سیستم</h1>
          <p>کد ملی و رمز عبور را وارد کنید</p>
          <form onSubmit={login}>
            <input
              type="text"
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              placeholder="کد ملی"
              inputMode="numeric"
              autoComplete="off"
              aria-label="کد ملی"
              autoFocus
              maxLength={10}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="رمز عبور"
              inputMode="numeric"
              autoComplete="current-password"
              aria-label="رمز عبور"
            />
            <div className="login-actions">
              <button
                type="submit"
                className="login-btn"
                disabled={sessionLoading}
              >
                {sessionLoading ? "در حال بررسی..." : "ورود"}
              </button>
            </div>
          </form>
          {message && (
            <p className="login-message" role="alert">
              {message}
            </p>
          )}
        </section>
      </main>
    );
  }

  function refreshFromServer() {
    router.refresh();
  }

  function runAction(action, onSuccess) {
    startTransition(async () => {
      const result = await action();
      if (!result?.ok) {
        notify(result?.error || "عملیات ناموفق بود.");
        return;
      }
      notify(result?.message || "عملیات با موفقیت انجام شد.");
      onSuccess?.(result);
      refreshFromServer();
    });
  }

  function addPerson(event) {
    event.preventDefault();

    if (!newName.trim() || newName.trim().length < 3) {
      return notify("❌ نام باید حداقل ۳ حرف باشد.");
    }
    if (!/^\d{10}$/.test(newNationalId)) {
      return notify("❌ کد ملی باید ۱۰ رقم عددی باشد.");
    }

    const formData = new FormData();
    formData.set("name", newName);
    formData.set("national_id", newNationalId);
    formData.set("score", newScore || "0");

    runAction(
      () => addPersonAction(formData),
      () => {
        setNewName("");
        setNewNationalId("");
        setNewScore("");
      },
    );
  }

  function openEditModal(person) {
    setEditModal(person);
    setEditName(person.name || "");
    setEditNationalId(person.national_id || "");
    setEditScore(person.score ?? "");
    setEditError("");
  }

  function closeEditModal() {
    setEditModal(null);
    setEditError("");
  }

  function submitEdit(event) {
    event.preventDefault();
    setEditError("");

    if (!editName.trim() || editName.trim().length < 3) {
      return setEditError("نام باید حداقل ۳ حرف باشد.");
    }
    if (!/^\d{10}$/.test(editNationalId)) {
      return setEditError("کد ملی باید ۱۰ رقم عددی باشد.");
    }

    const formData = new FormData();
    formData.set("name", editName);
    formData.set("national_id", editNationalId);
    formData.set("score", editScore || "0");

    runAction(
      () => updatePersonAction(editModal.id, formData),
      () => closeEditModal(),
    );
  }

  function assign() {
    if (!personId) return notify("ابتدا فرد را انتخاب کنید.");
    if (!unitCode.trim()) return notify("کد واحد را وارد کنید.");
    runAction(() => assignUnitAction(personId, unitCode));
  }

  function removePerson(person) {
    const personUnits = personUnitsMap[person.id] || [];
    const unitsText =
      personUnits.length > 0
        ? ` واحدهای او (${personUnits.join("، ")}) نیز آزاد می‌شوند.`
        : "";

    setConfirmDialog({
      title: "حذف فرد",
      message: `آیا از حذف «${person.name}» مطمئنید؟${unitsText}`,
      danger: true,
      confirmText: "حذف",
      onConfirm: () => {
        runAction(async () => {
          const released = await releaseUnitAction(person.id);
          if (!released.ok) return released;
          return deletePersonAction(person.id);
        });
      },
    });
  }

  async function exportCSV() {
    const result = await getAssignmentsHistory();

    if (!result.ok) {
      notify("❌ خطا در دریافت تاریخچه: " + result.error);
      return;
    }

    if (!result.data.length) {
      notify("❌ تاریخچه خالیه.");
      return;
    }

    try {
      const XLSX = await import("xlsx");

      const rows = result.data.map((h, i) => ({
        ردیف: i + 1,
        تاریخ: new Date(h.assigned_at).toLocaleString("fa-IR"),
        عملیات: h.action || "",
        "کد واحد": h.unit_code || "",
        ساختمان: h.building || "",
        "شماره واحد": h.unit_number ?? "",
        "نام و نام خانوادگی": h.person_name || "",
        "کد ملی": h.person_national_id || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "تاریخچه");

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 25 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 25 },
        { wch: 15 },
      ];

      XLSX.writeFile(workbook, `assignments-history-${Date.now()}.xlsx`);

      notify(`✅ ${result.data.length} رکورد در فایل اکسل ذخیره شد.`);
    } catch (error) {
      console.error("Excel export failed:", error);
      notify("❌ خطا در ساخت فایل اکسل: " + error.message);
    }
  }

  function downloadSampleCSV() {
    const csv =
      "\uFEFF" +
      "نام,کد ملی,امتیاز\n" +
      "علی رضایی,1234567890,950\n" +
      "مریم احمدی,0987654321,870\n" +
      "حسن کریمی,1122334455,920\n";

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-people.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportJSON() {
    const result = await exportFullBackup();
    if (!result.ok) {
      notify("❌ خطا در بکاپ: " + result.error);
      return;
    }

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    notify(
      `✅ بکاپ کامل ذخیره شد (${result.data.meta.total_people} نفر، ${result.data.meta.total_units} واحد، ${result.data.meta.total_history} لاگ).`,
    );
  }

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function parseImportText(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const firstLine = lines[0]?.toLowerCase() || "";
    const dataLines =
      firstLine.includes("نام") && firstLine.includes("کد ملی")
        ? lines.slice(1)
        : lines;

    return dataLines.map(parseCSVLine);
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportError("فقط فایل CSV مجاز است.");
      return;
    }

    if (file.size > 1_000_000) {
      setImportError("فایل بیش از ۱ مگابایت است.");
      return;
    }

    setImportFile(file);
    setImportError("");
  }

  function submitImport() {
    setImportError("");

    if (importTab === "text") {
      if (!importText.trim()) {
        setImportError("متنی وارد نکرده‌اید.");
        return;
      }
      const rows = parseImportText(importText);
      if (!rows.length) {
        setImportError("خط معتبری پیدا نشد.");
        return;
      }
      runAction(
        () => importPeopleAction(rows),
        (result) => {
          setShowImportModal(false);
          setImportText("");
          notify(
            `✅ ${result.count} نفر اضافه شد${result.skipped ? `، ${result.skipped} نفر رد شد` : ""}.`,
          );
        },
      );
    } else {
      if (!importFile) {
        setImportError("فایلی انتخاب نکرده‌اید.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = String(e.target?.result || "").replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (!lines.length) {
          setImportError("فایل خالیه.");
          return;
        }
        const firstLine = lines[0].toLowerCase();
        const dataLines = firstLine.includes("نام") ? lines.slice(1) : lines;
        if (!dataLines.length) {
          setImportError("فقط هدر توی فایل هست.");
          return;
        }
        const rows = dataLines.map(parseCSVLine);
        runAction(
          () => importPeopleAction(rows),
          (result) => {
            setShowImportModal(false);
            setImportFile(null);
            notify(
              `✅ ${result.count} نفر اضافه شد${result.skipped ? `، ${result.skipped} نفر رد شد` : ""}.`,
            );
          },
        );
      };
      reader.onerror = () => setImportError("خطا در خواندن فایل.");
      reader.readAsText(importFile, "UTF-8");
    }
  }

  return (
    <main className="container">
      <header className="card">
        <div className="header-top">
          <h1>🏢 سیستم تخصیص واحد (پنل مدیریت سایت)</h1>

          <div className="header-actions">
            {accessLevel === "full" && (
              <Link
                href="/SuperAdmin"
                className="admin-manage-btn"
                title="مدیریت ادمین‌ها"
              >
                👥 مدیریت ادمین‌ها
              </Link>
            )}
            <button
              type="button"
              className="logout-btn"
              onClick={async () => {
                await authLogout();
              }}
              title="خروج"
            >
              🚪 خروج
            </button>
          </div>
        </div>

        <div className="dashboard-stats-compact">
          <div className="stat-compact stat-compact-total">
            <span className="stat-compact-icon">🏢</span>
            <span className="stat-compact-label">کل واحدها</span>
            <span className="stat-compact-value">{ALL_UNITS.length}</span>
          </div>
          <div className="stat-compact stat-compact-taken">
            <span className="stat-compact-icon">✅</span>
            <span className="stat-compact-label">تخصیص‌یافته</span>
            <span className="stat-compact-value">{takenCount}</span>
          </div>
          <div className="stat-compact stat-compact-free">
            <span className="stat-compact-icon">⚪</span>
            <span className="stat-compact-label">آزاد</span>
            <span className="stat-compact-value">
              {ALL_UNITS.length - takenCount}
            </span>
          </div>
          <div className="stat-compact stat-compact-people">
            <span className="stat-compact-icon">👥</span>
            <span className="stat-compact-label">متقاضیان</span>
            <span className="stat-compact-value">{people.length}</span>
          </div>
        </div>
      </header>
      {message && (
        <div className="notice" role="status">
          {message}
          <button className="small gray" onClick={() => setMessage("")}>
            بستن
          </button>
        </div>
      )}
      <nav className="tabs" aria-label="بخش‌های برنامه">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && (
        <section className="card">
          <DashboardPlan
            stats={dashboardStats}
            onGoToBlock={(block) => {
              const allCollapsed = {};
              Object.keys(BUILDINGS).forEach((b) => {
                allCollapsed[b] = b !== block;
              });
              setCollapsedBuildings(allCollapsed);
              setTab("select");

              setTimeout(() => {
                const el = document.getElementById(`building-${block}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }, 150);
            }}
          />
        </section>
      )}

      {tab === "select" && (
        <SelectTab
          people={people}
          personId={personId}
          setPersonId={setPersonId}
          unitCode={unitCode}
          setUnitCode={setUnitCode}
          personUnitsMap={personUnitsMap}
          assignments={assignments}
          unitsMap={unitsMap}
          collapsedBuildings={collapsedBuildings}
          setCollapsedBuildings={setCollapsedBuildings}
          busy={busy}
          onAssign={assign}
        />
      )}

      {tab === "filter" && (
        <section className="card">
          <h2>🔍 جستجو و فیلتر</h2>
          <div className="row">
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
            >
              <option value="all">همه بلوک‌ها</option>
              {Object.keys(BUILDINGS).map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="taken">انتخاب‌شده</option>
              <option value="free">آزاد</option>
            </select>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کد واحد یا نام ساکن..."
            className="search-input"
          />

          {(() => {
            if (!filteredUnits.length) {
              return <p className="stats">هیچ نتیجه‌ای پیدا نشد.</p>;
            }

            const grouped = {};
            for (const code of filteredUnits) {
              const building = code.split("-")[0];
              if (!grouped[building]) grouped[building] = [];
              grouped[building].push(code);
            }

            return Object.entries(grouped).map(([building, units]) => {
              const takenInBuilding = units.filter(
                (code) => assignments[code],
              ).length;
              const collapseKey = `filter-${building}`;
              const isCollapsed = collapsedBuildings[collapseKey];

              const rightPart = units.filter(
                (code) => unitsMap[code]?.part === "راست",
              );
              const leftPart = units.filter(
                (code) => unitsMap[code]?.part === "چپ",
              );

              return (
                <div className="building-section" key={building}>
                  <div className="building-header">
                    <div
                      className="building-title"
                      onClick={() =>
                        setCollapsedBuildings((prev) => ({
                          ...prev,
                          [collapseKey]: !prev[collapseKey],
                        }))
                      }
                      style={{ cursor: "pointer", flex: 1 }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setCollapsedBuildings((prev) => ({
                            ...prev,
                            [collapseKey]: !prev[collapseKey],
                          }));
                        }
                      }}
                    >
                      <span className="building-caret">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                      🏢 {building}
                    </div>
                    <span className="building-stats">
                      {takenInBuilding} از {units.length} تخصیص‌یافته
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="parts-container">
                      <PartColumn
                        partSide="راست"
                        partName="شرقی"
                        partCodes={rightPart}
                        assignments={assignments}
                        unitsMap={unitsMap}
                        onSelectUnit={setUnitCode}
                      />
                      <PartColumn
                        partSide="چپ"
                        partName="غربی"
                        partCodes={leftPart}
                        assignments={assignments}
                        unitsMap={unitsMap}
                        onSelectUnit={setUnitCode}
                      />
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </section>
      )}
      {tab === "people" && (
        <section className="card">
          <h2>افزودن فرد</h2>
          <form onSubmit={addPerson} className="person-form">
            <div className="form-row">
              <label htmlFor="new-name">نام و نام خانوادگی *</label>
              <input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً علی رضایی"
              />
            </div>

            <div className="form-row">
              <label htmlFor="new-national-id">کد ملی *</label>
              <input
                id="new-national-id"
                value={newNationalId}
                onChange={(e) => setNewNationalId(e.target.value)}
                placeholder="۱۰ رقم"
                inputMode="numeric"
                maxLength={10}
              />
            </div>

            <div className="form-row">
              <label htmlFor="new-score">امتیاز *</label>
              <input
                id="new-score"
                type="number"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="مثلاً 950"
                inputMode="numeric"
              />
            </div>

            <div className="actions">
              <button disabled={busy} type="submit">
                ➕ افزودن
              </button>
              <button
                type="button"
                className="gray"
                onClick={() => {
                  setShowImportModal(true);
                  setImportError("");
                  setImportTab("text");
                }}
              >
                📥 ورود گروهی
              </button>
            </div>
          </form>

          <h2 className="section-title">لیست افراد ({people.length})</h2>

          <input
            value={peopleSearch}
            onChange={(e) => setPeopleSearch(e.target.value)}
            placeholder="🔍 جستجو با نام یا کد ملی..."
            className="search-input"
          />

          {(() => {
            const q = peopleSearch.toLowerCase().trim();
            const filteredPeople = people.filter((p) => {
              if (!q) return true;
              return (
                p.name?.toLowerCase().includes(q) || p.national_id?.includes(q)
              );
            });

            if (!filteredPeople.length) {
              return (
                <p className="stats">
                  {q ? "هیچ فردی با این جستجو پیدا نشد." : "هیچ فردی ثبت نشده."}
                </p>
              );
            }

            return filteredPeople.map((p) => {
              const originalIndex = people.findIndex((x) => x.id === p.id);
              const personUnits = personUnitsMap[p.id] || [];

              return (
                <div className="person-item" key={p.id}>
                  <div className="person-info">
                    <strong>
                      {originalIndex + 1}. {p.name}
                      {personUnits.length > 0 && (
                        <span className="person-units">
                          {personUnits.map((unit) => (
                            <span className="unit-chip" key={unit}>
                              🏠 {unit}
                              <button
                                type="button"
                                className="unit-chip-remove"
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDialog({
                                    title: "🔓 آزادسازی واحد",
                                    message: `آیا واحد «${unit}» از «${p.name}» آزاد شود؟`,
                                    danger: false,
                                    confirmText: "🔓 آزادسازی",
                                    onConfirm: () => {
                                      runAction(() =>
                                        releaseSingleUnitAction(unit),
                                      );
                                    },
                                  });
                                }}
                                title="آزادسازی این واحد"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </span>
                      )}
                    </strong>
                    <div className="person-meta">
                      {p.national_id && <span>🆔 {p.national_id}</span>}
                      {p.score != null && <span>⭐ امتیاز: {p.score}</span>}
                    </div>
                  </div>
                  <div className="person-actions">
                    <button
                      className="gray small"
                      disabled={busy}
                      onClick={() => openEditModal(p)}
                      title="ویرایش اطلاعات"
                    >
                      ✏️
                    </button>
                    <button
                      className="danger small"
                      disabled={busy}
                      onClick={() => removePerson(p)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </section>
      )}

      {tab === "scan" && (
        <ScanPrintTab assignments={assignments} people={people} />
      )}

      {tab === "data" && accessLevel === "full" && (
        <DataTab
          onExportJSON={exportJSON}
          onExportCSV={exportCSV}
          onResetAll={() => setShowResetConfirm(true)}
          busy={busy}
          logsClearedAt={logsClearedAt}
          setLogsClearedAt={setLogsClearedAt}
        />
      )}
      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowImportModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 ورود گروهی افراد</h2>
              <button
                className="modal-close"
                onClick={() => setShowImportModal(false)}
                aria-label="بستن"
              >
                ×
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={importTab === "text" ? "active" : ""}
                onClick={() => {
                  setImportTab("text");
                  setImportError("");
                }}
              >
                ✏️ متن دستی
              </button>
              <button
                className={importTab === "file" ? "active" : ""}
                onClick={() => {
                  setImportTab("file");
                  setImportError("");
                }}
              >
                📄 فایل CSV
              </button>
            </div>

            <div className="modal-body">
              {importTab === "text" ? (
                <>
                  <p className="help-text">
                    هر خط یک نفر با فرمت: <code>نام, کد ملی, امتیاز</code>
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`علی رضایی, 1234567890, 950\nمریم احمدی, 0987654321, 870\nحسن کریمی, 1122334455, 920`}
                    rows={10}
                    dir="rtl"
                  />
                </>
              ) : (
                <>
                  <p className="help-text">
                    فایل CSV با فرمت: <code>نام, کد ملی, امتیاز</code>
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportFile}
                  />
                  {importFile && (
                    <p className="file-info">
                      📎 {importFile.name} (
                      {(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  <button
                    type="button"
                    className="gray small"
                    onClick={downloadSampleCSV}
                  >
                    📄 دانلود فایل نمونه
                  </button>
                </>
              )}

              {importError && (
                <p className="modal-error" role="alert">
                  ❌ {importError}
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="gray"
                onClick={() => setShowImportModal(false)}
              >
                انصراف
              </button>
              <button onClick={submitImport} disabled={busy}>
                {busy ? "در حال ثبت..." : "✅ ثبت"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ ویرایش فرد</h2>
              <button
                className="modal-close"
                onClick={closeEditModal}
                aria-label="بستن"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitEdit}>
              <div className="modal-body">
                <div className="form-row">
                  <label htmlFor="edit-name">نام و نام خانوادگی *</label>
                  <input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="edit-national-id">کد ملی *</label>
                  <input
                    id="edit-national-id"
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="edit-score">امتیاز *</label>
                  <input
                    id="edit-score"
                    type="number"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    inputMode="numeric"
                  />
                </div>

                {editError && (
                  <p className="modal-error" role="alert">
                    ❌ {editError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="gray" onClick={closeEditModal}>
                  انصراف
                </button>
                <button type="submit" disabled={busy}>
                  {busy ? "در حال ذخیره..." : "✅ ذخیره"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        danger={confirmDialog?.danger}
        confirmText={confirmDialog?.confirmText}
        onConfirm={() => {
          const cb = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          cb?.();
        }}
        onCancel={() => setConfirmDialog(null)}
      />

      <DangerConfirm
        open={showResetConfirm}
        title="🗑️ پاک کردن همه داده‌ها"
        message={`تمام افراد (${people.length} نفر)، تمام تخصیص‌ها (${takenCount} واحد) و تمام تاریخچه پاک می‌شوند.`}
        warning="این عملیات برگشت‌پذیر نیست. اگر بکاپ نگرفته‌اید، الان آخرین فرصت شماست."
        confirmText="DELETE"
        confirmLabel="🗑️ حذف همه داده‌ها"
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false);
          runAction(() => resetAllAction());
        }}
      />
    </main>
  );
}
