"use server";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message: string; ok: boolean };

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
  const same: LoginState = {
    ok: true,
    /* ⚠️ «القادة والإدارة» لا «الطاقم» — تتبع عنوانَ الشاشة (غُيّر ١١
       أغسطس ٢٠٢٦). والصياغةُ الشرطيّة تبقى: لا تكشف أوجد البريدُ أم لا. */
    message: "إن كان بريدك مسجّلًا ضمن القادة والإدارة، وصلك رابط الدخول. تحقّق منه.",
  };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
