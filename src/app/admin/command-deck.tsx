"use client";

import { useEffect, useRef, useState } from "react";

import { Ring } from "./charts";
import type { DayPoint } from "./stats";

/**
 * شريط القيادة — **الواجهة التي يُفتح عليها `/admin`**.
 *
 * ⚠️ خروجٌ مقصود عن انضباط الهوية بأمر حسام؛ الحيثيات في رأس `admin.css`.
 * وما يُطمئن أنّ نطاقه صفحةٌ داخلية خلف تسجيل دخول لا يراها زائر.
 *
 * ── القاعدة التي لا تُكسَر ──────────────────────────────────────────────
 * **المحتوى ظاهرٌ افتراضيًّا.** الرقم يُطبع في `HTML` بقيمته النهائية،
 * والشظايا تُرسم بارتفاعاتها كاملةً. فلو لم يعمل `JS` — تبويبةٌ خلفية،
 * تعثّرُ ترطيب، لقطةُ شاشة — تبقى اللوحة صحيحةً كاملة، ويضيع الزخرف وحده.
 * وهذا نقيض الفخّ المعروف: `opacity:0` ينتظر حركةً قد لا تأتي فيبقى الفراغ.
 */

const SLANT_TAN = Math.tan((20 * Math.PI) / 180);

type Props = {
  total: number;
  decided: number;
  withCv: number;
  days: readonly DayPoint[];
  scope: string;
  lastAt: string | null;
  /* أرقامٌ ثانوية — كانت ألواحًا مستقلّة تحت الشريط */
  stats: readonly { label: string; value: number }[];
};

export function CommandDeck({
  total,
  decided,
  withCv,
  days,
  scope,
  lastAt,
  stats,
}: Props) {
  const live = useLive();

  return (
    <section
      className={`deck mb-s5 px-s5 pt-s6 pb-0 sm:px-s7 sm:pt-s7 ${live ? "deck-live" : ""}`}
      aria-labelledby="deck-title"
    >
      {/* شعاعٌ زخرفيّ — خلف المحتوى ولا يلتقط الفأرة */}
      <span
        aria-hidden
        className="deck-sweep pointer-events-none absolute inset-y-0 -z-[1] w-[26%] opacity-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--snow) 26%, transparent), transparent)",
        }}
      />

      <div className="flex flex-wrap items-end justify-between gap-x-s7 gap-y-s6">
        <div className="min-w-0">
          <p
            id="deck-title"
            className="text-[0.78rem] font-semibold tracking-[0.14em] opacity-70"
          >
            غرفة العمليات
          </p>
          <p className="mt-s2 text-[0.92rem] opacity-80">{scope}</p>

          <p className="mt-s4 flex items-baseline gap-x-s4">
            <Counter value={total} className="deck-figure font-display font-bold" />
            <span className="text-lg font-semibold opacity-75">
              {total === 1 ? "طلب" : "طلبًا"}
            </span>
          </p>

          {lastAt && (
            <p className="mt-s3 flex items-center gap-x-s2 text-[0.82rem] opacity-75">
              <span
                aria-hidden
                className="slant-mark inline-block h-[10px] w-[13px] shrink-0"
                style={{ background: "var(--sky)" }}
              />
              آخرُ طلبٍ وصل {lastAt}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-s7 gap-y-s5">
          <DeckRing value={decided} total={total} label="حُسم" />
          <DeckRing value={withCv} total={total} label="بسيرة ذاتية" />
        </div>
      </div>

      {/* ⚠️ **شريطُ الأرقام الثانوية هنا لا في ألواحٍ تحت الشريط.** كانا
          لوحين أبيضين فيهما رقمٌ واحد لا غير، يقطعان الاندفاع بعد الشريط
          ويتركان في الشريط نفسه فراغًا أسودَ واسعًا. وضمُّهما يملأ الفراغ
          ويرفع الكثافة، وهي المقصودة هنا. */}
      <ul className="mt-s6 flex flex-wrap gap-x-s7 gap-y-s4 border-t pt-s4" style={{ borderColor: "color-mix(in oklab, var(--snow) 18%, transparent)" }}>
        {stats.map((s) => (
          <li key={s.label} className="flex items-center gap-x-s3">
            <span
              aria-hidden
              className="slant-mark inline-block h-[16px] w-[11px] shrink-0"
              style={{ background: "color-mix(in oklab, var(--sky) 80%, transparent)" }}
            />
            <span dir="ltr" className="text-2xl leading-none font-bold tabular-nums">
              {s.value}
            </span>
            <span className="text-[0.82rem] opacity-75">{s.label}</span>
          </li>
        ))}
      </ul>

      <ShardField days={days} />
    </section>
  );
}

/* ── حقل الوصول: يومٌ لكل شظيّة ─────────────────────────────────────────
   لماذا شظايا لا أعمدة؟ لأن الميلان هنا **بنيةٌ لا زخرف**: زاوية الشعار
   نفسها تصير هيكل الرسم. وهذا هو الخروج المطلوب — والقيمة تبقى مقروءة،
   فالارتفاع كمّيّ صادق والعنوان يذكر العدد نصًّا. */
function ShardField({ days }: { days: readonly DayPoint[] }) {
  if (days.length === 0) return null;

  const H = 132;
  const GAP = 5;
  const W = 1000;
  const n = days.length;
  const bw = Math.max(6, (W - GAP * (n - 1)) / n);
  const max = Math.max(...days.map((d) => d.count), 1);
  const lean = Math.min(bw * 0.62, H * SLANT_TAN);

  return (
    /* ⚠️ **الحقل يرسو على الحافّة السفلى** ويمتدّ عرضَ الشريط كاملًا.
       جُرّب طافيًا داخل الحشو فبدا جسمًا معلّقًا فوق شريطٍ أسودَ فارغ،
       والشظايا تحتاج أرضًا تقف عليها لتُقرأ كقاعدةٍ لا كزينةٍ سابحة. */
    <figure className="mt-s6 mb-0 -mx-s5 sm:-mx-s7">
      <figcaption className="sr-only">
        الطلبات الواصلة يومًا بيوم خلال {days.length} يومًا
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[132px] w-full"
        role="img"
        aria-label={`أعلى يومٍ وصل فيه ${max} ${max === 1 ? "طلب" : "طلبًا"}`}
      >
        {days.map((d, i) => {
          /* الحدّ الأدنى ٣px: يومٌ بلا طلبٍ يبقى له أثرٌ في الخطّ الزمنيّ،
             فاختفاؤه يجعل الأسبوع الصامت يبدو كأنه لم يكن. */
          const h = d.count === 0 ? 3 : Math.max(6, (d.count / max) * H);
          const x = i * (bw + GAP);
          const y = H - h;
          const k = d.count === 0 ? 0 : lean;
          return (
            <g key={d.day} className="shard-hit" style={{ ["--i" as string]: i }}>
              <title>
                {d.label} — {d.count} {d.count === 1 ? "طلب" : "طلبًا"}
              </title>
              <polygon
                className="shard"
                points={`${x + k},${y} ${x + bw},${y} ${x + bw - k},${H} ${x},${H}`}
                fill={
                  d.count === 0
                    ? "color-mix(in oklab, var(--snow) 16%, transparent)"
                    : `color-mix(in oklab, var(--sky) ${42 + (d.count / max) * 58}%, transparent)`
                }
                style={{ ["--i" as string]: i }}
              />
              {/* هدفُ تمريرٍ بعرض العمود كاملًا — الشظيّة النحيلة يصعب لمسها */}
              <rect
                x={x}
                y={0}
                width={bw + GAP}
                height={H}
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function DeckRing({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label: string;
}) {
  return (
    <div className="text-snow">
      <Ring value={value} total={total} label={label} size={104} />
    </div>
  );
}

/**
 * عدّادٌ تصاعديّ.
 *
 * ⚠️ **الحالة الابتدائية هي القيمة النهائية**، فالخادم يطبع الرقم صحيحًا
 * ويبقى صحيحًا لو لم يُنفَّذ `JS` إطلاقًا. والتصاعد يبدأ في `useEffect` بعد
 * أول رسم — أي أن أسوأ ما يحدث ظهورُ الرقم الصحيح إطارًا قبل أن يتحرّك، لا
 * ظهورُ صفرٍ كاذبٍ ولا فراغ.
 */
function Counter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) {
      setShown(value);
      return;
    }
    ran.current = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value <= 0) return;

    const DURATION = 1100;
    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setShown(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className} dir="ltr">
      {shown}
    </span>
  );
}

/**
 * هل نحن على العميل؟
 *
 * تُضاف أصنافُ الحركة **بعد الترطيب فقط**. لولا ذلك لاختلف `HTML` الخادم
 * عن العميل، ولانطلقت الحركة قبل جاهزية الصفحة فتُقطَّع.
 */
function useLive() {
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  return live;
}
