"use client";

import UnitStatusScanner from "./UnitStatusScanner";

import { useRouter } from "next/navigation";
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
} from "../Js/actions";

const BUILDINGS = { A1: 40, A2: 40, A3: 40, C1: 40, C2: 40, C3: 40, B1: 22 };
const ALL_UNITS = Object.entries(BUILDINGS).flatMap(([building, count]) =>
  Array.from({ length: count }, (_, index) => `${building}-${index + 1}`),
);

const TABS = [
  ["select", "📋 انتخاب واحد"],
  ["filter", "🔍 فیلتر و جستجو"],
  ["people", "👥 اسامی افراد"],
  ["scan", "📷 اسکن بارکد"],
  ["print", "🖨 چاپ بارکدها"],
  ["data", "💾 داده‌ها"],
];

export default function UnitAllocationApp({ initialData }) {
  const router = useRouter();

  const [tab, setTab] = useState("select");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [qrCodes, setQrCodes] = useState([]);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrProgress, setQrProgress] = useState(0);
  const [people, setPeople] = useState(initialData.people || []);
  const [units, setUnits] = useState(initialData.units || []);
  const [assignments, setAssignments] = useState(initialData.assignments || {});
  const [personId, setPersonId] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [newName, setNewName] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNationalId, setNewNationalId] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [collapsedBuildings, setCollapsedBuildings] = useState({});

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
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");

  const [message, setMessage] = useState(
    initialData.ok ? "" : `خطای اتصال به دیتابیس: ${initialData.error}`,
  );

  useEffect(() => {
    setPeople(initialData.people || []);
    setUnits(initialData.units || []);
    setAssignments(initialData.assignments || {});
  }, [initialData]);

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

  const personUnitsMap = useMemo(() => {
    const map = {};
    for (const [code, a] of Object.entries(assignments)) {
      if (!a.personId) continue;
      if (!map[a.personId]) map[a.personId] = [];
      map[a.personId].push(code);
    }
    return map;
  }, [assignments]);

  function notify(text) {
    setMessage(text);
  }

  function login(event) {
    event.preventDefault();
    if (password === "5041") {
      setIsLoggedIn(true);
      setMessage("");
    } else {
      setMessage("❌ رمز عبور اشتباه است.");
      setPassword("");
    }
  }

  if (!isLoggedIn) {
    return (
      <main className="login-container">
        <section className="card login-card">
          <h1>🔐 ورود به سیستم</h1>
          <p>رمز عبور را وارد کنید</p>
          <form onSubmit={login}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="رمز عبور"
              inputMode="numeric"
              autoComplete="current-password"
              aria-label="رمز عبور"
              autoFocus
            />
            <button type="submit">ورود</button>
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
      notify("عملیات با موفقیت انجام شد.");
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
    if (!/^09\d{9}$/.test(newPhone)) {
      return notify("❌ شماره تماس باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
    }
    if (!newAddress.trim() || newAddress.trim().length < 5) {
      return notify("❌ آدرس باید حداقل ۵ حرف باشد.");
    }

    const formData = new FormData();
    formData.set("name", newName);
    formData.set("phone", newPhone);
    formData.set("national_id", newNationalId);
    formData.set("address", newAddress);

    runAction(
      () => addPersonAction(formData),
      () => {
        setNewName("");
        setNewPhone("");
        setNewNationalId("");
        setNewAddress("");
      },
    );
  }

  // ===== توابع ویرایش =====
  function openEditModal(person) {
    setEditModal(person);
    setEditName(person.name || "");
    setEditNationalId(person.national_id || "");
    setEditPhone(person.phone || "");
    setEditAddress(person.address || "");
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
    if (!/^09\d{9}$/.test(editPhone)) {
      return setEditError("شماره تماس باید با ۰۹ شروع شود و ۱۱ رقم باشد.");
    }
    if (!editAddress.trim() || editAddress.trim().length < 5) {
      return setEditError("آدرس باید حداقل ۵ حرف باشد.");
    }

    const formData = new FormData();
    formData.set("name", editName);
    formData.set("phone", editPhone);
    formData.set("national_id", editNationalId);
    formData.set("address", editAddress);

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
        ? `\nواحدهای او (${personUnits.join(", ")}) نیز آزاد می‌شوند.`
        : "";

    if (!window.confirm(`فرد «${person.name}» حذف شود؟${unitsText}`)) return;
    runAction(async () => {
      const released = await releaseUnitAction(person.id);
      if (!released.ok) return released;
      return deletePersonAction(person.id);
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
        "شماره تماس": h.person_phone || "",
        آدرس: h.person_address || "",
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
        { wch: 12 },
        { wch: 15 },
        { wch: 40 },
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
      "نام,تلفن,کد ملی,آدرس\n" +
      "علی رضایی,09123456789,1234567890,تهران، خیابان آزادی\n" +
      "مریم احمدی,09121111111,0987654321,اصفهان، خیابان چهارباغ\n";

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-people.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const payload = { people, units, assignments };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateQRCodes() {
    if (isGeneratingQR) return;

    setIsGeneratingQR(true);
    setQrProgress(0);
    setQrCodes([]);

    try {
      const qrModule = await import("qrcode");
      const QRCode = qrModule.default ?? qrModule;
      const generated = [];
      const batchSize = 20;

      for (let start = 0; start < ALL_UNITS.length; start += batchSize) {
        const batch = ALL_UNITS.slice(start, start + batchSize);
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
      notify(`ساخت ${generated.length} کد QR با موفقیت انجام شد.`);
    } catch (error) {
      console.error("QR generation failed:", error);
      notify(
        "ساخت QR کدها ناموفق بود. مطمئن شوید کتابخانه qrcode نصب شده است.",
      );
    } finally {
      setIsGeneratingQR(false);
    }
  }

  function printBarcodes() {
    if (!qrCodes.length) {
      notify("ابتدا روی «ساخت QR کدها» کلیک کنید.");
      return;
    }
    window.print();
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
        <h1>🏢 سیستم تخصیص واحد</h1>
        <p>
          واحدها: {ALL_UNITS.length} | تخصیص‌یافته: {takenCount} | آزاد:{" "}
          {ALL_UNITS.length - takenCount}
        </p>
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
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "select" && (
        <section className="card">
          <h2>ثبت تخصیص</h2>
          <label htmlFor="person">فرد</label>
          <select
            id="person"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">-- انتخاب کنید --</option>
            {people.map((p) => {
              const count = (personUnitsMap[p.id] || []).length;
              return (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {count > 0 ? ` (${count} واحد)` : ""}
                </option>
              );
            })}
          </select>
          <label htmlFor="unit">کد واحد (یا اسکن کنید)</label>
          <input
            id="unit"
            value={unitCode}
            onChange={(e) => setUnitCode(e.target.value.toUpperCase())}
            placeholder="مثلاً A1-15"
          />
          <div className="actions">
            <button disabled={busy} onClick={assign}>
              ✅ ثبت انتخاب
            </button>
            <button
              className="gray"
              onClick={() => {
                setPersonId("");
                setUnitCode("");
              }}
            >
              پاک کردن فرم
            </button>
          </div>

          <h2 className="section-title">واحدها</h2>

          {Object.keys(BUILDINGS).map((building) => {
            const buildingUnits = ALL_UNITS.filter((code) =>
              code.startsWith(`${building}-`),
            );
            const takenInBuilding = buildingUnits.filter(
              (code) => assignments[code],
            ).length;
            const isCollapsed = collapsedBuildings[building];

            return (
              <div className="building-section" key={building}>
                <button
                  type="button"
                  className="building-header"
                  onClick={() =>
                    setCollapsedBuildings((prev) => ({
                      ...prev,
                      [building]: !prev[building],
                    }))
                  }
                  aria-expanded={!isCollapsed}
                >
                  <span className="building-title">
                    <span className="building-caret">
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                    🏢 {building}
                  </span>
                  <span className="building-stats">
                    {takenInBuilding} از {buildingUnits.length} تخصیص‌یافته
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="unit-grid">
                    {buildingUnits.map((code) => (
                      <button
                        key={code}
                        className={`unit ${assignments[code] ? "taken" : ""}`}
                        onClick={() => setUnitCode(code)}
                      >
                        <strong>{code}</strong>
                        <small>{assignments[code]?.name || "آزاد"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
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
          <p className="stats">
            کل: {ALL_UNITS.length} | انتخاب‌شده: {takenCount} | آزاد:{" "}
            {ALL_UNITS.length - takenCount} | نتایج: {filteredUnits.length}
          </p>

          {/* گرید گروه‌بندی‌شده بر اساس ساختمان */}
          {(() => {
            if (!filteredUnits.length) {
              return <p className="stats">هیچ نتیجه‌ای پیدا نشد.</p>;
            }

            // گروه‌بندی نتایج بر اساس ساختمان
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

              return (
                <div className="building-section" key={building}>
                  <button
                    type="button"
                    className="building-header"
                    onClick={() =>
                      setCollapsedBuildings((prev) => ({
                        ...prev,
                        [collapseKey]: !prev[collapseKey],
                      }))
                    }
                    aria-expanded={!isCollapsed}
                  >
                    <span className="building-title">
                      <span className="building-caret">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                      🏢 {building}
                    </span>
                    <span className="building-stats">
                      {takenInBuilding} از {units.length} تخصیص‌یافته
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="unit-grid">
                      {units.map((code) => (
                        <div
                          className={`unit ${assignments[code] ? "taken" : ""}`}
                          key={code}
                        >
                          <strong>{code}</strong>
                          <small>{assignments[code]?.name || "آزاد"}</small>
                        </div>
                      ))}
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
              <label htmlFor="new-national-id">کد ملی</label>
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
              <label htmlFor="new-phone">شماره تماس</label>
              <input
                id="new-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="۰۹xxxxxxxxx"
                inputMode="tel"
              />
            </div>

            <div className="form-row">
              <label htmlFor="new-address">آدرس</label>
              <textarea
                id="new-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="آدرس کامل"
                rows={2}
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
            placeholder="🔍 جستجو با نام، کد ملی، تلفن یا آدرس..."
            className="search-input"
          />

          {(() => {
            const q = peopleSearch.toLowerCase().trim();
            const filteredPeople = people.filter((p) => {
              if (!q) return true;
              return (
                p.name?.toLowerCase().includes(q) ||
                p.national_id?.includes(q) ||
                p.phone?.includes(q) ||
                p.address?.toLowerCase().includes(q)
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
                                  if (
                                    window.confirm(
                                      `واحد «${unit}» از «${p.name}» آزاد شود؟`,
                                    )
                                  ) {
                                    runAction(() =>
                                      releaseSingleUnitAction(unit),
                                    );
                                  }
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
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.address && <span>📍 {p.address}</span>}
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
        <section className="card">
          <h2>📷 اسکن و بررسی واحد</h2>
          <p>
            می‌توانید QR را اسکن کنید، کد را تایپ کنید، یا از لیست انتخاب کنید.
          </p>
          <UnitStatusScanner
            assignments={assignments}
            people={people}
            showPersonInfo={true}
          />
        </section>
      )}
      {tab === "print" && (
        <section className="card">
          <h2>🖨 ساخت و چاپ QR کد واحدها</h2>

          <div className="warning-box">
            <strong>⚠️ توجه مهم</strong>
            <p>
              محتوای هر QR کد <strong>ثابت</strong> است و به کد واحد مربوط
              می‌شود (مثلاً <code>A1-15</code>).
            </p>
            <p>
              QR ها هر بار <strong>عیناً یکسان</strong> ساخته می‌شوند. بنابراین:
            </p>
            <ul>
              <li>
                ✅ کافی است <strong>فقط یک بار</strong> چاپ کنید و به واحدها
                بزنید.
              </li>
              <li>❌ ساخت دوباره نیاز به چاپ و جایگزینی فیزیکی ندارد.</li>
              <li>💡 QR های چاپ‌شده و QR های جدید، با هم سازگارند.</li>
            </ul>
          </div>

          <p>
            با زدن دکمه ساخت، برای هر واحد یک QR کد ساخته می‌شود. محتوای هر QR
            کد، کد همان واحد است؛ مثلاً <strong>A1-15</strong>.
          </p>

          <div className="actions qr-actions">
            <button onClick={generateQRCodes} disabled={isGeneratingQR}>
              {isGeneratingQR
                ? `در حال ساخت... ${qrProgress} از ${ALL_UNITS.length}`
                : "ساخت QR کدها"}
            </button>
            <button
              className="gray"
              onClick={printBarcodes}
              disabled={!qrCodes.length || isGeneratingQR}
            >
              چاپ QR کدها
            </button>
          </div>

          {isGeneratingQR && (
            <p className="stats" role="status">
              ساخت {qrProgress} از {ALL_UNITS.length} کد...
            </p>
          )}

          {!isGeneratingQR && qrCodes.length > 0 && (
            <p className="stats">{qrCodes.length} کد QR آماده چاپ است.</p>
          )}

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
        </section>
      )}
      {tab === "data" && (
        <section className="card">
          <h2>💾 پشتیبان‌گیری</h2>
          <div className="actions">
            <button onClick={exportJSON}>📤 خروجی JSON</button>
            <button onClick={exportCSV}>📄 خروجی به صورت Excel</button>
          </div>
          <button
            className="danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm("همه داده‌ها حذف شوند؟") &&
                window.confirm("این عملیات برگشت‌پذیر نیست. مطمئنید؟")
              )
                runAction(() => resetAllAction());
            }}
          >
            🗑 پاک کردن همه داده‌ها
          </button>
        </section>
      )}
      {/* ===== Modal ورود گروهی ===== */}
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
                    هر خط یک نفر با فرمت: <code>نام, تلفن, کد ملی, آدرس</code>
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={`علی رضایی, 09123456789, 1234567890, تهران، خیابان آزادی\nمریم احمدی, 09121111111, 0987654321, اصفهان، خیابان چهارباغ`}
                    rows={10}
                    dir="rtl"
                  />
                </>
              ) : (
                <>
                  <p className="help-text">
                    فایل CSV با فرمت: <code>نام, تلفن, کد ملی, آدرس</code>
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
      {/* ===== Modal ویرایش فرد ===== */}
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
                  <label htmlFor="edit-national-id">کد ملی</label>
                  <input
                    id="edit-national-id"
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="edit-phone">شماره تماس</label>
                  <input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    inputMode="tel"
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="edit-address">آدرس</label>
                  <textarea
                    id="edit-address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={2}
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
      )}{" "}
    </main>
  );
}
