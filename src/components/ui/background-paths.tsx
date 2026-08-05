"use client";

import Link from "next/link";
import { motion } from "motion/react";

/**
 * حقل الخطوط المتدفّقة — بهوية النادي.
 *
 * الأصل مكوّن عام (`background-paths`) فيه منحنيات بيزيه عشوائية وتدرّج على
 * النص وحواف دائرية وظلال. أُعيد بناؤه على قواعد النظام لا نُقل كما هو:
 *
 * ١. **زاوية واحدة.** الخطوط مستقيمة بميل ٢٤° — زاوية الشعار نفسها
 *    (`--rake`)، لا منحنيات مخترعة. والطبقتان تميلان **الميل نفسه**:
 *    تقاطع زاويتين يكسر «زاوية واحدة» ويصنع شبكةً لا توقيعًا.
 * ٢. **بلا تدرّج على النص.** العنوان لون واحد من الخمسة.
 * ٣. **بلا ظلال وبلا حواف دائرية** — `--radius: 0` قاعدة النظام.
 * ٤. **المحتوى ظاهر افتراضيًا.** الأصل يبدأ كل حرف بـ `opacity: 0` وينتظر
 *    حركة تُظهره — فإن لم تنطلق الحركة (تبويب في الخلفية، تعطّل، لقطة شاشة)
 *    اختفى العنوان كلّه. هنا تُزاح `y` وحدها ولا تُلمس `opacity` أبدًا،
 *    وهي القاعدة نفسها المكتوبة في رأس `components/motion.tsx`.
 * ٥. **بلا `Math.random()`.** الأصل يولّد مدّة عشوائية لكل مسار، فيختلف ما
 *    يرسمه الخادم عمّا يرسمه المتصفح — و`Next` يشتكي من عدم تطابق الترطيب.
 *    المدد هنا مشتقّة من الفهرس: متنوّعة وثابتة بين الرسمتين.
 * ٦. **الحركة تحترم `prefers-reduced-motion`** عبر `MotionProvider` في الجذر.
 */

/** tan(24°) — نفس `--rake-tan` في رموز الهوية */
const RAKE_TAN = 0.4452;

const VIEW_W = 1000;
const VIEW_H = 760;

type Layer = {
  /** عدد الضربات */
  count: number;
  /** شدّة الحبر — الطبقة البعيدة أخفت */
  opacity: number;
  /** ثخانة الضربة */
  width: number;
  /** أبطأ = أبعد */
  speed: number;
};

const LAYERS: readonly Layer[] = [
  { count: 14, opacity: 0.1, width: 2.4, speed: 34 },
  { count: 22, opacity: 0.16, width: 1.1, speed: 22 },
];

function RakedPaths({ layer, index }: { layer: Layer; index: number }) {
  /* الإزاحة الأفقية لضربة تقطع الارتفاع كلّه عند ٢٤° */
  const run = VIEW_H * RAKE_TAN;
  /* تُوزَّع على عرضٍ أوسع من اللوحة بمقدار الإزاحة، فلا تنقطع عند الحافّتين */
  const spread = (VIEW_W + run * 2) / layer.count;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: layer.count }, (_, i) => {
        const x0 = -run + i * spread;
        return (
          <motion.path
            key={i}
            d={`M${x0} ${VIEW_H} L${x0 + run} 0`}
            stroke="currentColor"
            strokeWidth={layer.width}
            strokeOpacity={layer.opacity}
            strokeLinecap="round"
            /* الظاهر ثلث الضربة، ينزلق على مسارها فيقرأ انسيابًا.
               `opacity` ثابتة — الزخرفة تتحرّك، ولا شيء يختفي. */
            initial={{ pathLength: 0.34, pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{
              duration: layer.speed + ((i + index * 3) % 7) * 1.6,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        );
      })}
    </svg>
  );
}

type BackgroundPathsProps = {
  title: string;
  /** سطر تحت العنوان — اختياري */
  lede?: string;
  /** إجراء واحد لا زرّان: النظام لا يعرف صفّ «ممتلئ + مفرّغ» */
  action?: { label: string; href: string };
};

export function BackgroundPaths({ title, lede, action }: BackgroundPathsProps) {
  return (
    <section className="relative grid min-h-[calc(100svh-var(--header-h))] place-items-center overflow-hidden bg-surface-ink px-s4 py-s7 text-on-ink sm:px-s7">
      {/* الحقل خلف المحتوى لا فوقه، ولا يلتقط النقر */}
      <div className="pointer-events-none absolute inset-0 text-snow">
        {LAYERS.map((layer, i) => (
          <RakedPaths key={i} layer={layer} index={i} />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        {/* الحركة على `y` وحدها. لو لم تنطلق بقي العنوان مقروءًا في مكانه —
            وهذا شرط، لا تفصيل. */}
        <motion.h1
          initial={{ y: 18 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          className="font-display text-display font-bold text-snow"
        >
          {title}
        </motion.h1>

        {lede && (
          <motion.p
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 22, delay: 0.06 }}
            className="mx-auto mt-s4 max-w-[54ch] text-lead text-on-ink-dim"
          >
            {lede}
          </motion.p>
        )}

        {action && (
          <div className="mt-s6">
            {/* حادّ، بلا ظلّ، وبلا رفع عند المرور — اللون وحده يتغيّر */}
            <Link
              href={action.href}
              className="rake rake-sm rake-interactive inline-flex min-h-11 items-center bg-snow px-s5 font-semibold text-deep transition-colors hover:bg-sky"
            >
              {action.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
