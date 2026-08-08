"use client";

import { useId, useState } from "react";

import {
  RANK_COLORS,
  RANK_LABELS,
  STATUSES,
  type DayPoint,
  type DemandRow,
} from "./stats";

/**
 * رسوم اللوحة — بالشكل الزجاجيّ المطلوب.
 *
 * ⚠️ الشكل (زوايا دائرية · تدرّجات · بنفسجيّ) قرارٌ صريح من حسام يخالف
 * دليل الهوية — السبب والحدود في رأس `admin.css`.
 *
 * ── وما لا يتغيّر مهما تغيّر الشكل ────────────────────────────────────────
 * · **المحتوى ظاهرٌ افتراضيًّا.** لا شيء يبدأ عند `opacity: 0` بانتظار حركة:
 *   حركةٌ لا تعمل تعني لوحةً فارغة.
 * · **كل مقدارٍ عليه رقمه** — فلا يعتمد الفهم على تحويمٍ أو تمييزِ لون.
 * · **كل حالةٍ تحمل اسمها نصًّا**: الأخضر والأحمر لا يفترقان لعمى الألوان
 *   (قِيس: ΔE 8.2 بروتان بعد إعادة الترتيب، وكان 7.2 قبلها)، فاللون
 *   ثانويٌّ لا وحيد.
 * · الطول يُقرأ على خطّ الأساس: التدوير على الطرفين وحده ولا يمسّ الطول.
 */

/* زاوية الشعار — `--mis-slant` في `globals.css` */
const SLANT_TAN = Math.tan((20 * Math.PI) / 180);

type Part = { value: number; color: string; label: string };

/** عمودٌ أفقيّ مكدَّس بأطرافٍ مدوّرة، ينمو من البداية (اليمين في RTL). */
function StackedBar({
  parts,
  max,
  height,
}: {
  parts: readonly Part[];
  max: number;
  height: number;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (max <= 0 || total <= 0) return <span style={{ height }} />;

  const cut = height * SLANT_TAN;

  return (
    <span
      className="flex"
      style={{
        height,
        width: `${(total / max) * 100}%`,
        minWidth: cut * 2,
        /* ⚠️ **القصّ على الطرف الأمامي (اليسار في RTL) لا المثبَّت.** الأعمدة
           مرساةٌ من اليمين وتنمو يسارًا، فطرفها الأيسر هو الذي يقول «إلى هنا
           وصل المقدار» — وهو الذي يستحقّ التوقيع. والقياس يبقى صحيحًا:
           الطول يُقرأ على خطّ الأساس وهو كاملٌ لم يُقصّ. */
        clipPath: `polygon(${cut}px 0, 100% 0, 100% 100%, 0 100%)`,
      }}
    >
      {parts.map((p, i) =>
        p.value > 0 ? (
          <span
            key={p.label}
            className="h-full transition-[filter] duration-150 hover:brightness-110"
            style={{
              width: `${(p.value / total) * 100}%`,
              background: p.color,
              /* فاصلٌ 2px بلون السطح بين الأجزاء — لا حدّ ولا خطّ */
              marginInlineEnd: i < parts.length - 1 ? 2 : 0,
            }}
            title={`${p.label}: ${p.value}`}
          />
        ) : null,
      )}
    </span>
  );
}

/**
 * يفصل «اللجنة — الوحدة» إلى سطرين. المشاريع بلا شرطة فتبقى سطرًا واحدًا.
 * الفاصل شرطةٌ مُحاطةٌ بفراغين كما تبنيها `preferences.ts`، لا أيّ شرطة:
 * اسمٌ فيه شرطةٌ عاديّة لا يُشطر خطأً.
 */
function splitLabel(label: string): [string | null, string] {
  const i = label.indexOf(" — ");
  if (i === -1) return [null, label];
  return [label.slice(0, i), label.slice(i + 3)];
}

/* ── الحلقة المئوية ─────────────────────────────────────────────────────
   ⚠️ **الرقم في مركز الحلقة رياضيًّا لا بالعين.** `text-anchor: middle`
   يوسّط أفقيًّا وحده؛ الرأسيّ يحتاج `dominant-baseline: central` — وبدونه
   يطفو الرقم أعلى مركزه وهو أشهر خطأ في هذي الحلقات. */
export function Ring({
  value,
  total,
  label,
  size = 116,
}: {
  value: number;
  total: number;
  label: string;
  size?: number;
}) {
  const id = useId();
  const pct = total > 0 ? value / total : 0;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <figure className="m-0 flex items-center gap-x-s4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${Math.round(pct * 100)}٪`}
        className="shrink-0"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--sky)" />
            <stop offset="55%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--deep)" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="ring-track"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
          />
        </g>
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          direction="ltr"
          className="fill-current text-[1.35rem] font-bold tabular-nums"
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <figcaption className="text-[0.86rem] leading-snug">
        <span className="block font-semibold">{label}</span>
        <span className="opacity-70">
          <span dir="ltr" className="tabular-nums">
            {value}
          </span>{" "}
          من{" "}
          <span dir="ltr" className="tabular-nums">
            {total}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/* ── الطلب على اللجان والمشاريع ─────────────────────────────────────── */

export function DemandChart({ rows }: { rows: readonly DemandRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <figure className="m-0">
      <figcaption className="mb-s2 flex flex-wrap items-baseline justify-between gap-x-s5 gap-y-s2">
        <h2 className="font-display text-lg font-bold">
          الطلب على اللجان والمشاريع
        </h2>
        <Legend
          items={RANK_LABELS.map((label, i) => ({
            label,
            color: RANK_COLORS[i],
          }))}
        />
      </figcaption>
      <p className="mb-s5 max-w-[62ch] text-[0.84rem] leading-relaxed opacity-70">
        مرتَّبٌ بعدد من وضعها <strong className="opacity-100">رغبةً أولى</strong>{" "}
        لا بالمجموع: جهةٌ اختارها عشرون ثالثةً ليست كجهةٍ اختارها عشرة أوّلى.
      </p>

      {/* ⚠️ التسمية تُقرأ كاملةً: اسمان مثل «… — وحدة الرعايات» و«… — وحدة
          الزيارات» يتطابقان بعد القصّ فلا يُعرف أيّهما. فاللجنة سطرٌ خافت
          والوحدة سطرٌ ظاهر — الفرق حيث يُبحث عنه. */}
      <ul className="flex flex-col gap-s4">
        {rows.map((r) => {
          const [group, unit] = splitLabel(r.label);
          return (
            <li
              key={r.value}
              className="grid grid-cols-[minmax(9rem,15rem)_1fr] items-center gap-x-s4"
            >
              <span className="min-w-0">
                {group && (
                  <span className="block truncate text-[0.72rem] leading-tight opacity-60">
                    {group}
                  </span>
                )}
                <span className="block text-[0.86rem] leading-snug font-medium">
                  {unit}
                </span>
              </span>
              <span className="flex items-center gap-x-s3">
                <StackedBar
                  height={14}
                  max={max}
                  parts={[
                    { value: r.first, color: RANK_COLORS[0], label: RANK_LABELS[0] },
                    { value: r.second, color: RANK_COLORS[1], label: RANK_LABELS[1] },
                    { value: r.third, color: RANK_COLORS[2], label: RANK_LABELS[2] },
                  ]}
                />
                <span
                  className="shrink-0 text-[0.82rem] font-semibold tabular-nums"
                  dir="ltr"
                >
                  {r.total}
                </span>
                <span className="shrink-0 text-[0.75rem] whitespace-nowrap opacity-60">
                  منها <span dir="ltr">{r.first}</span> أولى
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/* ── حالة المراجعة ──────────────────────────────────────────────────── */

export function StatusList({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  return (
    <ul className="flex flex-col gap-s3">
      {STATUSES.map((s) => {
        const n = counts[s.key] ?? 0;
        return (
          <li
            key={s.key}
            className="border-line flex items-center gap-x-s3 border-b py-s3 last:border-b-0"
          >
            {/* ⚠️ علامةٌ مستقلّة لا `border-inline-start`: الحدّ يتبع الزاوية
                الدائرية فينحني طرفاه ويُقرأ قوسًا شاردًا لا حافّةً مقصودة. */}
            <span
              aria-hidden
              className="slant-mark h-6 w-[9px] shrink-0"
              style={{ background: s.color }}
            />
            <span className="grow text-[0.88rem] font-medium">{s.label}</span>
            <span className="text-[1rem] font-bold tabular-nums" dir="ltr">
              {n}
            </span>
            <span
              className="tag"
              style={{
                background: `color-mix(in oklab, ${s.color} 14%, transparent)`,
                borderColor: `color-mix(in oklab, ${s.color} 30%, transparent)`,
                color: s.color,
              }}
              dir="ltr"
            >
              {total ? `${Math.round((n / total) * 100)}%` : "0%"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ── وصول الطلبات ───────────────────────────────────────────────────── */

export function ArrivalsChart({ points }: { points: readonly DayPoint[] }) {
  const fillId = useId();
  const lineId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) return null;

  const W = 720;
  const H = 190;
  const PAD = 26;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;

  /* المحور مقلوب: في RTL يبدأ الزمن من اليمين */
  const x = (i: number) => W - PAD - i * step;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  /* منحنًى ناعم بمنتصفاتٍ بين النقاط — لا خطوطٌ مكسورة كما في المرجع */
  const pts = points.map((p, i) => [x(i), y(p.count)] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    d += ` C ${(px + cx) / 2} ${py}, ${(px + cx) / 2} ${cy}, ${cx} ${cy}`;
  }
  const areaD = `${d} L ${pts[pts.length - 1][0]} ${H - PAD} L ${pts[0][0]} ${H - PAD} Z`;
  const active = hover === null ? null : points[hover];

  return (
    <figure className="m-0">
      <div className="mb-s4 flex flex-wrap items-baseline justify-between gap-x-s5">
        <h2 className="font-display text-lg font-bold">وصول الطلبات</h2>
        <p className="text-[0.84rem] opacity-75">
          {active ? (
            <>
              {active.label}:{" "}
              <span className="font-bold tabular-nums opacity-100" dir="ltr">
                {active.count}
              </span>
            </>
          ) : (
            <>
              الذروة{" "}
              <span dir="ltr" className="font-bold tabular-nums">
                {max}
              </span>{" "}
              في اليوم
            </>
          )}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`وصول الطلبات على ${points.length} يومًا، الذروة ${max}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--deep)" stopOpacity="0.38" />
            <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--sky)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={lineId} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--sky)" />
            <stop offset="50%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--deep)" />
          </linearGradient>
        </defs>

        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--line)"
          strokeWidth="1"
        />

        <path d={areaD} fill={`url(#${fillId})`} />
        <path
          d={d}
          fill="none"
          stroke={`url(#${lineId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.day}>
            {hover === i && (
              <line
                x1={x(i)}
                y1={PAD - 10}
                x2={x(i)}
                y2={H - PAD}
                stroke="var(--primary)"
                strokeOpacity="0.5"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
            <circle
              cx={x(i)}
              cy={y(p.count)}
              r={hover === i ? 6 : 3.5}
              fill="var(--bg-raised)"
              stroke="var(--primary)"
              strokeWidth={hover === i ? 3 : 2}
            />
            {/* هدف التحويم أكبر من العلامة */}
            <rect
              x={x(i) - step / 2}
              y={0}
              width={Math.max(step, 16)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>

      <div className="mt-s2 flex justify-between text-[0.72rem] opacity-60">
        <span>{points[points.length - 1]?.label}</span>
        <span>{points[0]?.label}</span>
      </div>
    </figure>
  );
}

/* ── توزيعٌ مضغوط ───────────────────────────────────────────────────── */

export function Distribution({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; value: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="m-0">
      <h2 className="font-display mb-s4 text-lg font-bold">{title}</h2>
      {/* التسمية تلتفّ ولا تُقصّ: «جامعة الإمام محمد بن سعود الإسلامية»
          مقصوصةً تُقرأ «…بن سعود الإ…» فلا تُميَّز عن غيرها. */}
      <ul className="flex flex-col gap-s3">
        {items.map((it) => (
          <li
            key={it.label}
            className="grid grid-cols-[minmax(7rem,13rem)_1fr] items-center gap-x-s4"
          >
            <span className="text-[0.82rem] leading-snug">{it.label}</span>
            <span className="flex items-center gap-x-s3">
              <StackedBar
                height={10}
                max={max}
                parts={[
                  {
                    value: it.value,
                    color:
                      "var(--primary)",
                    label: it.label,
                  },
                ]}
              />
              <span
                className="shrink-0 text-[0.82rem] font-semibold tabular-nums"
                dir="ltr"
              >
                {it.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ── وسيلة الإيضاح ──────────────────────────────────────────────────── */

function Legend({
  items,
}: {
  items: readonly { label: string; color: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-s5 gap-y-s2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-x-s2">
          <span
            aria-hidden
            className="slant-mark inline-block h-[11px] w-[15px] shrink-0"
            style={{ background: i.color }}
          />
          <span className="text-[0.8rem] opacity-70">{i.label}</span>
        </li>
      ))}
    </ul>
  );
}
