import type { Metadata } from "next";
import Link from "next/link";

import { LiveMark } from "@/components/site/live-mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PROJECTS } from "@/content/projects";
import { ProjectsTeaser } from "./teaser";

/**
 * صفحة المشاريع — **مغلقةٌ مؤقّتًا بقرار الإدارة (١٠ أغسطس ٢٠٢٦).**
 *
 * السبب: لا يوجد في المستودع ملفُّ شعارٍ واحدٍ لأيّ مشروع (`public/projects/`
 * غير موجود أصلًا، و`markSrc` فارغةٌ في كلّ مشروع). وبطاقةُ مشروعٍ بلا
 * شعارٍ تُقرأ ناقصةً لا هادئة، فالإغلاق أصدق من عرضٍ نصفِ جاهز.
 *
 * ⚠️ **الصفحة تبقى وتُخدَم — لا تُحذف ولا تُعاد توجيهًا.** من وصل إليها من
 * رابطٍ قديم أو من نتيجة بحثٍ مفهرسةٍ سابقًا يجد وجهةً واضحة، لا 404 يقول
 * إن النادي حذف مشاريعه.
 *
 * ⚠️ **ورابطُ التنقّل باقٍ في الشريط والتذييل — بقرار الإدارة صراحةً.** فهذي
 * ليست صفحةً مخفيّة بل **وجهةٌ معلَنة**: من ضغط «المشاريع» يجد جوابًا لا
 * فراغًا. وحذفُ الرابط كان يُخفي أن للنادي مشاريعَ أصلًا، وهي أبرز ما فيه.
 * ولذلك يلزم أن تبقى هذي الصفحة **تامّةً في ذاتها** لا صفحةَ عطلٍ مؤقّتة:
 * فهي مقصودةٌ بالنقر لا مُتعثَّرٌ بها.
 *
 * ── ما يجب أن يُعكَس عند الفتح ───────────────────────────────────────────
 *
 * الشيفرة الكاملة للفهرس في `27407d3:src/app/projects/page.tsx`. وللفتح:
 *   ١) أعِد ذلك الملفّ، وأعِد `[slug]/page.tsx` من نفس التجزئة
 *   ٢) انزع `robots: noindex` من الملفّين
 *   ٣) أعِد سطرَي المشاريع في `sitemap.ts`
 *   ٤) أعِد رابط «تصفّح المشاريع» في `contact.ts` ورابط `faq.ts`
 *
 * (ورابطُ التنقّل لا يحتاج شيئًا — لم يُنزع.)
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
        className="mx-auto flex w-full max-w-3xl flex-col items-center px-s4 pt-s9 pb-s7 text-center sm:px-s7"
      >
        {/* العلامة هي بطلُ الصفحة — حيّةٌ كما في صفحة الهيكل الإداري:
            أضلاعُها تُطفأ وتشتعل موجةً. و`--mark` دورٌ ينقلب مع الوضع:
            كحليّةٌ نهارًا وثلجيّةٌ ليلًا. */}
        <LiveMark />

        <h1 className="font-display mt-s7 text-4xl font-bold text-fg sm:text-5xl">
          ترقّبونا
        </h1>

        {/* ⚠️ **سطرٌ واحد — وأربع صياغاتٍ رُدَّت قبله، كلُّها بطلب الإدارة:**
            ١) «المشاريع تعمل ولم تتوقّف» — ادّعاءٌ بلا سند يناقض «التقديم
               مغلق حاليًّا» في الواجهة.
            ٢) إحالةٌ إلى صفحة الإنجازات — تصرف من جاء يسأل عن المشاريع
               إلى قسمٍ لم يطلبه.
            ٣) «٦ مشاريع قائمة، وصفحاتُها في الطريق» — نصفُه تكرار،
               و«قائمة» وصفُ حالةٍ بلا سند.
            ٤) «قيد التجهيز — نُعِدُّ لكلِّ مشروعٍ هويّته كاملةً» — تشرح
               للطالب عملًا داخليًّا لا يعنيه.
            فبقي ما يعنيه وحده: **ماذا يحدث، ومتى.** والقاعدة الخارجة من
            الجولة: كلُّ جملةٍ تصف حالةً راهنة تحتاج مصدرًا في المستودع
            أو تُحذف — والصفحة تكفيها جملةٌ واحدة ومخرجان. */}
        {/* ⚠️ **العددُ أُضيف والقاعدةُ محفوظة.** «ستّة» ليس وصفَ حالةٍ بلا
            سند — هو `PROJECTS.length` نفسُه، مقروءًا من `projects.ts`. فلو
            زاد مشروعٌ أو نقص تغيّر الرقمُ معه، ولا يكذب السطر. */}
        <p className="text-fg-muted mt-s4 max-w-[42ch] text-lead leading-relaxed">
          نجهّز صفحاتِ مشاريعنا الـ
          <span dir="ltr" className="tabular-nums">
            {PROJECTS.length}
          </span>
          . قريبًا.
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

        <ProjectsTeaser />
      </main>

      <SiteFooter />
    </>
  );
}
