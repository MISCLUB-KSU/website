/**
 * سقفُ القبول في كلّ جهة — «الحدُّ الأعلى للقبول».
 *
 * أعطته الرئاسةُ رقمًا رقمًا في ٢٠ أغسطس ٢٠٢٦، وهو **أعدادُ من يُقبل**
 * لا أعدادُ من يُدعى إلى المقابلة (ذاك `INTERVIEW_CAP` وهو إرشادٌ آخر).
 *
 * ⚠️ **مِلفٌّ واحدٌ لا رقمٌ في الشاشة.** الرقمُ يظهر في ثلاثة مواضع —
 * عدّادُ الجهة، وتحذيرُ زرّ القبول، وسطرُ «أين وصل الموسم» — فلو كُتب عند
 * كلٍّ منها لانفرد أحدُها بالتحديث ولَقرأ قائدان رقمين مختلفين للجهة
 * نفسِها.
 *
 * ⚠️ **وهو عدّادٌ لا قفل** — كما `INTERVIEW_CAP` حرفًا بحرف. الإدارة تملك
 * أن تتجاوز، والشاشةُ تقول ولا تمنع. ومنعٌ صارمٌ هنا يعني قائدًا يقف أمام
 * زرٍّ معطَّلٍ في ليلة الحسم بلا من يفتحه له.
 */

import { PREFERENCES } from "./preferences";

/**
 * **جهةٌ لها سقف** — قد تجمع أكثرَ من قيمةِ رغبة.
 *
 * ⚠️ **ولهذا `values` جمعٌ لا مفرد.** اللجنةُ الإعلاميّة تُقدَّم على ستّة
 * مساراتٍ (`applicationUnits` في `committees.ts`) وتُدار بثلاث وحدات
 * (`units`) — والرئاسةُ أعطت السقفَ **بأسماء الوحدات الثلاث**. فلا قيمةَ
 * محفوظةٌ في القاعدة اسمُها `committee:media/marketing`؛ المحفوظُ
 * `‎/content-writing` و`‎/creative-campaigns` وأخواتُها. فيُجمع العدُّ على
 * الوحدة، ويبقى المسارُ هو ما يختاره المتقدّم.
 */
export type CapacityBucket = {
  /** مفتاحٌ ثابتٌ للعرض والترتيب — لا يُعرض للقارئ */
  key: string;
  /** الاسمُ كما قالته الرئاسة */
  label: string;
  /** الحدُّ الأعلى للقبول */
  cap: number;
  /** قيمُ الرغبات التي تُعدّ على هذا السقف */
  values: readonly string[];
};

/**
 * ⚠️ **تقسيمُ مسارات الإعلاميّة الستّة على وحداتها الثلاث اجتهادٌ منّي، لا
 * نصٌّ من الرئاسة.** أُثبت هنا مكشوفًا ليُقرأ ويُصحَّح بسطرٍ واحد:
 *
 *   - التسويق  ← كتابة المحتوى + الأفكار الإبداعية + إدارة الحسابات
 *   - التصوير  ← التصوير الفوتوغرافي والفيديو + المونتاج والموشن
 *   - التصميم  ← التصميم الجرافيكي
 *
 * والبديلُ الوحيدُ عن الاجتهاد أن يبقى ثلثُ الجهات بلا سقفٍ أصلًا.
 */
export const CAPACITY: readonly CapacityBucket[] = [
  /* ── لجنة المشاريع ─────────────────────────────────────────────────── */
  { key: "misthon", label: "MISthon", cap: 50, values: ["project:misthon"] },
  { key: "misology", label: "MISology", cap: 50, values: ["project:misology"] },
  {
    key: "intermission",
    label: "InterMission",
    cap: 35,
    values: ["project:intermission"],
  },
  {
    key: "job-shadowing",
    label: "Job Shadowing",
    cap: 35,
    values: ["project:job-shadowing"],
  },
  { key: "impact", label: "Impact", cap: 32, values: ["project:impact"] },

  /* ── لجنة العلاقات العامة والشراكات ────────────────────────────────── */
  {
    key: "sponsorship",
    label: "وحدة الرعايات والشراكات",
    cap: 15,
    values: ["committee:public-relations/sponsorship"],
  },
  {
    key: "visits",
    label: "وحدة الزيارات",
    cap: 15,
    values: ["committee:public-relations/visits"],
  },
  {
    key: "internal-comms",
    label: "وحدة التواصل الداخلي",
    cap: 25,
    values: ["committee:public-relations/internal-comms"],
  },

  /* ── لجنة الموارد البشرية — تُقدَّم ككتلةٍ واحدة، فقيمتُها اللجنةُ نفسُها ── */
  {
    key: "human-resources",
    label: "لجنة الموارد البشرية",
    cap: 20,
    values: ["committee:human-resources"],
  },

  /* ── لجنة الموارد المالية والتنظيمية ───────────────────────────────── */
  {
    key: "archive",
    label: "وحدة الأرشيف والتقارير",
    cap: 7,
    values: ["committee:finance-operations/archive"],
  },
  {
    key: "operations",
    label: "وحدة العمليات",
    cap: 25,
    values: ["committee:finance-operations/operations"],
  },
  {
    key: "budget",
    label: "وحدة إدارة الميزانية",
    cap: 4,
    values: ["committee:finance-operations/budget"],
  },

  /* ── اللجنة الإعلامية — ثلاثُ وحداتٍ فوق ستّة مسارات (انظر أعلاه) ──── */
  {
    key: "marketing",
    label: "وحدة التسويق",
    cap: 15,
    values: [
      "committee:media/content-writing",
      "committee:media/creative-campaigns",
      "committee:media/social-accounts",
    ],
  },
  {
    key: "photography",
    label: "وحدة التصوير",
    cap: 10,
    values: [
      "committee:media/photography-video",
      "committee:media/video-editing",
    ],
  },
  {
    key: "design",
    label: "وحدة التصميم",
    cap: 15,
    values: ["committee:media/graphic-design"],
  },
];

/** مجموعُ ما يقبله النادي هذا الموسم — ٣٥٣ */
export const CAPACITY_TOTAL = CAPACITY.reduce((sum, b) => sum + b.cap, 0);

const BY_VALUE = new Map<string, CapacityBucket>(
  CAPACITY.flatMap((bucket) => bucket.values.map((v) => [v, bucket] as const)),
);

/** سقفُ الجهة التي تقع فيها هذي الرغبة — و`undefined` لجهةٍ بلا سقف */
export function capacityOf(value: string): CapacityBucket | undefined {
  return BY_VALUE.get(value);
}

/**
 * **جهاتٌ مفتوحةٌ للتقديم بلا سقفٍ مسجَّل.**
 *
 * ⚠️ **تُحسب ولا يُرمى بها استثناء.** وحدةٌ جديدةٌ تُفتح في
 * `committees.ts` ولا تُذكر هنا تصير بلا سقفٍ صامتة، فيقبل قائدُها بلا
 * عدّاد. ورميُ استثناءٍ عند تحميل الوحدة يُبيّض شاشةَ اللوحة كلَّها على
 * سطرٍ ناقص — فتُقال في اللوحة بدل أن تُسقطها.
 */
export const UNCAPPED_PREFERENCES: readonly string[] = PREFERENCES.filter(
  (p) => p.open && !BY_VALUE.has(p.value),
).map((p) => p.value);

/**
 * **قيمٌ في الجدول أعلاه لا تقابلها رغبةٌ معرَّفة.**
 *
 * ⚠️ **وهذا هو الوجهُ الآخر للانحراف:** سلَجٌ يُعاد تسميتُه في
 * `committees.ts` يترك هنا سطرًا ميّتًا — سقفًا لا يعدّ أحدًا، وجهةً حيّةً
 * بلا سقف. والاثنان يظهران معًا في اللوحة.
 */
export const UNKNOWN_CAPACITY_VALUES: readonly string[] = CAPACITY.flatMap(
  (bucket) => bucket.values,
).filter((v) => !PREFERENCES.some((p) => p.value === v));
