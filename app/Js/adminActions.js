"use server";

import { createServerSupabase } from "../../lib/supabase/server";
import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { hash } from "bcryptjs";

export async function seedSuperAdminAction({ nationalId, fullName, phone, password }) {
  try {
    const supabase = createServerSupabase();
    const passwordHash = await hash(password, 10);

    const { error } = await supabase.from("admin_register_requests").insert({
      national_id: nationalId,
      full_name: fullName,
      phone: phone,
      password_hash: passwordHash,
      status: "approved",
      access_level: "full",
    });

    if (error) throw error;

    return { ok: true, message: "ادمین اصلی با موفقیت ایجاد شد." };
  } catch (error) {
    return { ok: false, error: error.message || "درج ادمین اصلی ناموفق بود." };
  }
}


export async function loginAdminAction({ nationalId, password }) {
  if (!nationalId || !password) {
    return { ok: false, error: "کد ملی و رمز عبور الزامی است." };
  }

  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم باشد." };
  }

  try {
    const supabase = createServerSupabase();

    // ۱. جستجوی ادمین با کد ملی
    const { data: admin, error } = await supabase
      .from("admin_register_requests")
      .select("id,national_id,full_name,phone,status,access_level,password_hash")
      .eq("national_id", nationalId)
      .maybeSingle();

    if (error) throw error;
    if (!admin) {
      return { ok: false, error: "کد ملی یا رمز عبور نادرست است." };
    }

    // ۲. چک وضعیت
    if (admin.status !== "approved") {
      if (admin.status === "pending") {
        return { ok: false, error: "درخواست شما هنوز تأیید نشده است." };
      }
      return { ok: false, error: "دسترسی شما رد شده است." };
    }

    // ۳. بررسی رمز
    const passwordOk = await compare(password, admin.password_hash);
    if (!passwordOk) {
      return { ok: false, error: "کد ملی یا رمز عبور نادرست است." };
    }

    // ۴. ذخیره در کوکی (session)
    const cookieStore = await cookies();
    const sessionData = {
      id: admin.id,
      national_id: admin.national_id,
      full_name: admin.full_name,
      access_level: admin.access_level,
    };

    cookieStore.set("admin_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // maxAge: 60 * 15,
    });

    return {
      ok: true,
      message: "ورود موفق.",
      admin: sessionData,
    };
  } catch (error) {
    return { ok: false, error: error.message || "ورود ناموفق بود." };
  }
}



// ============================================================
// خروج ادمین
// ============================================================

export async function logoutAdminAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}



// ============================================================
// خواندن session ادمین
// ============================================================

export async function getAdminSessionAction() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("admin_session")?.value;
    if (!raw) return { ok: false, session: null };

    const session = JSON.parse(raw);
    return { ok: true, session };
  } catch {
    return { ok: false, session: null };
  }
}



// ============================================================
// ثبت درخواست ادمین جدید (pending)
// ============================================================

export async function registerAdminAction(formData) {
  console.log("registerAdminAction called");

  const nationalId = String(formData.get("nationalId") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم عددی باشد." };
  }

  if (!fullName || fullName.length < 3) {
    return { ok: false, error: "نام و نام خانوادگی باید حداقل ۳ حرف باشد." };
  }

  if (!/^09\d{9}$/.test(phone)) {
    return { ok: false, error: "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد." };
  }

  if (!password || password.length < 6) {
    return { ok: false, error: "رمز عبور باید حداقل ۶ کاراکتر باشد." };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "رمز عبور و تکرار آن یکسان نیستند." };
  }

  try {
    const supabase = createServerSupabase();

    // چک تکراری بودن کد ملی یا موبایل
    const { data: existing, error: checkError } = await supabase
      .from("admin_register_requests")
      .select("national_id,phone")
      .or(`national_id.eq.${nationalId},phone.eq.${phone}`)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return {
        ok: false,
        error: "کد ملی یا شماره موبایل قبلاً ثبت شده است.",
      };
    }

    // هش رمز
    const passwordHash = await hash(password, 10);

    // درج درخواست
    const { error: insertError } = await supabase
      .from("admin_register_requests")
      .insert({
        national_id: nationalId,
        full_name: fullName,
        phone,
        password_hash: passwordHash,
        status: "pending",
        access_level: "limited",
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          ok: false,
          error: "کد ملی یا شماره موبایل قبلاً ثبت شده است.",
        };
      }
      throw insertError;
    }

    return {
      ok: true,
      message: "درخواست شما ثبت شد. پس از تأیید ادمین اصلی فعال می‌شود.",
    };
  } catch (error) {
    console.error("registerAdminAction error:", error);
    return {
      ok: false,
      error: error.message || "ثبت درخواست ناموفق بود.",
    };
  }
}



// ============================================================
// تأیید درخواست ادمین جدید توسط ادمین اصلی
// ============================================================

export async function approveAdminRequestAction({
  requestId,
  accessLevel,
}) {
  if (!requestId) {
    return { ok: false, error: "شناسه درخواست نامعتبر است." };
  }

  if (!["limited", "full"].includes(accessLevel)) {
    return { ok: false, error: "سطح دسترسی نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();

    // چک اینکه درخواست وجود دارد و در حالت pending است
    const { data: request, error: fetchError } = await supabase
      .from("admin_register_requests")
      .select("id,status,access_level")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return { ok: false, error: "درخواست پیدا نشد." };
    }
    if (request.status !== "pending") {
      return { ok: false, error: "این درخواست قبلاً بررسی شده است." };
    }

    // به‌روزرسانی: status = approved + access_level انتخاب‌شده
    const { error: updateError } = await supabase
      .from("admin_register_requests")
      .update({
        status: "approved",
        access_level: accessLevel,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending"); // فقط اگر هم‌زمان کسی تغییرش نداده باشد

    if (updateError) throw updateError;

    revalidatePath("/SuperAdmin");
    return {
      ok: true,
      message: `درخواست با دسترسی ${
        accessLevel === "full" ? "کامل" : "محدود"
      } تأیید شد.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "تأیید درخواست ناموفق بود.",
    };
  }
}



// ============================================================
// رد درخواست ادمین جدید توسط ادمین اصلی
// ============================================================
export async function rejectAdminRequestAction({ requestId }) {
  if (!requestId) {
    return { ok: false, error: "شناسه درخواست نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();

    const { data: request, error: fetchError } = await supabase
      .from("admin_register_requests")
      .select("id,status")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return { ok: false, error: "درخواست پیدا نشد." };
    }
    if (request.status !== "pending") {
      return { ok: false, error: "این درخواست قبلاً بررسی شده است." };
    }

    const { error: updateError } = await supabase
      .from("admin_register_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (updateError) throw updateError;

    revalidatePath("/SuperAdmin");
    return { ok: true, message: "درخواست رد شد." };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "رد درخواست ناموفق بود.",
    };
  }
}




export async function getAdminRequestsAction() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("admin_register_requests")
      .select("id,national_id,full_name,phone,status,access_level,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { ok: true, data: data || [] };
  } catch (error) {
    return { ok: false, error: error.message, data: [] };
  }
}



// ============================================================
// حذف ادمین
// ============================================================

export async function deleteAdminAction(requestId) {
  if (!requestId) {
    return { ok: false, error: "شناسه نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("admin_register_requests")
      .delete()
      .eq("id", requestId);

    if (error) throw error;

    revalidatePath("/SuperAdmin");
    return { ok: true, message: "ادمین حذف شد." };
  } catch (error) {
    return { ok: false, error: error.message || "حذف ناموفق بود." };
  }
}




// ============================================================
// ویرایش سطح دسترسی (با رمز ادمین اصلی)
// ============================================================

export async function updateAdminAccessAction({
  requestId,
  accessLevel,
  superAdminPassword,
}) {
  if (!requestId) {
    return { ok: false, error: "شناسه نامعتبر است." };
  }
  if (!["limited", "full"].includes(accessLevel)) {
    return { ok: false, error: "سطح دسترسی نامعتبر است." };
  }
  if (!superAdminPassword) {
    return { ok: false, error: "رمز ادمین اصلی را وارد کنید." };
  }

  try {
    const supabase = createServerSupabase();

    // ۱. پیدا کردن ادمین‌های با دسترسی کامل (approved + full)
    const { data: superAdmins, error: fetchError } = await supabase
      .from("admin_register_requests")
      .select("id,national_id,password_hash")
      .eq("status", "approved")
      .eq("access_level", "full");

    if (fetchError) throw fetchError;
    if (!superAdmins || superAdmins.length === 0) {
      return { ok: false, error: "هیچ ادمین با دسترسی کامل یافت نشد." };
    }

    // ۲. چک رمز با هر کدام از ادمین‌های کامل
    let passwordOk = false;
    for (const admin of superAdmins) {
      const match = await compare(superAdminPassword, admin.password_hash);
      if (match) {
        passwordOk = true;
        break;
      }
    }

    if (!passwordOk) {
      return { ok: false, error: "رمز ادمین اصلی نادرست است." };
    }

    // ۳. به‌روزرسانی سطح دسترسی
    const { error } = await supabase
      .from("admin_register_requests")
      .update({
        access_level: accessLevel,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;

    revalidatePath("/SuperAdmin");
    return { ok: true, message: "سطح دسترسی به‌روزرسانی شد." };
  } catch (error) {
    return { ok: false, error: error.message || "ویرایش ناموفق بود." };
  }
}





// ============================================================
// بررسی دوباره (rejected → pending)
// ============================================================

export async function recheckAdminRequestAction({ requestId }) {
  if (!requestId) {
    return { ok: false, error: "شناسه نامعتبر است." };
  }

  try {
    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("admin_register_requests")
      .update({
        status: "pending",
        access_level: "limited",
        reviewed_at: null,
      })
      .eq("id", requestId)
      .eq("status", "rejected");

    if (error) throw error;

    revalidatePath("/SuperAdmin");
    return { ok: true, message: "درخواست به حالت «در انتظار» برگشت." };
  } catch (error) {
    return { ok: false, error: error.message || "بررسی دوباره ناموفق بود." };
  }
}




// ============================================================
// ویرایش اطلاعات ادمین (نام، کد ملی، موبایل)
// ============================================================

export async function updateAdminInfoAction({
  requestId,
  fullName,
  nationalId,
  phone,
  newPassword,        // اختیاری — اگر خالی باشد، رمز عوض نمی‌شود
  superAdminPassword,
}) {
  if (!requestId) {
    return { ok: false, error: "شناسه نامعتبر است." };
  }
  if (!fullName || fullName.trim().length < 3) {
    return { ok: false, error: "نام باید حداقل ۳ حرف باشد." };
  }
  if (!/^\d{10}$/.test(nationalId)) {
    return { ok: false, error: "کد ملی باید ۱۰ رقم باشد." };
  }
  if (!/^09\d{9}$/.test(phone)) {
    return { ok: false, error: "شماره موبایل نامعتبر است." };
  }
  if (newPassword && newPassword.length < 6) {
    return { ok: false, error: "رمز جدید باید حداقل ۶ کاراکتر باشد." };
  }
  if (!superAdminPassword) {
    return { ok: false, error: "رمز ادمین اصلی را وارد کنید." };
  }

  try {
    const supabase = createServerSupabase();

    // ۱. چک رمز ادمین اصلی (approved + full)
    const { data: superAdmins, error: fetchError } = await supabase
      .from("admin_register_requests")
      .select("id,password_hash")
      .eq("status", "approved")
      .eq("access_level", "full");

    if (fetchError) throw fetchError;
    if (!superAdmins || superAdmins.length === 0) {
      return { ok: false, error: "هیچ ادمین با دسترسی کامل یافت نشد." };
    }

    let passwordOk = false;
    for (const admin of superAdmins) {
      if (await compare(superAdminPassword, admin.password_hash)) {
        passwordOk = true;
        break;
      }
    }

    if (!passwordOk) {
      return { ok: false, error: "رمز ادمین اصلی نادرست است." };
    }

    // ۲. چک تکراری بودن کد ملی/موبایل
    const { data: existing, error: checkError } = await supabase
      .from("admin_register_requests")
      .select("id")
      .or(`national_id.eq.${nationalId},phone.eq.${phone}`)
      .neq("id", requestId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return {
        ok: false,
        error: "کد ملی یا شماره موبایل برای ادمین دیگری ثبت شده است.",
      };
    }

    // ۳. آماده‌سازی داده‌های به‌روزرسانی
    const updateData = {
      full_name: fullName.trim(),
      national_id: nationalId,
      phone,
    };

    // اگر رمز جدید وارد شده، هش کن و اضافه کن
    if (newPassword) {
      updateData.password_hash = await hash(newPassword, 10);
    }

    const { error: updateError } = await supabase
      .from("admin_register_requests")
      .update(updateData)
      .eq("id", requestId);

    if (updateError) {
      if (updateError.code === "23505") {
        return { ok: false, error: "کد ملی یا شماره موبایل تکراری است." };
      }
      throw updateError;
    }

    revalidatePath("/SuperAdmin");
    return {
      ok: true,
      message: newPassword
        ? "اطلاعات و رمز ادمین به‌روزرسانی شد."
        : "اطلاعات ادمین به‌روزرسانی شد.",
    };
  } catch (error) {
    return { ok: false, error: error.message || "ویرایش ناموفق بود." };
  }
}



export async function getAdminAccessLevelAction(adminId) {
  if (!adminId) {
    return { ok: false, access_level: null };
  }

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("admin_register_requests")
      .select("access_level,status")
      .eq("id", adminId)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.status !== "approved") {
      return { ok: false, access_level: null };
    }

    return { ok: true, access_level: data.access_level };
  } catch (error) {
    return { ok: false, access_level: null, error: error.message };
  }
}