"use client";

import { motion } from "motion/react";

import { RISE } from "@/components/leadership/chart-parts";
import {
  useOpenPerson,
  type PersonView,
} from "@/components/leadership/person-context";

/**
 * الشخص في شكلين: بطاقةُ قمّة، وصفٌّ داخل لوحة فرع.
 *
 * الاسمُ والمسمّى في HTML **دائمًا** — الزرُّ يفتح تفصيلًا (موقعُه من
 * الشجرة، ورابطُه إن وُجد) ولا يكشف أساسًا. فلو لم تعمل الجافاسكربت بقي
 * الهيكلُ كاملَ القراءة، وما ضاع إلّا التفصيل.
 */

/** بطاقةُ القمّة — الرئيس والنائب على الجذع */
export function PersonCard({
  person,
  path,
  variant,
  nameClass,
}: PersonView & {
  variant: "apex" | "lead";
  nameClass: string;
}) {
  const openPerson = useOpenPerson();

  return (
    <motion.li variants={RISE}>
      <button
        type="button"
        className={
          variant === "apex" ? "org-card org-card-apex" : "org-card org-card-lead"
        }
        aria-haspopup="dialog"
        onClick={(event) => openPerson({ person, path }, event.currentTarget)}
      >
        <span className="org-role">{person.role}</span>
        <span className={`org-name ${nameClass}`}>{person.name}</span>

        {person.linkedin ? (
          <>
            <span className="org-has-link" aria-hidden />
            <span className="sr-only">— له حساب لينكدإن</span>
          </>
        ) : null}
      </button>
    </motion.li>
  );
}

/** صفٌّ داخل لوحة فرعٍ أو جذر — الاسمُ يتقدّم والمسمّى يليه هادئًا */
export function PersonRow({ person, path }: PersonView) {
  const openPerson = useOpenPerson();

  return (
    <li>
      <button
        type="button"
        className="org-person"
        aria-haspopup="dialog"
        onClick={(event) => openPerson({ person, path }, event.currentTarget)}
      >
        <span className="org-person-name">
          {person.name}
          {person.linkedin ? (
            <>
              <span className="org-has-link" aria-hidden />
              <span className="sr-only">— له حساب لينكدإن</span>
            </>
          ) : null}
        </span>
        <span className="org-person-role">{person.role}</span>
      </button>
    </li>
  );
}
