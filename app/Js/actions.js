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
  // ۱. استخراج و پاکسازی ورودی‌ها
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

    // ۲. چک تکراری — اول کد ملی، اگه نبود اسم
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

    // ۳. درج فرد جدید
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

  // ۱. اعتبارسنجی هر ردیف
  const parsed = [];
  const errors = [];

  rows.forEach((row, index) => {
    // پشتیبانی از string و array
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

    // ۲. حذف تکراری داخل لیست
    const seenNationalIds = new Set();
    const uniqueInList = [];
    for (const p of parsed) {
      if (seenNationalIds.has(p.national_id)) continue;
      seenNationalIds.add(p.national_id);
      uniqueInList.push(p);
    }

    // ۳. حذف تکراری با دیتابیس
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

    // ۴. درج گروهی
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
 * حذف یک فرد — به دلیل ON DELETE SET NULL روی units.person_id، واحد او خودکار آزاد می‌شود.
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
 * تخصیص یک واحد به یک فرد.
 * - اعتبارسنجی کد واحد
 * - بررسی وجود فرد و واحد
 * - بررسی آزاد بودن واحد و نداشتن واحد قبلی توسط فرد
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

    // ۴. بررسی اینکه فرد قبلاً واحدی نگرفته باشد
    const { data: alreadyAssigned, error: assignedError } = await supabase
      .from("units")
      .select("code")
      .eq("person_id", personId)
      .maybeSingle();

    if (assignedError) throw assignedError;
    if (alreadyAssigned) {
      return {
        ok: false,
        error: `این فرد قبلاً واحد ${alreadyAssigned.code} را انتخاب کرده است.`,
      };
    }

    // ۵. آپدیت شرطی — فقط اگر واحد هنوز آزاد باشد
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
          error:
            "این فرد یا واحد هم‌زمان به تخصیص دیگری رسیده است؛ اطلاعات را تازه کنید.",
        };
      }
      throw updateError;
    }

    // ۶. تأیید نهایی — اگر درخواست دیگری برنده شده باشد، ۰ ردیف آپدیت می‌شود
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

    // ۷. ثبت در تاریخچه (فقط یک بار)
    await logAssignmentHistory(supabase, {
      action: "ثبت کاربر و تخصیص واحد",
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
 * آزادسازی واحد فرد — person_id را NULL می‌کند و در تاریخچه ثبت می‌کند.
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

    // ۲. اطلاعات واحد فعلی فرد (قبل از آزادسازی)
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("code,building,number")
      .eq("person_id", personId)
      .maybeSingle();

    if (unitError) throw unitError;

    // ۳. آزادسازی واحد
    const { error: updateError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .eq("person_id", personId);

    if (updateError) throw updateError;

    // ۴. ثبت در تاریخچه (اگه فرد و واحد پیدا شدن)
    if (person && unit) {
      await logAssignmentHistory(supabase, {
        action: "حذف کابر و آزاد سازی واحد",
        unitCode: unit.code,
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

// ============================================================
// ریست کامل
// ============================================================

/**
 * پاک کردن همه‌ی تخصیص‌ها و همه‌ی افراد.
 */
export async function resetAllAction() {
  try {
    const supabase = createServerSupabase();

    // آزادسازی همه‌ی واحدها
    const { error: unitsError } = await supabase
      .from("units")
      .update({
        person_id: null,
        assigned_at: null,
      })
      .not("person_id", "is", null);

    if (unitsError) throw unitsError;

    // حذف همه‌ی افراد
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