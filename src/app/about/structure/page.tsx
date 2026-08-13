import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SOCIAL_LINKS } from "@/content/about";
import { ABOUT_SECTION } from "@/content/navigation";
import { LiveMark } from "@/components/site/live-mark";
import { StructureTeaser } from "./teaser";

/**
 * الهيكل الإداري — **صفحةُ ترقّبٍ مُعلَنة (١٢ أغسطس ٢٠٢٦).**
 *
 * ⚠️ **الاسم «الإداري» لا «القيادي» — بقرار حسام.** غُيّر في العنوان والوصف
 * وفي كل رابطٍ يشير إليها. وما بقي من «القياديّ» في `content/leadership.ts`
 * و`content/alumni.ts` وصفٌ لمصدرٍ خارجيّ (الملفّ التعريفيّ ٢٠٢٥–٢٠٢٦) لا
 * اسمُ هذي الصفحة، فلم يُمسّ.
 *
 * ⚠️ **ورجعت مُعلَنةً لا مرفوعة.** كانت مرفوعةً في ١١ أغسطس بلا رابطٍ
 * إليها ولا فهرسة، لأن سبع صياغاتٍ للشجرة رُفضت ولم يُحسم الاتجاه. والآن
 * الحسمُ غيرُ مطلوبٍ أصلًا: **الإعلان يقع في إكس**، وهذي الصفحة تقود إليه.
 * فعادت إلى `ABOUT_SECTION` وإلى `sitemap`، ونُزع `noindex` — صفحةٌ لها
 * دعوةٌ صريحة تُفهرس، بخلاف صفحة انتظارٍ خاوية.
 *
 * ⚠️ **ولا يُوعَد بموعد.** لا «خلال أيام» ولا «الأسبوع القادم» — النصُّ
 * يقول أين يقع الإعلان لا متى، فوعدُ الموعد يُخلَف ويُكلّف الثقة.
 *
 * ── الشجرة حين تجهز ─────────────────────────────────────────────────────
 * الشيفرة الكاملة في `566d069` وما قبلها، والنسخ الخمس في
 * `components/leadership/`. وبيانات الـ٣٢ قياديًّا في `content/leadership.ts`
 * لم تُمسّ، وثلاثةُ أسماءٍ فيها معلَّمةٌ ⚠️ تنتظر تأكيد حسام.
 */

const X = SOCIAL_LINKS.find((link) => link.platform === "x");

export const metadata: Metadata = {
  title: "الهيكل الإداري",
  description:
    "الهيكل الإداري لنادي نظم المعلومات الإدارية — يُعلَن في حساب النادي على إكس.",
  alternates: { canonical: "/about/structure" },
};

export default function StructurePage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="structure"
          title="الهيكل الإداري"
          lede="رئاسة النادي ولجانه ووحداته — ومن يقود كلًّا منها هذا الفصل."
          siblings={ABOUT_SECTION.children}
          currentHref="/about/structure"
        />

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-s4 pt-s9 pb-s7 text-center sm:px-s7">
          <LiveMark />

          <h2 className="font-display mt-s7 text-4xl font-bold text-fg sm:text-5xl">
            ترقّبوا الإعلان
          </h2>

          <p className="text-fg-muted mt-s4 max-w-[44ch] text-lead leading-relaxed">
            يُعلَن الهيكل الإداري للنادي — رئاسته ولجانه ووحداته — في حسابنا
            على{" "}
            <span dir="ltr" lang="en">
              X
            </span>
            . تابعنا حتى لا يفوتك.
          </p>

          <div className="mt-s7 flex flex-wrap items-center justify-center gap-s4">
            {/* ⚠️ `rel="noopener noreferrer"` مع `target="_blank"`: الصفحةُ
                المفتوحة تصل إلى `window.opener` بدونهما. */}
            {X && (
              <a
                href={X.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rake rake-sm rake-interactive bg-accent text-accent-fg inline-flex min-h-11 items-center gap-s2 px-s6 text-sm font-semibold transition-colors"
              >
                تابعنا على{" "}
                <span dir="ltr" lang="en">
                  X
                </span>
              </a>
            )}
            <Link
              href="/committees"
              className="text-fg hover:text-accent inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 transition-colors hover:underline"
            >
              تصفّح اللجان
            </Link>
          </div>

          <StructureTeaser />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
