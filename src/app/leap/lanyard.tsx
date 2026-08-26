/**
 * الحبل كاملًا — شريطان ونسيجٌ ومشبك، في رسمةٍ واحدة.
 *
 * ⚠️ **الحبلُ منحنٍ، والمستطيلُ المُدارُ لا يكذب على العين طويلًا.** القماشُ
 * المعلَّق يتقوّس بثقله، فالشريطان مساران منحنيان يُرسمان بـ`stroke` عريض
 * فتتقوّس حافّتاهما فعلًا.
 *
 * ⚠️ **ولا `textPath` هنا — لا يُرسم في هذا السياق.** جُرِّب بمسارٍ داخل
 * `defs` وخارجه، وفي الحالتين خرج النصُّ حرفًا عند الأصل. فالتسمياتُ
 * والزخارفُ تُوضع بإحداثياتٍ محسوبةٍ من منحنى بيزييه نفسِه، وتُدار بزاوية
 * المماسّ. حسابٌ ثابتٌ لا يعتمد على ميزةٍ قد لا تعمل.
 *
 * ⚠️ **نقشُ الطباعة `userSpaceOnUse` بعرض الرسمة كلِّها** — فلا يتكرّر
 * أفقيًّا، وتصير الكتلُ أشرطةً تقطع الشريطَ عرضًا مهما مال. والنقشُ واحدٌ
 * للشريطين: هما وجها حبلٍ واحدٍ طُبع مرّةً واحدة.
 */

const LABEL = "MIS CLUB";

/** الشريط الأمامي — يهبط من أعلى ويلتقي الآخرَ عند حلقة المشبك */
const FRONT = "M 96 -12 C 100 90, 106 200, 116 296";
const BACK = "M 170 -12 C 160 92, 138 205, 120 296";

type Spot = { x: number; y: number; a: number };

/* مراكزُ الكتل السوداء على كلِّ مسار (حيث يقع الاسم) */
const FRONT_TEXT: Spot[] = [
  { x: 101, y: 99, a: 88 },
  { x: 111, y: 253, a: 87 },
];
const BACK_TEXT: Spot[] = [
  { x: 156, y: 99, a: 96 },
  { x: 130, y: 253, a: 95 },
];

/* مراكزُ الكتل الملوّنة (حيث تقع زخرفةُ الميلان) */
const FRONT_MOTIF: Spot[] = [
  { x: 97, y: 22, a: 88 },
  { x: 106, y: 176, a: 88 },
];
const BACK_MOTIF: Spot[] = [
  { x: 166, y: 22, a: 95 },
  { x: 143, y: 176, a: 96 },
];

/** متوازي أضلاعٍ بميلان النادي — زخرفةُ الكتل الملوّنة */
const MOTIF_PATH = "M -8 8 L -2.2 -8 L 8 -8 L 2.2 8 Z";

/* الكتلةُ عند y=22 ماجنتا (زخرفةٌ بيضاء)، وعند y=176 سماويّة (زخرفةٌ
   داكنة — الأبيضُ على `#73fafd` يذوب) */
const MOTIF_FILL: Record<number, string> = {
  22: "rgb(255 255 255 / 55%)",
  176: "rgb(23 19 29 / 34%)",
};

function StrapText({ spots, size }: { spots: Spot[]; size: number }) {
  return (
    <>
      {spots.map((s) => (
        <text
          key={`${s.x}-${s.y}`}
          className="leap-lat"
          x={s.x}
          y={s.y}
          transform={`rotate(${s.a} ${s.x} ${s.y})`}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size}
          fontWeight="800"
          fill="#ffffff"
          stroke="#141019"
          strokeWidth="3"
          paintOrder="stroke"
        >
          {LABEL}
        </text>
      ))}
    </>
  );
}

function StrapMotifs({ spots }: { spots: Spot[] }) {
  return (
    <>
      {spots.map((s) => (
        <path
          key={`${s.x}-${s.y}`}
          d={MOTIF_PATH}
          transform={`translate(${s.x} ${s.y}) rotate(${s.a - 90}) scale(1.15)`}
          fill={MOTIF_FILL[s.y] ?? "rgb(255 255 255 / 55%)"}
        />
      ))}
    </>
  );
}

export function Lanyard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 402"
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern
          id="lgWeave"
          width="240"
          height="308"
          patternUnits="userSpaceOnUse"
        >
          <rect width="240" height="44" fill="#eb3df7" />
          <rect y="44" width="240" height="110" fill="#17131d" />
          <rect y="154" width="240" height="44" fill="#73fafd" />
          <rect y="198" width="240" height="110" fill="#17131d" />
        </pattern>

        {/* حياكةُ القماش — خطوطٌ مائلةٌ دقيقةٌ تكسر السطحَ المصمت */}
        <pattern
          id="lgThread"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(48)"
        >
          <rect width="1" height="4" fill="#000" opacity="0.2" />
        </pattern>

        {/* استدارةُ الشريط: ظلٌّ على الحافّتين ولمعةٌ قربَ الثلث */}
        <linearGradient id="lgRound" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.5" />
          <stop offset="0.2" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="0.78" stopColor="#000" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>

        {/**
         * ⚠️ **الكرومُ يحتاج حزامًا داكنًا في وسطه.** المعدنُ المصقول يعكس
         * الأفق: لمعةٌ حادّة، ثم حزامٌ داكن، ثم انعكاسٌ ثانٍ أخفت. تدرّجٌ
         * داكن→فاتح→داكن يعطي بلاستيكًا لامعًا لا فولاذًا.
         */}
        <linearGradient id="lgChrome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2e2e36" />
          <stop offset="0.12" stopColor="#7d7d89" />
          <stop offset="0.26" stopColor="#ffffff" />
          <stop offset="0.38" stopColor="#c8c8d2" />
          <stop offset="0.52" stopColor="#55555f" />
          <stop offset="0.68" stopColor="#9a9aa6" />
          <stop offset="0.84" stopColor="#d5d5df" />
          <stop offset="1" stopColor="#33333c" />
        </linearGradient>

        <linearGradient id="lgChromeDim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#26262d" />
          <stop offset="0.28" stopColor="#8f8f9b" />
          <stop offset="0.5" stopColor="#4b4b55" />
          <stop offset="0.74" stopColor="#84848f" />
          <stop offset="1" stopColor="#2a2a32" />
        </linearGradient>

        {/* الشريطُ يخرج من أعلى الإطار: تلاشٍ بدل قَصٍّ حادّ */}
        <linearGradient id="lgFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.15" stopColor="#fff" />
        </linearGradient>
        <mask id="lgTop">
          <rect width="240" height="402" fill="url(#lgFade)" />
        </mask>

        {/* تنعيمُ ظلّ العتاد الساقط على البطاقة */}
        <filter id="lgSoft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        <path id="lgBackLine" d={BACK} />
        <path id="lgFrontLine" d={FRONT} />
      </defs>

      <g mask="url(#lgTop)">
        {/* ---------- الشريط الخلفيّ — أخفتُ لأنه أبعدُ عن الضوء ---------- */}
        <g opacity="0.7">
          <use href="#lgBackLine" stroke="url(#lgWeave)" strokeWidth="42" fill="none" />
          <use href="#lgBackLine" stroke="url(#lgThread)" strokeWidth="42" fill="none" />
          <use href="#lgBackLine" stroke="url(#lgRound)" strokeWidth="42" fill="none" />
          <StrapMotifs spots={BACK_MOTIF} />
          <StrapText spots={BACK_TEXT} size={17} />
        </g>

        {/* ---------- الشريط الأماميّ ---------- */}
        <g>
          <use href="#lgFrontLine" stroke="url(#lgWeave)" strokeWidth="46" fill="none" />
          <use href="#lgFrontLine" stroke="url(#lgThread)" strokeWidth="46" fill="none" />
          <use href="#lgFrontLine" stroke="url(#lgRound)" strokeWidth="46" fill="none" />
          <StrapMotifs spots={FRONT_MOTIF} />
          <StrapText spots={FRONT_TEXT} size={19} />
        </g>
      </g>

      {/* ---------- العتاد المعدنيّ ---------- */}

      {/**
       * ⚠️ **المعدنُ يُقرأ من ثلاث لمساتٍ لا من التدرّج وحده:** حزامٌ
       * سبكولارٌ حادٌّ مُزاحٌ نحو مصدر الضوء فوق كلِّ قطعة، وظلُّ العتاد
       * ساقطًا على وجه البطاقة، وسلكٌ **أنحفُ من الفتحة** فيظهر سوادُ
       * الثقب حوله ويُقرأ العبور. والتداخلُ ماديّ: المسارُ الأماميُّ
       * **ينتهي داخل الثقب** — الالتفافةُ الراجعةُ خلف البطاقة فلا تُرسم
       * أمامها، ومقطعُها الغاطسُ يُرسم داخل الفتحة نفسِها (`badge.tsx`).
       */}

      {/* ظلُّ الخطّاف على وجه البطاقة — نفسُ المسار مُزاحًا عكسَ الضوء */}
      <path
        d="M 118 334 v 20 c 0 18 -8 28 -20 30 c -4 0.7 -7 3 -8 7"
        fill="none"
        stroke="rgb(0 0 0 / 45%)"
        strokeWidth="13"
        strokeLinecap="round"
        transform="translate(-9 11)"
        filter="url(#lgSoft)"
      />

      {/* حلقةُ D — يلتفّ عليها النسيج */}
      <rect
        x="96"
        y="288"
        width="44"
        height="30"
        rx="15"
        fill="none"
        stroke="#141019"
        strokeWidth="9"
      />
      <rect
        x="96"
        y="288"
        width="44"
        height="30"
        rx="15"
        fill="none"
        stroke="url(#lgChrome)"
        strokeWidth="6"
      />
      {/* لمعةُ الحافّة العلوية للحلقة */}
      <path
        d="M 104 286.5 a 15 11 0 0 1 24 0"
        fill="none"
        stroke="rgb(255 255 255 / 78%)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* طيّةُ النسيج فوق الحلقة، بخيط خياطةٍ ظاهر */}
      <rect x="92" y="268" width="52" height="28" rx="5" fill="#100d15" />
      <rect x="92" y="268" width="52" height="28" rx="5" fill="url(#lgThread)" />
      <rect x="92" y="268" width="52" height="28" rx="5" fill="url(#lgRound)" />
      <line
        x1="97"
        y1="282"
        x2="139"
        y2="282"
        stroke="#6d6878"
        strokeWidth="1.2"
        strokeDasharray="2.5 3"
      />

      {/* المحورُ الدوّار — طوقٌ عريضٌ فوق عنقٍ أرفع، وبينهما ظلُّ التماسّ */}
      <rect x="109" y="314" width="18" height="9" rx="3.5" fill="url(#lgChromeDim)" />
      <ellipse cx="118" cy="323.4" rx="7" ry="1.6" fill="rgb(0 0 0 / 45%)" />
      <rect x="112" y="322" width="12" height="12" rx="4" fill="url(#lgChrome)" />
      <rect x="113.5" y="323" width="3.6" height="10" rx="1.8" fill="rgb(255 255 255 / 65%)" />

      {/* جسمُ الخطّاف — يغطس في الثقب وينتهي هناك */}
      <path
        d="M 118 334 v 20 c 0 18 -8 28 -20 30 c -4 0.7 -7 3 -8 7"
        fill="none"
        stroke="#141019"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 118 334 v 20 c 0 18 -8 28 -20 30 c -4 0.7 -7 3 -8 7"
        fill="none"
        stroke="url(#lgChrome)"
        strokeWidth="10.5"
        strokeLinecap="round"
      />
      {/* السبكولار — مُزاحٌ نحو الضوء ويبقى داخل صورة السلك */}
      <path
        d="M 118 334 v 20 c 0 18 -8 28 -20 30 c -4 0.7 -7 3 -8 7"
        fill="none"
        stroke="rgb(255 255 255 / 78%)"
        strokeWidth="2.6"
        strokeLinecap="round"
        transform="translate(2.2 -2)"
      />

      {/* بوّابةُ الزنبرك وبرشامُ مفصلها — تُغلق الفتحةَ قبل مدخل الثقب */}
      <path
        d="M 101 371 L 115 350"
        stroke="#141019"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 101 371 L 115 350"
        stroke="url(#lgChromeDim)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="115.5" cy="349" r="2.6" fill="#141019" />
      <circle cx="115.1" cy="348.5" r="1.6" fill="#e8e8f0" />

      {/* لسانُ الإبهام */}
      <rect x="123" y="349" width="7" height="16" rx="3.5" fill="url(#lgChromeDim)" />
      <rect x="124.2" y="350.5" width="2.4" height="13" rx="1.2" fill="rgb(255 255 255 / 55%)" />
    </svg>
  );
}
