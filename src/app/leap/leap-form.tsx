"use client";

import { useActionState, useState, type ReactNode } from "react";

import {
  emptyLeapState,
  LEAP_REGISTRATION_OPEN,
  type LeapField,
  type LeapState,
} from "@/lib/leap";

import { submitLeap } from "./actions";
import { Badge } from "./badge";

const EMPTY: Record<LeapField, string> = {
  nameAr: "",
  nameEn: "",
  email: "",
  phone: "",
  reference: "",
};

type LeapFormProps = {
  /** نصُّ تعريفٍ اختياريٌّ فوق النموذج — يأتي من مكوّن الخادم فلا يُحزَم في
      حزمة المتصفّح. حُذف رأسُ الصفحة بطلب الإدارة، فصار بلا محتوى. */
  children?: ReactNode;
};

/**
 * نموذجُ تسجيل حضور LEAP 2026، والبطاقةُ التي يعبّئها.
 *
 * الحقولُ مضبوطةٌ (`controlled`) لسببٍ واحد: البطاقةُ فوقها تعرض ما يُكتب
 * لحظةً بلحظة — معاينةٌ بصريّةٌ لبيانات المسجِّل لا تصميمُ البزنس كارد
 * النهائيّ (تصميمُه مختلف). ولا يمنع ذلك من عطّل الجافاسكربت — النموذجُ
 * `<form>` حقيقيٌّ يقصد `Server Action`، والقيمُ الأوّليّة تُقرأ من الحالة
 * المعادة، فمن أخطأ بلا جافاسكربت يرجع فيجد ما كتبه في مكانه.
 */
export function LeapForm({ children }: LeapFormProps) {
  const [state, formAction, pending] = useActionState<LeapState, FormData>(
    submitLeap,
    emptyLeapState,
  );

  /* المصدرُ الأوّليّ هو الحالة المعادة: مسارُ «بلا جافاسكربت» يرسم الصفحة
     من جديدٍ بعد الإرسال، فلو بدأنا فارغين ضاع ما كتبه. */
  const [live, setLive] = useState<Record<LeapField, string>>(() => ({
    ...EMPTY,
    ...state.values,
  }));
  const done = state.status === "done";
  const shown = done ? { ...EMPTY, ...state.values } : live;

  /* الاكتمالُ حالةٌ حقيقيّةٌ لا تقدير: الخانات الخمس فيها نصٌّ فعلًا.
     وهو ما يُشعل حلقةَ البطاقة — فالمكافأةُ مربوطةٌ بما فعله المسجِّل. */
  const complete = (Object.keys(EMPTY) as LeapField[]).every((f) =>
    shown[f].trim(),
  );

  const set = (field: LeapField) => (value: string) =>
    setLive((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <div className="leap-stage">
        <Badge
          nameAr={shown.nameAr}
          nameEn={shown.nameEn}
          email={shown.email}
          phone={shown.phone}
          reference={shown.reference}
          complete={complete}
        />
      </div>

      {!LEAP_REGISTRATION_OPEN && !done ? (
        /* البابُ مغلق. ولا يُترك نموذجٌ معطَّلٌ ولا زرٌّ لا يعمل: ضابطٌ
           ميّتٌ يجعل الطالب يظنّ العطلَ في جهازه فيعيد المحاولة. يُقال
           ما حدث صراحةً، ويُدلُّ على مَن يسأل. */
        <div className="leap-done leap-closed">
          <h2>التسجيل مقفل</h2>
          <p>
            انتهت مهلة تسجيل الحضور مع النادي في{" "}
            <b className="leap-lat" dir="ltr" lang="en">
              LEAP 2026
            </b>
            . من سجّل قبل الإغلاق وصله دوره ولا يحتاج شيئًا — قادة النادي
            بيتواصلون معه على رقمه قبل الفعالية.
          </p>
          <p>عندك سؤال أو تظن أن تسجيلك ما وصل؟ كلّم قادة النادي مباشرة.</p>
        </div>
      ) : done ? (
        <div className="leap-done">
          <h2>تم تسجيلك</h2>
          <p>
            وصلَنا اسمك ورقم حجزك، وبنجهّز لك بزنس كارد للفعالية. البطاقة فوق
            معاينةٌ لبياناتك لا التصميم النهائي — قادة النادي بيتواصلون معك على
            رقمك قبل الفعالية. ولو فيه خطأ في الاسم أو الرقم كلّمهم الآن.
          </p>
        </div>
      ) : (
        <>
          {children}

          <form className="leap-form" action={formAction} noValidate>
            <div className="leap-group">
              <span className="leap-group-head">اسمك</span>
              <div className="leap-row">
                <Field
                  name="nameAr"
                  label="بالعربي"
                  value={live.nameAr}
                  onChange={set("nameAr")}
                  error={state.errors.nameAr}
                  autoComplete="name"
                  placeholder="الاسم الثلاثي"
                />
                <Field
                  name="nameEn"
                  label="بالإنجليزي"
                  value={live.nameEn}
                  onChange={set("nameEn")}
                  error={state.errors.nameEn}
                  ltr
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="Full name"
                />
              </div>
              <span className="leap-hint">
                الاسمان بيكونان على بزنس كاردك كما تكتبهما — دقّق فيهما.
              </span>
            </div>

            <div className="leap-group">
              <span className="leap-group-head">تواصلك</span>
              <div className="leap-row">
                <Field
                  name="email"
                  label="البريد"
                  type="email"
                  inputMode="email"
                  value={live.email}
                  onChange={set("email")}
                  error={state.errors.email}
                  ltr
                  autoComplete="email"
                  autoCapitalize="off"
                  placeholder="you@example.com"
                />
                <Field
                  name="phone"
                  label="الجوال"
                  type="tel"
                  inputMode="numeric"
                  value={live.phone}
                  onChange={set("phone")}
                  error={state.errors.phone}
                  ltr
                  autoComplete="tel"
                  placeholder="05XXXXXXXX"
                />
              </div>
            </div>

            <div className="leap-group">
              <span className="leap-group-head">تذكرتك</span>
              <Field
                name="reference"
                label="رقم الحجز"
                value={live.reference}
                onChange={set("reference")}
                error={state.errors.reference}
                ltr
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="Unique Reference Number"
                className="leap-field-key"
                hint="من رسالة تأكيد التسجيل التي وصلتك من LEAP. لو ما تعرف وينه، الشرح أسفل الصفحة."
              />
            </div>

            {state.message ? (
              <p className="leap-form-error" role="alert">
                {state.message}
              </p>
            ) : null}

            <button className="leap-submit" type="submit" disabled={pending}>
              {pending ? "جارٍ التسجيل…" : "سجّل حضوري"}
            </button>
          </form>
        </>
      )}
    </>
  );
}

type FieldProps = {
  name: LeapField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** الحقلُ لاتينيٌّ: يُقلب اتجاهُه ويأخذ خطَّ LEAP وتتبّعَه */
  ltr?: boolean;
  className?: string;
  type?: string;
  inputMode?: "email" | "numeric" | "text";
  autoComplete?: string;
  autoCapitalize?: string;
  spellCheck?: boolean;
  placeholder?: string;
};

function Field({
  name,
  label,
  value,
  onChange,
  error,
  hint,
  ltr = false,
  className,
  type = "text",
  inputMode,
  autoComplete,
  autoCapitalize,
  spellCheck,
  placeholder,
}: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  /* الوصفُ يجمع التلميحَ والخطأ — قارئُ الشاشة يقرأ الاثنين لا أحدهما */
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className ? `leap-field ${className}` : "leap-field"}>
      <label htmlFor={name}>{label}</label>

      {hint ? (
        <span className="leap-hint" id={hintId}>
          {hint}
        </span>
      ) : null}

      <input
        className={ltr ? "leap-input leap-lat" : "leap-input"}
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...(ltr ? { dir: "ltr" as const, lang: "en" } : {})}
        {...(inputMode ? { inputMode } : {})}
        {...(autoComplete ? { autoComplete } : {})}
        {...(autoCapitalize ? { autoCapitalize } : {})}
        {...(spellCheck === false ? { spellCheck: false } : {})}
        {...(placeholder ? { placeholder } : {})}
      />

      {error ? (
        <span className="leap-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
