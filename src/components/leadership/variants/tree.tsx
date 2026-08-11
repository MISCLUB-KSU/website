"use client";

import { motion } from "motion/react";

import {
  flattenUnits,
  IN_VIEW,
  RISE,
  STAGGER,
  VLabel,
  VPerson,
} from "@/components/leadership/variants/shared";
import type { LeadershipTerm } from "@/content/leadership";

/**
 * النسخة ب — «الشجرة».
 *
 * شجرةٌ تنمو من جهة البداية إلى نهايتها (يمينًا إلى يسارًا في العربية):
 * الرئاسةُ جذرًا، ثم اللجانُ فروعًا، ثم أشخاصُها أوراقًا — بمرفقٍ لكلِّ
 * عنصرٍ كما في شجرة الملفّات. كلُّ الفروع من **جهةٍ واحدة** فلا زيقزاغ،
 * والعمقُ يُقرأ من الإزاحة لا من اللون وحده.
 *
 * وهي أصلحُ الثلاث على الجوّال: التخطيطُ نفسُه لا يتغيّر، تضيق الإزاحةُ
 * فحسب.
 */
export function TreeVariant({ term }: { term: LeadershipTerm }) {
  const topPath = [term.label, "الرئاسة"];

  return (
    <>
      <motion.ul
        className="v2-root"
        initial="rest"
        whileInView="settled"
        viewport={IN_VIEW}
        variants={STAGGER}
      >
        <VPerson
          person={term.president}
          path={topPath}
          className="v2-person v2-person-chief"
          itemClassName="v2-root-item"
        />
        <VPerson
          person={term.vicePresident}
          path={topPath}
          className="v2-person v2-person-chief"
          itemClassName="v2-root-item"
        />
      </motion.ul>

      <VLabel id="v2-committees">اللجان</VLabel>

      <ul className="v2-branch">
        {term.committees.map((committee) => {
          const base = [term.label, committee.name];
          const units = flattenUnits(committee.units, base);

          return (
            <li key={committee.slug} className="v2-item">
              <h3 className="v2-node">{committee.name}</h3>

              <motion.ul
                className="v2-branch"
                initial="rest"
                whileInView="settled"
                viewport={IN_VIEW}
                variants={STAGGER}
              >
                <VPerson
                  person={committee.head}
                  path={base}
                  className="v2-person"
                  itemClassName="v2-item"
                />
                {committee.deputies?.map((deputy) => (
                  <VPerson
                    key={deputy.name}
                    person={deputy}
                    path={base}
                    className="v2-person"
                  itemClassName="v2-item"
                  />
                ))}
                {units.map((unit) => (
                  <VPerson
                    key={unit.key}
                    person={unit.person}
                    path={unit.path}
                    className="v2-person v2-person-leaf"
                    itemClassName="v2-item"
                  />
                ))}
              </motion.ul>
            </li>
          );
        })}
      </ul>

      <VLabel id="v2-projects">المشاريع</VLabel>

      <ul className="v2-branch">
        {term.projects.map((project) => {
          const base = [term.label, `مشروع ${project.name}`];

          return (
            <li key={project.slug} className="v2-item">
              {/* ⚠️ اسمٌ لاتينيّ — `dir="ltr"` صراحةً، وإلّا انقلب ترتيبُه
                  داخل سياقٍ عربيّ. */}
              <h3 className="v2-node v2-node-latin" dir="ltr" lang="en">
                {project.name}
              </h3>

              <motion.ul
                className="v2-branch"
                initial="rest"
                whileInView="settled"
                viewport={IN_VIEW}
                variants={STAGGER}
              >
                <VPerson
                  person={project.manager}
                  path={base}
                  className="v2-person"
                  itemClassName="v2-item"
                />
                {project.deputies.map((deputy) => (
                  <VPerson
                    key={deputy.name}
                    person={deputy}
                    path={base}
                    className="v2-person v2-person-leaf"
                    itemClassName="v2-item"
                  />
                ))}
              </motion.ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}
