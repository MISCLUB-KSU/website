"use client";

import { motion } from "motion/react";

import { RISE, Roots, Tie, TierDivider } from "@/components/leadership/chart-parts";
import { PersonRow } from "@/components/leadership/person-card";
import type { LeadershipTerm } from "@/content/leadership";

/**
 * جذورُ الشجرة — المشاريع.
 *
 * ⚠️ أسماءُ المشاريع لاتينيّة، فكلُّ عنوانٍ هنا `dir="ltr"` صراحةً. بدونها
 * ينقلب ترتيبُ الحروف والعلامات داخل سياقٍ عربيّ — أكثرُ عطلٍ يتكرّر في
 * هذا المستودع. ولا تُستعمل `isolateLatin`: المطلوب عنوانٌ لاتينيٌّ كاملٌ
 * لا مقطعٌ داخل جملةٍ عربية.
 */
export function BoardProjects({ term }: { term: LeadershipTerm }) {
  return (
    <section id="board-projects" aria-labelledby="board-projects-title">
      <Tie />
      <TierDivider id="board-projects-title" label="المشاريع" />

      <Roots count={term.projects.length}>
        {term.projects.map((project) => {
          const projectPath = [term.label, `مشروع ${project.name}`];

          return (
            <motion.li key={project.slug} className="org-root" variants={RISE}>
              <div className="org-panel">
                <div className="org-panel-head">
                  {/* ⚠️ لا حشوةَ منطقيّة على هذا العنوان: الخصائصُ
                      المنطقية تُحسب من اتجاه **العنصر نفسه**، وهو هنا
                      `dir="ltr"` — فـ`ps-*` عليه تقع في الجهة الخطأ.
                      الحشوةُ على الرأس في `structure.css`. */}
                  <h3
                    className="org-panel-title org-panel-title-latin"
                    dir="ltr"
                    lang="en"
                  >
                    {project.name}
                  </h3>
                </div>

                <div className="org-panel-body">
                  <ul>
                    <PersonRow person={project.manager} path={projectPath} />
                    {project.deputies.map((deputy) => (
                      <PersonRow
                        key={deputy.name}
                        person={deputy}
                        path={projectPath}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </motion.li>
          );
        })}
      </Roots>
    </section>
  );
}
