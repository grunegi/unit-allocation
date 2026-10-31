
"use client";

import "../css/assignmentmodal.css";

import { useEffect, useMemo, useState } from "react";

export default function AssignmentModal({
  people = [],
  unitCode,
  busy = false,
  onClose,
  onAssign,
}) {
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);

  // بستن پنجره با کلید Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !busy) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, busy]);

  // جست‌وجو بر اساس نام یا کد ملی
  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return [];

    return people.filter((person) => {
      const name = String(person.name || "").toLowerCase();
      const nationalId = String(person.national_id || "");

      return name.includes(query) || nationalId.includes(query);
    });
  }, [people, search]);

  function handleAssign() {
    if (!selectedPerson || busy) return;

    onAssign(selectedPerson.id, unitCode);
  }

  return (
    <div
      className="assignment-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        className="assignment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
      >
        <div className="assignment-modal-header">
          <div>
            <h2 id="assignment-modal-title">تخصیص واحد</h2>
            <p>انتخاب شخص برای تخصیص واحد موردنظر</p>
          </div>

          <button
            type="button"
            className="assignment-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن پنجره"
          >
            ×
          </button>
        </div>

        <div className="assignment-unit-info">
          <span>واحد انتخاب‌شده</span>
          <strong>{unitCode}</strong>
        </div>

        <div className="assignment-search">
          <label htmlFor="assignment-person-search">
            جست‌وجوی شخص
          </label>

          <input
            id="assignment-person-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedPerson(null);
            }}
            placeholder="نام یا کد ملی شخص را وارد کنید..."
            autoFocus
            disabled={busy}
          />

          <small>
            جست‌وجو بر اساس نام و کد ملی انجام می‌شود.
          </small>
        </div>

        <div className="assignment-results">
          {!search.trim() ? (
            <div className="assignment-empty">
              <span>🔎</span>
              <p>برای پیدا کردن شخص، نام یا کد ملی را وارد کنید.</p>
            </div>
          ) : filteredPeople.length === 0 ? (
            <div className="assignment-empty">
              <span>⚠️</span>
              <p>شخصی با این مشخصات پیدا نشد.</p>
            </div>
          ) : (
            <>
              <div className="assignment-results-title">
                {filteredPeople.length} نتیجه پیدا شد
              </div>

              {filteredPeople.map((person) => {
                const isSelected = selectedPerson?.id === person.id;

                return (
                  <button
                    type="button"
                    key={person.id}
                    className={`assignment-person ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedPerson(person)}
                    disabled={busy}
                  >
                    <div className="assignment-person-info">
                      <strong>{person.name}</strong>

                      <span>
                        کد ملی: {person.national_id || "ثبت نشده"}
                      </span>
                    </div>

                    <span className="assignment-person-check">
                      {isSelected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {selectedPerson && (
          <div className="assignment-selected-info">
            <span>شخص انتخاب‌شده:</span>
            <strong>{selectedPerson.name}</strong>
            <span>
              کد ملی: {selectedPerson.national_id || "ثبت نشده"}
            </span>
          </div>
        )}

        <div className="assignment-modal-actions">
          <button
            type="button"
            className="assignment-cancel-btn"
            onClick={onClose}
            disabled={busy}
          >
            انصراف
          </button>

          <button
            type="button"
            className="assignment-submit-btn"
            onClick={handleAssign}
            disabled={!selectedPerson || busy}
          >
            {busy ? "در حال ثبت..." : "تأیید و تخصیص واحد"}
          </button>
        </div>
      </section>
    </div>
  );
}
