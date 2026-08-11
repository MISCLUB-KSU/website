"use client";

import { motion } from "motion/react";

import { Limbs, RISE, Tie, TierDivider } from "@/components/leadership/chart-parts";
import { PersonRow } from "@/components/leadership/person-card";
import type { LeadershipTerm } from "@/content/leadership";

/**
 * فروعُ الشجرة — اللجان.
 *
 * كلُّ لجنةٍ فرعٌ يخرج من الجذع إلى لوحةٍ مرقَّمة، والفروعُ تتبادل جهتَي
 * الجذع (يمينًا ثم يسارًا). واللوحةُ تحمل قادةَ اللجنة صفًّا صفًّا.
 *
 * ⚠️ **اسمُ الوحدة لا يُطبع سطرًا مستقلًّا.** المسمّى في البيانات كاملٌ
 * أصلًا («قائدة وحدة التصميم») فطباعةُ «وحدة التصميم» فوقه تكرارٌ يضاعف
 * ارتفاع اللوحة بلا معلومة. الوحداتُ تبقى في `leadership.ts` لأنها
 * الحقيقة، وتُسطَّح هنا للعرض — ويظهر اسمُها في مسار البطاقة المنبثقة.
 */
export function BoardCommittees({ term }: { term: LeadershipTerm }) {
  return (
    <section id="board-committees" aria-labelledby="board-committees-title">
      <Tie />
      <TierDivider id="board-committees-title" label="اللجان" />

      <Limbs>
        {term.committees.map((committee, index) => {
          const committeePath = [term.label, committee.name];

          return (
            <motion.li
              key={committee.slug}
              className="org-branch"
              variants={RISE}
            >
              <div className="org-panel">
                <div className="org-panel-head">
                  <span className="org-plate" dir="ltr" aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="org-panel-title">{committee.name}</h3>
                </div>

                <div className="org-panel-body">
                  <ul>
                    <PersonRow person={committee.head} path={committeePath} />
                    {committee.deputies?.map((deputy) => (
                      <PersonRow
                        key={deputy.name}
                        person={deputy}
                        path={committeePath}
                      />
                    ))}
                  </ul>

                  {committee.units.length > 0 ? (
                    <>
                      <p className="org-unit-label">الوحدات</p>
                      <ul>
                        {committee.units.flatMap((unit) =>
                          unit.leaders.map((leader) => (
                            <PersonRow
                              key={`${unit.name}-${leader.name}`}
                              person={leader}
                              path={[...committeePath, unit.name]}
                            />
                          )),
                        )}
                      </ul>
                    </>
                  ) : null}
                </div>
              </div>
            </motion.li>
          );
        })}
      </Limbs>
    </section>
  );
}
