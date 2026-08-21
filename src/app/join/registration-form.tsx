"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button, BusyMark } from "@/components/ui/button";
import {
  STEPS,
  STEP_SCHEMAS,
  emptyState,
  stepOfField,
  validateUploadTotal,
  type RegistrationState,
} from "@/lib/registration";
import { helpWhatsappHref } from "@/content/contact";
import { submitRegistration } from "./actions";
import { RequestCard } from "./request-card";
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

/* ⚠️ في الوضع المقفل تُطوى خطوةُ الرغبات، فيصير آخرُ خطوةٍ رقمها ٢ كما هو
   لكن الخطوة ١ لا تُعرض ولا تُتحقَّق — والانتقال يقفز فوقها. */
const PREFERENCES_STEP = 1;

type RegistrationFormProps = {
  /** رغبة أولى مُهيَّأة من صفحة اللجنة — مُتحقَّق منها في الصفحة قبل تمريرها */
  initialChoice?: string;
  /**
   * جهةٌ **مقفلة** من رابطٍ مباشر — لا تُختار ولا تُبدَّل.
   *
   * ⚠️ القفلُ هنا راحةٌ للطالب لا حاجزُ أمان: `mode` و`choice1` حقلا نموذجٍ
   * يقدر أي أحدٍ تغييرهما. الفحص الحاسم على الخادم في `actions.ts` — أن
   * تكون الجهة رايتُها مرفوعة في `findDirectTarget`.
   */
  lockedTo?: string;
  lockedLabel?: string;
};

export function RegistrationForm({
  initialChoice,
  lockedTo,
  lockedLabel,
}: RegistrationFormProps) {
  const [state, formAction, pending] = useActionState<
    RegistrationState,
    FormData
  >(
    submitRegistration,
    lockedTo
      ? { ...emptyState, values: { choice1: lockedTo } }
      : initialChoice
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

  /* عدّادٌ لا مرجع: كتلة `lastState` أدناه تطلب النقل **أثناء العرض**،
     والكتابة في مرجعٍ هناك ممنوعة (`react-hooks/refs`) — بخلاف الحالة، وهي
     النمط الذي تستعمله الكتلة نفسها. والعدّاد لا قيمةَ له في ذاته: تغيّرُه
     هو الإشارة، فيعمل المؤثّر ولو تكرّرت الأخطاء نفسُها ضغطةً بعد ضغطة.
     ⚠️ ويُعرَّف **قبل** الكتلة — `const` في منطقة الموت الزمنيّ يرمي. */
  const [errorFocusNonce, setErrorFocusNonce] = useState(0);

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
      /* وردُّ الخادم مثلُه: قد تقع أخطاؤه في الخطوة المعروضة نفسِها فلا
         تتبدّل، فيبقى الطالب حيث هو ولا يرى ما رُفض. */
      setErrorFocusNonce((n) => n + 1);
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

  /**
   * ⚠️ **الرسالةُ وحدها لا تكفي — على الجوّال خاصّةً.**
   *
   * كان الضغط على «التالي» بحقولٍ ناقصة يضع الأخطاء في الشجرة **ولا يحرّك
   * شيئًا**: قِيس على 375×812 أن ستّةً من سبعة أخطاءٍ تقع **فوق الشاشة**
   * (‑677px إلى ‑41px)، والتركيز يبقى على `body`، والتمرير يتحرّك 61px.
   * فالطالب يضغط ويرى أن **لا شيء حدث** — ويغادر.
   *
   * فيُنقل التركيز إلى أوّل حقلٍ أخطأ: يُمرَّر إليه، ويُنطق عنوانُه ورسالتُه
   * (`aria-describedby` يشير إلى الرسالة نفسها)، وتُفتح لوحةُ المفاتيح على
   * الحقل الذي ينقصه جوابٌ لا على أوّل الصفحة.
   *
   * **الترتيب من الـDOM لا من قائمةٍ موازية:** `querySelector` يردّ أوّل
   * مطابقٍ في ترتيب المستند، وهو ترتيبُ العين نفسُه — فلا تُصان قائمةٌ
   * ثانيةٌ تتخلّف عن الحقول يوم يُضاف حقل.
   */
  useEffect(() => {
    if (errorFocusNonce === 0) return;
    const form = formRef.current;
    if (!form) return;

    /* داخل الخطوة المعروضة وحدها — اللوحات الثلاث كلّها في الشجرة */
    const scope = form.querySelector<HTMLElement>("[data-active]") ?? form;
    const invalid = scope.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!invalid) return;

    /* الحاملُ للحالة ليس دائمًا ما يُركَّز عليه: مجموعةُ الخيارات تحملها على
       `<fieldset>` وهو لا يقبل تركيزًا، والقائمةُ المحسَّنة تحملها على
       `<select>` مخفيٍّ وزرُّها **شقيقُه** لا ابنُه. فيُؤخذ الوعاء ثم أوّلُ
       ما يقبل التركيز فيه — يستوي الثلاثة بلا حالاتٍ خاصّة. */
    const group = invalid.closest<HTMLElement>("div,fieldset") ?? invalid;
    /* `[data-error-focus]` أوّلًا: بعضُ الخطوات لا حقلَ فيها يُركَّز عليه —
       خانات الرغبات عرضٌ لا إدخال — فتضع مرساةً صريحة على رسالتها. */
    const target =
      group.querySelector<HTMLElement>("[data-error-focus]") ??
      group.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([tabindex="-1"]), select:not([tabindex="-1"]), textarea, button',
      ) ??
      invalid;

    /* التمرير أوّلًا ليقع الحقل في وسط الشاشة ورسالتُه تحته ظاهرة، ثم
       التركيز بلا تمريرٍ ثانٍ يزحزح ما ضُبط. */
    group.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
  }, [errorFocusNonce]);

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
    if (!validateStep(step)) {
      /* الخطوة لم تتبدّل، فمؤثّر `[step]` لا يعمل — والطلبُ يُرفع هنا */
      setErrorFocusNonce((n) => n + 1);
      return;
    }
    setStep((current) => {
      const next = current + 1;
      return Math.min(
        lockedTo && next === PREFERENCES_STEP ? next + 1 : next,
        LAST_STEP,
      );
    });
  }

  function goBack() {
    setClientErrors({});
    setStep((current) => {
      const previous = current - 1;
      return Math.max(
        lockedTo && previous === PREFERENCES_STEP ? previous - 1 : previous,
        0,
      );
    });
  }

  /**
   * ما كُتب في الحقول الآن — تقرأه بطاقة الطلب.
   *
   * ⚠️ **مستمعٌ واحدٌ على النموذج لا حالةٌ لكل حقل.** ربطُ كل حقلٍ بحالة
   * يحوّل النموذج كلَّه إلى مضبوطٍ (`controlled`)، فيُعاد رسمُ ثلاثين حقلًا
   * عند كل حرف، ويُفقد ما يميّز البناء الحاليّ: أنه يعمل بلا جافاسكربت.
   * والمستمعُ هنا **يقرأ ولا يملك** — الحقول تبقى كما هي.
   *
   * والبدء من `state.values` مقصود: بعد ردّ خطأٍ من الخادم يعود الطالب إلى
   * نموذجٍ ممتلئ، فبطاقةٌ فارغةٌ فوقه تُوهمه أن ما كتبه ضاع.
   */
  const [live, setLive] = useState<Record<string, string>>(state.values);
  if (lastState !== state) setLive(state.values);

  function captureLive(event: React.ChangeEvent<HTMLFormElement>) {
    const field = event.target;
    if (!field?.name) return;
    /* غيرُ المؤشَّر لا يُكتب: وإلّا محا ترك الخيارِ قيمةَ الخيار المختار */
    if (
      field instanceof HTMLInputElement &&
      (field.type === "radio" || field.type === "checkbox") &&
      !field.checked
    ) {
      return;
    }
    setLive((current) => ({ ...current, [field.name]: field.value }));
  }

  /**
   * حارسُ ميزانية الرفع — **آخرُ موضعٍ يُمكن فيه مخاطبةُ الطالب**.
   *
   * ⚠️ مجموعُ المرفقات إن تجاوز الميزانية ردّه `Next` بـ500 خام في طبقةٍ
   * سابقةٍ لشيفرة الخادم، فلا رسالةَ عربيّةً تصل الطالب من هناك. فالفحصُ
   * هنا قبل أن يُرسَل شيء، والرسالةُ تقول له ما يفعل.
   *
   * يُفحص المجموعُ لا كلُّ ملفٍّ على حدة: الملفُّ المفرد يفحصه الخادم
   * ويردّ برسالةٍ في مكانه، والمجموعُ وحده هو ما لا يصل إليه.
   */
  function overBudget(): string | undefined {
    const form = formRef.current;
    if (!form) return undefined;
    const files = [...new FormData(form).values()].filter(
      (value): value is File => value instanceof File && value.size > 0,
    );
    return validateUploadTotal(files);
  }

  function guardSubmit(event: React.FormEvent<HTMLFormElement>) {
    const tooBig = overBudget();
    if (!tooBig) return;
    event.preventDefault();
    setClientErrors({ cv: tooBig });
    setStep(LAST_STEP);
  }

  function chooseAt(slot: number, value: string) {
    setChoices((current) =>
      current.map((existing, index) => (index === slot ? value : existing)),
    );
    /**
     * ⚠️ **الخطأ يُمسح فور التصحيح — وإلّا ناقض الشاشةَ نفسَها.**
     *
     * أخطاء الخطوة تُحسب عند «التالي» وتبقى حتى الضغطة التالية. فمن أخطأ
     * ثم أكمل رغباته الثلاث كان يرى — مقيسًا — الخاناتِ الثلاثَ مملوءةً
     * و**حدَّين أحمرين ورسالة «اختر رغبتك»** فوقها. رسالةٌ تكذب على من
     * أصلح خطأه، وهي أسوأُ من غيابها: تُشكّكه فيما فعل.
     *
     * وتُمسح رموزُ الرغبات وحدَها لا الخريطةُ كلُّها — أخطاءُ حقولٍ أخرى
     * في الخطوة نفسِها لم تُصلَّح بهذي النقرة.
     */
    setClientErrors((current) => {
      if (!current.choice1 && !current.choice2 && !current.choice3) {
        return current;
      }
      const { choice1, choice2, choice3, ...rest } = current;
      void choice1;
      void choice2;
      void choice3;
      return rest;
    });
  }

  if (state.ok) {
    /* يُحسب هنا لا في الوسم: `null` حين لا رقمَ مضبوطًا، فيسقط الزرّ */
    const help = helpWhatsappHref(
      "السلام عليكم، قدّمتُ على عضوية نادي MIS ونسيتُ إرفاق سيرتي الذاتية.",
    );
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
        {/* ⚠️ **لا وعدَ بإيصال** (١٧ أغسطس ٢٠٢٦) — التعليلُ كاملًا عند
            الرسالة نفسِها في `actions.ts`. وهذي نسخةُ العميل التي تُعرض قبل
            أن يردّ الخادم، فلو خالفتها ظهر للطالب نصّان متعاقبان. */}
        <p className="text-fg-muted mx-auto max-w-[44ch] leading-relaxed">
          راجعنا بياناتك واستلمناها. وتصلك النتيجة خلال أسبوعين عمل.
        </p>

        {/* ⚠️ **حالُ المرفق تُذكر صراحةً — والصمتُ هنا كلّفنا طلبًا.**
            قدّم متقدّمٌ في ١٥ أغسطس ٢٠٢٦ وسيرتُه لم تصل الخادمَ أصلًا، وقرأ
            «وصل طلبك» فاطمأنّ. ولم يُسجَّل شيء: `uploadOne` يخرج صامتًا حين
            يصل الحقلُ فارغًا. فصار الجوابُ معروضًا في الحالين — لا في حالة
            الوصول وحدها، لأن **الغياب هو الذي يحتاج أن يُقال**. */}
        {state.received && (
          <>
            <p
              className={`mx-auto mt-s4 max-w-[44ch] text-[0.9rem] leading-relaxed ${
                state.received.cv
                  ? "text-fg-muted"
                  : "text-warning font-semibold"
              }`}
            >
              {state.received.cv
                ? "ووصلت معه سيرتك الذاتية."
                : help
                  ? "ولم تصلنا سيرةٌ ذاتية مع الطلب — وهي اختيارية، وإن أردت إرفاقها فأرسِلها لنا الآن:"
                  : "ولم تصلنا سيرةٌ ذاتية مع الطلب — وهي اختيارية، فإن أردت إرفاقها راسلنا."}
            </p>

            {/**
             * **«راسلنا» كانت تقول افعل ولا تقول أين.**
             *
             * ⚠️ **وهي أسوأُ من الصمت:** تُحمّل الطالبَ مسؤوليّةَ استدراكٍ
             * ثم تُغلق البابَ في وجهه، فيبحث في الموقع عن عنوانٍ لا يعرفه
             * أو يترك الأمر. وثلثا من قدّموا بلا سيرة — فالسطرُ يُقرأ
             * كثيرًا.
             *
             * ⚠️ **وزرٌّ لا رقمٌ عارٍ.** ينقر فتُفتح المحادثةُ بنصٍّ مبدئيٍّ
             * يقول عن أيّ شيءٍ يكتب — فلا يصل «السلام عليكم» وحدَه ولا
             * يُعرف صاحبُه. والرقمُ لا يُطبع في الصفحة، فلا تلتقطه
             * الماسحات.
             *
             * ⚠️ **ولمن لم يرفق وحدَه.** من وصلت سيرتُه لا استدراكَ عنده،
             * وزرٌّ أمامه يدعوه إلى مراسلةٍ بلا سبب.
             */}
            {!state.received.cv && help && (
              <a
                href={help}
                target="_blank"
                rel="noopener noreferrer"
                className="border-line-strong text-fg mt-s3 inline-flex min-h-11 items-center gap-x-s2 rounded-xl border px-s4 text-[0.85rem] font-semibold transition-opacity hover:opacity-80"
              >
                أرسِلها لنا على واتساب
              </a>
            )}
          </>
        )}
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
      {/* ── لوحتان: الحقول تسأل، والبطاقة تُري ما صار ───────────────────
          البطاقة أوّلًا على الجوّال عمدًا: هي فوق أوّل حقلٍ يكتبه الطالب،
          فيرى اسمه يحطّ عليها وهو يكتبه — ولو وُضعت أسفل النموذج لما رآها
          إلّا بعد ثلاثين حقلًا، وأكثرُ من يقدّم علينا من جوّاله. */}
      <form
        ref={formRef}
        action={formAction}
        onChange={captureLive}
        onSubmit={guardSubmit}
        noValidate
        className="grid items-start gap-s6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-s7"
      >
        <div className="flex flex-col gap-s6">
          {!lockedTo && (
            <div className="js-only">
              <Stepper current={step} onGoTo={setStep} />
            </div>
          )}

          {lockedTo && (
            <p className="border-s-2 border-accent bg-bg-sunken px-s4 py-s3 text-[0.95rem]">
              تقدّم على{" "}
              <strong className="font-semibold">
                {lockedLabel ?? lockedTo}
              </strong>
            </p>
          )}

          {state.message && (
            <div
              role="alert"
              className="border border-danger/35 bg-danger/8 px-5 py-4 text-[0.95rem] text-danger"
            >
              {state.message}
              {/* المتصفح لا يحتفظ بالمرفق بعد ردّ الخادم — يُقال صراحةً
                بدل أن يرسل الطالب طلبه ثانيةً بلا سيرة ذاتية وهو لا يدري */}
              <span className="mt-1 block text-[0.875rem]">
                إن كنت أرفقت ملفًا، أعد اختياره قبل الإرسال.
              </span>
            </div>
          )}

          {/* مصيدة الآليات — مخفية عن العين وعن قارئ الشاشة، لا عن الروبوت */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">لا تملأ هذا الحقل</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <StepPersonal index={0} current={step} values={v} errors={errors} />

          {lockedTo ? (
            /* ⚠️ **حقلٌ خفيّ لا خطوةٌ معطّلة.** الحقل المعطّل `disabled` لا
             يُرسل أصلًا في `FormData`، فتصل الرغبة فارغةً إلى الخادم. */
            <>
              <input type="hidden" name="mode" value="direct" />
              <input type="hidden" name="choice1" value={lockedTo} />
              <input type="hidden" name="choice2" value="" />
              <input type="hidden" name="choice3" value="" />
            </>
          ) : (
            <>
              <input type="hidden" name="mode" value="open" />
              <StepPreferences
                index={1}
                current={step}
                choices={choices}
                onChange={chooseAt}
                values={v}
                errors={errors}
              />
            </>
          )}

          <StepQuestions
            index={2}
            current={step}
            choices={choices}
            values={v}
            errors={errors}
          />

          {/* ⚠️ **ملتصقٌ بالأسفل على الجوّال وحده.**
              النموذج **٢٫٤ شاشة** على 375×812، و«التالي» عرضُه 80px عند
              y=1635 — أي أن الطالب يمرّر إلى القاع في كل خطوة ليتقدّم.
              وبعد إصلاح نقلِ التركيز إلى أوّل خطأ صار يُرفع إلى وسط النموذج
              ثم يعود يمرّر إلى القاع مرّةً أخرى ليضغط. فيبقى الزرّ في مدى
              الإبهام دائمًا.
              `-mx-5 px-5` لأنّ `<main>` يحشو 20px: الشريط يمتدّ حافّةً إلى
              حافّة ويبقى محتواه على محاذاة النموذج. و`bg-bg` مصمتة وإلّا
              مرّت الحقول تحته فاختلط النصّان. و`lg:static` — الحاسب كما هو. */}
          {/* ⚠️ **بلا `-mx-5 px-5`** — جرّبتُها لتمتدّ الحافّةَ إلى الحافّة
              فأفاضت الصفحة عند تكبير النصّ 200% (قِيس 402px في 375): الهامش
              السالب `1.25rem` يتضاعف مع الخطّ، وأبوه `min-width: auto` ينمو
              ليسعه، فيتغذّى أحدهما من الآخر. والحدّان الجانبيان أرضيةُ صفحةٍ
              أصلًا، فبقاؤه داخل صندوق المحتوى لا يُرى فرقًا ويثبت عند أي
              مقاس. أُدخل هذا العطل مع الشريط وأُمسك في الفحص. */}
          {/* `mis-safe-bottom-mobile` لا `mis-safe-bottom`: الثانيةُ خارج
              طبقات Tailwind فتغلب `lg:pb-0` ويبقى الحشو على الحاسب.
              التعليل كاملًا عند تعريفها في `globals.css`. */}
          <div className="mis-safe-bottom-mobile sticky bottom-0 z-10 flex min-w-0 flex-wrap items-center gap-s4 border-t border-line bg-bg pt-s5 [&>*]:min-w-0 lg:static">
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
              {/* نسخةُ الحاسب وحدها — والجوّال يقرؤها أسفل «أوافق» في
                  `step-questions.tsx`، وثمّ تعليلُ الفصل بالأرقام. */}
              <p className="hidden text-[0.875rem] text-fg-muted lg:block">
                تصلك النتيجة خلال أسبوعين عمل.
              </p>
            </div>
          </div>
        </div>

        {/* `js-only`: مرآةٌ لا مصدر — بلا جافاسكربت تغيب ولا يفقد الطالب شيئًا.
            وترتيبُها **بعد الحقول** لا قبلها، والسبب جوّاليٌّ محض: فوقها كانت
            تأكل ١٦٧px قبل أول حقل وهي فارغة، وكلُّ سطرٍ يُضاف إليها يزحزح
            الحقلَ الذي يكتب فيه الطالب تحتها. وأسفلَ الصفحة تنمو في فراغٍ لا
            يزحزح شيئًا. وعلى الشاشة الواسعة يرفعها العمود الثاني إلى جانب
            الحقول ملتصقةً بالتمرير، فتُرى وهي تُبنى. */}
        <div className="js-only lg:sticky lg:top-28">
          <RequestCard
            values={live}
            choices={choices}
            progress={(step + 1) / STEPS.length}
          />
        </div>
      </form>
    </>
  );
}
