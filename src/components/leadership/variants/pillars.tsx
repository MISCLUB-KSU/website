"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type CSSProperties } from "react";

import {
  EASE,
  flattenUnits,
  IN_VIEW,
  RISE,
  STAGGER,
  VLabel,
  VPerson,
  VTie,
} from "@/components/leadership/variants/shared";
import { useOpenPerson } from "@/components/leadership/person-context";
import type { LeadershipTerm } from "@/content/leadership";

/**
 * النسخة ج — «الأعمدة».
 *
 * الحركةُ هنا هي الفكرة لا الزينة: كلُّ لجنةٍ عمودٌ يعرض رئيسَها، وضغطةٌ
 * تفتحه فينزل بقيّةُ فريقه بارتفاعٍ متحرّك. تُبقي الصفحةَ قصيرةً ومقروءةً،
 * ويقرّر القارئُ ماذا يفتح.
 *
 * ⚠️ **المطويُّ غيرُ مُصيَّرٍ أصلًا** لا مخفيٌّ بارتفاعٍ صفر: عنصرٌ بارتفاع
 * صفرٍ يبقى في مسار `Tab` فيقع التركيزُ على ما لا يُرى. و`aria-expanded`
 * على الزرّ يخبر قارئَ الشاشة بالحالة.
 */
export function PillarsVariant({ term }: { term: LeadershipTerm }) {
  const openPerson = useOpenPerson();
  const [openSlug, setOpenSlug] = useState<string | null>(
    term.committees[0]?.slug ?? null,
  );
  const topPath = [term.label, "الرئاسة"];

  return (
    <>
      <motion.ul
        className="v1-top"
        initial="rest"
        whileInView="settled"
        viewport={IN_VIEW}
        variants={STAGGER}
      >
        {[term.president, term.vicePresident].map((person) => (
          <motion.li key={person.name} variants={RISE}>
            <button
              type="button"
              className="v1-chief"
              aria-haspopup="dialog"
              onClick={(event) =>
                openPerson({ person, path: topPath }, event.currentTarget)
              }
            >
              <span className="vx-role">{person.role}</span>
              <span className="vx-name">
                {person.name}
                {person.linkedin ? (
                  <>
                    <span className="vx-has-link" aria-hidden />
                    <span className="sr-only">— له حساب لينكدإن</span>
                  </>
                ) : null}
              </span>
            </button>
          </motion.li>
        ))}
      </motion.ul>

      <VLabel id="v3-committees">اللجان</VLabel>
      <p className="v3-hint">اضغط على أي لجنة لعرض فريقها كاملًا</p>
      <VTie />

      <ol
        className="v3-row"
        style={{ "--vx-n": String(term.committees.length) } as CSSProperties}
      >
        {term.committees.map((committee) => {
          const base = [term.label, committee.name];
          const units = flattenUnits(committee.units, base);
          const rest = [...(committee.deputies ?? [])];
          const isOpen = openSlug === committee.slug;
          const total = 1 + rest.length + units.length;

          return (
            <li key={committee.slug}>
              <div className="v3-pillar" data-open={isOpen}>
                <button
                  type="button"
                  className="v3-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenSlug(isOpen ? null : committee.slug)}
                >
                  <span className="v3-title">{committee.name}</span>
                  <span className="v3-count" dir="ltr">
                    {total}
                  </span>
                </button>

                <div className="v3-inner">
                  <ul>
                    <VPerson person={committee.head} path={base} />
                  </ul>
                </div>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      className="v3-body"
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.32, ease: EASE }}
                    >
                      <motion.ul
                        className="v3-inner"
                        initial="rest"
                        animate="settled"
                        variants={STAGGER}
                      >
                        {rest.map((deputy) => (
                          <VPerson
                            key={deputy.name}
                            person={deputy}
                            path={base}
                          />
                        ))}
                        {units.map((unit) => (
                          <VPerson
                            key={unit.key}
                            person={unit.person}
                            path={unit.path}
                            className="vx-person vx-person-deep"
                          />
                        ))}
                      </motion.ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>

      <VLabel id="v3-projects">المشاريع</VLabel>
      <VTie />

      <ol
        className="v3-row"
        style={{ "--vx-n": String(term.projects.length) } as CSSProperties}
      >
        {term.projects.map((project) => {
          const base = [term.label, `مشروع ${project.name}`];

          return (
            <li key={project.slug}>
              <div className="v3-pillar" data-open="true">
                <div className="v3-trigger">
                  {/* ⚠️ اسمٌ لاتينيّ — `dir="ltr"` صراحةً */}
                  <span className="v3-title" dir="ltr" lang="en">
                    {project.name}
                  </span>
                </div>

                <motion.ul
                  className="v3-inner"
                  initial="rest"
                  whileInView="settled"
                  viewport={IN_VIEW}
                  variants={STAGGER}
                >
                  <VPerson person={project.manager} path={base} />
                  {project.deputies.map((deputy) => (
                    <VPerson key={deputy.name} person={deputy} path={base} />
                  ))}
                </motion.ul>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
