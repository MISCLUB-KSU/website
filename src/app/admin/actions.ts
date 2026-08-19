"use server";

import { revalidatePath } from "next/cache";

import { findPreference } from "@/content/preferences";
import { sendMail } from "@/lib/email/client";
import { applicationDecision, isNotifiable } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";
import { PHASE_ONE_STATUSES } from "./stats";

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

  /* ⛔ **بوّابةُ المرحلة الأولى — والفحصُ هنا لا في الواجهة وحدها.**
     إخفاءُ زرٍّ ليس منعًا: الفعلُ الخادميّ يُستدعى بيدٍ، والقرارُ الذي
     يُكتب `rejected` اليوم لا رجعةَ فيه — لأن الصفَّ لا يحفظ عند أيّ
     رغبةٍ رُفض، فلا يُعرف بعد إضافة `stage` من يستحقّ النزول إلى رغبته
     الثانية. تُرفع هذي البوّابةُ مع السلّم. */
  if (!PHASE_ONE_STATUSES.includes(status)) {
    return {
      ok: false as const,
      message: "الاعتذار مقفولٌ في هذي المرحلة — اتركه «جديدًا» إن لم ترده",
    };
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

/* ══════════════════════════════════════════════════════════════════════
   الإرسال بالجملة
   ══════════════════════════════════════════════════════════════════════ */

/**
 * كم رسالةً في الاستدعاء الواحد.
 *
 * ⚠️ **الرقم محكومٌ بحدّين لا بذوق:**
 *   · **مهلةُ الدالّة** — دالّةُ Vercel تُقطع بعد ثوانٍ معدودة، والإرسالُ
 *     شبكيٌّ متسلسل. عشرون رسالةً × نصف ثانية ≈ ١٠ ثوانٍ، وهي تحت المهلة
 *     بهامشٍ يحتمل بطءَ مزوّدٍ عارضًا.
 *   · **حدُّ المزوّد** — Resend يقبل طلبين في الثانية على الخطط الدنيا،
 *     فالتباطؤ أدناه يلزم وإلّا رُدَّت الدفعةُ نصفُها بـ429.
 *
 * والواجهةُ تستدعي مرارًا حتى يفرغ المتبقّي، فلا يقيّد هذا الرقمُ الحصيلة
 * — يقيّد طولَ الاستدعاء الواحد وحده.
 */
const BATCH = 20;

/** ٥٠٠ms بين رسالتين — دون سقف المزوّد بهامش */
const GAP_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * **إرسالُ قرارات الرفض لمن لم تصله بعد.**
 *
 * ⚠️ **`decision_mailed_at` هو الحارس، لا عدّادٌ في الواجهة.** الإرسالُ
 * ينقطع ويُستأنف — مهلةُ دالّة، أو تبويبٌ يُغلق، أو نصيبُ اليومِ ينفد.
 * فلو كان الحدُّ عدّادًا في المتصفّح لبدأ كلُّ استئنافٍ من الصفر: يستلم
 * المرفوضُ رفضَه مرّتين وثلاثًا. والختمُ في القاعدة يجعل الاستئناف يلتقط
 * من حيث انتهى مهما تكرّر.
 *
 * ⚠️ **ويُختم بعد نجاح الإرسال لا قبله.** الترتيبُ المعكوس يضيّع من فشل
 * بريدُه بلا أثر — وهو صنفُ العطل الذي عطّل التقديم مرّتين: فشلٌ لا يصرخ.
 * وثمنُ هذا الترتيب معروفٌ ومقبول: لو سقطت الدالّةُ **بين** الإرسال والختم
 * لخرجت رسالةٌ بلا ختم، فتُرسَل ثانيةً. رسالةٌ مكرّرةٌ نادرةٌ أهونُ من
 * مرفوضٍ لا يصله شيء.
 *
 * ⚠️ **وبعميل الجلسة لا بمفتاح الخدمة.** `RLS` تقصّ الصفوف على نطاق
 * القارئ: قائدٌ يرسل لمرفوضي لجنته، والرئاسةُ للجميع. ولو مرّ بمفتاح
 * الخدمة لصار أيُّ قائدٍ يراسل كلَّ متقدّمٍ في النادي.
 *
 * ⛔ **والرفضُ وحده يُرسَل بالجملة.** القبولُ قناتُه واتساب بقرار الإدارة،
 * والإحالةُ تحتاج ذكرَ الجهة فتُراجَع فرديًّا. وقصرُ الدالّة على `rejected`
 * يمنع أن يخرج قبولٌ بريدًا بضغطةٍ واحدةٍ على مئتين.
 */
export async function sendPendingRejections(): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  remaining: number;
  message: string;
}> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("applications")
    .select("id, full_name, email, status, choice1, choice2, choice3")
    .eq("status", "rejected")
    .is("decision_mailed_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    /* بحقوله لا كائنًا كاملًا: `details` قد يحمل الصفَّ برقم أحواله */
    console.error("[admin] تعذّرت قراءة دفعة الرفض", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false,
      sent: 0,
      failed: 0,
      remaining: 0,
      message: "تعذّرت القراءة",
    };
  }

  const batch = rows ?? [];
  if (batch.length === 0) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      remaining: 0,
      message: "لا رفضَ ينتظر الإرسال",
    };
  }

  const label = (value: string | null) =>
    value ? (findPreference(value)?.fullLabel ?? value) : "";

  let sent = 0;
  let failed = 0;
  let noKey = false;

  for (const [index, row] of batch.entries()) {
    /* تباطؤٌ **بين** الرسائل لا قبل الأولى — لا معنى لانتظارٍ قبل أوّل طلب */
    if (index > 0) await sleep(GAP_MS);

    const result = await sendMail(
      applicationDecision({
        fullName: row.full_name,
        email: row.email,
        status: "rejected",
        choices: [row.choice1, row.choice2, row.choice3]
          .filter((value): value is string => Boolean(value))
          .map(label),
      }),
    );

    if (!result.sent) {
      failed += 1;
      /* ⚠️ **غيابُ المفتاح يوقف الدفعة كلَّها فورًا.** المضيُّ فيها يعني
         عشرين فشلًا متطابقًا في السجلّ، وثوانيَ ضائعة، ورسالةً تقول
         «فشل ٢٠» بدل أن تقول **السبب**. */
      if (result.reason === "no-key") {
        noKey = true;
        break;
      }
      continue;
    }

    /* الختمُ بعد النجاح — وبعميل الجلسة، فتحكمه `RLS` كما تحكم القراءة */
    const { error: stampError } = await supabase
      .from("applications")
      .update({ decision_mailed_at: new Date().toISOString() })
      .eq("id", row.id);

    if (stampError) {
      /* ⚠️ خرجت الرسالةُ ولم يُختم — تُرسَل ثانيةً في دفعةٍ لاحقة. يُسجَّل
         صراحةً لأنه السبب الوحيد لتكرارٍ يراه المتقدّم. */
      console.error("[admin] أُرسل الرفض ولم يُختم الصفّ", {
        id: row.id,
        code: stampError.code,
        message: stampError.message,
      });
    }
    sent += 1;
  }

  /* المتبقّي يُحسب **بعد** الدفعة من القاعدة لا بالطرح: الطرحُ يفترض ألّا
     أحدًا غيّر حالةً أثناء الإرسال، وقائدان يعملان معًا ينقضان الافتراض. */
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected")
    .is("decision_mailed_at", null);

  const remaining = count ?? 0;

  if (noKey) {
    return {
      ok: false,
      sent,
      failed,
      remaining,
      message: "البريد غير موصول — يلزم ضبط RESEND_API_KEY وتوثيق النطاق",
    };
  }

  revalidatePath("/admin");
  return {
    ok: failed === 0,
    sent,
    failed,
    remaining,
    message:
      failed === 0
        ? `أُرسل ${sent}، وبقي ${remaining}`
        : `أُرسل ${sent}، وتعذّر ${failed}، وبقي ${remaining}`,
  };
}

/** كم رفضًا ينتظر الإرسال — تقرؤه اللوحة لتعرض العدد قبل أن يُضغط شيء */
export async function pendingRejectionCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected")
    .is("decision_mailed_at", null);
  return count ?? 0;
}
