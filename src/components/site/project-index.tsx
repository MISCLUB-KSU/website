import Link from "next/link";

import { PROJECTS, projectHref } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";

/**
 * فهرس المشاريع — وخاناته هي مهبط أضلاع الشعار.
 *
 * الخانة `[data-mark-slot]` صندوقٌ بمقاسٍ ثابت يحمل علامةً ثابتة
 * (`[data-mark-static]`). حين تعمل الطبقة المتشكّلة تُخفى الثابتة ويهبط
 * الضلع الطائر في مكانها بالضبط؛ وحين لا تعمل تبقى الثابتة وحدها.
 *
 * ⚠️ العلامة ليست حاملة معنى — ترتيب المشروع في الرقيمة، واسمه في النصّ.
 * فهي `aria-hidden` ولا يُنقل بها معنى.
 */
export function ProjectIndex() {
  return (
    /* `above-mark` تلزم هنا: بدونها تُرسم القطعُ الطائرة فوق أسماء المشاريع
       وأوصافها فتحجبها — رُصد فعليًّا في النموذج قبل ضبط الطبقات. */
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="above-mark w-full py-s8"
    >
      <h2
        id="projects-heading"
        className="px-s4 font-display text-sm font-semibold tracking-[0.12em] text-fg-muted sm:px-s7"
      >
        ما نعمل عليه
      </h2>

      <ul className="mt-s6 px-s4 sm:px-s7">
        {PROJECTS.map((project, index) => (
          <li key={project.slug}>
            <Link
              href={projectHref(project)}
              className="-mx-s3 flex min-h-14 items-center gap-s4 px-s3 py-s3 transition-colors hover:bg-bg-sunken"
            >
              <span
                aria-hidden
                data-mark-slot={index}
                className="relative block h-[38px] w-[30px] shrink-0"
              >
                <span
                  data-mark-static=""
                  className="absolute inset-0 bg-surface-floor"
                  style={{ clipPath: "polygon(44.5% 0, 100% 0, 55.5% 100%, 0 100%)" }}
                />
              </span>
              <span className="w-[2ch] shrink-0 font-display text-sm font-medium text-fg-muted">
                {`0${index + 1}`}
              </span>
              <span className="shrink-0 font-display text-xl font-bold text-surface-floor sm:text-2xl">
                {isolateLatin(project.name)}
              </span>
              {project.tagline ? (
                <span className="text-sm text-fg-muted">{project.tagline}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
