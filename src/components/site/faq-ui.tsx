import Link from "next/link";

import type { FaqItem } from "@/content/faq";
import { isolateLatin } from "@/lib/bidi";

/**
 * قطع الأسئلة الشائعة المشتركة — بين قسم الرئيسية وصفحة `/faq`.
 *
 * ── مصدر اللغة البصرية ─────────────────────────────────────────────────
 *
 * مرجعٌ اختاره حسام: صفحة الأسئلة الشائعة في نادي رؤية 2030 (٧ أغسطس
 * ٢٠٢٦). المأخوذ **اللغة** لا المحتوى ولا اللون:
 *
 * | العنصر | عندهم (مقيسًا) | هنا |
 * |---|---|---|
 * | الحوافّ | `radius: 32px` | `rounded-4xl` |
 * | العنوان | ضخم · وزن 700 · ملوّن · موسّط | نفسه |
 * | العلامة | نقطة دائرية 12px | نقطة 12px |
 * | البطاقة | حدّ 1px فاتح · **بلا ظلّ** · حشو 24px | نفسه |
 *
 * **ولونهم لم يُنقل.** التركوازي والأخضر علامةُ ذلك النادي، ونقلهما انتحالُ
 * هوية لا اقتباسُ أسلوب — فالأزرق هنا أزرق النادي.
 *
 * ⚠️ **قطيعةٌ مقصودة مع ميلان الهوية** بطلبٍ صريح: «لا تمشي على الهوية
 * أبدًا» (حسام). فلا `.rake` ولا `.mis-slant` في أيٍّ من هذي القطع —
 * الحوافّ مدوّرة والعناوين موسّطة، وكلاهما نقيض النظام في بقيّة الموقع.
 * القطيعة متعمّدة، فلا «تُصحَّح» في جلسةٍ قادمة.
 *
 * ⚠️ **لا أكورديون.** الأجوبة ظاهرةٌ بلا نقرة: المطويّ لا يلتقطه `Ctrl+F`
 * ولا تقرؤه مسحةُ عينٍ واحدة. (وهذا يخالف `faq-list.tsx` القديم عمدًا.)
 */

/** النقطة — علامةُ هذي الأقسام بدل ضلع الشعار. 12px كما في المرجع. */
export function Dot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`mt-[0.45em] inline-block size-3 shrink-0 rounded-full bg-accent ${className}`}
    />
  );
}

/** عنوان قسمٍ موسّط بنقطته — الشكل الموحَّد لكل عناوين الأسئلة. */
export function FaqHeading({
  id,
  children,
  as: Tag = "h2",
}: {
  id?: string;
  children: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex items-start justify-center gap-s3">
      <Dot />
      <Tag
        id={id}
        className="text-balance text-center font-display text-3xl font-bold text-accent sm:text-4xl"
      >
        {children}
      </Tag>
    </div>
  );
}

/**
 * بطاقة سؤال — السؤال بنقطته ثم الجواب.
 *
 * ⚠️ **الجذر شبكةٌ تصلح لـ`subgrid`.** الأسئلة تختلف أطوالًا، فلو تُركت
 * البطاقات `flex` بدأ جوابُ كلٍّ على ارتفاعٍ مختلف وتراوحت الشبكة. الأمّ
 * تعرّف صفّين والبطاقة ترثهما بـ`md:grid-rows-subgrid`، فيتساوى صفُّ
 * السؤال عند أطولِه وتبدأ الأجوبة على سطرٍ واحد.
 */
export function FaqCard({
  item,
  id,
  full = false,
  className = "",
}: {
  item: FaqItem;
  /** مرساة للمشاركة — رابط السؤال وحده */
  id?: string;
  /** كل الفقرات والرابط، لا الفقرة الأولى فقط */
  full?: boolean;
  className?: string;
}) {
  const paragraphs = full ? item.answer : item.answer.slice(0, 1);

  return (
    <li
      id={id}
      className={`grid content-start gap-s3 scroll-mt-28 rounded-4xl border border-border-quiet bg-bg-raised p-s6 ${className}`}
    >
      <h3 className="flex items-start gap-s3 font-display text-lg font-bold leading-snug text-accent">
        <Dot />
        <span className="min-w-0">{isolateLatin(item.question)}</span>
      </h3>

      <div className="grid gap-s3">
        {paragraphs.map((paragraph) => (
          /* ⚠️ `isolateLatin` لازمة: الأجوبة تحوي «LinkedIn» و«MISthon»
             و«MISology» وسط جملٍ عربية — بلا عزلٍ ينقلب ترتيبها. */
          <p
            key={paragraph}
            className="text-sm leading-relaxed text-fg-muted sm:text-base"
          >
            {isolateLatin(paragraph)}
          </p>
        ))}

        {full && item.link ? (
          <Link
            href={item.link.href}
            className="mt-s1 inline-flex min-h-11 items-center self-start text-sm font-semibold text-accent transition-[color,transform] hover:text-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
          >
            {item.link.label}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
