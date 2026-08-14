import { COMMITTEES, type Committee, type Unit } from "./committees";
import { PREFERENCE_VALUES, committeeValue } from "./preferences";

/**
 * رابط التقديم مع الرغبة الأولى مُهيَّأة مسبقًا.
 *
 * القيمة تُشتقّ من `preferences.ts` لا تُكتب هنا: النموذج يبني قائمته من
 * المصدر نفسه، ولو افترقت الصيغتان وصل الطالب إلى النموذج بخيار لا يطابق
 * شيئًا فيسقط اختياره صامتًا.
 *
 * ⚠️ **وما ليس خيارًا في النموذج يُرسَل إلى `/join` بلا تهيئة.** صار هذا
 * ممكنًا في ١٤ أغسطس ٢٠٢٦: اللجنة الإعلامية تعرض في صفحتها وحداتِها
 * الثلاث، ونموذجُها يعرض ستّة مساراتٍ غيرَها (`applicationUnits` في
 * `committees.ts`) — فوحدةٌ معروضةٌ هناك قد لا يكون لها خيارٌ هنا.
 *
 * ولو مُرّرت القيمةُ كما هي لأسقطها حارسُ `join/page.tsx` صامتًا، فيصل
 * المتقدّم إلى نموذجٍ فارغ بعد أن ضغط زرًّا يَعِد بوحدةٍ بعينها. فالسقوطُ
 * إلى `/join` صريحٌ ومقصود: الزرُّ يفتح النموذج ولا يَعِد بما لا يجده.
 */
export function joinHref(committee: Committee, unit?: Unit): string {
  const value = committeeValue(committee, unit);
  return PREFERENCE_VALUES.includes(value)
    ? `/join?choice=${encodeURIComponent(value)}`
    : "/join";
}

/** هل تستقبل هذي اللجنة طلبات؟ اللجنة بلا وحدات تتبع حالة النادي العامة. */
export function isCommitteeOpen(committee: Committee): boolean {
  return committee.units.length === 0
    ? false
    : committee.units.some((unit) => unit.isOpen);
}

export function findCommitteeBySlug(slug: string): Committee | undefined {
  return COMMITTEES.find((committee) => committee.slug === slug);
}
