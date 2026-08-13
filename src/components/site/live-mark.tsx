import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

import "./teaser.css";

/**
 * العلامة الحيّة — أضلاعُها الستّة تُطفأ وتشتعل موجةً.
 *
 * ⚠️ **حركةٌ اختارها حسام بعينها** («كان يطفي ويشتغل من جنب») — التوقيتاتُ
 * كلُّها في `teaser.css`، ولا تُغيَّر إلّا بطلبه.
 *
 * تُستعمل في صفحات الترقّب: الهيكل الإداري والمشاريع.
 */
export function LiveMark() {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      /* ⚠️ **عرضٌ صريح لا `w-full`.** العلامةُ ابنٌ في عمودٍ مرنٍ بمحاذاةٍ
         وسطى فلا يتمدّد، و`width: 100%` من أبٍ يتقلّص إلى محتواه يساوي
         صفرًا — فتختفي وهي مرسومة. */
      className="text-mark block h-auto"
      style={{ width: "13rem", maxWidth: "60vw" }}
      fill="currentColor"
      role="img"
      aria-label="نادي نظم المعلومات الإدارية"
    >
      {MARK_POINTS.map((points, i) => (
        <polygon
          key={points}
          className="tz-blade"
          style={{ ["--i" as string]: i }}
          points={points}
        />
      ))}
    </svg>
  );
}
