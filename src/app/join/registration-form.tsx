"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button, BusyMark } from "@/components/ui/button";
import {
  STEPS,
  STEP_SCHEMAS,
  emptyState,
  stepOfField,
  type RegistrationState,
} from "@/lib/registration";
import { submitRegistration } from "./actions";
import { StepPersonal } from "./step-personal";
import { StepPreferences } from "./step-preferences";
import { StepQuestions } from "./step-questions";
import { Stepper } from "./stepper";

/**
 * نموذج طلب العضوية — ثلاث خطوات في نموذج واحد.
 *
 * مبني على <form action> ويعمل بلا جافاسكربت: الخطوات الثلاث كلها في
 * الصفحة، والإخفاء بـ CSS يُلغى من <noscript>، فيصير النموذج صفحة واحدة
 * يرسلها المتصفح إلى الخادم ويعيدها بالأخطاء. الجافاسكربت يضيف التدرّج
 * والتحقّق الفوري، لا أكثر.
 *
 * التحقّق في المتصفح يشارك الخادمَ مخطّطاته نفسها (`STEP_SCHEMAS` مشتقّة من
 * `registrationSchema`) — فلا يمرّ في خطوة ما يُرفض عند الإرسال.
 */

const LAST_STEP = STEPS.length - 1;

type RegistrationFormProps = {
  /** رغبة أولى مُهيَّأة من صفحة اللجنة — مُتحقَّق منها في الصفحة قبل تمريرها */
  initialChoice?: string;
};

export function RegistrationForm({ initialChoice }: RegistrationFormProps) {
  const [state, formAction, pending] = useActionState<
    RegistrationState,
    FormData
  >(
    submitRegistration,
    initialChoice
      ? { ...emptyState, values: { choice1: initialChoice } }
      : emptyState,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [choices, setChoices] = useState<string[]>([
    state.values.choice1 ?? "",
    state.values.choice2 ?? "",
    state.values.choice3 ?? "",
  ]);

  const v = state.values;
  /* خطأ المتصفح يعلو خطأ الخادم: الأحدث هو ما يعالجه الطالب الآن */
  const errors = { ...state.errors, ...clientErrors };

  /* ردّ الخادم يقود إلى أول خطوة فيها خطأ — لا يُترك الطالب في خطوة سليمة
     ورسالةٌ تقول إن ثمة خطأً في مكان لا يراه.

     الضبط أثناء العرض لا داخل `useEffect`: الخطوة تُشتقّ من ردٍّ جديد وصل،
     وتأجيلها إلى ما بعد الرسم يُظهر الخطوة القديمة ومضةً ثم يقفز.
     الردّ السابق يُحفظ في حالة لا في مرجع — قراءة المرجع أثناء العرض
     لا تضمن إعادة العرض. */
  const [lastState, setLastState] = useState(state);
  if (lastState !== state) {
    setLastState(state);
    const fields = Object.keys(state.errors);
    if (fields.length > 0) {
      setClientErrors({});
      setStep(Math.min(...fields.map(stepOfField)));
    }
  }

  /* بعد كل انتقال يُنقل التركيز إلى عنوان الخطوة، وإلا بقي على زرّ اختفى
     فلا يعرف مستخدمُ قارئ الشاشة أن الشاشة تبدّلت. */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    formRef.current
      ?.querySelector<HTMLElement>("[data-active] [data-step-heading]")
      ?.focus();
  }, [step]);

  function validateStep(index: number): boolean {
    const form = formRef.current;
    if (!form) return true;

    const data = new FormData(form);
    const raw: Record<string, string> = {};
    for (const field of STEPS[index].fields as readonly string[]) {
      const value = data.get(field);
      raw[field] = typeof value === "string" ? value : "";
    }

    const result = STEP_SCHEMAS[index].safeParse(raw);
    if (result.success) {
      setClientErrors({});
      return true;
    }

    const found: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (key && !found[key]) found[key] = issue.message;
    }
    setClientErrors(found);
    return false;
  }

  function goNext() {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  function goBack() {
    setClientErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  function chooseAt(slot: number, value: string) {
    setChoices((current) =>
      current.map((existing, index) => (index === slot ? value : existing)),
    );
  }

  if (state.ok) {
    return (
      <div
        role="status"
        className="border border-success/30 bg-success/8 p-8 text-center"
      >
        <span className="mb-4 inline-flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              className="block h-7 w-2 bg-success"
              style={{ transform: "skewX(-24deg)" }}
            />
          ))}
        </span>
        <h2 className="mb-2 text-xl font-bold text-success">وصل طلبك</h2>
        <p className="text-fg-muted mx-auto max-w-[44ch] leading-relaxed">
          راجعنا بياناتك واستلمناها. سنراسلك على بريدك خلال أسبوع بنتيجة الطلب.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* بلا جافاسكربت: تُلغى قاعدة إخفاء الخطوات ويختفي التنقّل بينها،
          فيصير النموذج صفحة واحدة تُرسَل مرة واحدة. */}
      <noscript>
        <style>{`.js-step:not([data-active]){display:flex !important}.js-only{display:none !important}`}</style>
      </noscript>

      {/* لا يُكتب `encType` ولا `method` هنا: النموذج الذي `action` فيه دالّةٌ
          يرسمهما `Next` بنفسه — `multipart/form-data` و`POST` — في HTML الخادم،
          فيرفع المرفقَ بلا جافاسكربت أصلًا. وكتابتهما يدويًا يُطلق تحذير React
          «will get overridden» في التطوير بلا فائدة. مُتحقَّق منه في مصدر
          الصفحة المُرسَل من الخادم. */}
      {/* لا يُكتب `encType` ولا `method` هنا: النموذج الذي `action` فيه دالّةٌ
          يرسمهما `Next` بنفسه — `multipart/form-data` و`POST` — في HTML الخادم،
          فيرفع المرفقَ بلا جافاسكربت أصلًا. وكتابتهما يدويًا يُطلق تحذير React
          «will get overridden» في التطوير بلا فائدة. مُتحقَّق منه في مصدر
          الصفحة المُرسَل من الخادم. */}
      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="flex flex-col gap-s6"
      >
        <div className="js-only">
          <Stepper current={step} onGoTo={setStep} />
        </div>

        {state.message && (
          <div
            role="alert"
            className="border border-danger/35 bg-danger/8 px-5 py-4 text-[0.93rem] text-danger"
          >
            {state.message}
            {/* المتصفح لا يحتفظ بالمرفق بعد ردّ الخادم — يُقال صراحةً
                بدل أن يرسل الطالب طلبه ثانيةً بلا سيرة ذاتية وهو لا يدري */}
            <span className="mt-1 block text-[0.84rem]">
              إن كنت أرفقت ملفًا، أعد اختياره قبل الإرسال.
            </span>
          </div>
        )}

        {/* مصيدة الآليات — مخفية عن العين وعن قارئ الشاشة، لا عن الروبوت */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">لا تملأ هذا الحقل</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <StepPersonal index={0} current={step} values={v} errors={errors} />

        <StepPreferences
          index={1}
          current={step}
          choices={choices}
          onChange={chooseAt}
          values={v}
          errors={errors}
        />

        <StepQuestions
          index={2}
          current={step}
          choices={choices}
          values={v}
          errors={errors}
        />

        <div className="flex flex-wrap items-center gap-s4 border-t border-line pt-s5">
          <div className="js-only flex flex-wrap gap-s3">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={goBack}>
                السابق
              </Button>
            )}
            {step < LAST_STEP && (
              <Button type="button" onClick={goNext}>
                التالي
              </Button>
            )}
          </div>

          <div
            className="js-step flex flex-wrap items-center gap-s4"
            data-active={step === LAST_STEP ? "" : undefined}
          >
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  <BusyMark /> جارٍ الإرسال…
                </>
              ) : (
                "أرسل الطلب"
              )}
            </Button>
            <p className="text-[0.84rem] text-fg-muted">
              تصلك النتيجة على بريدك خلال أسبوع.
            </p>
          </div>
        </div>
      </form>
    </>
  );
}
