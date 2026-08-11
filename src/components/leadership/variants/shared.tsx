"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import {
  useOpenPerson,
  type PersonView,
} from "@/components/leadership/person-context";

/**
 * القِطَع المشتركة بين النسخ الثلاث.
 *
 * ⚠️ **كلُّ شخصٍ في صندوقه** — هذا قيدٌ لا خيار: الصفوفُ داخل لوحةٍ رُفضت
 * صراحةً (١١ أغسطس ٢٠٢٦) لأنها تُقرأ جدولًا لا هيكلًا.
 *
 * وقاعدةُ الحركة من `components/motion.tsx`: الصناديقُ تُزاح `y` ولا تُلمس
 * شفافيّتُها، فلو تعطّلت الجافاسكربت بقي الهيكلُ كاملَ القراءة.
 */

export const RISE: Variants = {
  rest: { y: 10 },
  settled: { y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export const STAGGER: Variants = {
  rest: {},
  settled: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

export const IN_VIEW = { once: true, margin: "-60px" } as const;
export const EASE = [0.16, 1, 0.3, 1] as const;

/** صندوقُ شخصٍ — يُفتح لوحُه بالضغط */
export function VPerson({
  person,
  path,
  className = "vx-person",
  itemClassName,
}: PersonView & { className?: string; itemClassName?: string }) {
  const openPerson = useOpenPerson();

  return (
    <motion.li className={itemClassName} variants={RISE}>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={(event) => openPerson({ person, path }, event.currentTarget)}
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
  );
}

/** عنوانُ طبقةٍ بين خطّين */
export function VLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="vx-label">
      <h2 id={id} className="vx-label-text">
        {children}
      </h2>
    </div>
  );
}

/** وصلةٌ رأسيةٌ تُرسم نازلةً */
export function VTie() {
  return (
    <motion.span
      aria-hidden
      className="vx-tie"
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={IN_VIEW}
      transition={{ duration: 0.4, ease: EASE }}
    />
  );
}

/** يسطّح قادةَ الوحدات مع مسار كلٍّ منهم */
export function flattenUnits(
  units: readonly { name: string; leaders: readonly PersonView["person"][] }[],
  base: readonly string[],
) {
  return units.flatMap((unit) =>
    unit.leaders.map((leader) => ({
      key: `${unit.name}-${leader.name}`,
      person: leader,
      path: [...base, unit.name],
    })),
  );
}
