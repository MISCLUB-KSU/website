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

    /**
     * **يُنشأ الحسابُ موثَّقًا قبل الإرسال — وإلّا وصلته رسالةُ توثيقٍ لا
     * رسالةَ دخول.**
     *
     * ⚠️ **عطلٌ وقع مرّتين قبل أن يُفهم (١٨ و٢٠ أغسطس ٢٠٢٦).**
     * `signInWithOtp` تُنشئ الحسابَ إن لم يوجد؛ ومع تفعيل تأكيد البريد في
     * المشروع يرسل Supabase عندئذٍ قالبَ **«أكّد تسجيلك»** لا قالبَ الرابط
     * السحريّ. والفرقُ قاتل: تلك الرسالةُ **لا رمزَ فيها**، ورابطُها
     * يُستهلك مرّةً فيرتدّ صاحبُه إلى شاشة الدخول بلا سببٍ مفهوم. قِيس في
     * السجلّ: خمسُ `One-time token not found` لقائدٍ واحدٍ في تسع دقائق،
     * وقولُه حرفًا: «عيا يتوثق ايميلي، ولا جاني رمز».
     *
     * ⚠️ **والتوثيقُ هنا لا يفتح بابًا.** البريدُ مسجَّلٌ في `staff` — فُحص
     * قبل سطرين — والجلسةُ لا تُمنح إلّا بعد أن يُثبت صاحبُه ملكيّةَ صندوقه
     * برمزٍ أو رابطٍ يصله. فالتوثيقُ المسبق يحذف خطوةً لا حارسًا.
     *
     * ⚠️ **ويُتجاهَل خطأُ «موجودٌ أصلًا» ولا يُردّ به.** أغلبُ النداءات
     * لحساباتٍ قائمة، وهي الحالةُ السويّة لا الخطأ. وما عداه يُسجَّل
     * ويمضي: فشلُ الإنشاء لا يمنع محاولةَ الإرسال — وأسوأُ ما يقع أن يعود
     * السلوكُ إلى ما كان.
     */
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError && !/already|exists|registered/i.test(createError.message)) {
      console.error("[admin] تعذّر تهيئة الحساب", createError.message);
    }

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

  /* ⚠️ **الطول مدًى لا رقمٌ واحد.** قيّدتُه بستّةٍ أوّلَ بناءٍ افتراضًا، ثم
     وصل الرمز الحقيقيّ **ثمانيةَ أرقام** — فكان الحقل يردّه قبل أن يصل
     الخادمَ أصلًا. وطولُ الرمز إعدادٌ في لوحة Supabase يقبل ٦ إلى ١٠،
     فيُقبل المدى كلُّه ولا يُفترض رقمٌ بعينه. */
  if (!email || token.length < 6 || token.length > 10) {
    return {
      ok: false,
      sent: true,
      email,
      message: "اكتب الرمز كما وصلك — أرقامًا بلا مسافات.",
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

/**
 * الخروج — **ثم العودة إلى الموقع**.
 *
 * ⚠️ **كان بلا وجهة، فيبقى القارئ على `/admin` بلا جلسة.** الصفحةُ لا
 * تُعاد رسمتُها بعد `Server Action` ما لم يُطلب ذلك، فيرى القائدُ لوحةً
 * ميّتةً بين يديه: بياناتٌ معروضةٌ وجلسةٌ مُلغاة، وأولُ نقرةٍ تقذفه إلى
 * صفحةٍ لا تُحمَّل. وهو ما بلّغ عنه من جرّبه (١٥ أغسطس ٢٠٢٦).
 *
 * فيُوجَّه إلى الرئيسية: من ضغط «خروج» انتهى من اللوحة، والموقعُ هو المكان
 * الطبيعيّ الذي يخرج إليه — لا صفحةُ دخولٍ تدعوه للعودة فورًا.
 *
 * و`redirect` ترمي استثناءً يلتقطه Next، فلا يوضع بعدها شيء ولا تُغلَّف
 * في `try`.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
