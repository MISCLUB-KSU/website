import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ABOUT_INTRO, FOUNDED_YEAR, WHAT_YOU_GET } from "@/content/about";
import { ABOUT_SECTION } from "@/content/navigation";
import { COMMITTEES } from "@/content/committees";
import { PROJECTS } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";

export const metadata: Metadata = {
  title: "حول النادي",
  description: ABOUT_INTRO.lede,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const unitCount = COMMITTEES.reduce((sum, c) => sum + c.units.length, 0);

  return (
    <>
      <SiteHeader />

      <main id="main" tabIndex={-1}>
        <PageHeader
          id="about"
          title="حول النادي"
          lede={ABOUT_INTRO.lede}
          siblings={ABOUT_SECTION.children}
          currentHref="/about"
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <div className="grid gap-s7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-s8">
            <section aria-labelledby="intro-heading">
              <h2 id="intro-heading" className="sr-only">
                نبذة
              </h2>
              {ABOUT_INTRO.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className="mt-s4 max-w-measure text-lead leading-loose first:mt-0"
                >
                  {isolateLatin(paragraph)}
                </p>
              ))}

              <h2 className="mt-s7 font-display text-2xl font-semibold">
                ماذا يكسب العضو
              </h2>
              <ul className="mt-s4 grid gap-s3">
                {WHAT_YOU_GET.map((item) => (
                  <li key={item} className="flex items-start gap-s3">
                    <span
                      aria-hidden
                      className="mis-slant mt-2 inline-block h-3.5 w-1 shrink-0 bg-accent"
                    />
                    <span className="max-w-measure">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* لوحة الحقائق: كل سطر فيها إمّا مؤكَّد أو محذوف — لا قيم تقديرية */}
            <aside
              className="rake h-fit bg-bg-sunken p-s5"
              aria-labelledby="facts-heading"
            >
              <h2
                id="facts-heading"
                className="font-display text-lg font-semibold"
              >
                باختصار
              </h2>
              <dl className="mt-s4 grid gap-s3 text-sm">
                <div className="flex justify-between gap-s3 border-b border-line pb-s3">
                  <dt className="text-fg-muted">الجامعة</dt>
                  <dd className="font-semibold">جامعة الملك سعود</dd>
                </div>
                <div className="flex justify-between gap-s3 border-b border-line pb-s3">
                  <dt className="text-fg-muted">الكلية</dt>
                  <dd className="font-semibold">إدارة الأعمال</dd>
                </div>
                {FOUNDED_YEAR ? (
                  <div className="flex justify-between gap-s3 border-b border-line pb-s3">
                    <dt className="text-fg-muted">سنة التأسيس</dt>
                    <dd dir="ltr" className="font-semibold tabular-nums">
                      {FOUNDED_YEAR}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-s3 border-b border-line pb-s3">
                  <dt className="text-fg-muted">اللجان</dt>
                  <dd dir="ltr" className="font-semibold tabular-nums">
                    {COMMITTEES.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-s3 border-b border-line pb-s3">
                  <dt className="text-fg-muted">الوحدات</dt>
                  <dd dir="ltr" className="font-semibold tabular-nums">
                    {unitCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-s3">
                  <dt className="text-fg-muted">المشاريع</dt>
                  <dd dir="ltr" className="font-semibold tabular-nums">
                    {PROJECTS.length}
                  </dd>
                </div>
              </dl>

              <Link
                href="/about/structure"
                className="mt-s5 inline-flex min-h-11 items-center gap-s2 font-medium text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
              >
                <span
                  aria-hidden
                  className="mis-slant inline-block h-3.5 w-1 bg-current"
                />
                اطّلع على الهيكل الإداري
              </Link>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
