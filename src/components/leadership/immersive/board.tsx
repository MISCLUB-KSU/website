"use client";

import { motion, type Variants } from "motion/react";
import { useCallback, useRef, useState, type CSSProperties } from "react";

import { ImmersiveHero } from "@/components/leadership/immersive/hero";
import {
  OpenPersonProvider,
  useOpenPerson,
  type PersonView,
} from "@/components/leadership/person-context";
import { PersonDialog } from "@/components/leadership/person-dialog";
import type { LeadershipPerson, LeadershipTerm } from "@/content/leadership";

/**
 * «الغامرة» — الصفحة كاملة.
 *
 * الواجهة أقرّتها الإدارة، وهذا جسمُها بلغتها: طبقاتٌ ثلاث، وكلُّ لجنةٍ أو
 * مشروعٍ مدخلٌ عنوانُه ملتصقٌ بينما يمرّ فريقُه بجانبه — وهو أوضحُ ما في
 * `immersive-g.com` من إحساس.
 *
 * ⚠️ **الكشفُ هنا إزاحةٌ لا قناع.** الواجهةُ تُكشف بـCSS لأن حركتها عند
 * التحميل؛ أمّا الجسمُ فحركتُه عند التمرير، وذلك يلزمه جافاسكربت. فلو
 * أُخفي بقناعٍ ثم تعثّرت الجافاسكربت لبقي نصفُ الصفحة غير مرئيّ — والقاعدة
 * في هذا المستودع أن لا يُخفى محتوًى بانتظار حركة. الإزاحةُ أسوأُ ما فيها
 * سطرٌ مزاحٌ اثني عشر بكسلًا.
 */

const RISE: Variants = {
  rest: { y: 12 },
  settled: { y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const STAGGER: Variants = {
  rest: {},
  settled: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

const IN_VIEW = { once: true, margin: "-80px" } as const;

type Row = { key: string; person: LeadershipPerson; path: string[] };

function PersonRow({ person, path }: PersonView) {
  const openPerson = useOpenPerson();

  return (
    <motion.li variants={RISE}>
      <button
        type="button"
        className="im-person"
        aria-haspopup="dialog"
        onClick={(event) => openPerson({ person, path }, event.currentTarget)}
      >
        <span className="im-person-name">
          {person.name}
          {person.linkedin ? (
            <>
              <span className="im-has-link" aria-hidden />
              <span className="sr-only">— له حساب لينكدإن</span>
            </>
          ) : null}
        </span>
        <span className="im-person-role">{person.role}</span>
      </button>
    </motion.li>
  );
}

function Entry({
  meta,
  title,
  latin,
  accent,
  rows,
  headingId,
}: {
  meta: string;
  title: string;
  latin?: boolean;
  accent?: string;
  rows: readonly Row[];
  headingId: string;
}) {
  return (
    <motion.li
      className="im-entry"
      style={accent ? ({ "--im-accent": accent } as CSSProperties) : undefined}
      initial="rest"
      whileInView="settled"
      viewport={IN_VIEW}
      variants={STAGGER}
    >
      <motion.div className="im-entry-head" variants={RISE}>
        <p className="im-entry-meta">{meta}</p>
        {/* ⚠️ الاسمُ اللاتينيّ يُلفّ `dir="ltr"` صراحةً وإلّا انقلب ترتيبُه */}
        <h3
          id={headingId}
          className={
            latin ? "im-entry-title im-entry-title-latin" : "im-entry-title"
          }
          dir={latin ? "ltr" : undefined}
          lang={latin ? "en" : undefined}
        >
          {title}
        </h3>
      </motion.div>

      <ul className="im-people">
        {rows.map((row) => (
          <PersonRow key={row.key} person={row.person} path={row.path} />
        ))}
      </ul>
    </motion.li>
  );
}

function Tier({
  id,
  index,
  name,
  children,
}: {
  id: string;
  index: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <section className="im-tier" id={id} aria-labelledby={`${id}-name`}>
      <div className="im-tier-head">
        <span className="im-tier-index" dir="ltr">
          {index}
        </span>
        <h2 id={`${id}-name`} className="im-tier-name">
          {name}
        </h2>
      </div>
      <ul>{children}</ul>
    </section>
  );
}

export function ImmersiveBoard({ term }: { term: LeadershipTerm }) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [view, setView] = useState<PersonView | null>(null);

  const openPerson = useCallback((next: PersonView, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setView(next);
  }, []);

  const closePerson = useCallback(() => {
    setView(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const topPath = [term.label, "الرئاسة"];

  return (
    <OpenPersonProvider value={openPerson}>
      <div className="im-stage">
        <ImmersiveHero term={term} />

        <div className="im-body">
          <Tier id="im-presidency" index="01" name="الرئاسة">
            <Entry
              headingId="im-presidency-entry"
              meta="قيادة النادي"
              title="الرئاسة"
              rows={[
                {
                  key: term.president.name,
                  person: term.president,
                  path: topPath,
                },
                {
                  key: term.vicePresident.name,
                  person: term.vicePresident,
                  path: topPath,
                },
              ]}
            />
          </Tier>

          <Tier id="im-committees" index="02" name="اللجان">
            {term.committees.map((committee, index) => {
              const base = [term.label, committee.name];
              const rows: Row[] = [
                { key: committee.head.name, person: committee.head, path: base },
                ...(committee.deputies ?? []).map((deputy) => ({
                  key: deputy.name,
                  person: deputy,
                  path: base,
                })),
                ...committee.units.flatMap((unit) =>
                  unit.leaders.map((leader) => ({
                    key: `${unit.name}-${leader.name}`,
                    person: leader,
                    path: [...base, unit.name],
                  })),
                ),
              ];

              return (
                <Entry
                  key={committee.slug}
                  headingId={`im-${committee.slug}`}
                  meta={`لجنة ${String(index + 1).padStart(2, "0")}`}
                  title={committee.name}
                  rows={rows}
                />
              );
            })}
          </Tier>

          <Tier id="im-projects" index="03" name="المشاريع">
            {term.projects.map((project) => {
              const base = [term.label, `مشروع ${project.name}`];
              const rows: Row[] = [
                {
                  key: project.manager.name,
                  person: project.manager,
                  path: base,
                },
                ...project.deputies.map((deputy) => ({
                  key: deputy.name,
                  person: deputy,
                  path: base,
                })),
              ];

              return (
                <Entry
                  key={project.slug}
                  headingId={`im-${project.slug}`}
                  meta="مشروع"
                  title={project.name}
                  latin
                  accent={project.accent}
                  rows={rows}
                />
              );
            })}
          </Tier>
        </div>
      </div>

      <PersonDialog view={view} onClose={closePerson} />
    </OpenPersonProvider>
  );
}
