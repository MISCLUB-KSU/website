import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { ProjectMark } from "@/components/site/project-mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PROJECTS, projectHref } from "@/content/projects";

export const metadata: Metadata = {
  title: "المشاريع",
  description:
    "مشاريع نادي نظم المعلومات الإدارية: لكل مشروع فريق وآلية عمل ومخرجات.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="projects"
          title="المشاريع"
          lede="كل مشروع فريق وآلية عمل ومخرجات — لا نشاط منفرد ينتهي بانتهاء اليوم."
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <ul className="grid gap-s4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((project) => (
              <li key={project.slug} className="grid">
                <Link
                  href={projectHref(project)}
                  {...(project.externalUrl
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="rake grid h-full grid-rows-[auto_auto_1fr_auto] gap-s3 bg-bg-raised p-s5 text-fg shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-bg-sunken"
                >
                  <ProjectMark project={project} size={32} />
                  <h2 dir="ltr" className="font-display text-lg font-semibold">
                    {project.name}
                  </h2>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {project.tagline ?? project.summary}
                  </p>
                  {project.programs && project.programs.length > 0 ? (
                    <p className="text-xs text-fg-muted">
                      <span dir="ltr" className="tabular-nums">
                        {project.programs.length}
                      </span>{" "}
                      برامج داخله
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
