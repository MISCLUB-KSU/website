"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";

import {
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
 * النسخة أ — «الملصق».
 *
 * أقربُ الثلاثِ إلى بطاقة النادي الرسمية: رئاسةٌ في الأعلى، ثم أعمدةٌ
 * متماثلة لكلِّ لجنةٍ عمود، رأسُه لوحةٌ مصمتةٌ باسمها وتحتها صناديقُ
 * أشخاصها. لا تبادلَ ولا زيقزاغ — تماثلٌ خالص.
 */
export function PosterVariant({ term }: { term: LeadershipTerm }) {
  const openPerson = useOpenPerson();
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

      <VLabel id="v1-committees">اللجان</VLabel>

      <ol
        className="v1-grid"
        style={{ "--vx-n": String(term.committees.length) } as CSSProperties}
      >
        {term.committees.map((committee) => {
          const base = [term.label, committee.name];
          const units = flattenUnits(committee.units, base);

          return (
            <li key={committee.slug} className="v1-col">
              <h3 className="v1-plate">{committee.name}</h3>

              <motion.ul
                className="v1-stack"
                initial="rest"
                whileInView="settled"
                viewport={IN_VIEW}
                variants={STAGGER}
              >
                <VPerson person={committee.head} path={base} />
                {committee.deputies?.map((deputy) => (
                  <VPerson key={deputy.name} person={deputy} path={base} />
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
            </li>
          );
        })}
      </ol>

      <VLabel id="v1-projects">المشاريع</VLabel>
      <VTie />

      <ol
        className="v1-grid"
        style={{ "--vx-n": String(term.projects.length) } as CSSProperties}
      >
        {term.projects.map((project) => {
          const base = [term.label, `مشروع ${project.name}`];

          return (
            <li key={project.slug} className="v1-col">
              {/* ⚠️ اسمٌ لاتينيّ — `dir="ltr"` صراحةً، وإلّا انقلب ترتيبُه
                  داخل سياقٍ عربيّ. */}
              <h3 className="v1-plate v1-plate-latin" dir="ltr" lang="en">
                {project.name}
              </h3>

              <motion.ul
                className="v1-stack"
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
            </li>
          );
        })}
      </ol>
    </>
  );
}
