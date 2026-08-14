import { ImageResponse } from "next/og";

import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

/**
 * صورة المشاركة — تظهر حين يُلصق رابط الموقع في واتساب أو إكس أو لينكدإن.
 *
 * ⚠️ **بلا نصٍّ عربيّ عمدًا — والقيد تقنيّ لا ذوقيّ.** `ImageResponse` يرسم
 * بمحرّك Satori، وهو لا يملك خطًّا عربيًّا افتراضيًّا: فالنصّ العربي يخرج
 * **مربّعاتٍ فارغة** ما لم يُحمَّل ملفُّ خطٍّ ويُمرَّر إليه. وخطّا الموقع
 * يأتيان من `next/font/google` ويُخزَّنان في `.next` بأسماءٍ مُجزّأة لا يصحّ
 * الاعتماد عليها، وجلبُهما من الشبكة وقت البناء يجعل البناء يسقط متى سقطت
 * الشبكة. فالنصّ هنا **لاتينيٌّ كلُّه**، وهذا ما يجعله ممكنًا أصلًا.
 *
 * ⚠️ **والوزن العريض غير مضمون:** الخطّ الافتراضي وزنٌ واحد، فـ`fontWeight`
 * قد لا يُغيّر شيئًا. والتمييز هنا بالمقاس والتباعد لا بالوزن — فمن أراد
 * وزنًا حقيقيًّا يلزمه ملفُّ خطٍّ **في المستودع** لا من الشبكة.
 *
 * ⚠️ **وما تحت البطاقة ليس منها.** المنصّات ترسم شريطًا أسفلها فيه النطاق
 * والعنوان والوصف — مصدرُها الرابطُ و`og:title` و`og:description` في
 * `layout.tsx`، لا هذي الصورة. فلا يُكتب فيها نطاقٌ ولا عنوانٌ يكرّرهما،
 * ولو كُتب لتناقض مع ما يعرضه واتساب فوقه مباشرة.
 *
 * والقياس 1200×630 هو نسبة 1.91:1 التي تطلبها منصّات المشاركة.
 */

export const alt = "نادي نظم المعلومات الإدارية — جامعة الملك سعود";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ألوان الهوية — من `tokens.generated.css`، لا تُقدَّر بالعين */
const SNOW = "#f9f9f9";
const SKY = "#7faed9";
const PRIMARY = "#034ca6";
const DEEP = "#022d63";
/** الأدكن — أرضية الوضع الليلي نفسُها */
const NIGHT = "#011c40";

export default function OpengraphImage() {
  /* العلامة تُبنى نصًّا ثم تُمرَّر عنوانَ بيانات: Satori يدعم `<img>` بثقة
     أكثر من دعمه لعناصر SVG المتداخلة. والهندسة مقروءةٌ من المولَّد نفسه،
     فلو صُحّحت العلامة يومًا تبعتها الصورة بلا تحرير. */
  const polygons = MARK_POINTS.map(
    (points) => `<polygon points="${points}"/>`,
  ).join("");
  /* تدرّجٌ خفيف على الأضلاع — أعلاها ثلجيّ وأسفلها سماويّ، كما في لوح
     الهوية. و`resvg` (رَاسِمُ Satori) يدعم تدرّجات SVG، بخلاف كثيرٍ ممّا
     لا يدعمه. */
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}">` +
    `<defs><linearGradient id="m" x1="0" y1="0" x2="0.85" y2="1">` +
    `<stop offset="0" stop-color="${SNOW}"/>` +
    `<stop offset="1" stop-color="${SKY}"/>` +
    `</linearGradient></defs>` +
    `<g fill="url(#m)">${polygons}</g></svg>`;
  const markSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  /* زخرفةُ الجهة اليمنى: وهجٌ ناعم وثلاثُ شرائح بزاوية الشعار.
     تُرسم صورةً واحدة لا عناصرَ متراكبة — كلُّ عنصرٍ مطلقٍ في Satori يزيد
     كلفة الرسم، وهذي بلا تفاعلٍ ولا معنًى دلاليّ.

     ⚠️ **والشفافية منخفضةٌ عمدًا.** أوّل رسمةٍ جعلتها `0.05→0.11` بعرض
     ٤٢٠px فقرأتها العينُ **أعمدةً** تنازع العلامةَ لا لمسةً خلفها. فضاقت
     ورقّت وانزاحت إلى الحافّة. */
  const decor =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 630">` +
    `<defs><radialGradient id="glow" cx="0.72" cy="0.44" r="0.62">` +
    `<stop offset="0" stop-color="${SKY}" stop-opacity="0.30"/>` +
    `<stop offset="1" stop-color="${SKY}" stop-opacity="0"/>` +
    `</radialGradient></defs>` +
    `<rect width="460" height="630" fill="url(#glow)"/>` +
    [
      { x: 150, w: 26, o: 0.07 },
      { x: 232, w: 54, o: 0.05 },
      { x: 340, w: 20, o: 0.09 },
    ]
      .map(
        ({ x, w, o }) =>
          `<polygon points="${x},630 ${x + w},630 ${x + 300},0 ${x + 300 - w},0" fill="${SNOW}" opacity="${o}"/>`,
      )
      .join("") +
    `</svg>`;
  const decorSrc = `data:image/svg+xml;utf8,${encodeURIComponent(decor)}`;

  /* السهم رسمًا لا حرفًا: `→` قد لا يوجد في الخطّ الافتراضي فيخرج مربّعًا
     فارغًا. وحيلةُ «حدودٌ على عنصرٍ بلا مقاس» لا يدعمها Satori — جُرّبت
     فخرجت مربّعًا مصمتًا. */
  const arrow =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">` +
    `<polygon points="0,1.5 11,6 0,10.5" fill="rgba(249,249,249,0.45)"/></svg>`;
  const arrowSrc = `data:image/svg+xml;utf8,${encodeURIComponent(arrow)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          color: SNOW,
          backgroundColor: NIGHT,
          /* من الأدكن يسارًا إلى الأساسيّ يمينًا — بزاويةٍ تُسايِر ميلَ
             الشعار فلا يتعارض اتجاهان في صورةٍ واحدة. */
          backgroundImage: `linear-gradient(115deg, ${NIGHT} 0%, ${DEEP} 58%, ${PRIMARY} 100%)`,
        }}
      >
        <img
          src={decorSrc}
          alt=""
          width={460}
          height={630}
          style={{ position: "absolute", top: 0, right: 0 }}
        />

        {/* ══ العلامة والاسم والشعار اللفظي — كتلةٌ واحدة ══
            الشعار اللفظي **تحت الاسم لا في وسط البطاقة**: أوّل رسمةٍ
            وزّعت الثلاثة بـ`space-between` فطفا بينهما فراغٌ يفصل ما هو
            وحدةٌ واحدة في التصميم. */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={markSrc} alt="" width={302} height={114} />

          <div
            style={{
              width: 2,
              height: 186,
              margin: "0 46px",
              backgroundColor: "rgba(249,249,249,0.32)",
            }}
          />

          {/* ثلاثة أسطر لا سطرٌ واحد: الاسم طويل، وكسرُه عند حدود المعنى
              أقرأُ من تصغيرِ خطٍّ ليتّسع في سطر. */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {["MANAGEMENT", "INFORMATION", "SYSTEMS CLUB"].map((line) => (
              <div
                key={line}
                style={{
                  fontSize: 50,
                  lineHeight: 1.16,
                  letterSpacing: 1.5,
                }}
              >
                {line}
              </div>
            ))}

            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 27,
                letterSpacing: 3,
                color: SKY,
              }}
            >
              Build · Connect · Grow
            </div>
          </div>
        </div>

        {/* ══ الجهة ══ */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 21,
              letterSpacing: 7,
              color: "rgba(249,249,249,0.72)",
            }}
          >
            KING SAUD UNIVERSITY
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 18 }}>
            <div
              style={{
                width: 236,
                height: 1,
                backgroundColor: "rgba(249,249,249,0.45)",
              }}
            />
            <img src={arrowSrc} alt="" width={12} height={12} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
