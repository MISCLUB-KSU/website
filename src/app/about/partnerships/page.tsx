import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PARTNERS, PARTNERSHIP_TRACKS } from "@/content/about";
import { ABOUT_SECTION } from "@/content/navigation";
import { isolateLatin } from "@/lib/bidi";

export const metadata: Metadata = {
  title: "الشراكات",
  description:
    "كيف تُبنى الشراكة مع نادي نظم المعلومات الإدارية، ومسارات التعاون المتاحة للجهات.",
  alternates: { canonical: "/about/partnerships" },
};

/**
 * الشراكات.
 *
 * الصفحة تخدم الراعي لا الطالب، فتبدأ بما يهمّه: ماذا تعني الشراكة عمليًا.
 *
 * قائمة الشركاء تُعرض فقط إن كانت مؤكَّدة. الحالة الفارغة تقول الحقيقة —
 * أن القائمة لم تُعلن بعد — ولا تُملأ بأرقام «جهات قيد التواصل»: التواصل
 * ليس شراكة، وعرضه كشراكة ادّعاء يكلّف مصداقية النادي عند أول تدقيق.
 */
export default function PartnershipsPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="partnerships"
          title="الشراكات"
          lede="النادي يبحث عن جهات تفتح لطلابه بابًا حقيقيًا على العمل — لا شعارًا يُعرض في ملصق."
          siblings={ABOUT_SECTION.children}
          currentHref="/about/partnerships"
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <section aria-labelledby="tracks-heading">
            <h2
              id="tracks-heading"
              className="font-display text-2xl font-semibold"
            >
              مسارات التعاون
            </h2>
            <p className="mt-s2 max-w-measure text-fg-muted">
              ثلاثة مسارات، ويمكن الجمع بينها.
            </p>

            <ul className="mt-s6 grid gap-s4 sm:grid-cols-3">
              {PARTNERSHIP_TRACKS.map((track) => (
                <li
                  key={track.title}
                  className="rake grid grid-rows-[auto_1fr] gap-s3 bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)]"
                >
                  <h3 className="font-display text-lg font-semibold">
                    {track.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {track.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-s8" aria-labelledby="partners-heading">
            <h2
              id="partners-heading"
              className="font-display text-2xl font-semibold"
            >
              الشركاء
            </h2>

            {PARTNERS.length > 0 ? (
              <ul className="mt-s6 grid gap-s4 sm:grid-cols-2 lg:grid-cols-3">
                {PARTNERS.map((partner) => (
                  <li
                    key={partner.name}
                    className="rake grid gap-s2 bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)]"
                  >
                    <h3 className="font-display text-lg font-semibold">
                      {partner.name}
                    </h3>
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {/* ⚠️ **بلا `isolateLatin` عمدًا — وقياسًا لا اجتهادًا.**
                        نصُّ الإسهام ينتهي بمقطعٍ لاتينيّ تليه نقطة
                        («…لمعرض LearnX.»). والعزل يغلق الصندوق قبل النقطة،
                        فتصير النقطةُ محايدًا في سياقٍ عربيّ فتُرسم **يمين**
                        الاسم لا يساره: قِيس فقفزت من 263 إلى 212→216، أي
                        بين «لمعرض» و«LearnX». وبلا عزلٍ تلتصق النقطة بالمقطع
                        اللاتينيّ نفسه فتُرسم في موضعها الصحيح.
                        القاعدة: العزل يصلح حين يكتنف العربيُّ اللاتينيَّ من
                        الجهتين، ويضرّ حين تليه علامةُ ترقيمٍ خِتاميّة. */}
                      {partner.contribution}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rake mt-s6 grid justify-items-center gap-s3 bg-bg-sunken px-s5 py-s7 text-center">
                <Mark decorative className="w-24 text-line-strong" />
                <p className="max-w-[46ch] font-semibold">
                  قائمة الشركاء لم تُعلن بعد.
                </p>
                <p className="max-w-[46ch] text-sm text-fg-muted">
                  تُنشر هنا الجهات التي اكتملت شراكتها فقط — لا الجهات قيد
                  التواصل.
                </p>
              </div>
            )}
          </section>

          <section
            className="rake mt-s8 grid gap-s4 bg-bg-sunken p-s6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            aria-labelledby="contact-heading"
          >
            <div>
              <h2
                id="contact-heading"
                className="font-display text-2xl font-semibold"
              >
                جهة تريد التعاون؟
              </h2>
              <p className="mt-s2 max-w-measure text-fg-muted">
                لجنة العلاقات العامة والشراكات هي نقطة الاتصال، وتحتها وحدة
                مخصّصة للرعايات والشراكات.
              </p>
            </div>
            {/* ⚠️ كان يشير إلى `/about/structure`، وتلك صارت **الهيكل
                القيادي** (من يقود) لا وصفَ نطاق اللجنة. ونصُّ الرابط يَعِد
                بالتعريف باللجنة، فمكانُه صفحتُها. */}
            <Link
              href="/committees/public-relations"
              className="inline-flex min-h-11 items-center gap-s2 font-medium text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
            >
              <span
                aria-hidden
                className="mis-slant inline-block h-3.5 w-1 bg-current"
              />
              تعرّف على اللجنة
            </Link>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
