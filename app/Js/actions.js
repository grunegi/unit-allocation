"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/supabase/server";

// ============================================================
// ثابت‌ها
// ============================================================

const BUILDINGS = {
  A1: 40, A2: 40, A3: 40, A4: 40, A5: 40, A6: 40,
  B1: 22, B2: 40, B3: 40, B4: 40,
  C1: 40, C2: 40, C3: 40,
};

// ============================================================
// توابع کمکی
// ============================================================

async function logAssignmentHistory(
  supabase,
  { action, unitCode, building, unitNumber, person },
) {
  try {
    await supabase.from("assignments_history").insert({
      action,
      unit_code: unitCode,
      building: building ?? null,
      unit_number: unitNumber ?? null,
      person_id: person?.id ?? null,
      person_name: person?.name ?? "—",
      person_national_id: person?.national_id ?? null,
      person_phone: person?.phone ?? null,
      person_address: person?.address ?? null,
    });
  } catch (error) {
    console.warn("assignments_history insert failed:", error.message);
  }
}

// ============================================================
// خواندن داده‌های اولیه
// ============================================================

export async function getInitialData() {
  try {
    const supabase = createServerSupabase();

    const [
      { data: people, error: peopleError },
      { data: units, error: unitsError },
    ] = await Promise.all([
      supabase
        .from("people")
        .select("id,name,phone,national_id,address,score,created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("units")
        .select("code,person_id,building,number,part,floor")
        .order("code"),
    ]);

    if (peopleError) throw peopleError;
    if (unitsError) throw unitsError;

    const assignments = {};
    for (const unit of units || []) {
      if (!unit.person_id) continue;
      const person = (people || []).find((p) => p.id === unit.person_id);
      if (person) {
        assignments[unit.code] = { personId: person.id, name: person.name };
      }
    }

    return {
      ok: true,
      people: people || [],
      units: units || [],
      assignments,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      people: [],
      units: [],
      assignments: {},
    };
  }
}

// ============================================================
// مدیریت افراد
// ============================================================

export async function addPersonAction(formData) {
  const name = String(formData.get("name") || "").trim();
  const nationalId = String(formData.get("national_id") || "").trim() || null;
  const score = Number(formData.get("score")) || 0;

  if (!name || name.length < 3) {
    return { ok: false, error: "نام باید حداقل ۳ حرف باشد." };
  }

  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم عددی باشد." };
  }

  try {
    const supabase = createServerSupabase();

    if (nationalId) {
      const { data: existingId, error: idCheckError } = await supabase
        .from("people")
        .select("id,name")
        .eq("national_id", nationalId)
        .maybeSingle();

      if (idCheckError) throw idCheckError;
      if (existingId) {
        return {
          ok: false,
          error: `این کد ملی قبلاً برای «${existingId.name}» ثبت شده است.`,
        };
      }
    } else {
      const { data: existingName, error: nameCheckError } = await supabase
        .from("people")
        .select("id,name")
        .ilike("name", name)
        .maybeSingle();

      if (nameCheckError) throw nameCheckError;
      if (existingName) {
        return {
          ok: false,
          error: `این نام قبلاً ثبت شده است: «${existingName.name}»`,
        };
      }
    }

    const { error } = await supabase.from("people").insert({
      name,
      national_id: nationalId,
      score,
    });

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "این کد ملی یا نام قبلاً ثبت شده است." };
      }
      throw error;
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "ثبت فرد ناموفق بود." };
  }
}

export async function importPeopleAction(rows) {
  if (!Array.isArray(rows)) {
    return { ok: false, error: "فرمت ورودی نامعتبر است." };
  }

  if (!rows.length) {
    return { ok: false, error: "داده‌ای برای ثبت وجود ندارد." };
  }

  const parsed = [];
  const errors = [];

  rows.forEach((row, index) => {
    const cells = Array.isArray(row)
      ? row
      : String(row).split(",").map((c) => c.trim());

    if (cells.length < 3) {
      errors.push(
        `ردیف ${index + 1}: باید ۳ فیلد داشته باشد (نام، کد ملی، امتیاز).`,
      );
      return;
    }

    const [name, nationalId, scoreStr] = cells;
    const score = Number(scoreStr) || 0;

    if (!name || name.length < 3) {
      errors.push(`ردیف ${index + 1}: نام باید حداقل ۳ حرف باشد.`);
      return;
    }
    if (!/^\d{10}$/.test(nationalId)) {
      errors.push(
        `ردیف ${index + 1}: کد ملی نامعتبر (${nationalId || "خالی"}).`,
      );
      return;
    }

    parsed.push({ name, national_id: nationalId, score });
  });

  if (errors.length) {
    const shown = errors.slice(0, 5).join("\n");
    const more = errors.length > 5 ? `\n... و ${errors.length - 5} خطای دیگر` : "";
    return {
      ok: false,
      error: `خطا در ${errors.length} ردیف:\n${shown}${more}`,
    };
  }

  if (!parsed.length) {
    return { ok: false, error: "هیچ ردیف معتبری برای ثبت وجود ندارد." };
  }

  try {
    const supabase = createServerSupabase();

    const seenNationalIds = new Set();
    const uniqueInList = [];
    for (const p of parsed) {
      if (seenNationalIds.has(p.national_id)) continue;
      seenNationalIds.add(p.national_id);
      uniqueInList.push(p);
    }

    const nationalIds = uniqueInList.map((p) => p.national_id);
    const { data: existing, error: checkError } = await supabase
      .from("people")
      .select("national_id")
      .in("national_id", nationalIds);

    if (checkError) throw checkError;

    const existingIds = new Set((existing || []).map((p) => p.national_id));
    const toInsert = uniqueInList.filter((p) => !existingIds.has(p.national_id));

    if (!toInsert.length) {
      return {
        ok: false,
        error: "همه‌ی افراد وارد شده قبلاً در دیتابیس هستند.",
      };
    }

    const { error } = await supabase.from("people").insert(toInsert);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "یکی از کدهای ملی تکراری است." };
      }
      throw error;
    }

    revalidatePath("/");
    return {
      ok: true,
      count: toInsert.length,
      skipped: parsed.length - toInsert.length,
    };
  } catch (error) {
    return { ok: false, error: error.message || "ورود گروهی ناموفق بود." };
  }
}

export async function deletePersonAction(personId) {
  if (!personId) {
    return { ok: false, error: "شناسه فرد نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();

    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", personId);

    if (error) throw error;

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "حذف فرد ناموفق بود." };
  }
}

// ============================================================
// مدیریت تخصیص واحد
// ============================================================

export async function assignUnitAction(personId, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!personId || !code) {
    return { ok: false, error: "فرد و کد واحد را انتخاب کنید." };
  }

  const match = /^([A-Z]\d)-(\d+)$/.exec(code);
  const building = match?.[1];
  const number = Number(match?.[2]);

  if (
    !match ||
    !BUILDINGS[building] ||
    number < 1 ||
    number > BUILDINGS[building]
  ) {
    return { ok: false, error: "کد واحد نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();

    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id,name,national_id,phone,address")
      .eq("id", personId)
      .maybeSingle();

    if (personError) throw personError;
    if (!person) return { ok: false, error: "فرد پیدا نشد." };

    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("code,person_id,building,number")
      .eq("code", code)
      .maybeSingle();

    if (unitError) throw unitError;
    if (!unit) {
      return { ok: false, error: "این واحد در دیتابیس وجود ندارد." };
    }
    if (unit.person_id) {
      return { ok: false, error: "این واحد قبلاً تخصیص داده شده است." };
    }

    const { error: updateError } = await supabase
      .from("units")
      .update({
        person_id: personId,
        assigned_at: new Date().toISOString(),
      })
      .eq("code", code)
      .is("person_id", null);

    if (updateError) {
      if (updateError.code === "23505") {
        return {
          ok: false,
          error: "این واحد هم‌زمان گرفته شد؛ صفحه را تازه کنید.",
        };
      }
      throw updateError;
    }

    const { data: verify, error: verifyError } = await supabase
      .from("units")
      .select("person_id")
      .eq("code", code)
      .maybeSingle();

    if (verifyError) throw verifyError;
    if (verify?.person_id !== personId) {
      return {
        ok: false,
        error: "واحد دیگر آزاد نیست؛ اطلاعات را تازه کنید.",
      };
    }

    await logAssignmentHistory(supabase, {
      action: "تخصیص واحد",
      unitCode: code,
      building: unit.building,
      unitNumber: unit.number,
      person: {
        id: person.id,
        name: person.name,
        national_id: person.national_id,
        phone: person.phone,
        address: person.address,
      },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "ثبت تخصیص ناموفق بود." };
  }
}

export async function releaseUnitAction(personId) {
  if (!personId) {
    return { ok: false, error: "شناسه فرد نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();

    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id,name,national_id,phone,address")
      .eq("id", personId)
      .maybeSingle();

    if (personError) throw personError;

    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("code,building,number")
      .eq("person_id", personId);

    if (unitsError) throw unitsError;

    const { error: updateError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .eq("person_id", personId);

    if (updateError) throw updateError;

    if (person && units && units.length > 0) {
      for (const unit of units) {
        await logAssignmentHistory(supabase, {
          action: "آزاد سازی واحد",
          unitCode: unit.code,
          building: unit.building,
          unitNumber: unit.number,
          person,
        });
      }
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "آزادسازی واحد ناموفق بود." };
  }
}

// ============================================================
// ریست کامل
// ============================================================

export async function resetAllAction() {
  try {
    const supabase = createServerSupabase();

    const { error: unitsError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .not("person_id", "is", null);

    if (unitsError) throw unitsError;

    const { error: peopleError } = await supabase
      .from("people")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (peopleError) throw peopleError;

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "ریست داده‌ها ناموفق بود." };
  }
}

// ============================================================
// تاریخچه‌ی تخصیص‌ها
// ============================================================

export async function getAssignmentsHistory() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("assignments_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (error) {
    return { ok: false, error: error.message, data: [] };
  }
}

export async function getTakenUnitsOnly() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("units")
      .select("code")
      .not("person_id", "is", null);

    if (error) throw error;

    return { ok: true, codes: (data || []).map((u) => u.code) };
  } catch (error) {
    return { ok: false, error: error.message, codes: [] };
  }
}

export async function releaseSingleUnitAction(unitCode) {
  if (!unitCode) {
    return { ok: false, error: "کد واحد نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();
    const code = String(unitCode).trim().toUpperCase();

    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("code,building,number,person_id")
      .eq("code", code)
      .maybeSingle();

    if (unitError) throw unitError;
    if (!unit) return { ok: false, error: "این واحد وجود ندارد." };
    if (!unit.person_id) {
      return { ok: false, error: "این واحد در حال حاضر آزاد است." };
    }

    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id,name,national_id,phone,address")
      .eq("id", unit.person_id)
      .maybeSingle();

    if (personError) throw personError;

    const { error: updateError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .eq("code", code);

    if (updateError) throw updateError;

    if (person) {
      await logAssignmentHistory(supabase, {
        action: "آزادسازی واحد",
        unitCode: code,
        building: unit.building,
        unitNumber: unit.number,
        person,
      });
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "آزادسازی واحد ناموفق بود." };
  }
}

export async function updatePersonAction(personId, formData) {
  if (!personId) {
    return { ok: false, error: "شناسه فرد نامعتبر است." };
  }

  const name = String(formData.get("name") || "").trim();
  const nationalId = String(formData.get("national_id") || "").trim() || null;
  const score = Number(formData.get("score")) || 0;

  if (!name || name.length < 3) {
    return { ok: false, error: "نام باید حداقل ۳ حرف باشد." };
  }
  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم عددی باشد." };
  }

  try {
    const supabase = createServerSupabase();

    const { data: existingId, error: idCheckError } = await supabase
      .from("people")
      .select("id,name")
      .eq("national_id", nationalId)
      .neq("id", personId)
      .maybeSingle();

    if (idCheckError) throw idCheckError;
    if (existingId) {
      return {
        ok: false,
        error: `این کد ملی قبلاً برای «${existingId.name}» ثبت شده است.`,
      };
    }

    const { error } = await supabase
      .from("people")
      .update({ name, national_id: nationalId, score })
      .eq("id", personId);

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "این کد ملی قبلاً ثبت شده است." };
      }
      throw error;
    }

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "ویرایش فرد ناموفق بود." };
  }
}

// ============================================================
// آمار داشبورد
// ============================================================

export async function getDashboardStats() {
  try {
    const supabase = createServerSupabase();

    const [
      { count: totalUnits, error: e1 },
      { count: takenUnits, error: e2 },
      { count: totalPeople, error: e3 },
    ] = await Promise.all([
      supabase.from("units").select("*", { count: "exact", head: true }),
      supabase
        .from("units")
        .select("*", { count: "exact", head: true })
        .not("person_id", "is", null),
      supabase.from("people").select("*", { count: "exact", head: true }),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;

    return {
      ok: true,
      totalUnits: totalUnits || 0,
      takenUnits: takenUnits || 0,
      freeUnits: (totalUnits || 0) - (takenUnits || 0),
      totalPeople: totalPeople || 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      totalUnits: 0,
      takenUnits: 0,
      freeUnits: 0,
      totalPeople: 0,
    };
  }
}

// ============================================================
// لاگ‌های اخیر
// ============================================================

export async function getRecentLogs(limit = 50) {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("assignments_history")
      .select("id,action,unit_code,person_name,person_national_id,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (error) {
    return { ok: false, error: error.message, data: [] };
  }
}

// ============================================================
// تنظیمات (رمز عبور)
// ============================================================

export async function getAdminPassword() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_password")
      .maybeSingle();

    if (error) throw error;
    return { ok: true, password: data?.value || "5041" };
  } catch (error) {
    return { ok: false, error: error.message, password: "5041" };
  }
}

export async function updateAdminPassword(newPassword) {
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, error: "رمز جدید باید حداقل ۴ کاراکتر باشد." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("settings").upsert(
      {
        key: "admin_password",
        value: newPassword,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "تغییر رمز ناموفق بود." };
  }
}




// ============================================================
// خلاصه تخصیص واحدها به تفکیک بلوک (مخصوص اسکنر)
// ============================================================

export async function getUnitsSummaryByBuilding() {
  try {
    const supabase = createServerSupabase();

    const { data, error } = await supabase
      .from("units")
      .select("code,building,number,person_id")
      .order("building")
      .order("number");

    if (error) throw error;

    const buildings = {};   // { A1: 40, B1: 22, ... }
    const takenByBuilding = {}; // { A1: ["A1-3", "A1-15"], ... }

    for (const unit of data || []) {
      if (!unit.building) continue;

      buildings[unit.building] = (buildings[unit.building] || 0) + 1;

      if (unit.person_id) {
        if (!takenByBuilding[unit.building]) {
          takenByBuilding[unit.building] = [];
        }
        takenByBuilding[unit.building].push(unit.code);
      }
    }

    const summary = Object.entries(buildings).map(([building, total]) => {
      const takenUnits = takenByBuilding[building] || [];
      return {
        building,
        total,
        taken: takenUnits.length,
        free: total - takenUnits.length,
        takenUnits,
      };
    });

    return {
      ok: true,
      buildings,
      summary,
      totals: {
        total: summary.reduce((s, r) => s + r.total, 0),
        taken: summary.reduce((s, r) => s + r.taken, 0),
        free: summary.reduce((s, r) => s + r.free, 0),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      buildings: {},
      summary: [],
      totals: { total: 0, taken: 0, free: 0 },
    };
  }
}



// ============================================================
// بکاپ کامل JSON برای بازیابی
// ============================================================

export async function exportFullBackup() {
  try {
    const supabase = createServerSupabase();

    const [people, units, history, settings] = await Promise.all([
      supabase.from("people").select("*").order("created_at"),
      supabase.from("units").select("*").order("building").order("number"),
      supabase.from("assignments_history").select("*").order("created_at"),
      supabase.from("settings").select("*"),
    ]);

    if (people.error) throw people.error;
    if (units.error) throw units.error;
    if (history.error) throw history.error;
    if (settings.error) throw settings.error;

    return {
      ok: true,
      data: {
        meta: {
          version: "1.0",
          exported_at: new Date().toISOString(),
          total_units: units.data?.length || 0,
          total_people: people.data?.length || 0,
          total_history: history.data?.length || 0,
          total_settings: settings.data?.length || 0,
          total_assigned: (units.data || []).filter((u) => u.person_id).length,
        },
        tables: {
          people: people.data || [],
          units: units.data || [],
          assignments_history: history.data || [],
          settings: settings.data || [],
        },
      },
    };
  } catch (error) {
    return { ok: false, error: error.message || "بکاپ‌گیری ناموفق بود." };
  }
}



export async function getBuildingsWithUnitsMeta() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("units")
      .select("code, building, number, part, floor, person_id")
      .order("building")
      .order("number");

    if (error) throw error;

    const unitsByBuilding = {};
    for (const unit of data || []) {
      if (!unit.building) continue;
      if (!unitsByBuilding[unit.building]) {
        unitsByBuilding[unit.building] = [];
      }
      unitsByBuilding[unit.building].push({
        code: unit.code,
        number: unit.number,
        part: unit.part,
        floor: unit.floor,
        isTaken: !!unit.person_id,
      });
    }

    return { ok: true, unitsByBuilding };
  } catch (error) {
    return { ok: false, error: error.message, unitsByBuilding: {} };
  }
}