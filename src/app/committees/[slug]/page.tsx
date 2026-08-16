import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { COMMITTEES } from "@/content/committees";
import { findCommitteeBySlug, joinHref } from "@/content/committees-helpers";
import { isolateLatin } from "@/lib/bidi";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COMMITTEES.map((committee) => ({ slug: committee.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const committee = findCommitteeBySlug(slug);
  if (!committee) return {};
  return {
    title: committee.name,
    description: committee.description,
    alternates: { canonical: `/committees/${committee.slug}` },
  };
}

/**
 * صفحة اللجنة.
 *
 * كل وحدة بطاقة تقود إلى نموذج التقديم وخيارها مُهيَّأ — فلا يعيد الطالب
 * البحث عن وحدته داخل قائمة طويلة بعد أن اختارها هنا.
 *
 * حالة الوحدة تُعرض كما هي في البيانات: مفتوح أو مغلق، ولا حالة ثالثة.
 */
export default async function CommitteePage({ params }: PageProps) {
  const { slug } = await params;
  const committee = findCommitteeBySlug(slug);
  if (!committee) notFound();

  const hasUnits = committee.units.length > 0;

  return (
    <>
      <SiteHeader />

      <main id="main" tabIndex={-1}>
        <PageHeader
          id={`committee-${committee.slug}`}
          title={committee.name}
          lede={committee.description}
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          {committee.reportsToPresidency ? (
            <p className="inline-flex items-center gap-s2 text-sm font-medium text-fg-muted">
              <span
                aria-hidden
                className="mis-slant inline-block h-3.5 w-1 bg-line-strong"
              />
              بإشراف الرئاسة مباشرة
            </p>
          ) : null}

          {hasUnits ? (
            <section className="mt-s6" aria-labelledby="units-heading">
              <h2
                id="units-heading"
                className="font-display text-2xl font-semibold"
              >
                الوحدات
              </h2>
              <p className="mt-s2 max-w-measure text-fg-muted">
                اختر الوحدة التي تناسب مهاراتك — يفتح النموذج وخيارها مُهيَّأ.
              </p>

              <ul className="mt-s6 grid gap-s4 sm:grid-cols-2">
                {committee.units.map((unit) => (
                  <li key={unit.slug} className="grid">
                    <div className="rake grid h-full grid-rows-[auto_auto_1fr_auto] gap-s3 bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)]">
                      <span
                        className={
                          unit.isOpen
                            ? "inline-flex items-center gap-s2 text-sm font-semibold text-success"
                            : "inline-flex items-center gap-s2 text-sm font-semibold text-fg-muted"
                        }
                      >
                        <span
                          aria-hidden
                          className="mis-slant inline-block h-3 w-1 bg-current"
                        />
                        {unit.isOpen ? "مفتوح" : "مغلق"}
                      </span>
                      <h3 className="font-display text-lg font-semibold">
                        {unit.name}
                      </h3>
                      <p className="text-sm leading-relaxed text-fg-muted">
                        {isolateLatin(unit.description)}
                      </p>
                      {unit.isOpen ? (
                        <Link
                          href={joinHref(committee, unit)}
                          className="rake rake-sm rake-interactive inline-flex min-h-11 items-center justify-self-start bg-accent px-s5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
                        >
                          قدِّم على هذي الوحدة
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rake mt-s6 bg-bg-sunken p-s6">
              <h2 className="font-display text-2xl font-semibold">
                تعمل ككتلة واحدة
              </h2>
              <p className="mt-s2 max-w-measure text-fg-muted">
                لا وحدات فرعية تحت هذي اللجنة — التقديم عليها مباشرةً.
              </p>
              <Link
                href={joinHref(committee)}
                className="rake rake-sm rake-interactive mt-s5 inline-flex min-h-11 items-center bg-accent px-s5 font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
              >
                قدِّم على {committee.name}
              </Link>
            </section>
          )}

          <p className="mt-s7 text-sm text-fg-muted">
            <Link
              href="/committees"
              className="inline-flex min-h-11 items-center gap-s2 font-medium text-accent transition-colors hover:text-accent-hover"
            >
              <span
                aria-hidden
                className="mis-slant inline-block h-3.5 w-1 bg-current"
              />
              كل اللجان
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
