import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PRIMARY_ACTION } from "@/content/navigation";
import { PROJECTS, findProject } from "@/content/projects";

type PageProps = { params: Promise<{ slug: string }> };

/** كل المشاريع معروفة وقت البناء — تُولَّد صفحاتها ثابتة. */
export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
  };
}

/**
 * صفحة المشروع — فضاء المشروع نفسه.
 *
 * هنا فقط تُطبَّق طبقة ألوان المشروع، عبر متغيّر محصور في هذا القسم.
 * أما شريط النادي وتذييله فيبقيان على هوية النادي — بلا هذا الحدّ تتحوّل
 * هوية النادي إلى ألوان متناثرة بعدد مشاريعه.
 */
export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();

  const accent = project.accent ?? "var(--accent)";
  const isOpen = project.applicationState === "open";

  return (
    <>
      <SiteHeader />

      <main style={{ "--project-accent": accent } as React.CSSProperties}>
        <PageHeader
          id={`project-${project.slug}`}
          title={project.name}
          lede={project.tagline ?? project.summary}
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          {project.tagline ? (
            <p className="max-w-measure text-lead leading-loose">
              {project.summary}
            </p>
          ) : null}

          {project.vision || project.mission ? (
            <div className="mt-s7 grid gap-s4 sm:grid-cols-2">
              {project.vision ? (
                <section className="rake bg-bg-sunken p-s5">
                  <h2 className="text-sm font-bold text-fg-muted">الرؤية</h2>
                  <p className="mt-s2 leading-relaxed">{project.vision}</p>
                </section>
              ) : null}
              {project.mission ? (
                <section className="rake bg-bg-sunken p-s5">
                  <h2 className="text-sm font-bold text-fg-muted">الرسالة</h2>
                  <p className="mt-s2 leading-relaxed">{project.mission}</p>
                </section>
              ) : null}
            </div>
          ) : null}

          {project.programs && project.programs.length > 0 ? (
            <section className="mt-s8" aria-labelledby="programs-heading">
              <h2
                id="programs-heading"
                className="font-display text-2xl font-semibold"
              >
                البرامج
              </h2>
              <p className="mt-s2 max-w-measure text-fg-muted">
                برامج المشروع تتشارك شكل العلامة وتفترق بلونها.
              </p>

              <ul className="mt-s6 grid gap-s4 sm:grid-cols-2">
                {project.programs.map((program) => (
                  <li
                    key={program.name}
                    className="rake grid grid-rows-[auto_auto_1fr] gap-s3 bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)]"
                  >
                    <span
                      aria-hidden
                      className="mis-slant inline-block h-5 w-1.5"
                      style={{
                        background: program.accent ?? "var(--project-accent)",
                      }}
                    />
                    <h3 className="font-display text-lg font-semibold">
                      <span dir="ltr">{program.name}</span>
                      {program.nameAr ? (
                        <span className="mr-s2 text-sm font-normal text-fg-muted">
                          {program.nameAr}
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {program.description}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {project.stats && project.stats.length > 0 ? (
            <section className="mt-s8" aria-labelledby="stats-heading">
              <h2
                id="stats-heading"
                className="font-display text-2xl font-semibold"
              >
                أرقام المشروع
              </h2>
              {/* أرقام حقيقية منقولة من مصادر النادي — لا أرقام تزيينية */}
              <dl className="mt-s5 grid gap-s4 sm:grid-cols-2 lg:grid-cols-4">
                {project.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-s-2 ps-s4"
                    style={{ borderColor: "var(--project-accent)" }}
                  >
                    <dt className="text-sm text-fg-muted">{stat.label}</dt>
                    <dd
                      dir="ltr"
                      className="mt-s1 font-display text-2xl font-bold tabular-nums"
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section
            className="rake mt-s8 grid gap-s4 bg-bg-sunken p-s6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            aria-labelledby="join-heading"
          >
            <div>
              <h2
                id="join-heading"
                className="font-display text-2xl font-semibold"
              >
                {isOpen ? "التقديم مفتوح" : "التقديم مغلق حاليًا"}
              </h2>
              <p className="mt-s2 max-w-measure text-fg-muted">
                {isOpen
                  ? "اختر المشروع الذي يناسبك عند التقديم."
                  : "يُفتح التقديم لكل اللجان والمشاريع في اللحظة نفسها."}
              </p>
            </div>
            {isOpen ? (
              <Link
                href={PRIMARY_ACTION.href}
                className="rake rake-sm rake-interactive inline-flex min-h-11 items-center bg-accent px-s5 font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
              >
                {PRIMARY_ACTION.label}
              </Link>
            ) : null}
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
