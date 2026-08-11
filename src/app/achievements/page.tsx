import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  ACHIEVEMENTS,
  DELIVERED_PARTNERSHIPS,
  FOUNDED,
} from "@/content/achievements";
import { isolateLatin } from "@/lib/bidi";
import { CountUp } from "@/components/site/mobile-motion";

export const metadata: Metadata = {
  title: "الإنجازات",
  description:
    "ما أنجزه نادي نظم المعلومات الإدارية بجامعة الملك سعود بأرقامه: مستفيدو المشاريع، والمشاركون، والشراكات المكتملة.",
  alternates: { canonical: "/achievements" },
};

/**
 * الإنجازات.
 *
 * كل رقم يحمل مشروعه تحته: الرقم بلا سياقه ادّعاء، ومع سياقه يُتحقَّق منه.
 * ولا مجموع كليّ في أعلى الصفحة — انظر سبب ذلك في `achievements.ts`.
 */
export default function AchievementsPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="achievements"
          title="الإنجازات"
          lede={isolateLatin(
            `منذ ${FOUNDED}، وهذي حصيلة ما نُفِّذ فعلًا — كل رقم بمصدره، بلا تقدير ولا تدوير.`,
          )}
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <ul className="grid gap-s4 sm:grid-cols-2 lg:grid-cols-3">
            {ACHIEVEMENTS.map((item) => (
              <li
                key={`${item.source}-${item.label}`}
                className="flex flex-col gap-s2 bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)]"
              >
                {/* الرقم معزول وحده، ووحدته العربية خارج العزل — وإلا
                    قُرئت «+6 آلاف» على الشاشة «آلاف 6+». */}
                {/* ⚠️ العدّاد يستبدل نصًّا **مطبوعًا من الخادم** ثم يعيده
                    إليه — لا يبني رقمًا من عدم. تعثّر الجافاسكربت؟ بقيت
                    القيمة الصحيحة مقروءة. وعلى الحاسب ومع تقليل الحركة:
                    نصٌّ ثابتٌ كما كان. */}
                <p className="font-display text-3xl font-bold text-accent">
                  <CountUp
                    value={item.value}
                    className="tabular-nums inline-block"
                  />
                  {item.unit ? ` ${item.unit}` : null}
                </p>
                <span className="text-[0.95rem] leading-relaxed text-fg">
                  {item.label}
                </span>
                {/* المشروع هو مصدر الرقم — يُذكر لا يُخفى */}
                <span className="mt-auto text-xs text-fg-muted">
                  من مشروع <span dir="ltr">{item.source}</span>
                </span>
              </li>
            ))}
          </ul>

          <section className="mt-s8 border-t border-line pt-s6">
            <h2 className="font-display text-xl font-semibold text-fg">
              شراكات اكتملت
            </h2>
            <p className="mt-s2 max-w-measure text-sm leading-relaxed text-fg-muted">
              جهات تعاونت مع النادي فعلًا — لا شعارات بلا مضمون. وما زال قيد
              التواصل لا يُعرض هنا حتى يكتمل.
            </p>

            <ul className="mt-s5 grid gap-s4 sm:grid-cols-3">
              {DELIVERED_PARTNERSHIPS.map((partner) => (
                <li
                  key={partner.name}
                  className="border-s-2 border-line-strong ps-s3"
                >
                  <p className="text-[0.95rem] font-semibold text-fg">
                    {isolateLatin(partner.name)}
                  </p>
                  <p className="mt-1 text-[0.84rem] leading-relaxed text-fg-muted">
                    {isolateLatin(partner.contribution)}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-s6 text-sm text-fg-muted">
              تبحث عن تفاصيل كل مشروع ومخرجاته؟{" "}
              <Link
                href="/projects"
                className="font-medium text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
              >
                صفحة المشاريع
              </Link>
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
