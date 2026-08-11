"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import dynamic from "next/dynamic";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  useOpenPerson,
  type PersonView,
} from "@/components/leadership/person-context";
import {
  countPeople,
  type LeadershipPerson,
  type LeadershipTerm,
} from "@/content/leadership";
import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

import "./stage.css";

/**
 * الهيكل القيادي — «المسرح».
 *
 * التخطيطُ أعمدةٌ متماثلة (أقربُ ما كان في ذهن حسام)، وفوقه أربعةُ أشياء
 * طلبها صراحةً: علامةٌ مجسَّمةٌ بـthree.js خلف الرئاسة، وشعارٌ ضبابيٌّ خلف
 * كلِّ صندوقٍ يصحو عند المرور، ولونُ هويةٍ لكلِّ مشروع، وحركةٌ وميل.
 *
 * ⚠️ **الطبقةُ المجسَّمة زخرفةٌ مؤجَّلةُ التحميل.** تُستورَد ديناميكيًّا
 * (`ssr: false`) فلا تدخل حزمةَ الصفحة الأولى، ولا تُركَّب أصلًا لمن طلب
 * تقليلَ الحركة. والهيكلُ كلُّه نصٌّ في HTML تحتها — لو لم تعمل WebGL لم
 * يضع من المعنى شيء.
 */

const Mark3D = dynamic(() => import("./mark-3d"), { ssr: false });

const RISE: Variants = {
  rest: { y: 10 },
  settled: { y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const STAGGER: Variants = {
  rest: {},
  settled: { transition: { staggerChildren: 0.045, delayChildren: 0.03 } },
};

const IN_VIEW = { once: true, margin: "-60px" } as const;

/** ميلٌ محدود — يبقى الصندوقُ مقروءًا ولا يتحوّل إلى لعبة */
const TILT = 7;

/** علامةُ النادي رسمًا — من الهندسة المولَّدة لا من ملفٍّ مرسومٍ بيد */
function MarkGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={MARK_VIEWBOX}
      aria-hidden
      focusable="false"
      fill="currentColor"
    >
      {MARK_POINTS.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </svg>
  );
}

type BoxProps = PersonView & { variant?: "node" | "chief" };

function StageBox({ person, path, variant = "node" }: BoxProps) {
  const openPerson = useOpenPerson();
  const ref = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);

  /* الميلُ يُكتب في خاصّيتين مخصّصتين داخل `requestAnimationFrame`، فلا
     تُعاد تصييرُ React ولا يُحسب تخطيطٌ في كل حركةِ مؤشّر. */
  const handleMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const node = ref.current;
    if (!node) return;

    const box = node.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--st-ry", `${px * TILT * 2}deg`);
      node.style.setProperty("--st-rx", `${-py * TILT}deg`);
    });
  }, []);

  const handleLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    cancelAnimationFrame(frame.current);
    node.style.setProperty("--st-ry", "0deg");
    node.style.setProperty("--st-rx", "0deg");
  }, []);

  return (
    <motion.li variants={RISE}>
      <button
        ref={ref}
        type="button"
        className={variant === "chief" ? "st-box st-chief" : "st-box"}
        aria-haspopup="dialog"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onClick={(event) => openPerson({ person, path }, event.currentTarget)}
      >
        <MarkGlyph className="st-mark" />
        <span className="st-role">{person.role}</span>
        <span className="st-name">
          {person.name}
          {person.linkedin ? (
            <>
              <span className="st-has-link" aria-hidden />
              <span className="sr-only">— له حساب لينكدإن</span>
            </>
          ) : null}
        </span>
      </button>
    </motion.li>
  );
}

function Column({
  title,
  latin,
  accent,
  people,
}: {
  title: string;
  latin?: boolean;
  accent?: string;
  people: readonly { key: string; person: LeadershipPerson; path: string[] }[];
}) {
  return (
    <li
      className="st-col"
      style={accent ? ({ "--st-accent": accent } as CSSProperties) : undefined}
    >
      {/* ⚠️ الاسمُ اللاتينيّ يُلفّ `dir="ltr"` صراحةً، وإلّا انقلب ترتيبُه */}
      <h3
        className={
          accent ? "st-plate st-plate-latin st-plate-brand" : "st-plate"
        }
        dir={latin ? "ltr" : undefined}
        lang={latin ? "en" : undefined}
      >
        <MarkGlyph className="st-mark" />
        <span className="st-plate-text">{title}</span>
      </h3>

      <motion.ul
        className="st-stack"
        initial="rest"
        whileInView="settled"
        viewport={IN_VIEW}
        variants={STAGGER}
      >
        {people.map((entry) => (
          <StageBox key={entry.key} person={entry.person} path={entry.path} />
        ))}
      </motion.ul>
    </li>
  );
}

export function LeadershipStage({ term }: { term: LeadershipTerm }) {
  const calm = useReducedMotion();
  const topPath = [term.label, "الرئاسة"];

  return (
    <div className="st-field">
      <div className="st-shell">
        {/* ⚠️ سطرُ الفصل **خارج** الواجهة: داخلَها يقع فوق أشكالِ العلامة
            المجسَّمة الزرقاء فيسقط تباينُه — والنصُّ لا يوضع على لوحٍ
            متحرّكٍ لا يُضمن لونُه. */}
        <p className="st-term">
          {term.label}
          <span aria-hidden className="mx-s2">
            ·
          </span>
          <span dir="ltr">{countPeople(term)}</span> قياديًّا
        </p>

        <section className="st-hero" aria-labelledby="stage-presidency">
          {/* الطبقةُ المجسَّمة — زخرفةٌ خلف المحتوى، تُتخطّى عند تقليل الحركة */}
          {calm ? null : (
            <div className="st-canvas-wrap" aria-hidden>
              <Mark3D tint="#034ca6" />
            </div>
          )}

          <h2 id="stage-presidency" className="sr-only">
            الرئاسة
          </h2>

          <motion.ul
            className="st-top"
            initial="rest"
            whileInView="settled"
            viewport={IN_VIEW}
            variants={STAGGER}
          >
            <StageBox
              person={term.president}
              path={topPath}
              variant="chief"
            />
            <StageBox
              person={term.vicePresident}
              path={topPath}
              variant="chief"
            />
          </motion.ul>
        </section>

        <section aria-labelledby="stage-committees">
          <div className="st-label">
            <h2 id="stage-committees" className="st-label-text">
              اللجان
            </h2>
          </div>

          <ol
            className="st-grid"
            style={{ "--st-n": String(term.committees.length) } as CSSProperties}
          >
            {term.committees.map((committee) => {
              const base = [term.label, committee.name];
              const people = [
                {
                  key: committee.head.name,
                  person: committee.head,
                  path: base,
                },
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
                <Column
                  key={committee.slug}
                  title={committee.name}
                  people={people}
                />
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="stage-projects">
          <div className="st-label">
            <h2 id="stage-projects" className="st-label-text">
              المشاريع
            </h2>
          </div>

          <ol
            className="st-grid"
            style={{ "--st-n": String(term.projects.length) } as CSSProperties}
          >
            {term.projects.map((project) => {
              const base = [term.label, `مشروع ${project.name}`];
              const people = [
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
                <Column
                  key={project.slug}
                  title={project.name}
                  latin
                  accent={project.accent}
                  people={people}
                />
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
