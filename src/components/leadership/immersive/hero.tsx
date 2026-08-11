"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

import { countPeople, type LeadershipTerm } from "@/content/leadership";

import "./immersive.css";

/**
 * واجهةُ «الغامرة» — لحظةُ الفتح وحدها.
 *
 * تُبنى على المرجعين اللذين اختارهما حسام: `immersive-g.com` (قُرئ فعليًّا)
 * و`activetheory.net`. والمأخوذ منهما: أرضيةٌ رماديّةٌ دافئة، ولوحُ تحميلٍ
 * بعلامةٍ وخطِّ تقدّم، وعنوانٌ عملاقٌ تصعد كلماتُه من قناع، وعمقٌ مجسَّمٌ
 * خلفه.
 *
 * ⚠️ **هذي المرحلة الأولى وحدها — الواجهة.** تُعرض على حسام قبل بناء بقيّة
 * الصفحة، لأن ستّ محاولاتٍ كاملةٍ سبقت ورُفضت: الاتجاه يُثبَّت بأصغر قطعةٍ
 * دالّة لا بصفحةٍ كاملة.
 *
 * ⚠️ **الكشفُ بـCSS لا بـMotion** — التعليل في رأس `immersive.css`.
 * والجافاسكربت هنا لا تفعل شيئًا سوى تركيب الطبقة المجسَّمة وتخطّيها لمن
 * طلب تقليل الحركة.
 */

const Mark3D = dynamic(() => import("@/components/leadership/stage/mark-3d"), {
  ssr: false,
});

/** يقسّم العنوان كلماتٍ، كلٌّ في قناعها، بترتيبٍ يقود التتابع */
function Title({ text }: { text: string }) {
  return (
    <h2 className="im-title">
      {text.split(" ").map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="im-word"
          style={{ "--i": index } as CSSProperties}
        >
          <span>{word}</span>
          {/* الفراغُ خارج القناع، وإلّا التصقت الكلمات */}
        </span>
      )).reduce<React.ReactNode[]>((acc, node, i) => (i === 0 ? [node] : [...acc, " ", node]), [])}
    </h2>
  );
}

export function ImmersiveHero({ term }: { term: LeadershipTerm }) {
  const calm = useReducedMotion();

  /* ⚠️ لا غلافَ `.im-stage` هنا — يملكه `board.tsx`. غلافان متداخلان
     يكرّران الأرضيةَ و`overflow: clip` ويجعلان لوحَ التحميل داخل سياقِ
     تكديسٍ ثانٍ. */
  return (
    <>
      <section className="im-hero" aria-labelledby="im-title">
        {calm ? null : (
          <div className="im-canvas" aria-hidden>
            <Mark3D tint="#034ca6" />
          </div>
        )}

        <p className="im-eyebrow">
          {term.label}
          <span aria-hidden>·</span>
          <span dir="ltr">{countPeople(term)}</span> قياديًّا
        </p>

        <div id="im-title">
          <Title text="مَن يقود النادي" />
        </div>

        <p className="im-lede">
          من الرئاسة إلى آخر وحدة — كل من يحمل مسؤوليةً في النادي هذا الفصل،
          ومكانه من الهيكل.
        </p>

        <p className="im-scroll">
          <span className="im-scroll-rail" aria-hidden />
          انزل
        </p>
      </section>
    </>
  );
}
