import "@/components/site/teaser.css";

/**
 * تشويقُ المشاريع — **ستُّ بطاقاتٍ تتشكّل مطموسة**.
 *
 * توأمُ تشويق الهيكل الإداري بلغته نفسِها، ومحتواه يختلف: هناك شجرةُ
 * إدارة، وهنا **رفُّ مشاريع**. والعددُ ستّةٌ لأن مشاريع النادي ستّة —
 * فيقرأ الزائرُ حجمَ ما ينتظره لا مجرّد «قريبًا».
 *
 * ⚠️ **ولا اسمَ ولا شعارَ في الشيفرة.** البطاقاتُ أشكالٌ مجرّدة: مربّعٌ
 * موضعَ الشعار وشريطان موضعَ الاسم والوصف. والصفحةُ مغلقةٌ أصلًا **لأن
 * الشعارات غير جاهزة** (`markSrc` فارغةٌ في كلّ مشروع) — فرسمُ شعارٍ
 * مؤقّتٍ هنا يناقض سببَ الإغلاق.
 *
 * ⚠️ **وعرضُ الأشرطة يختلف بين البطاقات عمدًا** — ستّةُ أسطرٍ متساوية
 * تُقرأ شبكةً هندسيّة لا محتوًى ينتظر.
 */

const W = 720;
const H = 250;

/** ٣ × ٢ — البطاقة ٢٠٠ والفجوة ٦٠، فيملأ الصفُّ العرضَ تمامًا */
const CARD = { w: 200, h: 110 };
const COLS = [0, 260, 520];
const ROWS = [0, 140];

/** عرضُ شريط الاسم لكل بطاقة — يختلف فيُقرأ اسمًا لا خطًّا */
const TITLE_W = [104, 132, 88, 120, 96, 140];

const CARDS = ROWS.flatMap((y, r) =>
  COLS.map((x, c) => ({ x, y, i: r * COLS.length + c })),
);

export function ProjectsTeaser() {
  return (
    /* `div` و`svg` عاديّان: الحركةُ كلُّها في `teaser.css` */
    <div className="pointer-events-none relative mt-s6 w-full max-w-3xl" aria-hidden>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="text-accent block h-auto w-full"
        style={{
          /* الطمسُ هو التشويق: يُرى الشكلُ ولا يُقرأ */
          filter: "blur(2.2px)",
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 74%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 74%, transparent 100%)",
        }}
      >
        {CARDS.map((card) => (
          <g
            key={card.i}
            className="tz-node"
            style={{ ["--i" as string]: card.i }}
          >
            {/* جسمُ البطاقة */}
            <rect
              x={card.x}
              y={card.y}
              width={CARD.w}
              height={CARD.h}
              rx="6"
              fill="currentColor"
              opacity={0.14}
            />
            {/* موضعُ الشعار */}
            <rect
              x={card.x + 18}
              y={card.y + 20}
              width="28"
              height="28"
              rx="6"
              fill="currentColor"
              opacity={0.3}
            />
            {/* موضعُ الاسم — يتنفّس */}
            <rect
              className="tz-bar"
              style={{ ["--i" as string]: card.i }}
              x={card.x + 18}
              y={card.y + 62}
              width={TITLE_W[card.i]}
              height="10"
              rx="5"
              fill="currentColor"
            />
            {/* موضعُ الوصف */}
            <rect
              x={card.x + 18}
              y={card.y + 82}
              width={CARD.w - 52}
              height="7"
              rx="3.5"
              fill="currentColor"
              opacity={0.22}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
