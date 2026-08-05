import type { CommitteeMarkShape } from "@/content/committees";

/**
 * علامات اللجان — مشتقّة من هندسة الشعار، لا من طقم أيقونات.
 *
 * **لماذا ضربات لا رسوم:** أيقونة كاميرا للإعلام وحقيبة للمالية تصلح لأي
 * موقع في الدنيا، وتُقرأ فورًا أنها من طقم جاهز. الشعار نفسه لا يرسم شيئًا:
 * ستّ متوازيات بزاوية ٢٤° يُقرأ منها الحرف. فعلامة اللجنة تُبنى بالقواعد
 * نفسها — ثلاث ضربات على المحور ذاته — وتفترق **بإيقاع ارتفاعاتها** وحده.
 *
 * خمسة إيقاعات لخمس لجان: صاعد · هابط · مستوٍ · وادٍ · قمّة. تُميَّز من
 * لمحة، وتُقرأ عائلةً واحدة، ولا تصلح لأي علامة أخرى.
 *
 * ⚠️ إضافة إلى نظام الهوية — تحتاج اعتماد الرئاسة قبل النشر.
 */

/** ميلان الشعار: ‏tan(24.32°) — مقيسة من الملف الأصلي */
const SLANT = 0.4522;
/** عرض الضربة ونهاية المحور — بنسبة الشعار نفسها */
const WIDTH = 3.2;
const BASELINE = 20;
/** مواضع الضربات الثلاث على الأساس */
const SLOTS = [1.5, 7.5, 13.5] as const;

/** ارتفاعات الضربات: كلما صغر الرقم طالت الضربة */
const SHAPES: Record<CommitteeMarkShape, readonly [number, number, number]> = {
  ascending: [14, 10, 5],
  descending: [5, 10, 14],
  flat: [10, 10, 10],
  valley: [5, 14, 5],
  peak: [14, 5, 14],
};

/** متوازي أضلاع واحد: رأسه يزيح يمينًا بمقدار ارتفاعه × الميلان */
function stroke(x: number, top: number): string {
  const shift = (BASELINE - top) * SLANT;
  return [
    `${(x + shift).toFixed(2)},${top}`,
    `${(x + shift + WIDTH).toFixed(2)},${top}`,
    `${(x + WIDTH).toFixed(2)},${BASELINE}`,
    `${x.toFixed(2)},${BASELINE}`,
  ].join(" ");
}

type CommitteeMarkProps = {
  shape: CommitteeMarkShape;
  className?: string;
};

/**
 * زخرفية دائمًا: لا تظهر إلا بجانب اسم اللجنة مكتوبًا، فتسميتها لقارئ
 * الشاشة تكرارٌ ينطقه مرّتين.
 */
export function CommitteeMark({ shape, className }: CommitteeMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      {SHAPES[shape].map((top, index) => (
        <polygon key={SLOTS[index]} points={stroke(SLOTS[index], top)} />
      ))}
    </svg>
  );
}
