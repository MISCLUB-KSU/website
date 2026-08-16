import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * الشراكات — **مرفوعةٌ بقرار الإدارة (١٢ أغسطس ٢٠٢٦).**
 *
 * ⚠️ **الصفحة تبقى وتُخدَم — لا تُحذف ولا تُعاد توجيهًا.** من وصل من رابطٍ
 * قديم يجد وجهةً واضحة لا 404. نفس مبدأ `about/structure/page.tsx`
 * و`projects/page.tsx`.
 *
 * ⚠️ **ورابطُ التنقّل نُزع** من `ABOUT_SECTION.children` ومن `contact.ts`
 * ومن `sitemap.ts` — لا يُدعى الزائر إلى صفحةِ انتظار.
 *
 * ── ما يجب أن يُعكَس عند العودة إليها ────────────────────────────────────
 *
 * الشيفرة الكاملة محفوظةٌ في `7b57d24` (آخر نسخةٍ عاملة):
 *   ١) أعِد جسمَ الصفحة من `7b57d24:src/app/about/partnerships/page.tsx`
 *   ٢) انزع `robots: noindex` أدناه
 *   ٣) أعِد سطر `‎/about/partnerships` في `sitemap.ts`
 *   ٤) أعِد السطر في `ABOUT_SECTION.children` في `content/navigation.ts`
 *   ٥) أعِد قناة «الشراكات» في `content/contact.ts`
 *
 * ⚠️ **وبيانات `content/about.ts` لم تُمسّ ولا تُمسّ.** ومنها ما **زال
 * معروضًا في مكانٍ آخر**، فلا يُظنّ أنها ماتت برفع هذي الصفحة:
 *   · `PARTNERS` (جاهز · علم · مزن) تُعرض في **`/achievements`** تحت
 *     «شراكات اكتملت» — عبر `DELIVERED_PARTNERSHIPS` في `achievements.ts`.
 *   · `ALL_PARTNERS` (شعارات الشركاء) تُعرض في الصفحة الرئيسية.
 *   · `PARTNERSHIP_TRACKS` وحدها هي التي بقيت بلا مستهلك — وتبقى للعودة.
 *
 * ⚠️ **فرفعُ هذي الصفحة لا يُخفي أسماء الشركاء عن الموقع.** إن كان
 * المقصود إخفاءهم فالموضعان أعلاه هما المقصودان — يُرفع للإدارة.
 */

export const metadata: Metadata = {
  title: "الشراكات",
  description: "صفحة شراكات نادي نظم المعلومات الإدارية — قيد التجهيز.",
  alternates: { canonical: "/about/partnerships" },
  /* تُحجب عن الفهرسة ما دامت مرفوعة، فلا تُعرض في نتائج البحث صفحةُ انتظار */
  robots: { index: false, follow: true },
};

export default function PartnershipsPage() {
  return (
    <>
      <SiteHeader />

      <main
        id="main" tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-col items-center px-s4 py-s9 text-center sm:px-s7"
      >
        <Mark decorative className="w-full max-w-sm text-mark" />

        <h1 className="font-display mt-s8 text-3xl font-bold text-fg sm:text-4xl">
          قريبًا
        </h1>

        <p className="text-fg-muted mt-s4 max-w-[42ch] text-lead leading-relaxed">
          نجهّز صفحة الشراكات. قريبًا.
        </p>

        {/* مخرجان لا طريقٌ مسدود — والأوّل لجنةُ الشراكات نفسُها، فمن جاء
            يسأل عن التعاون يجد من يكلّمه لا صفحةً صامتة. */}
        <div className="mt-s8 flex flex-wrap items-center justify-center gap-s4">
          <Link
            href="/contact"
            className="rake rake-sm rake-interactive bg-accent text-accent-fg inline-flex min-h-11 items-center px-s6 text-sm font-semibold transition-colors"
          >
            تواصل معنا
          </Link>
          <Link
            href="/about"
            className="text-fg hover:text-accent inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 transition-colors hover:underline"
          >
            نبذة عن النادي
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
