"use server";

import { revalidatePath } from "next/cache";

import { findPreference } from "@/content/preferences";
import { sendMail } from "@/lib/email/client";
import { applicationDecision, isNotifiable } from "@/lib/email/templates";
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

/**
 * إرسالُ نتيجة الطلب إلى الطالب.
 *
 * ⚠️ **فعلٌ مستقلٌّ لا أثرٌ لتغيير الحالة.** ربطُه بضغطة «مقبول» يجعل
 * نقرةً خاطئةً ترسل قبولًا أو رفضًا لا يُسحب. فالحالةُ تُضبط أوّلًا وتُراجَع،
 * ثم يُرسَل البريدُ بفعلٍ ثانٍ مقصود.
 *
 * ⚠️ **والصفُّ يُقرأ بعميل الجلسة لا بمفتاح الخدمة** — فقائدُ اللجنة لا
 * يراسل متقدّمًا خارج نطاقه: `RLS` تُرجع صفرَ صفٍّ فيُردّ «غير متاح لك».
 *
 * ⚠️ **ولا سجلَّ إرسالٍ في القاعدة بعد**، فالإرسالُ مرّتين ممكنٌ بفعلٍ
 * متعمَّد. الواجهةُ تطلب تأكيدًا قبل كلّ إرسال، وهو ما يمنع النقرة
 * الخاطئة. والمنعُ الدائم يحتاج عمودًا (`notified_at`) وهجرةً على قاعدةٍ
 * حيّة — يُرفع للإدارة لا يُقرَّر هنا.
 */
export async function notifyDecision(id: string) {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("applications")
    .select("full_name, email, status, choice1, choice2, choice3")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin] تعذّرت قراءة الطلب للمراسلة", error.message);
    return { ok: false as const, message: "تعذّرت القراءة" };
  }
  if (!row) return { ok: false as const, message: "الطلب غير متاح لك" };

  if (!isNotifiable(row.status)) {
    return {
      ok: false as const,
      message: "لا نتيجةَ تُرسَل — اضبط القرار أوّلًا",
    };
  }

  const label = (value: string | null) =>
    value ? (findPreference(value)?.fullLabel ?? value) : "";

  const result = await sendMail(
    applicationDecision({
      fullName: row.full_name,
      email: row.email,
      status: row.status,
      choices: [row.choice1, row.choice2, row.choice3]
        .filter((value): value is string => Boolean(value))
        .map(label),
      /* الإحالةُ تكون إلى الرغبة الثانية — نفس ما تعرضه اللوحة */
      referredTo: row.status === "referred" ? label(row.choice2) : undefined,
    }),
  );

  if (!result.sent) {
    return {
      ok: false as const,
      message:
        result.reason === "no-key"
          ? "البريد غير موصول — يلزم ضبط RESEND_API_KEY"
          : "تعذّر الإرسال — حاول مرّة أخرى",
    };
  }

  return { ok: true as const, message: `أُرسل إلى ${row.email}` };
}
