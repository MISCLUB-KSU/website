import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PROJECTS } from "@/content/projects";

/**
 * صفحة المشاريع — **مغلقةٌ مؤقّتًا بقرار حسام (١٠ أغسطس ٢٠٢٦).**
 *
 * السبب: لا يوجد في المستودع ملفُّ شعارٍ واحدٍ لأيّ مشروع (`public/projects/`
 * غير موجود أصلًا، و`markSrc` فارغةٌ في كلّ مشروع). وبطاقةُ مشروعٍ بلا
 * شعارٍ تُقرأ ناقصةً لا هادئة، فالإغلاق أصدق من عرضٍ نصفِ جاهز.
 *
 * ⚠️ **الصفحة تبقى وتُخدَم — لا تُحذف ولا تُعاد توجيهًا.** من وصل إليها من
 * رابطٍ قديم أو من نتيجة بحثٍ مفهرسةٍ سابقًا يجد وجهةً واضحة، لا 404 يقول
 * إن النادي حذف مشاريعه.
 *
 * ── ما يجب أن يُعكَس عند الفتح ───────────────────────────────────────────
 *
 * الشيفرة الكاملة للفهرس في `27407d3:src/app/projects/page.tsx`. وللفتح:
 *   ١) أعِد ذلك الملفّ، وأعِد `[slug]/page.tsx` من نفس التجزئة
 *   ٢) انزع `robots: noindex` من الملفّين
 *   ٣) أعِد `"/projects"` إلى `NAVIGATION` و`FOOTER_LINKS` في `navigation.ts`
 *   ٤) أعِد سطرَي المشاريع في `sitemap.ts`
 *   ٥) أعِد رابط «تصفّح المشاريع» في `contact.ts` ورابط `faq.ts`
 *
 * ⚠️ **وبيانات `projects.ts` لم تُمسّ ولا تُمسّ**: هي التي تغذّي رغبات
 * نموذج التسجيل و`preferences.ts`. وروابط القادة المباشرة
 * `‎/join/project/<slug>` مسارٌ مستقلٌّ **لا يمرّ بهذي الصفحة** فيبقى عاملًا.
 */

export const metadata: Metadata = {
  title: "المشاريع",
  description: "صفحة مشاريع نادي نظم المعلومات الإدارية — قيد التجهيز.",
  alternates: { canonical: "/projects" },
  /* تُحجب عن الفهرسة ما دامت مغلقة، فلا تُعرض في نتائج البحث صفحةُ انتظار */
  robots: { index: false, follow: true },
};

export default function ProjectsPage() {
  return (
    <>
      <SiteHeader />

      <main
        id="main"
        className="mx-auto flex w-full max-w-3xl flex-col items-center px-s4 py-s9 text-center sm:px-s7"
      >
        {/* العلامة هي بطلُ الصفحة — عاريةً بلا صندوقٍ خلفها، بمقاسٍ يملأ
            الشاشة على الجوّال. و`--mark` دورٌ ينقلب مع الوضع: كحليّةٌ
            نهارًا وثلجيّةٌ ليلًا. */}
        <Mark decorative className="w-full max-w-sm text-mark" />

        <h1 className="font-display mt-s8 text-3xl font-bold text-fg sm:text-4xl">
          ترقّبونا
        </h1>

        <p className="text-fg-muted mt-s4 max-w-[46ch] text-lead leading-relaxed">
          صفحةُ المشاريع قيد التجهيز — نُعِدُّ لكلِّ مشروعٍ هويّته كاملةً قبل أن
          نعرضه. وحتى ذلك الحين، المشاريع تعمل ولم تتوقّف.
        </p>

        {/* ⚠️ **رقمٌ حقيقيٌّ يُقرأ من المصدر، لا رقمٌ مكتوب.** لو أُضيف
            مشروعٌ أو حُذف تبدّل السطرُ وحده — ولا يُكتب هنا عددٌ يتقادم. */}
        <p className="text-fg-muted mt-s6 text-sm">
          <span dir="ltr" className="tabular-nums font-semibold">
            {PROJECTS.length}
          </span>{" "}
          مشاريع قائمة، وصفحاتُها في الطريق.
        </p>

        {/* مخرجان لا طريقٌ مسدود: من جاء يسأل عن مشروعٍ يجد أين يسأل، ومن
            جاء ليشارك يجد أين يقدّم. */}
        <div className="mt-s8 flex flex-wrap items-center justify-center gap-s4">
          <Link
            href="/join"
            className="rake rake-sm rake-interactive bg-accent text-accent-fg inline-flex min-h-11 items-center px-s6 text-sm font-semibold transition-colors"
          >
            قدِّم للعضوية
          </Link>
          <Link
            href="/contact"
            className="text-fg hover:text-accent inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 transition-colors hover:underline"
          >
            اسأل عن مشروع
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
