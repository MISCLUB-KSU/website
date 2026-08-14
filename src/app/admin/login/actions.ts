"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * `sent` تفتح خانةَ الرمز، و`email` تُعاد لتُرسَل معه في الخطوة الثانية —
 * فلا يُطالَب القائد بكتابة بريده مرّتين.
 */
export type LoginState = {
  message: string;
  ok: boolean;
  sent?: boolean;
  email?: string;
};

/**
 * إرسال رابط الدخول.
 *
 * ⚠️ **الردّ واحدٌ في كل الحالات** — «أرسلنا الرابط إن كان بريدك مسجّلًا».
 * ردٌّ يقول «هذا البريد ليس في الطاقم» يحوّل النموذج إلى أداةِ استكشاف:
 * يجرّب المرء عناوين حتى يعرف مَن يملك صلاحية الاطّلاع على أرقام هويات
 * الطلاب. والسكوت أغلى من الوضوح هنا.
 *
 * ⚠️ **والفحص قبل الإرسال لا بعده.** `signInWithOtp` تُنشئ مستخدمًا إن لم
 * يوجد، فبلا هذا الفحص يستطيع أيّ أحدٍ توليد حسابات بلا حدّ ويُغرق بريد
 * المشروع بحصّته. من ليس في `staff` لا يُرسَل له شيء أصلًا.
 */
export async function sendLoginLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const same: LoginState = {
    ok: true,
    sent: true,
    email,
    /* ⚠️ «القادة والإدارة» لا «الطاقم» — تتبع عنوانَ الشاشة (غُيّر ١١
       أغسطس ٢٠٢٦). والصياغةُ الشرطيّة تبقى: لا تكشف أوجد البريدُ أم لا.

       ⚠️ **و«آخر رسالة» صراحةً.** كلُّ إرسالٍ جديد يُبطل ما قبله، ومن
       ضغط مرّتين ثم فتح البريد **الأول** يجد رمزًا ميّتًا — وهو ما
       تكرّر أربع مرّاتٍ في سجلّ المصادقة (`One-time token not found`). */
    message:
      "إن كان بريدك مسجّلًا ضمن القادة والإدارة، وصلك رمزٌ ورابط. افتح «آخر» رسالة وصلتك — وما قبلها بطل.",
  };

  if (!email || !email.includes("@")) {
    return { ok: false, message: "اكتب بريدًا صحيحًا." };
  }

  /* ⚠️ **الالتقاط هنا لأن الاستثناء يقتل الردّ.** متغيّرٌ ناقص أو انقطاعٌ
     يرمي من `createAdminClient`، و`Server Action` التي ترمي لا تُرجع حالةً
     — فيبقى الزرّ كأنه ميت ولا رسالة. السبب يُسجَّل كاملًا في سجلّ الخادم،
     والمستخدم يُقال له إن الخلل عندنا لا عنده. */
  try {
    const admin = createAdminClient();
    const { data: staff, error: lookupError } = await admin
      .from("staff")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!staff) return same;

    const origin = (await headers()).get("origin") ?? "";
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });

    if (error) {
      console.error("[admin] تعذّر إرسال رابط الدخول", error.message);
      return { ok: false, message: "تعذّر الإرسال الآن. جرّب بعد قليل." };
    }

    return same;
  } catch (cause) {
    console.error("[admin] خلل في إعداد الدخول", cause);
    return {
      ok: false,
      message: "الخدمة غير مهيّأة الآن. أبلغ من يدير الموقع.",
    };
  }
}

/**
 * التحقّق بالرمز — البابُ الثاني إلى الجلسة نفسِها.
 *
 * ⚠️ **وهو الذي يعالج العطل الحقيقيّ.** الرابط يُستهلَك قبل صاحبه: ماسحاتُ
 * البريد (Gmail وOutlook) تفتح الروابط تلقائيًّا للفحص، فيصل القائد إلى
 * رمزٍ «غير موجود». والرمزُ لا يُنقر فلا يستهلكه ماسح — يُقرأ ويُكتب.
 *
 * ⚠️ **والرابط يبقى عاملًا.** هذا بابٌ ثانٍ لا بديل: لو لم يُحدَّث قالبُ
 * البريد في لوحة Supabase ليحوي `{{ .Token }}` فلن يظهر رمزٌ في الرسالة،
 * ويبقى الرابطُ وحده — فلا تنكسر الشاشة، بل يفقد القائد الطريق الأسرع.
 */
export async function verifyLoginCode(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  /* الأرقام وحدها: النسخُ من البريد يجرّ مسافةً أو سطرًا، والرمزُ ستّةُ
     أرقامٍ لا غير — فتُنقّى قبل الإرسال بدل أن تُردَّ على الطالب. */
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (!email || token.length !== 6) {
    return {
      ok: false,
      sent: true,
      email,
      message: "اكتب الرمز — ستّة أرقام كما وصلك.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      /* ⚠️ الرسالة تصف الحالتين معًا — انتهاءً واستعمالًا — ولا تفرّق
         بينهما: التفريقُ يقول لمن يجرّب إن الرمز كان صحيحًا يومًا. */
      return {
        ok: false,
        sent: true,
        email,
        message: "الرمز غير صحيح أو انتهى. اطلب رمزًا جديدًا.",
      };
    }
  } catch (cause) {
    console.error("[admin] خلل في التحقّق من الرمز", cause);
    return {
      ok: false,
      sent: true,
      email,
      message: "الخدمة غير مهيّأة الآن. أبلغ من يدير الموقع.",
    };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
