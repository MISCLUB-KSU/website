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
        {/* ⚠️ **`sr-only` على الجوّال لا `hidden` — والفرق ليس تجميليًّا.**
            العنوان مكرَّر بصريًّا: شريط الخطوات فوقه يعرض «البيانات الشخصية»
            خطوةً حاليّة، ثم يعيدها عنوانًا للقسم. فيُخفى عن العين على
            الجوّال وحده.
            ولا يُنزع من الشجرة أبدًا — ثلاث وظائف تتعلّق به:
            · `aria-labelledby` على `<section>` يشير إليه، ونزعُه يترك
              القسم بلا اسم؛
            · `data-step-heading` مرساةُ التركيز بعد كل انتقال — بدونها
              يبقى التركيز على زرٍّ اختفى؛
            · تسلسلُ العناوين h1 ← h2 ينكسر بحذفه.
            و`sr-only` تُبقي الثلاثة وتُخفي البكسل. */}
        <h2
          id={`step-${index}-title`}
          data-step-heading
          tabIndex={-1}
          className="font-display text-lg font-semibold text-fg outline-none max-lg:sr-only"
        >
          {title}
        </h2>
        {/* `mt-s2` تفصل الشرحَ عن العنوان فوقه — والعنوان مخفيٌّ على
            الجوّال، فلا شيءَ تفصله هناك. */}
        {lede && (
          <p className="mt-s2 max-w-measure text-sm leading-relaxed text-fg-muted max-lg:mt-0">
            {lede}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
