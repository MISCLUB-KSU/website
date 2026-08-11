"use client";

import { motion, type Variants } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/**
 * قِطَعُ الشجرة: الوصلةُ الرأسية، وفاصلُ الطبقة، والجذعُ وفروعُه، والجذور.
 *
 * ⚠️ **قاعدةُ الحركة موروثةٌ من `components/motion.tsx`: لا يُخفى محتوًى
 * بانتظار حركة.** اللوحاتُ تُزاح `y` ولا تُلمس شفافيّتُها، فلو تعطّلت
 * الجافاسكربت بقي الهيكلُ كاملَ القراءة. والاستثناءُ الوحيد ما كان
 * **زخرفةً محضة** موسومةً `aria-hidden` — الجذعُ والوصلات: هذي تبدأ من
 * الصفر لأن غيابها لا يحجب معلومة، و`MotionConfig reducedMotion="user"`
 * في جذر التطبيق يقفز بها إلى حالتها النهائية لمن طلب تقليل الحركة
 * (ويحرسها `!important` في `structure.css` احتياطًا).
 */

export const RISE: Variants = {
  rest: { y: 12 },
  settled: { y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
};

export const STAGGER: Variants = {
  rest: {},
  settled: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const IN_VIEW = { once: true, margin: "-60px" } as const;
const EASE = [0.16, 1, 0.3, 1] as const;

/** وصلةٌ رأسيةٌ بين عقدتين — تُرسم نازلةً حين تبلغ الشاشة */
export function Tie() {
  return (
    <motion.span
      aria-hidden
      className="org-tie"
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={IN_VIEW}
      transition={{ duration: 0.4, ease: EASE }}
    />
  );
}

/** عنوانُ الطبقة بين خطّين */
export function TierDivider({ id, label }: { id: string; label: string }) {
  return (
    <div className="org-divider">
      <h2 id={id} className="org-divider-label">
        {label}
      </h2>
    </div>
  );
}

/**
 * الجذعُ وفروعُه.
 *
 * الجذعُ عنصرٌ مطلقٌ **خارج** قائمة الفروع: لو كان ابنًا لها لأزاح
 * `nth-child` بمقدارِ واحد فانقلب التبادلُ يمينًا ويسارًا كلُّه.
 */
export function Limbs({ children }: { children: ReactNode }) {
  return (
    <div className="org-limbs">
      <motion.span
        aria-hidden
        className="org-trunk"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={IN_VIEW}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <motion.ol
        className="org-branches"
        initial="rest"
        whileInView="settled"
        viewport={IN_VIEW}
        variants={STAGGER}
      >
        {children}
      </motion.ol>
    </div>
  );
}

/**
 * الجذور: شريطٌ أفقيٌّ يتفرّع إلى `count` جذرًا.
 *
 * ⚠️ عددُ الجذور يمرّ **خاصّيةً مخصّصة** لا صنفًا مبنيًّا بقالبٍ نصّي:
 * ماسحُ Tailwind لا يرى الأصنافَ المركَّبة وقتَ البناء فتسقط صامتة. ومنه
 * يشتقّ CSS عرضَ الشريط ليقف عند مركزَي أوّل جذرٍ وآخره بالضبط.
 */
export function Roots({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <div
      className="org-roots"
      style={{ "--org-n": String(count) } as CSSProperties}
    >
      {/* جذعُ الجذور — يظهر على الجوّال وحده حين تصير سلسلةً رأسية */}
      <span aria-hidden className="org-roots-trunk" />

      <motion.span
        aria-hidden
        className="org-bar"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={IN_VIEW}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <motion.ol
        className="org-roots-grid"
        initial="rest"
        whileInView="settled"
        viewport={IN_VIEW}
        variants={STAGGER}
      >
        {children}
      </motion.ol>
    </div>
  );
}
