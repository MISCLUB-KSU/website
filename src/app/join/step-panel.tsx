import type { ReactNode } from "react";

/**
 * لوحة خطوة واحدة.
 *
 * اللوحات الثلاث تبقى في الشجرة كلها ويُخفى غير الحالية بـ `CSS` وحده
 * (`.js-step` في `globals.css`) — لا تُنزع من الشجرة. فائدتان: النموذج
 * يُرسَل كاملًا بضغطة واحدة، وما كتبه الطالب في خطوة سابقة لا يضيع بعودة.
 * وبلا جافاسكربت تُلغى قاعدة الإخفاء فتظهر الخطوات الثلاث متتابعة.
 *
 * `tabIndex={-1}` على العنوان ليس زينة: بعد كل انتقال يُنقل التركيز إليه،
 * فينطق قارئ الشاشة عنوان الخطوة الجديدة بدل أن يبقى التركيز على زرّ اختفى.
 */

type StepPanelProps = {
  /** ترتيب اللوحة — صفري */
  index: number;
  current: number;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
};

export function StepPanel({
  index,
  current,
  title,
  lede,
  children,
}: StepPanelProps) {
  return (
    <section
      className="js-step flex flex-col gap-s5"
      data-active={index === current ? "" : undefined}
      aria-labelledby={`step-${index}-title`}
    >
      <header>
        <h2
          id={`step-${index}-title`}
          data-step-heading
          tabIndex={-1}
          className="font-display text-lg font-semibold text-fg outline-none"
        >
          {title}
        </h2>
        {lede && (
          <p className="mt-s2 max-w-measure text-sm leading-relaxed text-fg-muted">
            {lede}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
