"use client";

import { MotionConfig, motion, type Variants } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/**
 * طبقة الحركة — Motion.
 *
 * ⚠️ **قاعدة تحكم هذا الملف كله: لا يُخفى محتوى بانتظار حركة.**
 *
 * الحركة هنا تُزيح `y` وحدها ولا تلمس `opacity` أبدًا. السبب ليس ذوقًا:
 * لو بدأ العنصر بـ `opacity: 0` وانتظر حركةً لتُظهره، فكل مرّة لا تنطلق
 * فيها الحركة — لسان مُعطَّل، أو تبويب في الخلفية، أو تعثّر في الترطيب،
 * أو لقطة شاشة — يُعرض القسم **فارغًا**. أما إزاحة ١٤ بكسل فأسوأ ما يقع
 * منها أن يجلس النص مزاحًا قليلًا، ويبقى مقروءًا.
 *
 * `MotionConfig reducedMotion="user"` يوقف الحركة كلها لمن طلب تقليلها،
 * والمحتوى يبقى في مكانه — لأنه لم يُخفَ أصلًا.
 *
 * ولا رفعٌ عند المرور: «بطاقات ترتفع عند المرور» من الممنوعات المكتوبة في
 * `.impeccable.md`. تفاعل البطاقة لونٌ يتبدّل وقَطعٌ يتعمّق (`rake-interactive`)
 * — وهما من هندسة النادي لا من قوالب جاهزة.
 */

/** يُلفّ به التطبيق مرّة واحدة في الجذر */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** إزاحة صغيرة تنتهي عند الصفر — لا شفافية في أي طرف */
const RISE: Variants = {
  rest: { y: 14 },
  settled: { y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
};

const STAGGER: Variants = {
  rest: {},
  settled: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

type BlockProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** دخول جانبي — القاعدة نفسها: إزاحة `x` وحدها ولا لمس للشفافية أبدًا */
const SIDE: Variants = {
  rest: { x: 48 },
  settled: { x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/** كتلة تدخل من الجانب حين تبلغ الشاشة — لصناديق الأقسام فوق رحلة الشعار */
export function RevealSide({ children, className, style }: BlockProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="rest"
      whileInView="settled"
      viewport={{ once: true, margin: "-60px" }}
      variants={SIDE}
    >
      {children}
    </motion.div>
  );
}

/** كتلة تستقرّ صاعدةً حين تدخل الشاشة — مرّة واحدة، ثم تُترك وشأنها */
export function Reveal({ children, className, style }: BlockProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="rest"
      whileInView="settled"
      viewport={{ once: true, margin: "-60px" }}
      variants={RISE}
    >
      {children}
    </motion.div>
  );
}

/** شبكة تُدخل أبناءها تباعًا — يُستعمل مع `RevealItem` */
export function RevealGrid({ children, className, style }: BlockProps) {
  return (
    <motion.ul
      className={className}
      style={style}
      initial="rest"
      whileInView="settled"
      viewport={{ once: true, margin: "-60px" }}
      variants={STAGGER}
    >
      {children}
    </motion.ul>
  );
}

export function RevealItem({ children, className, style }: BlockProps) {
  return (
    <motion.li className={className} style={style} variants={RISE}>
      {children}
    </motion.li>
  );
}
