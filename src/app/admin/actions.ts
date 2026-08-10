"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * تغيير حالة الطلب.
 *
 * ⚠️ **بعميل الجلسة لا بمفتاح الخدمة.** سياسة `update` في
 * `rls_scope_isolation` تسمح للقائد بنطاقه وللرئاسة بالكلّ — فتمريرُ
 * التحديث بمفتاح الخدمة يتجاوز ذلك العزل ويجعل أيَّ قائدٍ يعدّل أيَّ طلب.
 * وبعميل الجلسة: طلبٌ خارج النطاق يرجع بصفر صفّ، لا بخطأ صلاحية — فلا
 * يُستدلّ بوجوده.
 */
/* ⚠️ **القائمة البيضاء تُطابق قيد القاعدة حرفًا بحرف.** زيادةٌ هنا بلا
   هجرة تُرمى من `Postgres` بخطأٍ غامض، ونقصٌ هنا يمنع حالةً مشروعة. */
const ALLOWED = [
  "new",
  "reviewing",
  "accepted",
  "rejected",
  "referred",
] as const;
type Status = (typeof ALLOWED)[number];

export async function setStatus(id: string, status: string) {
  if (!(ALLOWED as readonly string[]).includes(status)) {
    return { ok: false as const, message: "حالة غير معروفة" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status: status as Status })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[admin] تعذّر تغيير الحالة", error.message);
    return { ok: false as const, message: "تعذّر الحفظ" };
  }
  if (!data || data.length === 0) {
    /* صفر صفّ = خارج النطاق أو غير موجود. لا نفرّق بينهما في الرسالة. */
    return { ok: false as const, message: "الطلب غير متاح لك" };
  }

  revalidatePath("/admin");
  return { ok: true as const, message: "" };
}
