"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { adminRegisterSchema } from "../Js/validation";
import { registerAdminAction } from "../Js/adminActions";

import "../css/adminform.css";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adminRegisterSchema),
    defaultValues: {
      nationalId: "",
      fullName: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  // ارسال اطلاعات معتبر به سرور
  async function onSubmit(data) {
    setServerError("");
    setServerSuccess("");

    console.log("Form submitted:", {
      ...data,
      password: "[HIDDEN]",
      confirmPassword: "[HIDDEN]",
    });

    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    try {
      const result = await registerAdminAction(formData);

      if (result.ok) {
        setServerSuccess(result.message);
        reset();
        setTimeout(() => router.push("/SuperAdmin"), 1500);
      }

      if (!result?.ok) {
        setServerError(result?.error || "ثبت درخواست ناموفق بود.");
        return;
      }

      setServerSuccess(result.message || "درخواست با موفقیت ثبت شد.");

      reset();
    } catch (error) {
      console.error("Admin registration error:", error);

      setServerError("خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.");
    }
  }

  // نمایش خطاهای اعتبارسنجی Zod
  function onInvalid(errors) {
    console.log("FORM VALUES:", getValues());
    console.log("ZOD ERRORS:", errors);

    Object.entries(errors).forEach(([field, error]) => {
      console.log(`${field}:`, error.message);
    });
  }

  return (
    <main className="login-container">
      <section className="card login-card" style={{ maxWidth: "420px" }}>
        <h1>📝 ثبت ادمین جدید</h1>

        <p>
          اطلاعات خود را وارد کنید. درخواست شما پس از تأیید ادمین اصلی فعال
          می‌شود.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="admin-request-form"
          noValidate
        >
          {/* National ID */}
          <div className="form-row">
            <label htmlFor="nationalId">کد ملی</label>

            <input
              id="nationalId"
              type="text"
              inputMode="numeric"
              maxLength={10}
              autoComplete="off"
              placeholder="۱۰ رقم"
              {...register("nationalId")}
            />

            {errors.nationalId && (
              <span className="field-error">{errors.nationalId.message}</span>
            )}
          </div>

          {/* Full Name */}
          <div className="form-row">
            <label htmlFor="fullName">نام و نام خانوادگی</label>

            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="مثلاً علی رضایی"
              {...register("fullName")}
            />

            {errors.fullName && (
              <span className="field-error">{errors.fullName.message}</span>
            )}
          </div>

          {/* Phone */}
          <div className="form-row">
            <label htmlFor="phone">شماره موبایل</label>

            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              autoComplete="tel"
              dir="rtl"
              placeholder="09xxxxxxxxx"
              {...register("phone")}
            />

            {errors.phone && (
              <span className="field-error">{errors.phone.message}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-row">
            <label htmlFor="password">رمز عبور</label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="حداقل ۶ کاراکتر"
              {...register("password")}
            />

            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-row">
            <label htmlFor="confirmPassword">تکرار رمز عبور</label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="رمز را دوباره وارد کنید"
              {...register("confirmPassword")}
            />

            {errors.confirmPassword && (
              <span className="field-error">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* Server Error */}
          {serverError && (
            <p className="login-message" role="alert">
              {serverError}
            </p>
          )}

          {/* Server Success */}
          {serverSuccess && (
            <p className="login-success" role="status">
              {serverSuccess}
            </p>
          )}

          {/* Actions */}
          <div className="login-actions">
            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? "در حال ارسال..." : "ثبت درخواست"}
            </button>

            <Link href="/SuperAdmin" className="login-btn login-btn-secondary">
              بازگشت  
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
