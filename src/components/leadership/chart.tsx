"use client";

import { useCallback, useRef, useState } from "react";

import {
  OpenPersonProvider,
  type PersonView,
} from "@/components/leadership/person-context";
import { PersonDialog } from "@/components/leadership/person-dialog";
import { BoardCommittees } from "@/components/leadership/tier-committees";
import { BoardPresidency } from "@/components/leadership/tier-presidency";
import { BoardProjects } from "@/components/leadership/tier-projects";
import { countPeople, type LeadershipTerm } from "@/content/leadership";

/**
 * المخطّط الهرميّ للهيكل القيادي.
 *
 * يملك شيئًا واحدًا: البطاقةَ المفتوحة. وكلُّ ما عداه تخطيطٌ ساكنٌ يُصيَّر
 * على الخادم — لا قياساتٍ بالجافاسكربت ولا حالةَ تمرير، فالخطوطُ الواصلة
 * كلُّها مشتقّةٌ من الشبكة نفسِها في CSS.
 *
 * ⚠️ **إعادةُ البؤرة مكتوبةٌ صراحةً**: يُحفَظ الزرُّ الفاتح ويُعاد إليه
 * التركيز عند الإغلاق. لا يُتّكل على سلوكٍ افتراضيّ للمتصفّح.
 */
export function LeadershipChart({ term }: { term: LeadershipTerm }) {
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

  return (
    <>
      <div className="org-field">
        <div className="org-shell">
          <p className="org-term">
            {term.label}
            <span aria-hidden className="mx-s2">
              ·
            </span>
            <span dir="ltr">{countPeople(term)}</span> قياديًّا
          </p>

          <OpenPersonProvider value={openPerson}>
            <BoardPresidency term={term} />
            <BoardCommittees term={term} />
            <BoardProjects term={term} />
          </OpenPersonProvider>
        </div>
      </div>

      {/* ⚠️ خارج `.org-field` عمدًا — انظر التعليل في `person-dialog.tsx` */}
      <PersonDialog view={view} onClose={closePerson} />
    </>
  );
}
