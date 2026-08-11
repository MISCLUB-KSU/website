import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * الهيكل القيادي — **مرفوعٌ مؤقّتًا بقرار حسام (١١ أغسطس ٢٠٢٦).**
 *
 * السبب المباشر: زوّارٌ من «مبدعون» مرّوا على الموقع والصفحة لم تستقرّ
 * بعد. سبعُ صياغاتٍ بُنيت في يومٍ واحد ورُفضت كلُّها، والاتجاه لم يُحسم —
 * فرفعُها أصدق من عرضِ تجربةٍ نصفِ مستقرّة على من يزور الموقع لأوّل مرّة.
 *
 * ⚠️ **الصفحة تبقى وتُخدَم — لا تُحذف ولا تُعاد توجيهًا.** من وصل من
 * رابطٍ قديم يجد وجهةً واضحة لا 404. نفس مبدأ `app/projects/page.tsx`.
 *
 * ⚠️ **ورابطُ التنقّل نُزع هنا — بخلاف صفحة المشاريع.** الفرق مقصود: تلك
 * وجهةٌ معلَنة يقصدها الطالب بالنقر، وهذي بندٌ فرعيٌّ تحت «من نحن» لم
 * يكن أحدٌ يقصده. فالإعلانُ عنها وهي غير جاهزة دعوةٌ إلى صفحةِ انتظار.
 *
 * ── ما يجب أن يُعكَس عند العودة إليها ────────────────────────────────────
 *
 * الشيفرة الكاملة محفوظةٌ في `566d069` (آخر نسخةٍ عاملة) وما قبلها:
 *   ١) أعِد جسمَ الصفحة من `566d069:src/app/about/structure/page.tsx`
 *      واختر واحدةً من الخمس في `components/leadership/`
 *   ٢) أعِد `app/about/structure/preview/page.tsx` من `566d069` لمقارنتها
 *   ٣) انزع `robots: noindex` أدناه
 *   ٤) أعِد سطر `‎/about/structure` في `sitemap.ts`
 *   ٥) أعِد السطر في `ABOUT_SECTION.children` في `content/navigation.ts`
 *   ٦) أعِد رابطَي `about/page.tsx` و`committees/page.tsx`
 *
 * ⚠️ **وبيانات `content/leadership.ts` لم تُمسّ ولا تُمسّ** — أسماء الـ٣٢
 * قياديًّا ومسمّياتهم منقولةٌ من البطاقة الرسمية، وهي أغلى ما في العمل.
 * وثلاثةُ أسماءٍ فيها معلَّمةٌ ⚠️ تنتظر تأكيد حسام.
 */

export const metadata: Metadata = {
  title: "الهيكل القيادي",
  description: "صفحة الهيكل القيادي لنادي نظم المعلومات الإدارية — قيد التجهيز.",
  alternates: { canonical: "/about/structure" },
  /* تُحجب عن الفهرسة ما دامت مرفوعة، فلا تُعرض في نتائج البحث صفحةُ انتظار */
  robots: { index: false, follow: true },
};

export default function StructurePage() {
  return (
    <>
      <SiteHeader />

      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-col items-center px-s4 py-s9 text-center sm:px-s7"
      >
        <Mark decorative className="w-full max-w-sm text-mark" />

        <h1 className="font-display mt-s8 text-3xl font-bold text-fg sm:text-4xl">
          قريبًا
        </h1>

        {/* جملةٌ واحدة تصف ما يحدث ومتى — بلا وصفِ حالةٍ لا سندَ لها في
            المستودع. نفس القاعدة التي خرجت من جولة صفحة المشاريع. */}
        <p className="text-fg-muted mt-s4 max-w-[42ch] text-lead leading-relaxed">
          نجهّز صفحة الهيكل القيادي. قريبًا.
        </p>

        {/* مخرجان لا طريقٌ مسدود */}
        <div className="mt-s8 flex flex-wrap items-center justify-center gap-s4">
          <Link
            href="/committees"
            className="rake rake-sm rake-interactive bg-accent text-accent-fg inline-flex min-h-11 items-center px-s6 text-sm font-semibold transition-colors"
          >
            تصفّح اللجان
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
