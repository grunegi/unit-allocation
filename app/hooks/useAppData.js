"use client";

import { useEffect, useState, useMemo } from "react";
import { getDashboardStats } from "../Js/actions";

export function useAppData(initialData) {
  const [people, setPeople] = useState(initialData.people || []);
  const [units, setUnits] = useState(initialData.units || []);
  const [assignments, setAssignments] = useState(initialData.assignments || {});
  const [dashboardStats, setDashboardStats] = useState({
    totalUnits: 0,
    takenUnits: 0,
    freeUnits: 0,
    totalPeople: 0,
  });

  // ۱. بارگذاری/مرتب‌سازی people (ترکیب useEffect اول و سوم)
  useEffect(() => {
    const sorted = [...(initialData.people || [])]
      .sort((a, b) => {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        if (sa !== sb) return sb - sa;
        return new Date(a.created_at) - new Date(b.created_at);
      })
      .map((p, index) => ({ ...p, priority: index + 1 }));
    setPeople(sorted);
    setUnits(initialData.units || []);
    setAssignments(initialData.assignments || {});
  }, [initialData]);

  // ۲. دریافت آمار داشبورد
  useEffect(() => {
    getDashboardStats().then((result) => {
      if (result.ok) {
        setDashboardStats({
          totalUnits: result.totalUnits,
          takenUnits: result.takenUnits,
          freeUnits: result.freeUnits,
          totalPeople: result.totalPeople,
        });
      }
    });
  }, [assignments]);

  // مشتقات (useMemoها)
  const unitsMap = useMemo(() => {
    const map = {};
    for (const unit of units || []) {
      map[unit.code] = unit;
    }
    return map;
  }, [units]);

  const personUnitsMap = useMemo(() => {
    const map = {};
    for (const [code, a] of Object.entries(assignments)) {
      if (!a.personId) continue;
      if (!map[a.personId]) map[a.personId] = [];
      map[a.personId].push(code);
    }
    return map;
  }, [assignments]);

  return {
    people,
    setPeople,
    units,
    setUnits,
    assignments,
    setAssignments,
    dashboardStats,
    unitsMap,
    personUnitsMap,
  };
}