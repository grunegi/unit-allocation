"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/supabase/server";

// ============================================================
// ثابت‌ها
// ============================================================

const BUILDINGS = {
  A1: 40,
  A2: 40,
  A3: 40,
  C1: 40,
  C2: 40,
  C3: 40,
  B1: 22,
};

// ============================================================
// توابع کمکی
// ============================================================

/**
 * ثبت تاریخچه‌ی تخصیص با تمام اطلاعات فرد و واحد.
 * عکس لحظه‌ای می‌گیرد تا اگه فرد بعداً تغییر کرد، تاریخچه حفظ شود.
 * هرگز خطا پرتاب نمی‌کند تا عملیات اصلی را خراب نکند.
 */
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

/**
 * داده‌های اولیه‌ی صفحه (افراد، واحدها و تخصیص‌ها) را از دیتابیس می‌خواند.
 */
export async function getInitialData() {
  try {
    const supabase = createServerSupabase();

    const [
      { data: people, error: peopleError },
      { data: units, error: unitsError },
    ] = await Promise.all([
      supabase
        .from("people")
        .select("id,name,phone,national_id,address,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("units")
        .select("code,person_id,building,number")
        .order("code"),
    ]);

    if (peopleError) throw peopleError;
    if (unitsError) throw unitsError;

    // ساخت نقشه‌ی تخصیص‌ها: { [unitCode]: { personId, name } }
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

/**
 * افزودن یک فرد جدید — قبل از درج، تکراری بودن کد ملی (یا نام) را چک می‌کند.
 */
export async function addPersonAction(formData) {
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const nationalId = String(formData.get("national_id") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  if (!name || name.length < 3) {
    return { ok: false, error: "نام باید حداقل ۳ حرف باشد." };
  }

  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم عددی باشد." };
  }

  if (!/^09\d{9}$/.test(phone)) {
    return {
      ok: false,
      error: "شماره تماس باید با ۰۹ شروع شود و ۱۱ رقم باشد.",
    };
  }

  if (!address || address.length < 5) {
    return { ok: false, error: "آدرس باید حداقل ۵ حرف باشد." };
  }

  try {
    const supabase = createServerSupabase();

    // چک تکراری — اول کد ملی، اگه نبود اسم
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
      phone,
      national_id: nationalId,
      address,
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

/**
 * ورود گروهی افراد — تکراری‌های داخل لیست و تکراری‌های موجود در دیتابیس را رد می‌کند.
 */
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

    if (cells.length < 4) {
      errors.push(`ردیف ${index + 1}: باید ۴ فیلد داشته باشد (نام، تلفن، کد ملی، آدرس).`);
      return;
    }

    const [name, phone, nationalId, ...addressParts] = cells;
    const address = addressParts.join(", ").trim();

    if (!name || name.length < 3) {
      errors.push(`ردیف ${index + 1}: نام باید حداقل ۳ حرف باشد.`);
      return;
    }
    if (!/^09\d{9}$/.test(phone)) {
      errors.push(`ردیف ${index + 1}: شماره تماس نامعتبر (${phone || "خالی"}).`);
      return;
    }
    if (!/^\d{10}$/.test(nationalId)) {
      errors.push(`ردیف ${index + 1}: کد ملی نامعتبر (${nationalId || "خالی"}).`);
      return;
    }
    if (!address || address.length < 5) {
      errors.push(`ردیف ${index + 1}: آدرس باید حداقل ۵ حرف باشد.`);
      return;
    }

    parsed.push({ name, phone, national_id: nationalId, address });
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

/**
 * حذف یک فرد — به دلیل ON DELETE SET NULL روی units.person_id، واحدهای او خودکار آزاد می‌شوند.
 */
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

/**
 * تخصیص یک واحد به یک فرد (می‌تواند چند واحد داشته باشد).
 * - اعتبارسنجی کد واحد
 * - بررسی وجود فرد و واحد
 * - بررسی آزاد بودن واحد
 * - آپدیت شرطی + تأیید نهایی (مقابله با race condition)
 * - ثبت در تاریخچه
 */
export async function assignUnitAction(personId, rawCode) {
  // ۱. اعتبارسنجی ورودی‌ها
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

    // ۲. بررسی وجود فرد
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id,name,national_id,phone,address")
      .eq("id", personId)
      .maybeSingle();

    if (personError) throw personError;
    if (!person) return { ok: false, error: "فرد پیدا نشد." };

    // ۳. بررسی وجود واحد و آزاد بودن آن
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

    // ۴. آپدیت شرطی — فقط اگر واحد هنوز آزاد باشد
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

    // ۵. تأیید نهایی — اگر درخواست دیگری برنده شده باشد، ۰ ردیف آپدیت می‌شود
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

    // ۶. ثبت در تاریخچه
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

/**
 * آزادسازی تمام واحدهای یک فرد — person_id را NULL می‌کند و برای هر واحد در تاریخچه ثبت می‌کند.
 */
export async function releaseUnitAction(personId) {
  if (!personId) {
    return { ok: false, error: "شناسه فرد نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();

    // ۱. اطلاعات کامل فرد
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id,name,national_id,phone,address")
      .eq("id", personId)
      .maybeSingle();

    if (personError) throw personError;

    // ۲. همه‌ی واحدهای فعلی فرد (قبل از آزادسازی) — ممکنه چند تا باشن
    const { data: units, error: unitsError } = await supabase
      .from("units")
      .select("code,building,number")
      .eq("person_id", personId);

    if (unitsError) throw unitsError;

    // ۳. آزادسازی همه‌ی واحدها
    const { error: updateError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .eq("person_id", personId);

    if (updateError) throw updateError;

    // ۴. ثبت هر واحد در تاریخچه
    if (person && units && units.length > 0) {
      for (const unit of units) {
        await logAssignmentHistory(supabase, {
          action: " آزاد سازی واحد",
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

/**
 * پاک کردن همه‌ی تخصیص‌ها و همه‌ی افراد.
 */
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

/**
 * دریافت کامل تاریخچه‌ی تخصیص‌ها (برای خروجی Excel/CSV).
 */
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

/**
 * فقط کد واحدهای تخصیص‌یافته رو برمی‌گردونه (بدون اطلاعات شخص).
 * برای صفحه‌ی اسکن عمومی که نباید اطلاعات لو بره.
 */
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



/**
 * آزادسازی یک واحد خاص از یک فرد.
 * فقط واحد مشخص‌شده رو آزاد می‌کنه (بقیه دست نمی‌خورن).
 */
export async function releaseSingleUnitAction(unitCode) {
  if (!unitCode) {
    return { ok: false, error: "کد واحد نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();
    const code = String(unitCode).trim().toUpperCase();

    // ۱. اطلاعات واحد و فرد فعلی
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

    // ۲. اطلاعات فرد
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id,name,national_id,phone,address")
      .eq("id", unit.person_id)
      .maybeSingle();

    if (personError) throw personError;

    // ۳. آزادسازی واحد
    const { error: updateError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .eq("code", code);

    if (updateError) throw updateError;

    // ۴. ثبت در تاریخچه
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



/**
 * ویرایش اطلاعات یک فرد.
 * - نام، تلفن، کد ملی، آدرس
 */
export async function updatePersonAction(personId, formData) {
  if (!personId) {
    return { ok: false, error: "شناسه فرد نامعتبر است." };
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const nationalId = String(formData.get("national_id") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;

  if (!name || name.length < 3) {
    return { ok: false, error: "نام باید حداقل ۳ حرف باشد." };
  }
  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم عددی باشد." };
  }
  if (!/^09\d{9}$/.test(phone)) {
    return {
      ok: false,
      error: "شماره تماس باید با ۰۹ شروع شود و ۱۱ رقم باشد.",
    };
  }
  if (!address || address.length < 5) {
    return { ok: false, error: "آدرس باید حداقل ۵ حرف باشد." };
  }

  try {
    const supabase = createServerSupabase();

    // چک تکراری بودن کد ملی (برای بقیه)
    const { data: existingId, error: idCheckError } = await supabase
      .from("people")
      .select("id,name")
      .eq("national_id", nationalId)
      .neq("id", personId)         // ← خودش نه
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
      .update({ name, phone, national_id: nationalId, address })
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