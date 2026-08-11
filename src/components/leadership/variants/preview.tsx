"use client";

import { useCallback, useRef, useState } from "react";

import {
  OpenPersonProvider,
  type PersonView,
} from "@/components/leadership/person-context";
import { PersonDialog } from "@/components/leadership/person-dialog";
import { PillarsVariant } from "@/components/leadership/variants/pillars";
import { PosterVariant } from "@/components/leadership/variants/poster";
import { TreeVariant } from "@/components/leadership/variants/tree";
import { countPeople, type LeadershipTerm } from "@/content/leadership";

/**
 * صفحةُ اختيارٍ مؤقّتة: ثلاثُ نسخٍ من الهيكل القيادي، تُبدَّل من شريطٍ
 * ملتصقٍ أعلى الصفحة.
 *
 * ⚠️ **تُحذف بعد الاختيار.** تُنقل النسخةُ المختارةُ وحدها إلى
 * `/about/structure`، ويُحذف هذا المجلَّد كلُّه — وإلّا بقيت ثلاثُ نسخٍ
 * تُصان بلا سبب.
 */

const VARIANTS = [
  {
    id: "poster",
    label: "أ · الملصق",
    note: "أعمدةٌ متماثلة، لكلّ لجنةٍ لوحةُ عنوانٍ مصمتة وتحتها صناديقُ أشخاصها.",
  },
  {
    id: "tree",
    label: "ب · الشجرة",
    note: "شجرةٌ تتفرّع من جهةٍ واحدة بمرفقٍ لكلّ عنصر — كشجرة الملفّات.",
  },
  {
    id: "pillars",
    label: "ج · الأعمدة",
    note: "خمسةُ أعمدة، تُضغط اللجنةُ فينزل فريقُها بارتفاعٍ متحرّك.",
  },
] as const;

type VariantId = (typeof VARIANTS)[number]["id"];

export function VariantsPreview({ term }: { term: LeadershipTerm }) {
  const [variant, setVariant] = useState<VariantId>("poster");
  const [view, setView] = useState<PersonView | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openPerson = useCallback((next: PersonView, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setView(next);
  }, []);

  const closePerson = useCallback(() => {
    setView(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const current = VARIANTS.find((item) => item.id === variant) ?? VARIANTS[0];

  return (
    <>
      <nav className="vx-picker" aria-label="اختيار النسخة">
        {VARIANTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="vx-pick"
            aria-pressed={item.id === variant}
            onClick={() => setVariant(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="vx-stage">
        <div className="vx-shell">
          <p className="vx-term">
            {current.note}
            <br />
            {term.label}
            <span aria-hidden className="mx-s2">
              ·
            </span>
            <span dir="ltr">{countPeople(term)}</span> قياديًّا
          </p>

          <OpenPersonProvider value={openPerson}>
            {variant === "poster" ? <PosterVariant term={term} /> : null}
            {variant === "tree" ? <TreeVariant term={term} /> : null}
            {variant === "pillars" ? <PillarsVariant term={term} /> : null}
          </OpenPersonProvider>
        </div>
      </div>

      <PersonDialog view={view} onClose={closePerson} />
    </>
  );
}
