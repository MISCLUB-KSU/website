import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

type MarkProps = {
  className?: string;
  /** بلا عنوان بديل حين تتكرّر العلامة بجانب اسم النادي مكتوبًا */
  decorative?: boolean;
};

/**
 * علامة النادي — ستّة متوازيات مقيسة من الملف الأصلي، لا صورة نقطية:
 * حادّة عند أي مقاس، وتأخذ لونها من `currentColor`.
 */
export function Mark({ className, decorative = false }: MarkProps) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      fill="currentColor"
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "نادي نظم المعلومات الإدارية" })}
    >
      {MARK_POINTS.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </svg>
  );
}
