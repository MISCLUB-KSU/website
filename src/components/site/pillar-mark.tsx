/**
 * علامات الركائز الثلاث — الهدف · الرسالة · الرؤية.
 *
 * ضرباتٌ بزاوية الشعار ٢٤°، لا أيقونات تصويرية: هدفٌ وصاروخٌ ولمبة تصلح
 * لأي موقع في الدنيا، وقاعدة النادي تمنع التصويرية نصًّا.
 *
 *   الهدف   · «الحفر»    — كتلةٌ صلبة والعلامة محفورةٌ فيها فراغًا سالبًا.
 *                          مبدأ الشعار حرفيًّا: يُقرأ من الفراغ لا الحبر.
 *   الرسالة · «الانتشار» — ضرباتٌ متساوية تتباعد فجواتها تصاعديًّا.
 *   الرؤية  · «الأفق»    — ضرباتٌ تضمر عرضًا وتتلاشى، منظورٌ نحو البعيد.
 *
 * **الموازنة البصرية:** رأس الضربة يزيح يمينًا بمقدار ارتفاعه × الميلان،
 * فالكتلة تتزحلق داخل مربّعها وتبدو غير مركّزة. هنا يُحسب الصندوق المحيط
 * الحقيقي لكل علامة ثم تُزاح لتجلس في مركز إطارها **رياضيًّا** لا بالعين.
 */

/** ميلان الشعار: ‏tan(24.32°) — مقيسة من الملف الأصلي */
const SLANT = 0.4522;
const BASELINE = 20;
const TOP = 4;
const BOX = 24;

export type PillarMarkShape = "carved" | "spread" | "horizon";

/** أركان متوازي الأضلاع: الرأس يزيح يمينًا بمقدار الارتفاع × الميلان */
function corners(x: number, w: number): readonly [number, number][] {
  const shift = (BASELINE - TOP) * SLANT;
  return [
    [x + shift, TOP],
    [x + shift + w, TOP],
    [x + w, BASELINE],
    [x, BASELINE],
  ];
}

const pointsOf = (x: number, w: number): string =>
  corners(x, w)
    .map(([px, py]) => `${px.toFixed(2)},${py}`)
    .join(" ");

/** الهدف — كتلةٌ واحدة، والفراغان محفوران فيها */
const CARVED_PLATE: readonly [number, number] = [1, 13];
const CARVED_VOIDS: readonly [number, number][] = [
  [5, 1.8],
  [9.4, 1.8],
];

/** الرسالة — فجواتٌ تتّسع: 1.5 ثم 3، فتُقرأ انتشارًا لا صفًّا منتظمًا */
const SPREAD: readonly [number, number][] = [
  [1, 3],
  [5.5, 3],
  [11.5, 3],
];

/** الرؤية — عرضٌ يضمر: 4 → 1.2، منظورٌ يتلاشى نحو الأفق */
const HORIZON: readonly [number, number][] = [
  [1, 4],
  [6.4, 3],
  [10.8, 2],
  [14.2, 1.2],
];

/** كل الأشكال المرئية لكل علامة — تُحسب منها الموازنة */
const GEOMETRY: Record<PillarMarkShape, readonly (readonly [number, number])[]> =
  {
    carved: [CARVED_PLATE],
    spread: SPREAD,
    horizon: HORIZON,
  };

/** الإزاحة التي تجعل العلامة تجلس في مركز إطارها أفقيًّا ورأسيًّا */
function centreOffset(shape: PillarMarkShape): readonly [number, number] {
  const pts = GEOMETRY[shape].flatMap(([x, w]) => corners(x, w));
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  return [
    (BOX - (Math.max(...xs) + Math.min(...xs))) / 2,
    (BOX - (Math.max(...ys) + Math.min(...ys))) / 2,
  ];
}

type PillarMarkProps = {
  shape: PillarMarkShape;
  className?: string;
};

/**
 * زخرفية دائمًا: لا تظهر إلا بجانب اسم الركيزة مكتوبًا، فتسميتها لقارئ
 * الشاشة تكرارٌ ينطقه مرّتين.
 */
export function PillarMark({ shape, className }: PillarMarkProps) {
  const maskId = `pillar-void-${shape}`;
  const [dx, dy] = centreOffset(shape);

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <g transform={`translate(${dx.toFixed(3)} ${dy.toFixed(3)})`}>
        {shape === "carved" ? (
          <>
            <defs>
              <mask id={maskId}>
                {/* أبيضٌ يُبقي، وأسودُ يحفر — فالفراغ هو ما يُقرأ */}
                <rect width={BOX} height={BOX} fill="#fff" />
                {CARVED_VOIDS.map(([x, w]) => (
                  <polygon key={x} points={pointsOf(x, w)} fill="#000" />
                ))}
              </mask>
            </defs>
            <polygon
              points={pointsOf(CARVED_PLATE[0], CARVED_PLATE[1])}
              mask={`url(#${maskId})`}
            />
          </>
        ) : null}

        {shape === "spread"
          ? SPREAD.map(([x, w]) => (
              <polygon key={x} points={pointsOf(x, w)} />
            ))
          : null}

        {shape === "horizon"
          ? HORIZON.map(([x, w], index) => (
              <polygon
                key={x}
                points={pointsOf(x, w)}
                /* التلاشي جزءٌ من المعنى: البعيد أخفت */
                opacity={1 - index * 0.18}
              />
            ))
          : null}
      </g>
    </svg>
  );
}
