"use server";

import { revalidatePath } from "next/cache";

import { findPreference } from "@/content/preferences";
import { sendMail } from "@/lib/email/client";
import { applicationDecision, isNotifiable } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";
import { DIRECT_STATUSES, type Note } from "./stats";

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

/**
 * ══════════════════════════════════════════════════════════════════════
 * **قاعدةُ `revalidatePath` في هذا الملفّ — تُقرأ قبل تعديل أيّ فعلٍ هنا**
 * ══════════════════════════════════════════════════════════════════════
 *
 * الصفحةُ `force-dynamic`، فـ`revalidatePath("/admin")` تعني: أعِد جلبَ
 * **كلّ** الطلبات وكلّ الملاحظات، وأعِد بناء الشجرة. وقِيس ما يُنقل في كلّ
 * مرّة: **٨١١ كB لـ٢٥٧ صفًّا** — منها ٣٣٧ كB `answers` و١١٤ كB `why`،
 * وكلاهما لا تقرؤه القائمةُ أصلًا بل ملفٌّ واحدٌ مفتوح. أي أن **٧٣٪ ممّا
 * يُنقل في كلّ ضغطةٍ لا يُقرأ**، والموسمُ المتوقَّع يزيد على ٦٠٠.
 *
 * فالقاعدة:
 *
 * · **فعلٌ يغيّر حقولًا يعرفها العميلُ أصلًا** (حالة · موعد · ملاحظة ·
 *   ختمُ إرسال) → **لا `revalidatePath`**. يُرجع الفعلُ **ما كتبه فعلًا**
 *   — لا ما طُلب منه — والعميلُ يرقّع صفوفَه بها. و`RLS` قد تردّ بعضَ
 *   الدفعة، فالمُرجَعُ هو ما نجح لا ما أُرسل.
 *
 * · **فعلٌ ينقل صفًّا بين النطاقات أو يقلب الموسم** (`pass_over` ·
 *   `set_phase`) → **`revalidatePath` باقية**. الصفُّ بعد التمرير يخرج من
 *   نطاق القائد، **فالعميلُ لا يملك الحقيقةَ الجديدة أصلًا** — `RLS` تحجبها
 *   عنه. وترقيعُه محليًّا يعني عرضَ صفٍّ لم يعد له.
 *
 * ⚠️ **ولا يُحذف `revalidatePath` من فعلٍ جديدٍ إلّا بعد أن يُكتب ترقيعُه في
 * العميل.** حذفُها وحدَها لا يُظهر خطأً ولا يكسر بناءً — يجعل الشاشةَ
 * **تسكت عن تغييرٍ وقع**، وهو صنفُ العطل الذي سُمّي هذا الفرعُ باسمه.
 */

export async function setStatus(id: string, status: string) {
  if (!(ALLOWED as readonly string[]).includes(status)) {
    return { ok: false as const, message: "حالة غير معروفة" };
  }

  /* ⛔ **`rejected` لا تُضبط بيد — والفحصُ هنا لا في الواجهة وحدها.**
     صارت تعني «انتهت رغباتُه كلُّها»، وهو حكمٌ تملكه القاعدةُ وحدها.
     وضبطُها من هنا يقفز فوق السلّم فيُخرج من له رغبتان باقيتان. */
  if (!DIRECT_STATUSES.includes(status)) {
    return {
      ok: false as const,
      message: "الاعتذار يمرّ بـ«لا يناسب لجنتي» — لا يُضبط مباشرةً",
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

  /* لا إعادةَ جلب — العميلُ يرقّع `status` بنفسه. انظر القاعدة أعلاه */
  return { ok: true as const, message: "", id, status };
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
  /** المختومون في هذي الدفعة — يرقّع بهم العميلُ `decision_mailed_at` */
  stamped: { id: string; at: string }[];
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
      stamped: [],
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
      stamped: [],
      remaining: 0,
      message: "لا رفضَ ينتظر الإرسال",
    };
  }

  const label = (value: string | null) =>
    value ? (findPreference(value)?.fullLabel ?? value) : "";

  let sent = 0;
  let failed = 0;
  let noKey = false;
  /** من خرجت رسالتُه **وخُتم صفُّه** — وحدَهم يُرقَّعون في العميل */
  const stamped: { id: string; at: string }[] = [];

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
    const at = new Date().toISOString();
    const { error: stampError } = await supabase
      .from("applications")
      .update({ decision_mailed_at: at })
      .eq("id", row.id);

    if (!stampError) stamped.push({ id: row.id, at });

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
      stamped,
      remaining,
      message: "البريد غير موصول — يلزم ضبط RESEND_API_KEY وتوثيق النطاق",
    };
  }

  return {
    ok: failed === 0,
    sent,
    failed,
    stamped,
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

/* ══════════════════════════════════════════════════════════════════════
   ملاحظات المراجعة والمقابلة
   ══════════════════════════════════════════════════════════════════════ */

/**
 * إضافةُ ملاحظة.
 *
 * ⚠️ **الكاتبُ لا يُرسَل من هنا.** محفِّزُ `stamp_note_author` يقرأ البريد
 * من الرمز ويجلب الاسمَ من `staff` — فلا يكتب أحدٌ باسم زميله ولو صنع
 * الاستدعاءَ بيده. والسياسةُ تفحص النطاق، فلا تُكتب ملاحظةٌ على طلبٍ خارجه.
 *
 * ⚠️ **وبعميل الجلسة لا بمفتاح الخدمة** — كبقيّة أفعال اللوحة.
 */
export async function addNote(applicationId: string, body: string) {
  const text = body.trim();
  if (text.length === 0) {
    return { ok: false as const, message: "اكتب الملاحظة أوّلًا" };
  }
  /* ⚠️ يُقصّ هنا وفي القاعدة معًا: القيدُ يحرس، وهذا يقول **لماذا** رُدّ
     بدل أن يخرج خطأُ Postgres خامًا للقائد. */
  if (text.length > 2000) {
    return { ok: false as const, message: "الملاحظة أطول من ٢٠٠٠ حرف" };
  }

  const supabase = await createClient();
  /* ⚠️ **يُقرأ الصفُّ بعد الكتابة لا يُبنى في العميل.** الكاتبُ واسمُه
     و`created_at` كلُّها من **محفِّزٍ في القاعدة** (`stamp_note_author`) —
     فملاحظةٌ يبنيها العميلُ من عنده تحمل اسمًا مخمَّنًا وتاريخًا محلّيًّا،
     ثم تتبدّل تحت عين كاتبها عند أوّل جلبٍ حقيقيّ. */
  const { data: created, error } = await supabase
    .from("application_notes")
    .insert({ application_id: applicationId, body: text })
    .select("*")
    .single();

  if (error) {
    /* بحقوله لا كائنًا كاملًا: `details` قد يحمل نصَّ الملاحظة كاملًا */
    console.error("[admin] تعذّرت إضافة ملاحظة", {
      code: error.code,
      message: error.message,
    });
    /* `42501` انتهاكُ سياسة — أي طلبٌ خارج النطاق، لا عطلٌ في اللوحة */
    return {
      ok: false as const,
      message:
        error.code === "42501" ? "هذا الطلب خارج نطاقك" : "تعذّر الحفظ",
    };
  }

  return { ok: true as const, message: "", note: created as Note };
}

/**
 * تعديلُ ملاحظة — **للكاتب وحده**، تفرضه السياسة لا هذي الدالّة.
 *
 * ولا يُمرَّر `updated_at`: محفِّزُ `touch_note` يختمه، ويعيد الكاتبَ
 * والطلبَ إلى ما كانا — فلا تُنقل ملاحظةٌ إلى طلبٍ آخر ولا تُنسب لغير من
 * كتبها.
 */
export async function editNote(id: string, body: string) {
  const text = body.trim();
  if (text.length === 0 || text.length > 2000) {
    return { ok: false as const, message: "نصٌّ غير صالح" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_notes")
    .update({ body: text })
    .eq("id", id)
    /* الصفُّ كاملًا: `touch_note` يختم `updated_at` فلا يُخمَّن هنا */
    .select("*");

  if (error) {
    console.error("[admin] تعذّر تعديل ملاحظة", {
      code: error.code,
      message: error.message,
    });
    return { ok: false as const, message: "تعذّر الحفظ" };
  }
  /* صفر صفّ = ليست ملاحظتَه. لا يُفرَّق عن «غير موجودة» في الرسالة. */
  if (!data || data.length === 0) {
    return { ok: false as const, message: "لا تُعدَّل إلّا ملاحظتُك" };
  }

  return { ok: true as const, message: "", note: data[0] as Note };
}

/** حذفُ ملاحظة — للكاتب وحده، بالمنطق نفسِه */
export async function deleteNote(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_notes")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[admin] تعذّر حذف ملاحظة", {
      code: error.code,
      message: error.message,
    });
    return { ok: false as const, message: "تعذّر الحذف" };
  }
  if (!data || data.length === 0) {
    return { ok: false as const, message: "لا تُحذَف إلّا ملاحظتُك" };
  }

  return { ok: true as const, message: "", id };
}

/**
 * **«لا يناسب لجنتي»** — تمريرُ المتقدّم إلى رغبته التالية.
 *
 * ⚠️ **ليست رفضًا من النادي.** من له رغبةٌ تالية ينزل إليها وتعود حالتُه
 * «جديدًا» عند قائدها؛ ومن لا رغبةَ بعدها يُعتذر عنه نهائيًّا. والقاعدةُ
 * وحدها تعرف أيَّهما — ولذلك لا يُضبط `rejected` بيد.
 *
 * ⚠️ **وتمرّ بدالّةٍ لا بتحديث.** الصفُّ بعد `stage + 1` يخرج من نطاق
 * القائد، فشرطُ `with check` يردّ التحديثَ الذي أذِنّا به للتوّ. والدالّة
 * تتحقّق من النطاق والمرحلة **قبل** النقل ثم تنقل.
 */
export async function passOver(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pass_over", { app_id: id });

  if (error) {
    console.error("[admin] تعذّر التمرير", {
      code: error.code,
      message: error.message,
    });
    return { ok: false as const, message: "تعذّر التمرير" };
  }

  /* رموزُ الدالّة تُترجَم هنا — ولا يُعرض رمزٌ إنجليزيٌّ لقائد */
  const outcome = String(data ?? "");
  if (outcome === "moved") {
    revalidatePath("/admin");
    return { ok: true as const, message: "نزل إلى رغبته التالية" };
  }
  if (outcome === "rejected") {
    revalidatePath("/admin");
    return { ok: true as const, message: "لا رغبةَ بعدها — اعتُذر عنه" };
  }
  if (outcome === "decided") {
    return { ok: false as const, message: "قرارُه نهائيٌّ ولا يُنقض بتمرير" };
  }
  if (outcome === "denied") {
    return { ok: false as const, message: "ليس عند رتبتِك الآن" };
  }
  return { ok: false as const, message: "الطلب غير متاح" };
}

/**
 * **فتحُ المرحلة التالية** — للرئاسة وحدها، تفرضه سياسةُ `settings`.
 *
 * ⚠️ **قرارُ موسمٍ لا تصرّفُ قائد.** فتحُ المرحلة الثانية يجعل من نزلوا
 * مرئيّين لقادة رغبتهم التالية دفعةً واحدة؛ وفتحُها قبل أن يفرغ قادةُ
 * الأولى يعني أن يملأ قادةُ الثانية نصيبَهم من دفعةٍ ناقصة — وهو الظلمُ
 * الذي وُجد السلّمُ ليمنعه.
 *
 * ⚠️ **ولا تُرجَع مرحلةٌ إلى الوراء من هنا.** من نزل لا يصعد بإغلاق
 * المرحلة، فإرجاعُها يُخفي أشخاصًا عن قادتهم بلا أن يردَّهم إلى أحد.
 * وتصحيحُ خطأٍ في الفتح يُراجَع في القاعدة بيدٍ واعية.
 */
export async function setPhase(phase: number) {
  if (![1, 2, 3].includes(phase)) {
    return { ok: false as const, message: "مرحلةٌ غير معروفة" };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("settings")
    .select("phase")
    .maybeSingle();

  if (current && phase < current.phase) {
    return {
      ok: false as const,
      message: "لا تُرجَع مرحلةٌ فُتحت — من نزل لا يصعد",
    };
  }

  const { data, error } = await supabase
    .from("settings")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select("phase");

  if (error) {
    console.error("[admin] تعذّر ضبط المرحلة", {
      code: error.code,
      message: error.message,
    });
    return { ok: false as const, message: "تعذّر الحفظ" };
  }
  /* صفر صفّ = ليس من الرئاسة. السياسةُ هي التي ردّت، لا هذي الدالّة. */
  if (!data || data.length === 0) {
    return { ok: false as const, message: "الرئاسة وحدها تفتح مرحلة" };
  }

  revalidatePath("/admin");
  return { ok: true as const, message: `فُتحت المرحلة ${phase}` };
}

/* ══════════════════════════════════════════════════════════════════════
   الأفعال الجماعيّة
   ══════════════════════════════════════════════════════════════════════ */

/**
 * سقفُ الدفعة الواحدة.
 *
 * ⚠️ **حارسٌ لا ذوق.** أكبرُ طابورٍ في الموسم ٤٦ (العلاقات العامة، مقيسٌ من
 * القاعدة)، فمئةٌ تسع «حدِّد الكلّ» في أيّ جهةٍ بهامشٍ مضاعف. وما فوقها
 * استدعاءٌ مصنوعٌ بيد، أو خللٌ في الواجهة يرسل مصفوفةً لا تنتهي.
 */
const BULK_MAX = 100;

/**
 * ضبطُ حالةِ عدّةِ طلباتٍ دفعةً واحدة.
 *
 * ⚠️ **استعلامٌ واحدٌ بـ`in` لا حلقةٌ من الاستدعاءات.** الحلقةُ تعني ٤٦
 * ذهابًا وإيابًا إلى القاعدة وأربعين ثانيةً على شبكةٍ متوسّطة، و`in` تُنجزها
 * في واحد. و`RLS` تقصّ الصفوف داخل الاستعلام نفسِه: ما ليس عند رتبة
 * القائد **لا يُحدَّث ولا يُبلَّغ عنه بخطأ** — فيُعدّ الفرقُ ويُقال.
 *
 * ⚠️ **والفرقُ يُقال ولا يُبتلع.** «غُيّرت ١٢» وحدَها تجعل القائدَ يظنّ أن
 * الخمسةَ عشرَ كلَّها تغيّرت. و«وتُخطّيت ٣» تدلّه أنّ ثلاثةً ليست عند رتبته
 * — وهو تفسيرٌ يفهمه، لا عطلٌ يشكو منه.
 */
export async function setStatusMany(ids: readonly string[], status: string) {
  if (!DIRECT_STATUSES.includes(status)) {
    return { ok: false as const, changed: 0, skipped: 0, message: "حالةٌ لا تُضبط مباشرةً" };
  }
  const list = [...new Set(ids)].filter(Boolean);
  if (list.length === 0) {
    return { ok: false as const, changed: 0, skipped: 0, message: "لم تحدّد أحدًا" };
  }
  if (list.length > BULK_MAX) {
    return {
      ok: false as const,
      changed: 0,
      skipped: 0,
      message: `الدفعة أكبر من ${BULK_MAX}`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .in("id", list)
    .select("id");

  if (error) {
    console.error("[admin] تعذّر ضبط دفعة", {
      code: error.code,
      message: error.message,
    });
    return { ok: false as const, changed: 0, skipped: 0, message: "تعذّر الحفظ" };
  }

  /* ⚠️ **المُرجَعُ ما غُيّر فعلًا لا ما أُرسل.** `RLS` تقصّ داخل الاستعلام،
     فمن ليس عند رتبة القائد لا يُحدَّث — وترقيعُ العميل بالقائمة المُرسَلة
     يلوّن صفوفًا لم تتغيّر في القاعدة. */
  const changedIds = (data ?? []).map((r) => r.id as string);
  const changed = changedIds.length;
  const skipped = list.length - changed;
  return {
    ok: true as const,
    ids: changedIds,
    status,
    changed,
    skipped,
    message:
      skipped === 0
        ? `غُيّرت ${changed}`
        : `غُيّرت ${changed}، وتُخطّيت ${skipped} ليست عند رتبتك`,
  };
}

/**
 * تمريرُ عدّةِ متقدّمين دفعةً واحدة.
 *
 * ⚠️ **حلقةٌ هنا ولا مفرّ منها.** `pass_over` تقرأ رتبةَ كلّ صفٍّ ورغباتِه
 * لتقرّر: أينزل أم يُعتذر عنه نهائيًّا؟ فالقرارُ صفٌّ صفّ، ولا يُختصر في
 * `in` واحد. والسقفُ يحمي من دفعةٍ تطول فتُقطع الدالّةُ في منتصفها.
 *
 * ⚠️ **والنتائجُ تُفصَّل ولا تُجمَع.** «مُرّر ٢٠» يخفي أن سبعةً منهم انتهت
 * رغباتُهم فاعتُذر عنهم **نهائيًّا** — وهو أثقلُ قرارٍ في اللوحة. فيُقال
 * العددان منفصلين.
 */
export async function passOverMany(ids: readonly string[]) {
  const list = [...new Set(ids)].filter(Boolean);
  if (list.length === 0) {
    return { ok: false as const, moved: 0, rejected: 0, skipped: 0, message: "لم تحدّد أحدًا" };
  }
  if (list.length > BULK_MAX) {
    return {
      ok: false as const,
      moved: 0,
      rejected: 0,
      skipped: 0,
      message: `الدفعة أكبر من ${BULK_MAX}`,
    };
  }

  const supabase = await createClient();
  let moved = 0;
  let rejected = 0;
  let skipped = 0;

  for (const id of list) {
    const { data, error } = await supabase.rpc("pass_over", { app_id: id });
    if (error) {
      console.error("[admin] تعذّر تمريرٌ في دفعة", {
        code: error.code,
        message: error.message,
      });
      skipped += 1;
      continue;
    }
    const outcome = String(data ?? "");
    if (outcome === "moved") moved += 1;
    else if (outcome === "rejected") rejected += 1;
    else skipped += 1;
  }

  revalidatePath("/admin");
  const parts: string[] = [];
  if (moved > 0) parts.push(`نزل ${moved}`);
  if (rejected > 0) parts.push(`واعتُذر نهائيًّا عن ${rejected}`);
  if (skipped > 0) parts.push(`وتُخطّي ${skipped}`);
  return {
    ok: skipped === 0,
    moved,
    rejected,
    skipped,
    message: parts.join(" · ") || "لم يتغيّر شيء",
  };
}

/**
 * ضبطُ موعد المقابلة — أو مسحُه بقيمةٍ فارغة.
 *
 * ⚠️ **الوقتُ يصل لحظةً مطلقة (`ISO`) لا نصًّا محلّيًّا.** التحويلُ من
 * توقيت الرياض يقع في العميل حيث كُتب، فلا يتأثّر بمنطقة الخادم.
 */
export async function setInterview(id: string, iso: string | null) {
  if (iso !== null && Number.isNaN(Date.parse(iso))) {
    return { ok: false as const, message: "موعدٌ غير صالح" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .update({ interview_at: iso })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[admin] تعذّر ضبط الموعد", {
      code: error.code,
      message: error.message,
    });
    return { ok: false as const, message: "تعذّر الحفظ" };
  }
  if (!data || data.length === 0) {
    return { ok: false as const, message: "ليس عند رتبتِك" };
  }

  return {
    ok: true as const,
    id,
    interview_at: iso,
    message: iso ? "حُفظ الموعد" : "مُسح الموعد",
  };
}

/* ══════════════════════════════════════════════════════════════════════
   الطاقم — إضافةُ القادة وتعديلُهم

   ⚠️ **لماذا شاشةٌ لا سطرُ SQL.** كان إدخالُ قائدٍ يمرّ بقالبٍ في
   `supabase/seed/leaders.template.sql` يُملأ بأسماءٍ وبُرد ثم يُشغَّل على
   قاعدةٍ حيّة. وثلاثةُ أثمانٍ لذلك:

   · **لا يفعله إلّا من يعرف SQL** — أي شخصٌ واحدٌ في النادي.
   · **وأسماءُ الأشخاص لا تدخل المستودع** (قاعدةُ النادي)، فيبقى القالبُ
     فارغًا ويُملأ في ملفٍّ خارجه يضيع عند تبديل الدورة.
   · **وخطأٌ مطبعيٌّ في نطاقٍ لا يُكتشف** إلّا حين يفتح القائدُ شاشةً
     فارغةً ولا يعرف لماذا.

   والصلاحيةُ موجودةٌ أصلًا: سياسةُ «الرئاسة تدير الطاقم» على `staff`
   بـ`ALL` وشرطُها `current_staff_role() = 'admin'`. فالناقصُ لم يكن إذنًا
   بل شاشة. وهذي الأفعالُ تمرّ **بعميل الجلسة**، فالقاعدةُ هي التي تأذن
   لا هذي الدوالّ — وإخفاءُ تبويبٍ ليس منعًا.
   ══════════════════════════════════════════════════════════════════════ */

/** الأدوارُ المسموحة — قائمةٌ مغلقة، فلا يُكتب دورٌ لا تعرفه السياسات */
const STAFF_ROLES: readonly string[] = ["admin", "leader"];

/**
 * ⚠️ **النطاقُ يُفحص بشكله.** `inScopes` تطابق ببادئة، فنطاقٌ مكتوبٌ بخطأٍ
 * مطبعيّ لا يطابق شيئًا — **ويفتح للقائد شاشةً فارغةً بلا رسالة**. فالشكلُ
 * يُفحص هنا، والقيمُ تأتي من قائمةٍ في الواجهة لا من كتابةٍ حرّة.
 */
function validScope(s: string): boolean {
  return /^(committee|project):[a-z0-9-]+$/.test(s);
}

export async function saveStaff(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const scopes = formData
    .getAll("scopes")
    .map((s) => String(s).trim())
    .filter(Boolean);

  if (!email.includes("@") || email.length < 5) {
    return { ok: false as const, message: "بريدٌ غير صحيح" };
  }
  if (!STAFF_ROLES.includes(role)) {
    return { ok: false as const, message: "دورٌ غير معروف" };
  }
  if (scopes.some((s) => !validScope(s))) {
    return { ok: false as const, message: "نطاقٌ بصيغةٍ غير معروفة" };
  }
  /* ⚠️ **قائدٌ بلا نطاقٍ يرى صفرًا.** `inScopes` على مصفوفةٍ فارغة تُرجع
     «لا» دائمًا — فيدخل ويجد شاشةً فارغةً ويظنّ اللوحةَ معطوبة. والرئاسةُ
     عكسُه: نطاقُها الكلّ، فمصفوفتُها فارغةٌ عمدًا. */
  if (role === "leader" && scopes.length === 0) {
    return { ok: false as const, message: "اختر نطاقًا واحدًا على الأقلّ" };
  }

  const supabase = await createClient();

  /**
   * 🔴 **حارسُ آخر رئاسة — وكان البابُ هنا مفتوحًا بينما القفلُ على الآخر.**
   *
   * `removeStaff` تمنع حذفَ آخر رئاسةٍ وحذفَ النفس. **ونزعُ الدور يفعل ما
   * يفعله الحذفُ سواءً**: من صار «قائدًا» لم يعد يرى تبويبَ الطاقم ولا
   * تأذن له السياسة — فيبقى الجدولُ بلا من يديره، ولا سبيلَ إلى ردّه إلّا
   * من لوحة Supabase. فقفلٌ على بابٍ وبابٌ مفتوحٌ بجانبه لا يحرس شيئًا.
   */
  if (role !== "admin") {
    const { data: current } = await supabase
      .from("staff")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (current?.role === "admin") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if ((user?.email ?? "").toLowerCase() === email) {
        return { ok: false as const, message: "لا تنزع الرئاسةَ عن نفسِك" };
      }

      const { data: admins } = await supabase
        .from("staff")
        .select("email")
        .eq("role", "admin");
      if ((admins ?? []).length <= 1) {
        return {
          ok: false as const,
          message: "لا تُنزع الرئاسةُ عن آخر من يديرها",
        };
      }
    }
  }

  const { data, error } = await supabase
    .from("staff")
    .upsert(
      {
        email,
        role,
        scopes: role === "admin" ? [] : scopes,
        display_name: displayName || null,
      },
      { onConflict: "email" },
    )
    .select("email, role, scopes, display_name, created_at");

  if (error) {
    /* بحقوله لا كائنًا كاملًا — `details` قد يحمل الصفَّ ببريده */
    console.error("[admin] تعذّر حفظ صفّ الطاقم", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false as const,
      message:
        error.code === "42501" ? "الرئاسة وحدها تدير الطاقم" : "تعذّر الحفظ",
    };
  }

  return { ok: true as const, message: "حُفظ", row: data?.[0] ?? null };
}

/**
 * حذفُ صفٍّ من الطاقم.
 *
 * ⚠️ **حارسان لا تفرضهما السياسةُ ويفرضهما العقل:**
 *
 * ١) **لا يحذف المرءُ نفسَه** — يفقد اللوحةَ في اللحظة نفسِها، ولا يملك
 *    ردَّها إلّا بمن بقي من الرئاسة أو بمفتاح الخدمة.
 * ٢) **ولا يُحذف آخرُ رئاسة** — فيبقى الطاقمُ بلا من يديره، ولا سبيلَ إلى
 *    إضافة أحدٍ إلّا من لوحة Supabase. وهي «نقطةُ الفشل الواحدة» التي
 *    كُتب ملفُّ التسليم لأجلها — فلا تُصنع بزرّ.
 */
export async function removeStaff(email: string) {
  const target = email.trim().toLowerCase();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if ((user?.email ?? "").toLowerCase() === target) {
    return { ok: false as const, message: "لا تحذف نفسَك من الطاقم" };
  }

  const { data: admins, error: countError } = await supabase
    .from("staff")
    .select("email")
    .eq("role", "admin");

  if (countError) {
    console.error("[admin] تعذّر عدُّ الرئاسة", {
      code: countError.code,
      message: countError.message,
    });
    return { ok: false as const, message: "تعذّر التحقّق" };
  }

  const list = admins ?? [];
  if (list.length <= 1 && list.some((a) => a.email === target)) {
    return { ok: false as const, message: "لا يُحذف آخرُ من يدير الطاقم" };
  }

  const { data, error } = await supabase
    .from("staff")
    .delete()
    .eq("email", target)
    .select("email");

  if (error) {
    console.error("[admin] تعذّر حذف صفّ الطاقم", {
      code: error.code,
      message: error.message,
    });
    return {
      ok: false as const,
      message:
        error.code === "42501" ? "الرئاسة وحدها تدير الطاقم" : "تعذّر الحذف",
    };
  }
  if (!data || data.length === 0) {
    return { ok: false as const, message: "لم يُوجد" };
  }

  return { ok: true as const, message: "حُذف", email: target };
}
