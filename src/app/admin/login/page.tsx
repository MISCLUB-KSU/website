"use client";

import { useActionState } from "react";

import { Button, BusyMark } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { sendLoginLink, type LoginState } from "./actions";

/**
 * دخول معالي الإدارة والقادة — برابطٍ يصل البريد، بلا كلمة مرور.
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
      {/* ⚠️ النصُّ بحرفه بطلب حسام (١١ أغسطس ٢٠٢٦): «دخول معالي الإدارة
          والقادة» — بعد «دخول الطاقم» ثم «دخول الإدارة والقادة».
          والرسمُ صُحّح إلى «الإدارة» بالهمزة كبقيّة الموقع، واللفظُ كما
          طُلب. وهو يسمّي **من يدخل** لا الفعل: اللوحةُ واحدةٌ يقصّها RLS،
          يدخلها الإدارةُ وقادةُ اللجان والوحدات والمشاريع. */}
      <h1 className="text-fg mb-3 text-2xl font-bold sm:text-3xl">
        دخول معالي الإدارة والقادة
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
          placeholder="name@ksu.edu.sa"
          dir="ltr"
          className="text-start"
        />

        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              <BusyMark /> جارٍ الإرسال…
            </>
          ) : (
            "أرسل رابط الدخول"
          )}
        </Button>
      </form>

      {state.message && (
        <p
          role="status"
          className={`mt-s5 border-s-2 px-s4 py-s3 text-[0.9rem] leading-relaxed ${
            state.ok
              ? "border-success bg-success/8 text-success"
              : "border-danger bg-danger/8 text-danger"
          }`}
        >
          {state.message}
        </p>
      )}
    </main>
  );
}
