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

  /* ══ زخرفة الأرضية: موجةٌ وخطُّ ضوءٍ وكتلٌ متوازية ══
     تُرسم صورةً واحدة تغطّي البطاقة كلَّها لا عناصرَ متراكبة — كلُّ عنصرٍ
     مطلقٍ في Satori يزيد كلفة الرسم، وهذي بلا تفاعلٍ ولا معنًى دلاليّ.

     ⚠️ **والميل ليس اختيارًا حرًّا: `SLOPE` مشتقٌّ من الشعار نفسِه.**
     ضلعُ العلامة ينزل من `(813,0)` إلى `(659.8,339)`، أي إزاحةٌ أفقية
     مقدارُها `153.2/339 ≈ 0.452` لكل وحدةِ ارتفاع. فكلُّ متوازيةٍ هنا
     تُبنى بهذا الميل — ولو قُدّرت بالعين لظهر في البطاقة اتجاهان
     متقاربان لا يتطابقان، وهو أسوأ من اتجاهين مختلفين صراحةً. */
  const SLOPE = 153.2 / 339;
  /** متوازيةُ أضلاعٍ بميل الشعار — `x,y` رأسُها الأعلى الأيسر */
  const slab = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    o: number,
  ) =>
    `<polygon points="${x},${y} ${x + w},${y} ${x + w - SLOPE * h},${y + h} ${x - SLOPE * h},${y + h}" fill="${fill}" opacity="${o}"/>`;

  const decor =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">` +
    `<defs>` +
    /* الموجة: أفتحُ ما تكون عند وسطها الأيمن ثم تخبو — لا لونٌ مصمت */
    `<linearGradient id="wave" x1="0" y1="1" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${PRIMARY}" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="${PRIMARY}" stop-opacity="0.34"/>` +
    `<stop offset="1" stop-color="${SKY}" stop-opacity="0.14"/>` +
    `</linearGradient>` +
    /* خطُّ الضوء: يشتدّ في الوسط ويتلاشى في الطرفين، فلا يبدو حدًّا
       مرسومًا بل انعكاسَ ضوءٍ على حافّة الموجة */
    `<linearGradient id="edge" x1="0" y1="1" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${SKY}" stop-opacity="0"/>` +
    `<stop offset="0.46" stop-color="#dceaf8" stop-opacity="0.9"/>` +
    `<stop offset="0.78" stop-color="${SKY}" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="${SKY}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<linearGradient id="wave2" x1="0" y1="1" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${DEEP}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${PRIMARY}" stop-opacity="0.16"/>` +
    `</linearGradient>` +
    `</defs>` +
    /* موجةٌ خلفيةٌ باهتة ثم الموجة الرئيسة فوقها — طبقتان تعطيان عمقًا
       لا تعطيه واحدة */
    `<path d="M -40 640 C 260 600 420 470 720 400 S 1060 300 1240 190 L 1240 640 Z" fill="url(#wave2)"/>` +
    `<path d="M -40 640 C 300 585 430 360 760 300 S 1080 190 1240 70 L 1240 640 Z" fill="url(#wave)"/>` +
    `<path d="M -40 640 C 300 585 430 360 760 300 S 1080 190 1240 70" fill="none" stroke="url(#edge)" stroke-width="3"/>` +
    /* الكتل اليمنى — صفّان متداخلان بأحجامٍ متفاوتة، كما في اللوح */
    slab(946, 286, 96, 148, SKY, 0.14) +
    slab(1054, 286, 56, 148, SKY, 0.09) +
    slab(1014, 168, 118, 148, PRIMARY, 0.40) +
    slab(1144, 168, 66, 148, SKY, 0.12) +
    slab(1086, 50, 84, 148, SKY, 0.10) +
    slab(902, 404, 62, 148, SKY, 0.08) +
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
          backgroundImage: `linear-gradient(115deg, #010f26 0%, ${NIGHT} 42%, ${DEEP} 100%)`,
        }}
      >
        <img
          src={decorSrc}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        {/* ══ الشعار الكامل: العلامة والاسم، وتحتهما الشعار اللفظي ══
            ⚠️ **الشعار اللفظي متوسّطٌ تحت الشعار كلِّه لا محاذٍ للاسم.**
            رسمةٌ سابقة حاذته بيسار «MANAGEMENT» فبدا تابعًا للنصّ وحده،
            وهو في اللوح تحت الوحدة كلِّها (العلامة + الفاصل + الاسم).
            و`alignItems: center` على غلافٍ يتقلّص إلى عرض الصفّ هو ما
            يوسّطه دون أن يوسّط الكتلة في البطاقة. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={markSrc} alt="" width={266} height={100} />

            <div
              style={{
                width: 2,
                height: 164,
                margin: "0 42px",
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
                    fontSize: 46,
                    lineHeight: 1.18,
                    letterSpacing: 1.5,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 26,
              letterSpacing: 3,
              color: SNOW,
            }}
          >
            Build · Connect · Grow
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
