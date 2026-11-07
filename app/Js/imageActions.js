"use server"

import { createServerSupabase } from "../../lib/supabase/server";

const BUILDING_IMAGE_FOLDERS = {
  A1: "building-A1-A2-C1",
  A2: "building-A1-A2-C1",
  C1: "building-A1-A2-C1",

  A3: "building-A3",
  B1: "building-B1",
  C2: "building-C2",
  C3: "building-C3",
};

const BUCKET_NAME = "images";

export async function getUnitImageAction(unitCode) {
  try {
    const code = String(unitCode || "").trim().toUpperCase();

    // استخراج ساختمان و شماره واحد
    const match = /^([A-Z]\d)-(\d+)$/.exec(code);

    if (!match) {
      return {
        success: false,
        message: "کد واحد معتبر نیست.",
      };
    }

    const [, building, unitNumber] = match;

    const folder = BUILDING_IMAGE_FOLDERS[building];

    if (!folder) {
      return {
        success: false,
        message: "پوشه تصاویر این ساختمان تعریف نشده است.",
      };
    }

    const supabase = createServerSupabase();

    // دریافت فایل‌های پوشه ساختمان
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, {
        limit: 100,
      });

    if (error) throw error;

    // پیدا کردن عکس مناسب بر اساس نام فایل
    const imageExtensions = /\.(jpg|jpeg|png|webp)$/i;

    const matchedImages = (files || []).filter((file) => {
      if (!imageExtensions.test(file.name)) return false;

      const fileName = file.name.replace(imageExtensions, "");
      const numbers = fileName.split("-").map(Number);

      if (
        numbers.length < 2 ||
        numbers.some((n) => !Number.isInteger(n) || n <= 0)
      ) {
        return false;
      }

      // آخرین عدد متراژ است
      const unitNumbers = numbers.slice(0, -1);

      return unitNumbers.includes(Number(unitNumber));
    });

    if (matchedImages.length === 0) {
      return {
        success: false,
        message: `تصویری برای واحد ${code} پیدا نشد.`,
      };
    }

    if (matchedImages.length > 1) {
      console.warn("Multiple images found for:", code);
    }

    const selectedImage = matchedImages[0];

    // استخراج متراژ: آخرین عدد اسم فایل (مثلاً 1-5-9-13-17-85.jpg => 85)
    const nameParts = selectedImage.name
      .replace(imageExtensions, "")
      .split("-")
      .map(Number);
    const area = nameParts[nameParts.length - 1];

    const imagePath = `${folder}/${selectedImage.name}`;

    // دریافت آدرس عمومی تصویر
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(imagePath);

    return {
      success: true,
      imageUrl: data.publicUrl,
      fileName: selectedImage.name,
      area, // عدد متراژ
    };
  } catch (error) {
    console.error("getUnitImageAction error:", error);

    return {
      success: false,
      message: "خطا در دریافت تصویر واحد.",
    };
  }
}