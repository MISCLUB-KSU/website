import { MARK_POINTS } from "@/lib/geometry.generated";

/**
 * الصندوق المحيط بضلعٍ داخل `viewBox` الشعار — نسبة عرضه إلى ارتفاعه هي
 * نسبة الشكل الحقيقية غير المشوَّهة.
 *
 * مصدرٌ واحد يشترك فيه `mark-morph.tsx` (حساب الحركة) و`project-index.tsx`
 * (مقاس خانة الهبوط الساكنة) — بدل حساب الصناديق مرّتين من `MARK_POINTS`
 * فتنحرف نسخةٌ عن الأخرى بصمت لو تغيّرت الهندسة يومًا.
 */
export type MarkBox = { x: number; y: number; w: number; h: number };

export const MARK_BOXES: readonly MarkBox[] = MARK_POINTS.map((points) => {
  const pairs = points.split(" ").map((pair) => pair.split(",").map(Number));
  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
});
