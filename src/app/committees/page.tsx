import type { Metadata } from "next";
import Link from "next/link";

import { CommitteeMark } from "@/components/site/committee-mark";
import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { COMMITTEES } from "@/content/committees";
import { isolateLatin } from "@/lib/bidi";

export const metadata: Metadata = {
  title: "اللجان",
  description:
    "لجان نادي نظم المعلومات الإدارية ووحداتها — اختر ما يناسب مهاراتك قبل التقديم.",
  alternates: { canonical: "/committees" },
};

/**
 * اللجان — صفحة الاختيار.
 *
 * تختلف عن `/about/structure` بالغرض لا بالمحتوى: تلك تعرض الهيكل كما هو
 * معتمد وتخدم من يسأل «كيف يُدار النادي؟». وهذي تخدم الطالب الذي يسأل
 * «أين أنتمي؟» — فترتّب اللجان كخيارات تقديم، وتقود كل وحدة إلى النموذج
 * وخيارها مُهيَّأ. صفحتان بمسارين لأن السؤالين مختلفان.
 */
export default function CommitteesPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="committees"
          title="اللجان"
          lede="الطالب ينضم إلى وحدة لها عمل محدّد ومسؤولية يُحاسَب عليها — لا إلى النادي بصفة عامة."
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <ul className="grid gap-s4 sm:grid-cols-2">
            {COMMITTEES.map((committee) => (
              <li key={committee.slug} className="grid">
                <Link
                  href={`/committees/${committee.slug}`}
                  className="rake grid h-full grid-rows-[auto_auto_1fr_auto] gap-s3 bg-bg-raised p-s5 text-fg shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-bg-sunken"
                >
                  {/* علامة اللجنة — تتكرّر في صفحتها وفي نموذج التقديم،
                      فيتعرّف الطالب عليها قبل أن يقرأ اسمها */}
                  <CommitteeMark
                    icon={committee.mark}
                    className="size-6 text-accent"
                  />
                  <h2 className="font-display text-lg font-semibold">
                    {committee.name}
                  </h2>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {isolateLatin(committee.description)}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {committee.units.length > 0 ? (
                      <>
                        <span dir="ltr" className="tabular-nums">
                          {committee.units.length}
                        </span>{" "}
                        وحدات متخصّصة
                      </>
                    ) : (
                      "تعمل ككتلة واحدة"
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* ⚠️ نُزعت الإحالةُ إلى «الهيكل القيادي» — الصفحة مرفوعةٌ
              مؤقّتًا (١١ أغسطس ٢٠٢٦). تعود مع الصفحة. */}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
