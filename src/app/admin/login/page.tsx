"use client";

import { useActionState, useEffect, useState } from "react";

import { Button, BusyMark } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { sendLoginLink, verifyLoginCode, type LoginState } from "./actions";

/**
 * مهلةُ إعادة الإرسال — ستّون ثانية.
 *
 * ⚠️ **وهي علاجُ عطلٍ مقيس لا تجميل.** كلُّ إرسالٍ يُبطل ما قبله، ومن لم
 * يرَ البريد في ثانيتين ضغط ثانيةً ثم فتح الرسالة **الأولى** فوجد رمزًا
 * ميّتًا — أربعُ مرّاتٍ في سجلّ المصادقة (`One-time token not found`).
 * فالزرُّ يُقفل ستّين ثانية: مدّةٌ تكفي لوصول الرسالة، وتمنع الإبطالَ
 * الذي يسبّبه الاستعجال.
 */
const RESEND_SECONDS = 60;

/**
 * دخول معالي القادة والإدارة — برابطٍ يصل البريد، بلا كلمة مرور.
 *
 * **لماذا بلا كلمة مرور؟** الصفحة تعرض أرقام هويات الطلاب وجوالاتهم. كلمة
 * مرورٍ واحدةٌ مشتركة تنتشر في الواتس ولا يُعرف من دخل بها؛ وكلماتٌ لكلٍّ
 * تعني توليدَها وتوزيعَها وتغييرَها عند كل تبديل قائد. والبريد هو الهويّة
 * أصلًا: نطاقُ الاطّلاع معلَّقٌ به في `staff`، ونزعُ الصلاحية شطبُ سطر.
 */
export default function AdminLoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendLoginLink,
    { ok: false, message: "" },
  );
  const [codeState, codeAction, codePending] = useActionState<
    LoginState,
    FormData
  >(verifyLoginCode, { ok: false, message: "" });

  /* ⚠️ **الضبط أثناء العرض لا داخل `useEffect`.** العدّاد مشتقٌّ من ردٍّ
     جديد وصل، وتأجيلُه إلى ما بعد الرسم يُظهر الزرَّ مفتوحًا ومضةً ثم
     يُقفله. وهو النمط الذي تستعمله `registration-form.tsx` نفسُها، ويرفض
     `react-hooks/set-state-in-effect` غيرَه. */
  const [left, setLeft] = useState(0);
  const [lastReply, setLastReply] = useState<LoginState | null>(null);
  if (state !== lastReply) {
    setLastReply(state);
    if (state.sent) setLeft(RESEND_SECONDS);
  }

  /* والتنازل بمؤقّتٍ واحدٍ لكل ثانية — لا `setInterval` يبقى بعد الصفر */
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const email = codeState.email ?? state.email ?? "";
  const shown = codeState.message || state.message;
  const ok = codeState.message ? codeState.ok : state.ok;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5 py-14">
      <span
        className="mis-slant bg-deep mb-4 inline-block self-start px-7 py-1.5"
        aria-hidden
      >
        <span className="text-snow text-[0.7rem] font-semibold tracking-widest">
          إدارة النادي
        </span>
      </span>

      {/* ⚠️ **`text-fg` لا `text-deep`.** الأزرق العميق لونُ علامةٍ لا لونُ
          نصّ: كان يُقرأ نهارًا مصادفةً، ولمّا صارت اللوحة داكنة سقط إلى
          **1.32:1** — كحليٌّ على حبر. راجع `mis-club-role-token-misuse`. */}
      {/* ⚠️ النصُّ بحرفه بطلب الإدارة (١١ أغسطس ٢٠٢٦): «دخول معالي القادة
          والإدارة» — بعد «دخول الطاقم» ثم «دخول الإدارة والقادة».
          والرسمُ صُحّح إلى «الإدارة» بالهمزة كبقيّة الموقع، واللفظُ كما
          طُلب. وهو يسمّي **من يدخل** لا الفعل: اللوحةُ واحدةٌ يقصّها RLS،
          يدخلها الإدارةُ وقادةُ اللجان والوحدات والمشاريع. */}
      {/* ⚠️ **لوحٌ لا نصٌّ عارٍ.** كانت الحقول تطفو مباشرةً على أرضية
          `/admin`، فتُقرأ الصفحة ناقصةً على شاشةٍ واسعة: عمودٌ 448px في
          1512px وحوله فراغ. و`.panel` رمزُ هذي اللوحة نفسِه — معرَّفٌ في
          `admin.css` وله نظيرٌ ليليّ — فالعلاج من النظام لا من خارجه. */}
      <div className="panel p-s6">
        <h1 className="text-fg mb-3 text-2xl font-bold sm:text-3xl">
          دخول معالي القادة والإدارة
        </h1>
        <p className="text-fg-muted mb-s6 leading-relaxed">
          اكتب بريدك ويصلك رابط دخول. الرابط لمرّةٍ واحدة وينتهي بعدها.
        </p>

        <form action={action} className="flex flex-col gap-s5" noValidate>
          <TextField
            id="email"
            label="بريدك"
            required
            type="email"
            defaultValue={email}
            placeholder="name@ksu.edu.sa"
            dir="ltr"
            className="text-start"
          />

          <Button
            type="submit"
            disabled={pending || left > 0}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <BusyMark /> جارٍ الإرسال…
              </>
            ) : left > 0 ? (
              <>
                أعد الإرسال بعد <span dir="ltr">{left}</span> ثانية
              </>
            ) : state.sent ? (
              "أعد الإرسال"
            ) : (
              "أرسل رمز الدخول"
            )}
          </Button>
        </form>

        {shown && (
          <p
            role="status"
            className={`mt-s5 border-s-2 px-s4 py-s3 text-[0.9rem] leading-relaxed ${
              ok
                ? "border-success bg-success/8 text-success"
                : "border-danger bg-danger/8 text-danger"
            }`}
          >
            {shown}
          </p>
        )}

        {/* ⚠️ **بابان إلى الجلسة نفسِها.** الرابط في الرسالة يبقى عاملًا،
            وهذي الخانة للرمز — والرمزُ هو الذي يعالج العطل: ماسحاتُ البريد
            تفتح الروابط تلقائيًّا فتستهلكها قبل صاحبها، ولا شيء يُنقر في
            رمزٍ يُقرأ. ولو لم يُحدَّث قالبُ البريد ليحوي `{{ .Token }}` بقي
            الرابطُ وحده ولم تنكسر الشاشة. */}
        {state.sent && (
          <form action={codeAction} className="mt-s6 flex flex-col gap-s4">
            <input type="hidden" name="email" value={email} readOnly />
            <TextField
              id="code"
              label="أو اكتب الرمز الذي وصلك"
              /* ⚠️ `inputMode` و`autoComplete` لأن الرمز يصل الجوّال غالبًا:
                 الأولى تفتح لوحة الأرقام، والثانية تعرضه فوق الكيبورد
                 فيُلصَق بضغطة بدل التنقّل بين تطبيقين. */
              inputMode="numeric"
              autoComplete="one-time-code"
              /* ⚠️ **عشرةٌ لا ستّة.** كان `6` افتراضًا، والرمز الحقيقيّ وصل
                 **ثمانيةً** — فكان الحقل يقصّ آخر رقمين صامتًا، ويعجز
                 القائد عن الدخول بلا أن يعرف لماذا. وطولُ الرمز إعدادٌ في
                 لوحة Supabase (٦–١٠)، فيُفتح المدى كلُّه. */
              maxLength={10}
              placeholder="123456"
              dir="ltr"
              className="text-start tracking-[0.4em]"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={codePending}
              aria-busy={codePending}
            >
              {codePending ? (
                <>
                  <BusyMark /> جارٍ التحقّق…
                </>
              ) : (
                "ادخل بالرمز"
              )}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
