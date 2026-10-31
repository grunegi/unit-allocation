
import { z } from "zod/v3";

// اعتبارسنجی کد ملی ایران
export function validateNationalId(code) {
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;

  const check = Number(code[9]);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += Number(code[i]) * (10 - i);
  }

  const rem = sum % 11;

  return rem < 2
    ? check === rem
    : check === 11 - rem;
}

// Schema ثبت درخواست ادمین
export const adminRegisterSchema = z
  .object({
    nationalId: z
      .string()
      .trim()
      .length(10, "کد ملی باید ۱۰ رقم باشد")
      .regex(/^\d{10}$/, "کد ملی فقط باید شامل اعداد انگلیسی باشد")
      .refine(
        validateNationalId,
        "کد ملی معتبر نیست"
      ),

    fullName: z
      .string()
      .trim()
      .min(3, "نام و نام خانوادگی را کامل وارد کنید")
      .max(80, "نام طولانی است"),

    phone: z
      .string()
      .trim()
      .regex(
        /^09\d{9}$/,
        "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد"
      ),

    password: z
      .string()
      .min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),

    confirmPassword: z
      .string()
      .min(1, "تکرار رمز عبور الزامی است"),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "رمز عبور و تکرار آن یکسان نیستند",
      path: ["confirmPassword"],
    }
  );
