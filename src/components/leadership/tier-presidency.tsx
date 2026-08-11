"use client";

import { motion } from "motion/react";

import { STAGGER } from "@/components/leadership/chart-parts";
import { PersonCard } from "@/components/leadership/person-card";
import type { LeadershipTerm } from "@/content/leadership";

/**
 * قمّةُ المخطّط — الرئاسة.
 *
 * بطاقتان مركزيّتان تنزل إحداهما من الأخرى، ومن أسفلهما ينطلق كلُّ ما
 * تحت. العنوانُ `sr-only` لأن البطاقتين نفسَهما تقولان «رئيسة النادي»
 * و«نائب رئيس النادي» — عنوانٌ مرئيٌّ فوقهما تكرار، لكنّ قارئ الشاشة
 * يحتاج مرساةً للقسم.
 */
export function BoardPresidency({ term }: { term: LeadershipTerm }) {
  const path = [term.label, "الرئاسة"];

  return (
    <section id="board-presidency" aria-labelledby="board-presidency-title">
      <h2 id="board-presidency-title" className="sr-only">
        الرئاسة
      </h2>

      <motion.ul
        className="org-apex"
        initial="rest"
        whileInView="settled"
        viewport={{ once: true, margin: "-60px" }}
        variants={STAGGER}
      >
        <PersonCard
          person={term.president}
          path={path}
          variant="apex"
          nameClass="org-name-apex"
        />
        <PersonCard
          person={term.vicePresident}
          path={path}
          variant="lead"
          nameClass="org-name-lead"
        />
      </motion.ul>
    </section>
  );
}
