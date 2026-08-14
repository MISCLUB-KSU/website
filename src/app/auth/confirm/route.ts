import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * مقصد رابط الدخول في البريد.
 *
 * ⚠️ **يقبل الصيغتين عمدًا.** قوالب بريد Supabase تُرسل إمّا
 * `token_hash` + `type` (القالب الحديث) أو `code` (تدفّق `PKCE`)، والقالب
 * المضبوط في المشروع قد يتغيّر من اللوحة بلا علم الكود. فمعالجةُ واحدةٍ
 * فقط تعني رابطًا لا يعمل ولا أحد يعرف لماذا — والفشل يظهر عند المُراجِع لا
 * عندنا. فيُجرَّب ما وصل أيًّا كان.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect("/admin");
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/admin");
  }

  /* الرسالة عامّة عمدًا: «انتهى الرابط أو استُعمل» لا تكشف أوجدَ البريد في
     الطاقم أم لا — فلا يُستعمل النموذج لاستكشاف من له صلاحية. */
  redirect("/admin/login?e=1");
}
