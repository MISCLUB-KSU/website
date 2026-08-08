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
 * رسوم اللوحة.
 *
 * ── التوقيع ────────────────────────────────────────────────────────────
 * العمود **يُقصّ طرفه بزاوية الشعار**، فيصير متوازيَ أضلاعٍ لا مستطيلًا.
 * هندسةٌ مأخوذة من العلامة نفسها لا من مكتبة رسوم — لا تصلح لمنتجٍ آخر.
 *
 * ⚠️ **والقصّ على الطرف وحده لا على العمود كلّه.** `skewX` على العمود
 * يزيح حافّته العليا عن السفلى بمقدار الارتفاع × tan(20°)، فيختلف طول
 * الأعلى عن الأسفل ويكذب الترميز. أمّا قصُّ الطرف فيُبقي الطول على خطّ
 * الأساس صحيحًا: المقدار يُقرأ من القاعدة، والميلان توقيعٌ على الحافّة.
 *
 * ── قواعد ثابتة ────────────────────────────────────────────────────────
 * · **المحتوى ظاهرٌ افتراضيًّا.** لا شيء يبدأ عند `opacity: 0` بانتظار
 *   حركة: حركةٌ لا تعمل تعني لوحةً فارغة. الحركة على `width` لعمودٍ
 *   موجودٍ أصلًا، ومن طلب تقليل الحركة تصل فورًا.
 * · **كل عمودٍ عليه رقمه**، فالمقدار يُقرأ بلا تحويم — والتحويم زيادة.
 * · لا ظلال، ولا زوايا دائرية، ولا حدود شعرية حول كل شيء.
 */

/* زاوية الشعار من `--mis-slant`. القصّ يزيح الحافّة بمقدار الارتفاع × tan */
const SLANT_TAN = Math.tan((20 * Math.PI) / 180);

type BarProps = {
  /** أجزاء العمود، من الطرف الثابت إلى الطرف المائل */
  parts: readonly { value: number; color: string; label: string }[];
  max: number;
  height: number;
};

/**
 * عمودٌ أفقيّ مكدَّس. ينمو من البداية (اليمين في RTL) نحو النهاية،
 * وطرفه الأمامي وحده مقصوصٌ بزاوية الشعار.
 *
 * القصّ على **الغلاف** لا على كل جزء: لو قُصّ كلُّ جزءٍ وحده لظهرت حافّةٌ
 * مائلة بين كل لونين، فتتقطّع الكتلة وتُقرأ أشلاءً لا عمودًا واحدًا.
 */
function StackedBar({ parts, max, height }: BarProps) {
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
        /* ⚠️ **القصّ على الطرف الأمامي (اليسار هنا) لا المثبَّت.** الأعمدة
           مرساةٌ من اليمين في RTL وتنمو يسارًا، فطرفها الأيسر هو الذي يقول
           «إلى هنا وصل المقدار» — وهو الذي يستحقّ التوقيع. وقصُّ الطرف
           المثبَّت يجعل الميلان واحدًا في كل الأعمدة فلا يقول شيئًا.
           والقياس يبقى صحيحًا: الطول يُقرأ على خطّ الأساس (الحافّة السفلى)
           وهي كاملةٌ لم تُقصّ. */
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
 * الفاصل شرطةٌ مُحاطةٌ بفراغين كما تبنيها `preferences.ts` (`—`)، لا أيّ
 * شرطةٍ في النصّ: اسمٌ فيه شرطةٌ عاديّة لا يُشطر خطأً.
 */
function splitLabel(label: string): [string | null, string] {
  const i = label.indexOf(" — ");
  if (i === -1) return [null, label];
  return [label.slice(0, i), label.slice(i + 3)];
}

/* ── الطلب على اللجان والمشاريع ─────────────────────────────────────── */

export function DemandChart({ rows }: { rows: readonly DemandRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <figure className="m-0">
      <figcaption className="mb-s2 flex flex-wrap items-baseline justify-between gap-x-s5 gap-y-s2">
        <h2 className="font-display text-fg text-lg font-bold">
          الطلب على اللجان والمشاريع
        </h2>
        <Legend
          items={RANK_LABELS.map((label, i) => ({
            label,
            color: RANK_COLORS[i],
          }))}
        />
      </figcaption>
      <p className="text-fg-muted mb-s5 max-w-[62ch] text-[0.84rem] leading-relaxed">
        مرتَّبٌ بعدد من وضعها <strong className="text-fg">رغبةً أولى</strong> لا
        بالمجموع: جهةٌ اختارها عشرون ثالثةً ليست كجهةٍ اختارها عشرة أوّلى.
      </p>

      {/* ⚠️ **التسمية تُقرأ كاملةً ولا تُقصّ.** اسمان مثل «لجنة العلاقات
          العامة والشراكات — وحدة الرعايات» و«… — وحدة الزيارات» يتطابقان
          حرفيًّا بعد القصّ، فيرى القارئ سطرين متماثلين ولا يعرف أيّهما
          وحدته. فاللجنة سطرٌ خافت والوحدة سطرٌ ظاهر: الفرق حيث يُبحث عنه. */}
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
                  <span className="text-fg-muted block truncate text-[0.72rem] leading-tight">
                    {group}
                  </span>
                )}
                <span className="text-fg block text-[0.86rem] leading-snug font-medium">
                  {unit}
                </span>
              </span>
              <span className="flex items-center gap-x-s3">
                <StackedBar
                  height={18}
                  max={max}
                  parts={[
                    { value: r.first, color: RANK_COLORS[0], label: RANK_LABELS[0] },
                    { value: r.second, color: RANK_COLORS[1], label: RANK_LABELS[1] },
                    { value: r.third, color: RANK_COLORS[2], label: RANK_LABELS[2] },
                  ]}
                />
                {/* الرقم على العمود دائمًا: التباين عند أفتح درجةٍ 2.28:1،
                    فالتسمية المباشرة هي الإغاثة التي يوجبها المدقّق. */}
                <span
                  className="text-fg shrink-0 text-[0.82rem] font-semibold tabular-nums"
                  dir="ltr"
                >
                  {r.total}
                </span>
                <span className="text-fg-muted shrink-0 text-[0.75rem] whitespace-nowrap">
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

/* ── شريط الحالة ────────────────────────────────────────────────────── */

export function StatusRibbon({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const parts = STATUSES.map((s) => ({
    value: counts[s.key] ?? 0,
    color: s.color,
    label: s.label,
  })).filter((p) => p.value > 0);

  return (
    <figure className="m-0">
      <h2 className="font-display text-fg mb-s3 text-lg font-bold">
        أين وصلت المراجعة
      </h2>
      {total === 0 ? (
        <p className="text-fg-muted text-sm">لا طلبات بعد.</p>
      ) : (
        <>
          <StackedBar height={26} max={total} parts={parts} />
          {/* قائمةٌ رأسية لا صفٌّ ملتفّ: تملأ عمودها بدل أن تترك فراغًا
              تحتها، ويقف الرقم والنسبة على عمودٍ واحد فتُقارن بالعين. */}
          <ul className="mt-s5 flex flex-col">
            {STATUSES.map((s) => {
              const n = counts[s.key] ?? 0;
              return (
                <li
                  key={s.key}
                  className="border-line flex items-baseline gap-x-s3 border-b py-s3 last:border-b-0"
                >
                  <span
                    aria-hidden
                    className="inline-block h-[11px] w-[15px] shrink-0 translate-y-[1px]"
                    style={{
                      background: s.color,
                      clipPath: "polygon(26% 0, 100% 0, 74% 100%, 0 100%)",
                    }}
                  />
                  <span className="text-fg grow text-[0.86rem] font-medium">
                    {s.label}
                  </span>
                  <span
                    className="text-fg text-[0.95rem] font-semibold tabular-nums"
                    dir="ltr"
                  >
                    {n}
                  </span>
                  <span
                    className="text-fg-muted w-[3.2rem] text-end text-[0.78rem] tabular-nums"
                    dir="ltr"
                  >
                    {total ? `${Math.round((n / total) * 100)}%` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </figure>
  );
}

/* ── وصول الطلبات ───────────────────────────────────────────────────── */

export function ArrivalsChart({ points }: { points: readonly DayPoint[] }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) return null;

  const W = 720;
  const H = 150;
  const PAD = 22;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step =
    points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;

  /* المحور مقلوب: في RTL يبدأ الزمن من اليمين */
  const x = (i: number) => W - PAD - i * step;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const line = points.map((p, i) => `${x(i)},${y(p.count)}`).join(" ");
  const area = `${x(0)},${H - PAD} ${line} ${x(points.length - 1)},${H - PAD}`;
  const active = hover === null ? null : points[hover];

  return (
    <figure className="m-0">
      <div className="mb-s3 flex flex-wrap items-baseline justify-between gap-x-s5">
        <h2 className="font-display text-fg text-lg font-bold">وصول الطلبات</h2>
        <p className="text-fg-muted text-[0.82rem]">
          {active ? (
            <>
              {active.label}:{" "}
              <span className="text-fg font-semibold tabular-nums" dir="ltr">
                {active.count}
              </span>
            </>
          ) : (
            <>الذروة <span dir="ltr" className="tabular-nums">{max}</span> في اليوم</>
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
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* خطّ الأساس وحده — لا شبكةٌ كاملة تُشوّش */}
        <line
          x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD}
          stroke="var(--line)" strokeWidth="1"
        />

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g key={p.day}>
            {hover === i && (
              <line
                x1={x(i)} y1={PAD - 8} x2={x(i)} y2={H - PAD}
                stroke="var(--line-control)" strokeWidth="1"
              />
            )}
            <circle
              cx={x(i)}
              cy={y(p.count)}
              r={hover === i ? 5 : 3}
              fill="var(--primary)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
            {/* هدف التحويم أكبر من العلامة */}
            <rect
              x={x(i) - step / 2} y={0}
              width={Math.max(step, 16)} height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>

      <div className="text-fg-muted mt-s2 flex justify-between text-[0.72rem]">
        <span>{points[points.length - 1]?.label}</span>
        <span>{points[0]?.label}</span>
      </div>
    </figure>
  );
}

/* ── توزيعٌ مضغوط (جامعات · مستويات) ────────────────────────────────── */

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
      <h2 className="font-display text-fg mb-s4 text-lg font-bold">{title}</h2>
      {/* التسمية تلتفّ ولا تُقصّ: «جامعة الإمام محمد بن سعود الإسلامية»
          مقصوصةً تُقرأ «…بن سعود الإ…» فلا تُميَّز عن غيرها. */}
      <ul className="flex flex-col gap-s3">
        {items.map((it) => (
          <li
            key={it.label}
            className="grid grid-cols-[minmax(7rem,13rem)_1fr] items-center gap-x-s4"
          >
            <span className="text-fg text-[0.82rem] leading-snug">
              {it.label}
            </span>
            <span className="flex items-center gap-x-s3">
              <StackedBar
                height={14}
                max={max}
                parts={[
                  { value: it.value, color: "var(--primary)", label: it.label },
                ]}
              />
              <span
                className="text-fg shrink-0 text-[0.82rem] font-semibold tabular-nums"
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
        <li key={i.label} className="flex items-baseline gap-x-s2">
          <span
            aria-hidden
            className="inline-block h-[10px] w-[14px] shrink-0 translate-y-[1px]"
            style={{
              background: i.color,
              clipPath: "polygon(26% 0, 100% 0, 74% 100%, 0 100%)",
            }}
          />
          <span className="text-fg-muted text-[0.8rem]">{i.label}</span>
        </li>
      ))}
    </ul>
  );
}
