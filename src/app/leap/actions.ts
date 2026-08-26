"use server";

import {
  echoLeap,
  leapSchema,
  type LeapField,
  type LeapState,
} from "@/lib/leap";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * استقبال تسجيل حضور LEAP 2026.
 *
 * لا بريدَ تأكيدٍ هنا: المسجِّل يحمل أصلًا رسالةَ تأكيدٍ من LEAP نفسها،
 * ورسالةٌ ثانيةٌ من النادي تقول الشيء ذاته ضجيجٌ لا خدمة. وما يحتاجه
 * فعلًا — أن يرى أن اسمه وصل — يظهر أمامه في الحال على البطاقة.
 */
export async function submitLeap(
  _prev: LeapState,
  formData: FormData,
): Promise<LeapState> {
  const values = echoLeap(formData);
  const parsed = leapSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const errors: Partial<Record<LeapField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as LeapField | undefined;
      /* أولُ خطأٍ لكل حقلٍ يكفي — تكديسُ ثلاثِ رسائلَ على حقلٍ واحدٍ يربك */
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { status: "error", errors, values };
  }

  const row = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("leap_registrations").insert({
      name_ar: row.nameAr,
      name_en: row.nameEn,
      email: row.email,
      phone: row.phone,
      reference: row.reference,
    });

    if (error) {
      /* 23505 = خرقُ تفرّد. الوحيدُ المفروضُ هنا فهرسُ رقم الحجز، فالرسالة
         تقول ما حدث بالضبط بدل «تعذّر الحفظ» التي تجعله يعيد المحاولة أبدًا. */
      if (error.code === "23505") {
        return {
          status: "error",
          errors: { reference: "رقم الحجز هذا مسجَّل من قبل" },
          values,
        };
      }

      /* ⚠️ **تفاصيلُ الخطأ لا تُعرَض للمستخدم.** رسائلُ قاعدة البيانات
         تكشف أسماءَ جداولَ وقيودًا، ولا تفيد طالبًا. تُسجَّل للخادم فقط. */
      console.error("leap insert failed", error);
      return {
        status: "error",
        message: "تعذّر حفظ تسجيلك الآن. جرّب بعد قليل.",
        errors: {},
        values,
      };
    }
  } catch (cause) {
    console.error("leap insert threw", cause);
    return {
      status: "error",
      message: "تعذّر حفظ تسجيلك الآن. جرّب بعد قليل.",
      errors: {},
      values,
    };
  }

  return {
    status: "done",
    errors: {},
    /* تُحفظ القيم بعد النجاح: البطاقة تبقى معروضةً باسمه لا فارغة */
    values: {
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      email: row.email,
      phone: row.phone,
      reference: row.reference,
    },
  };
}
