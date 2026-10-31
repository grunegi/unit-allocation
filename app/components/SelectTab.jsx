"use client";

import PartColumn from "../components/PartColumn";
import { BUILDINGS, ALL_UNITS } from "../../lib/supabase/constants";

export default function SelectTab({
  people,
  personId,
  setPersonId,
  unitCode,
  setUnitCode,
  personUnitsMap,
  assignments,
  unitsMap,
  collapsedBuildings,
  setCollapsedBuildings,
  busy,
  onAssign,
}) {
  return (
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
              {p.score ? ` (امتیاز: ${p.score})` : ""}
              {count > 0 ? ` - ${count} واحد` : ""}
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
        <button disabled={busy} onClick={onAssign}>
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
          code.startsWith(`${building}-`)
        );
        const takenInBuilding = buildingUnits.filter(
          (code) => assignments[code]
        ).length;
        const isCollapsed = collapsedBuildings[building];

        return (
          <div
            className="building-section"
            key={building}
            id={`building-${building}`}
          >
            <div className="building-header">
              <div
                className="building-title"
                onClick={() =>
                  setCollapsedBuildings((prev) => ({
                    ...prev,
                    [building]: !prev[building],
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
                      [building]: !prev[building],
                    }));
                  }
                }}
              >
                <span className="building-caret">
                  {isCollapsed ? "▶" : "▼"}
                </span>
                🏢 {building}
              </div>

              <div className="building-header-right">
                <span className="building-stats">
                  {takenInBuilding} از {buildingUnits.length} تخصیص‌یافته
                </span>
              </div>
            </div>

            {!isCollapsed && (
              <div className="parts-container">
                <PartColumn
                  partSide="راست"
                  partName="شرقی"
                  partCodes={buildingUnits.filter(
                    (code) => unitsMap[code]?.part === "راست"
                  )}
                  assignments={assignments}
                  unitsMap={unitsMap}
                  onSelectUnit={setUnitCode}
                />
                <PartColumn
                  partSide="چپ"
                  partName="غربی"
                  partCodes={buildingUnits.filter(
                    (code) => unitsMap[code]?.part === "چپ"
                  )}
                  assignments={assignments}
                  unitsMap={unitsMap}
                  onSelectUnit={setUnitCode}
                />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}