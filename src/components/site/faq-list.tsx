import Link from "next/link";

import type { FaqItem } from "@/content/faq";
import { isolateLatin } from "@/lib/bidi";

/**
 * الأسئلة الشائعة — سؤال مطويّ يُفتح بالضغط.
 *
 * `<details>` أصيل لا أكورديون مبنيّ بجافاسكربت. ثلاث فوائد لا تُشترى:
 * يعمل بلا جافاسكربت · يفتحه المتصفح تلقائيًا حين يجد الجواب ببحث
 * الصفحة (Ctrl+F) · ويُعلن حالته لقارئ الشاشة بلا `aria` يدوي.
 *
 * الحوافّ حادّة والعلامة ضربةٌ مائلة من الشعار — لا صندوق دائري ولا سهم
 * جاهز. ولا تُفتح الأسئلة إلا واحدًا واحدًا؟ لا: يبقى المفتوح مفتوحًا،
 * فمن يقارن جوابين لا يُغلق عليه أحدهما وهو يقرأ الآخر.
 */

type FaqListProps = {
  items: readonly FaqItem[];
  /** ترقيم المراسي — يبقى ثابتًا ليصلح مشاركة رابط السؤال */
  idPrefix?: string;
  /** أول سؤال مفتوح: يُرى الشكل مفتوحًا فيُعرف أنها تُفتح */
  openFirst?: boolean;
};

export function FaqList({
  items,
  idPrefix = "q",
  openFirst = false,
}: FaqListProps) {
  return (
    <div className="flex flex-col gap-s2">
      {items.map((item, index) => (
        <details
          key={item.question}
          id={`${idPrefix}${index + 1}`}
          open={openFirst && index === 0}
          className="scroll-mt-28 border border-line bg-bg-raised transition-colors hover:border-line-strong"
        >
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-s4 px-s4 py-s3 text-start font-display text-[0.98rem] font-semibold text-fg [&::-webkit-details-marker]:hidden">
            {isolateLatin(item.question)}
            <span aria-hidden className="mis-toggle text-accent" />
          </summary>

          <div className="flex flex-col gap-s3 border-t border-line px-s4 py-s4">
            {item.answer.map((paragraph) => (
              <p
                key={paragraph}
                className="max-w-measure leading-relaxed text-fg-muted"
              >
                {isolateLatin(paragraph)}
              </p>
            ))}
            {item.link ? (
              <Link
                href={item.link.href}
                className="inline-flex min-h-11 items-center self-start text-sm font-medium text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
              >
                {item.link.label}
              </Link>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
