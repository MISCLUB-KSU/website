import {
  FIELD_MARK_POINTS,
  FIELD_STROKES,
  FIELD_VIEWBOX,
} from "@/lib/geometry.generated";

/**
 * الحقل المائل — التوقيع البصري.
 *
 * ضربات بزاوية ٢٤° تنجرف ببطء خلف قناع ثابت، والعلامة محفورة فيها كفراغ
 * سالب — نفس مبدأ الشعار: الحرف يُقرأ من الفراغ لا من الحبر.
 *
 * ثلاث طبقات تجعل العلامة تُقرأ بلا أن ترفع صوتها:
 *   لوحٌ أغمق درجة · حقلٌ ممنوع من عبورها · خيط ضوء على حافّتها.
 *
 * التدرّج في القناع ليس زخرفة: بدونه يقفز سطوع الضربات تحت النص فيهبط
 * التباين إلى 2.73:1 — مقيسًا على البكسل المرسوم لا تقديرًا.
 */
export function RakedField({ id }: { id: string }) {
  const maskId = `raked-void-${id}`;
  const fadeId = `raked-fade-${id}`;

  return (
    <svg
      viewBox={FIELD_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.38" stopColor="#fff" />
          <stop offset="0.78" stopColor="#5a5a5a" />
          <stop offset="1" stopColor="#2a2a2a" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill={`url(#${fadeId})`} />
          {FIELD_MARK_POINTS.map((points) => (
            <polygon key={points} points={points} fill="#000" />
          ))}
        </mask>
      </defs>

      {FIELD_MARK_POINTS.map((points) => (
        <polygon key={`plate-${points}`} points={points} fill="var(--ink-floor)" />
      ))}

      <g mask={`url(#${maskId})`}>
        <g className="drift">
          {FIELD_STROKES.map((s, i) => (
            <polygon
              key={`${s.points}-${i}`}
              points={s.points}
              fill="var(--sky)"
              opacity={s.opacity}
            />
          ))}
        </g>
      </g>

      {FIELD_MARK_POINTS.map((points) => (
        <polygon
          key={`edge-${points}`}
          points={points}
          fill="none"
          stroke="var(--sky)"
          strokeOpacity="0.34"
          strokeWidth="1.6"
        />
      ))}
    </svg>
  );
}
