import { STEPS } from "@/lib/registration";

/**
 * شريط الخطوات.
 *
 * ثلاثة أشرطة مصمتة بحواف حادّة — لا دوائر ولا أرقام داخل أقراص ملوّنة.
 * الميلان مستعمل مرّة واحدة في هذي الصفحة (شارة العنوان)، والمبدأ يقول
 * ميلانٌ واحد بارز لا أكثر، فالتقدّم هنا يُقرأ من الامتلاء لا من الشكل.
 *
 * ولأن اللون وحده لا ينقل معنى: الخطوة المكتملة تحمل علامة «✓» نصّية،
 * والحالية عليها `aria-current`، والموضع مكتوب لقارئ الشاشة.
 */

type StepperProps = {
  /** الخطوة الحالية — صفرية */
  current: number;
  /** الانتقال إلى خطوة سابقة؛ يُترك فارغًا فتصير الأشرطة عرضًا لا أزرارًا */
  onGoTo?: (index: number) => void;
};

export function Stepper({ current, onGoTo }: StepperProps) {
  /* ⚠️ `max-lg:mb-0`: الهامش هنا كان يفصل الشريطَ عن **عنوان الخطوة**،
     والعنوان صار `sr-only` على الجوّال (انظر `step-panel.tsx`). فبقاؤه
     يترك فجوةً مقيسة 74px بلا شيءٍ تفصله. وفجوةُ شبكة النموذج (32px)
     تكفي وحدها. والحاسبُ يرى العنوان فيبقى الهامش له. */
  return (
    <nav aria-label="خطوات الطلب" className="mb-s7 max-lg:mb-0">
      <p className="sr-only">
        الخطوة <span dir="ltr">{current + 1}</span> من{" "}
        <span dir="ltr">{STEPS.length}</span>: {STEPS[current].title}
      </p>

      <ol className="grid grid-cols-3 gap-s2">
        {STEPS.map((step, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          /* الرجوع مسموح، والتقدّم لا — الخطوة التالية تُفتح بعد اجتياز شرطها */
          const canGo = Boolean(onGoTo) && isDone;

          const bar = isDone || isCurrent ? "bg-accent" : "bg-line";
          const label = isCurrent
            ? "text-fg font-semibold"
            : isDone
              ? "text-fg-muted"
              : "text-fg-muted"; /* بلا `/70` — كان 3.50:1 نهارًا */

          const content = (
            <>
              <span aria-hidden="true" className={`block h-[3px] ${bar}`} />
              <span
                className={`mt-s2 block text-[0.72rem] leading-snug sm:text-[0.8rem] ${label}`}
              >
                <span dir="ltr" className="tabular-nums">
                  {isDone ? "✓" : index + 1}
                </span>{" "}
                {step.title}
              </span>
            </>
          );

          return (
            <li key={step.title} aria-current={isCurrent ? "step" : undefined}>
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onGoTo?.(index)}
                  className="block w-full cursor-pointer text-start transition-opacity hover:opacity-70"
                >
                  {content}
                  <span className="sr-only">— ارجع إلى هذي الخطوة</span>
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
