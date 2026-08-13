import type { ReactNode } from "react";

import Link from "next/link";

import { RakedField } from "@/components/site/raked-field";

type PageHeaderProps = {
  /** مُعرّف فريد — الأقنعة داخل SVG تحتاج معرّفًا لا يتكرّر في الصفحة */
  id: string;
  title: string;
  lede: ReactNode;
  /** روابط شقيقة داخل نفس القسم */
  siblings?: readonly { label: string; href: string }[];
  currentHref?: string;
};

/**
 * ترويسة صفحة داخلية — شريط مضغوط من نفس الحقل المائل، لا واجهة أولى ثانية.
 *
 * مقصود ألّا تكون الكومة المعتادة (لصيقة صغيرة ← عنوان كبير): العنوان مباشرة،
 * وسطر واحد يشرح، والروابط الشقيقة على خطّ واحد تحتها.
 */
export function PageHeader({
  id,
  title,
  lede,
  siblings,
  currentHref,
}: PageHeaderProps) {
  return (
    <header className="raked-field grain px-s4 pb-s6 pt-s7 text-on-ink sm:px-s7">
      <RakedField id={id} />

      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-bold text-snow sm:text-4xl">
          {title}
        </h1>
        <p className="mt-s3 max-w-[52ch] text-lead text-snow">{lede}</p>

        {siblings && siblings.length > 0 ? (
          <nav
            className="mt-s5 flex flex-wrap gap-x-s5"
            aria-label={`أقسام ${title}`}
          >
            {siblings.map((link) => {
              const isCurrent = link.href === currentHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent ? "page" : undefined}
                  /* الصفحة الحالية تُعرَف بالوزن والنبرة — لا نقطة معلّقة تحتها */
                  /* ⚠️ **`px-s2` إلزامي — نفس علّة `nav-links.tsx` بالحرف.**
                     `min-h-11` تضبط الارتفاع وحده، والعرضُ يبقى عرضَ النصّ
                     الخام: قِيست «اللجان» **34px** — تعبر حدّ WCAG 2.5.8
                     (24×24) وتسقط دون حدّ أبل (44×44). والحشو على الجهتين
                     يرفع أقصرَ رابطٍ فوق الحدّ. */
                  className={
                    isCurrent
                      ? "inline-flex min-h-11 items-center px-s2 text-sm font-bold text-snow"
                      : "inline-flex min-h-11 items-center px-s2 text-sm font-medium text-on-ink-dim transition-colors hover:text-snow"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
