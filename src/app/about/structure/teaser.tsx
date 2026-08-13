import "@/components/site/teaser.css";

/**
 * تشويقُ الهيكل الإداري — **هيكلٌ يتشكّل مطموسًا**.
 *
 * الفكرة: لا يُقال «قريبًا» ويُترك الزائرُ أمام شعار. بل يُرى **شكلُ ما
 * سيأتي** — رئاسةٌ ولجانٌ ووحداتٌ تتّصل — مطموسًا فلا يُقرأ. فيعرف الزائر
 * أن ثمّة شيئًا مبنيًّا ينتظر الإعلان، لا صفحةً فارغة.
 *
 * ⚠️ **ولا اسمَ في الشيفرة.** العقد **أشكالٌ مجرّدة** لا أسماءٌ مموّهة
 * بصريًّا: الطمسُ في CSS يُنزع بسطرٍ في أدوات المطوّر، فاسمٌ مطموسٌ هو
 * اسمٌ منشور. وأسماءُ الـ٣٢ قياديًّا في `content/leadership.ts` لا تدخل
 * هذي الصفحة إطلاقًا حتى يُعلَن الهيكل.
 *
 * ⚠️ **والحركةُ تُطفأ كاملةً مع `prefers-reduced-motion`** — لا بالاعتماد
 * على `MotionConfig` وحده: هو يوقف التحويلات ويُبقي الشفافية، والنبضُ
 * المتكرّر هنا شفافيةٌ في أصله. فيُفحص الطلبُ صراحةً وتُسلَّم الحالةُ
 * النهائية ساكنةً مرسومة.
 */

/* ── هندسة الهيكل — مجرّدة، بلا بيانات ────────────────────────────────── */

const W = 720;
const H = 240;

/** عقدة: رئاسة → نائب → أربع لجان → وحداتها */
const ROOT = { x: 310, y: 6, w: 100, h: 32 };
const VICE = { x: 310, y: 62, w: 100, h: 32 };
const BUS_Y = 118;
const COMMITTEES = [60, 220, 380, 540].map((x) => ({ x, y: 136, w: 120, h: 32 }));
const UNIT_Y = 194;
/** وحدتان تحت كل لجنة */
const UNITS = COMMITTEES.flatMap((c) => [
  { x: c.x, y: UNIT_Y, w: 52, h: 18 },
  { x: c.x + 68, y: UNIT_Y, w: 52, h: 18 },
]);

const mid = (n: { x: number; w: number }) => n.x + n.w / 2;

type Box = { x: number; y: number; w: number; h: number };

function Node({ box, i }: { box: Box; i: number }) {
  return (
    <g className="tz-node" style={{ ["--i" as string]: i }}>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx="4"
        fill="currentColor"
        opacity={0.2}
      />
      {/* شريطٌ داخليّ يوحي بسطرِ اسمٍ محجوب */}
      <rect
        className="tz-bar"
        style={{ ["--i" as string]: i }}
        x={box.x + 10}
        y={box.y + box.h / 2 - 3}
        width={box.w - 20}
        height="6"
        rx="3"
        fill="currentColor"
      />
    </g>
  );
}

export function StructureTeaser() {
  const path = [
    /* الرئاسة → النائب */
    `M${mid(ROOT)} ${ROOT.y + ROOT.h} V${VICE.y}`,
    /* النائب → ناقلٌ أفقيّ */
    `M${mid(VICE)} ${VICE.y + VICE.h} V${BUS_Y}`,
    `M${mid(COMMITTEES[0])} ${BUS_Y} H${mid(COMMITTEES[3])}`,
    /* الناقل → كل لجنة */
    ...COMMITTEES.map((c) => `M${mid(c)} ${BUS_Y} V${c.y}`),
    /* كل لجنة → وحدتيها */
    ...COMMITTEES.flatMap((c) => [
      `M${mid(c)} ${c.y + c.h} V${UNIT_Y - 8} H${c.x + 26} V${UNIT_Y}`,
      `M${mid(c)} ${c.y + c.h} V${UNIT_Y - 8} H${c.x + 94} V${UNIT_Y}`,
    ]),
  ].join(" ");

  return (
    /* `div` و`svg` عاديّان: حركةُ الخلفية كلُّها في `teaser.css` */
    <div className="pointer-events-none relative mt-s6 w-full max-w-3xl" aria-hidden>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="text-accent block h-auto w-full"
        style={{
          /* الطمسُ هو التشويق: يُرى الشكلُ ولا يُقرأ */
          filter: "blur(2.2px)",
          /* تلاشٍ إلى الأسفل فلا ينتهي الرسم بحدٍّ حادّ */
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 74%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 74%, transparent 100%)",
        }}
      >
        {/* `pathLength="1"` يجعل `stroke-dasharray: 1` تعني الطولَ كلَّه */}
        <path
          className="tz-line"
          d={path}
          pathLength="1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeOpacity={0.38}
        />
        <Node box={ROOT} i={0} />
        <Node box={VICE} i={1} />
        {COMMITTEES.map((c, i) => (
          <Node key={`c${c.x}`} box={c} i={2 + i} />
        ))}
        {UNITS.map((u, i) => (
          <Node key={`u${u.x}`} box={u} i={6 + i} />
        ))}
      </svg>
    </div>
  );
}

/**
 * العلامة الحيّة — أضلاعُها الستّة تتشكّل ثم تتنفّس.
 *
 * ⚠️ **بديلُ شارة «الإعلان قريبًا» — بقرار حسام (١٢ أغسطس).** الشارةُ عنصرٌ
 * عامّ يصلح لأي موقع؛ والعلامةُ **هندسةُ النادي نفسِه**، فحياتُها من داخل
 * الهوية لا من نمطٍ مستعار.
 *
 * ⚠️ **ولا معنًى ضائعٌ بحذف نصّ الشارة:** «ترقّبوا الإعلان» عنوانُ الصفحة
 * أسفلها مباشرةً، فما كانت الشارةُ تقوله مقولٌ في مكانٍ أوضح.
 *
 * ⚠️ **وهذي حضورٌ في موضعٍ له وظيفة لا جدارٌ خلف المحتوى** — التمييزُ الذي
 * حسمه حسام في اعتماد واجهة العلامة المتشكّلة: العلامة تحضر حيث تعمل،
 * ولا تلاحق القارئَ في كل قسم.
 *
 * والتنفّسُ موجةٌ تمرّ على الأضلاع بالترتيب — لا وميضٌ متزامن: المتزامنُ
 * يقرأ إنذارًا، والمتتابعُ يقرأ نبضًا.
 */
