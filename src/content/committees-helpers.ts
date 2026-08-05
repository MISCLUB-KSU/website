import { COMMITTEES, type Committee, type Unit } from "./committees";
import { committeeValue } from "./preferences";

/**
 * رابط التقديم مع الرغبة الأولى مُهيَّأة مسبقًا.
 *
 * القيمة تُشتقّ من `preferences.ts` لا تُكتب هنا: النموذج يبني قائمته من
 * المصدر نفسه، ولو افترقت الصيغتان وصل الطالب إلى النموذج بخيار لا يطابق
 * شيئًا فيسقط اختياره صامتًا.
 */
export function joinHref(committee: Committee, unit?: Unit): string {
  return `/join?choice=${encodeURIComponent(committeeValue(committee, unit))}`;
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
