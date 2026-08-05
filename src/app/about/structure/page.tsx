import type { Metadata } from "next";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { COMMITTEES } from "@/content/committees";
import { ABOUT_SECTION } from "@/content/navigation";

export const metadata: Metadata = {
  title: "هيكلة النادي",
  description:
    "الهيكل المعتمد لنادي نظم المعلومات الإدارية: اللجان ووحداتها ونطاق كل واحدة.",
  alternates: { canonical: "/about/structure" },
};

/**
 * هيكلة النادي.
 *
 * لا مخطّط شجريّ مرسوم: على الجوال ينهار أي شجرة إلى فوضى، وقارئ الشاشة
 * لا يقرأ الخطوط. الهيكل هنا قائمة متداخلة — تُقرأ بالعين وبالقارئ سواء.
 *
 * ملاحظة خصوصية: أسماء رؤساء اللجان والوحدات موجودة في العرض المعتمد
 * ولا تُنشر — بقرار الرئاسة.
 */
export default function StructurePage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="structure"
          title="هيكلة النادي"
          lede="لكل لجنة نطاق واضح، وتحت بعضها وحدات متخصّصة. الطالب ينضم إلى وحدة لها عمل محدّد، لا إلى النادي بصفة عامة."
          siblings={ABOUT_SECTION.children}
          currentHref="/about/structure"
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <ol className="grid gap-s5">
            {COMMITTEES.map((committee, index) => (
              <li
                key={committee.slug}
                className="rake grid gap-s4 bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)] sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] sm:gap-s6"
              >
                <div>
                  <p
                    dir="ltr"
                    className="text-xs font-bold tabular-nums text-fg-muted"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-s1 font-display text-xl font-semibold">
                    {committee.name}
                  </h2>
                  {committee.reportsToPresidency ? (
                    <p className="mt-s2 inline-flex items-center gap-s2 text-sm font-medium text-fg-muted">
                      <span
                        aria-hidden
                        className="mis-slant inline-block h-3 w-1 bg-line-strong"
                      />
                      بإشراف الرئاسة مباشرة
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="max-w-measure leading-relaxed text-fg-muted">
                    {committee.description}
                  </p>

                  {committee.units.length > 0 ? (
                    <>
                      <h3 className="mt-s5 text-sm font-bold">
                        الوحدات
                      </h3>
                      <ul className="mt-s3 grid gap-s3">
                        {committee.units.map((unit) => (
                          <li
                            key={unit.slug}
                            /* خصائص منطقية لا فيزيائية: تتبع اتجاه المستند */
                            className="border-s-2 border-line-control ps-s3"
                          >
                            <p className="font-semibold">{unit.name}</p>
                            <p className="mt-s1 max-w-measure text-sm text-fg-muted">
                              {unit.description}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-s4 text-sm text-fg-muted">
                      تعمل ككتلة واحدة بلا وحدات فرعية.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
