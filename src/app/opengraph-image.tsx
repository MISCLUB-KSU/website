import { ImageResponse } from "next/og";

import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

/**
 * صورة المشاركة — تظهر حين يُلصق رابط الموقع في واتساب أو إكس أو لينكدإن.
 *
 * ⚠️ **بلا نصٍّ عربيّ عمدًا.** `ImageResponse` يرسم بمحرّك Satori، وهو لا
 * يملك خطًّا عربيًّا افتراضيًّا — فالنصّ العربي يخرج **مربّعاتٍ فارغة** ما لم
 * يُحمَّل ملفُّ خطٍّ ويُمرَّر إليه. وخطّا الموقع يأتيان من `next/font/google`
 * ويُخزَّنان داخل `.next` بأسماءٍ مُجزّأة لا يصحّ الاعتماد عليها، وجلبُهما من
 * الشبكة وقت البناء يجعل البناء يسقط متى سقطت الشبكة.
 *
 * فالصورة **علامةٌ على أرضية** لا غير. والعنوان والوصف يصلان أصلًا في
 * `og:title` و`og:description` من `layout.tsx` — فالصورة لا تحمل نصًّا
 * مكرَّرًا، وتبقى صحيحةً في كل لغةٍ يقرأ بها المشارك.
 *
 * والقياس 1200×630 هو نسبة 1.91:1 التي تطلبها منصّات المشاركة.
 */

export const alt = "نادي نظم المعلومات الإدارية — جامعة الملك سعود";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** أرضية الصورة — الكحليّ العميق من لوحة العلامة (04 Deep Blue). */
const DEEP = "#022d63";
/** العلامة — الثلجيّ (01 Snow White). */
const SNOW = "#f9f9f9";

export default function OpengraphImage() {
  /* العلامة تُبنى نصًّا ثم تُمرَّر عنوانَ بيانات: Satori يدعم `<img>` بثقة
     أكثر من دعمه لعناصر SVG المتداخلة. والهندسة مقروءةٌ من المولَّد نفسه،
     فلو صُحّحت العلامة يومًا تبعتها الصورة بلا تحرير. */
  const polygons = MARK_POINTS.map(
    (points) => `<polygon points="${points}"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" fill="${SNOW}">${polygons}</svg>`;
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
          backgroundColor: DEEP,
        }}
      >
        {/* العرض 62% من الصورة: يترك هامشًا سخيًّا على الجوانب فلا تُقصّ
            العلامة حين تقصّ المنصّات حوافّ البطاقة. */}
        {/* ⚠️ `<img>` لا `next/image`: هذي الصورةُ تُرسم في Satori على
            الخادم لا في المتصفّح، ولا وجودَ لمُحسِّن الصور هناك. */}
        <img src={markSrc} alt="" width={744} height={280} />
      </div>
    ),
    size,
  );
}
