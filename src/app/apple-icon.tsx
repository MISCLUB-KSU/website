import { ImageResponse } from "next/og";

import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

/**
 * أيقونة الشاشة الرئيسية على iOS — تظهر حين يضيف الزائر الموقع من Safari.
 *
 * ⚠️ **بلا استدارةٍ مرسومة.** iOS يقصّ الأيقونة بقناعٍ مستديرٍ من عنده،
 * فرسمُ الاستدارة هنا يعني قصًّا مرّتين: زوايا بيضاء تظهر داخل القناع.
 * والمربّعُ الكامل هو الصحيح — والشكلُ المستدير الذي في لوح الهوية هو ما
 * يفعله النظامُ بهذي الصورة، لا ما نرسله إليه.
 *
 * ⚠️ **ولا شفافية.** خلفيةُ iOS للأيقونات الشفّافة سوداء صمّاء، فتُقرأ
 * العلامةُ على أرضيةٍ غير أرضيتنا. والأرضية هنا مرسومةٌ صراحةً.
 *
 * والقياس 180×180 هو ما يطلبه Safari لأعلى كثافة.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SNOW = "#f9f9f9";
const SKY = "#7faed9";
const DEEP = "#022d63";
const NIGHT = "#011c40";

export default function AppleIcon() {
  /* العلامة من المولَّد نفسه الذي يرسمها في الموقع — فلو صُحّحت هندستُها
     يومًا تبعتها الأيقونة بلا تحرير. والتدرّج مقبولٌ هنا بخلاف `icon.svg`:
     هذي تُعرض 180px لا 16px، فالتدرّج يُقرأ ولا يبتلع التباين. */
  const polygons = MARK_POINTS.map(
    (points) => `<polygon points="${points}"/>`,
  ).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}">` +
    `<defs><linearGradient id="m" x1="0" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0" stop-color="${SNOW}"/>` +
    `<stop offset="1" stop-color="${SKY}"/>` +
    `</linearGradient></defs>` +
    `<g fill="url(#m)">${polygons}</g></svg>`;
  const markSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: NIGHT,
          backgroundImage: `linear-gradient(135deg, ${NIGHT} 0%, ${DEEP} 100%)`,
        }}
      >
        {/* ٦٦٪ من العرض: القناعُ المستدير يقضم الزوايا، فالعلامةُ الممتدّة
            إلى الحافّة تُقصّ أطرافُها. */}
        <img src={markSrc} alt="" width={119} height={45} />
      </div>
    ),
    size,
  );
}
