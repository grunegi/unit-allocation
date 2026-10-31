"use client";

import React from "react";

function PartColumn({
  partSide,
  partName,
  partCodes,
  assignments,
  unitsMap,
  onSelectUnit,
}) {
  if (!partCodes.length) return null;

  const floorGroups = {};
  partCodes.forEach((code) => {
    const floor = unitsMap[code]?.floor || 1;
    if (!floorGroups[floor]) floorGroups[floor] = [];
    floorGroups[floor].push(code);
  });

  const partClass = partSide === "راست" ? "part-right" : "part-left";
  const icon = partSide === "راست" ? "➡️" : "⬅️";
  const floorNames = ["اول", "دوم", "سوم", "چهارم", "پنجم"];

  const sortedFloors = Object.keys(floorGroups).sort((a, b) => a - b);

  return (
    <div className={`part-column ${partClass}`}>
      <div className="part-title">
        {icon} پارت {partName} ({partSide})
      </div>
      {sortedFloors.map((floor) => {
        const floorName = floorNames[floor - 1] || `طبقه ${floor}`;
        return (
          <div className="floor-group" key={floor}>
            <div className="floor-title">طبقه {floorName}</div>
            <div className="unit-grid">
              {floorGroups[floor].map((code) => (
                <button
                  key={code}
                  className={`unit ${assignments[code] ? "taken" : ""}`}
                  onClick={() => onSelectUnit(code)}
                >
                  <strong>{code}</strong>
                  <small>{assignments[code]?.name || "آزاد"}</small>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(PartColumn);