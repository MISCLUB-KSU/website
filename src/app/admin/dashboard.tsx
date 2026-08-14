"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { useHydrated } from "@/lib/use-hydrated";
import {
  LEVEL_ORDER,
  STATUSES,
  countBy,
  demand,
  perDay,
  type Row,
} from "./stats";

/**
 * لوحة الشاشة الواحدة.
 *
 * ⚠️ **القيد الحاكم: بلا تمرير.** كل شيءٍ داخل ارتفاع النافذة. ولهذا:
 * · الشبكة `grid` بارتفاعٍ محسوب و`minmax(0,1fr)` في كل صفّ — بدون `minmax`
 *   يتمدّد الصفّ بمحتواه ويدفع ما تحته خارج الشاشة.
 * · كل بطاقة `overflow:hidden` و`min-h-0`، ورسومها `height:100%`.
 * · **جدول الطلبات ليس هنا** — ثلاثون صفًّا لا تدخل شاشةً بلا تمرير، فله
 *   تبويبه. وهذا ما يفعله المرجع نفسه بتبويباته العلوية.
 *
 * ودون ٤٤rem ارتفاعًا يُسمح بالتمرير: ضغطُ الكلّ في شاشةٍ قصيرة يقصّ
 * المحتوى، والقصُّ أسوأ من التمرير.
 */

const CYAN = "var(--d-cyan)";
const RANK = ["var(--deep)", "var(--primary)", "var(--sky)"] as const;

export function Dashboard({ rows }: { rows: readonly Row[] }) {
  const live = useHydrated();

  const m = useMemo(() => {
    const statusCounts = Object.fromEntries(countBy(rows, (r) => r.status));
    const demandRows = demand(rows);
    const levels = countBy(rows, (r) => r.level);
    const unis = [...countBy(rows, (r) => r.university)]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    return {
      total: rows.length,
      decided: (statusCounts.accepted ?? 0) + (statusCounts.rejected ?? 0),
      withCv: rows.filter((r) => r.cv_path).length,
      statusCounts,
      demandRows,
      days: perDay(rows),
      unis,
      levels: LEVEL_ORDER.filter((l) => levels.has(l)).map((label) => ({
        label,
        value: levels.get(label) ?? 0,
      })),
    };
  }, [rows]);

  if (m.total === 0) {
    return (
      <p className="tile items-center justify-center p-s8 text-center opacity-70">
        ما وصل طلبٌ بعد.
      </p>
    );
  }

  return (
    <div
      className={`dash grid min-h-[42rem] gap-s3 lg:h-full lg:min-h-0 lg:grid-cols-12 ${live ? "dash-live" : ""}`}
      style={{ gridTemplateRows: "minmax(0,1.06fr) minmax(0,1fr) minmax(0,0.94fr)" }}
    >
      <Total {...m} />
      <Arrivals days={m.days} />
      <Structure rows={m.demandRows} />
      <TopWanted rows={m.demandRows} />
      <StatusTile counts={m.statusCounts} total={m.total} />
      <Costs rows={m.demandRows} total={m.total} />
      <Levels levels={m.levels} />
      <Universities unis={m.unis} />
    </div>
  );
}

/* ── ١ · الإجمالي — البطاقة الحبريّة ───────────────────────────────────── */

function Total({
  total,
  decided,
  withCv,
  days,
}: {
  total: number;
  decided: number;
  withCv: number;
  days: { count: number }[];
}) {
  return (
    <section className="tile tile-ink col-span-12 p-s5 lg:col-span-3">
      <p className="text-[0.72rem] font-semibold tracking-[0.16em] opacity-70">
        إجمالي الطلبات
      </p>

      <p className="mt-s3 flex items-baseline gap-x-s3">
        <Counter
          value={total}
          className="font-display text-[3.4rem] leading-[0.85] font-bold tabular-nums"
        />
        <span className="text-[0.9rem] font-semibold opacity-70">
          {total === 1 ? "طلب" : "طلبًا"}
        </span>
      </p>

      <Spark days={days} />

      <dl className="mt-auto grid grid-cols-2 gap-s3 pt-s4">
        <MiniStat label="حُسم" value={decided} total={total} tint={CYAN} />
        <MiniStat
          label="بسيرة ذاتية"
          value={withCv}
          total={total}
          tint="var(--sky)"
        />
      </dl>
    </section>
  );
}

function MiniStat({
  label,
  value,
  total,
  tint,
}: {
  label: string;
  value: number;
  total: number;
  tint: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <dt className="text-[0.72rem] opacity-65">{label}</dt>
      <dd className="mt-s1 flex items-baseline gap-x-s2">
        <span dir="ltr" className="text-lg font-bold tabular-nums">
          {value}
        </span>
        <span dir="ltr" className="text-[0.72rem] tabular-nums opacity-65">
          {pct}%
        </span>
      </dd>
      <div className="mt-s2 h-[5px] overflow-hidden rounded-full bg-white/12">
        <span
          className="grow-x block h-full rounded-full"
          style={{ width: `${pct}%`, background: tint }}
        />
      </div>
    </div>
  );
}

/** خطُّ الوصول المصغَّر — نبضةٌ على آخر نقطة */
function Spark({ days }: { days: { count: number }[] }) {
  const W = 240;
  const H = 46;
  if (days.length < 2) return <div className="mt-s4 h-[46px]" />;
  const max = Math.max(...days.map((d) => d.count), 1);
  const pt = (i: number, v: number) => [
    (i / (days.length - 1)) * W,
    H - (v / max) * (H - 6) - 3,
  ];
  const pts = days.map((d, i) => pt(i, d.count));
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-s4 block h-[46px] w-full"
      aria-hidden
    >
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={CYAN} opacity={0.14} />
      <path d={line} fill="none" stroke={CYAN} strokeWidth={2} />
      <circle className="pulse" cx={lx} cy={ly} r={4} fill={CYAN} />
      <circle cx={lx} cy={ly} r={3} fill="var(--snow)" />
    </svg>
  );
}

/* ── ٢ · الوصول يومًا بيوم ──────────────────────────────────────────────── */

function Arrivals({
  days,
}: {
  days: { day: string; label: string; count: number }[];
}) {
  const max = Math.max(...days.map((d) => d.count), 1);
  const peak = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);

  return (
    <section className="tile col-span-12 p-s5 lg:col-span-6">
      <Head title="وصول الطلبات">
        <span className="text-fg-muted text-[0.76rem]">
          الذروة <b dir="ltr" className="text-fg">{peak?.count ?? 0}</b> في{" "}
          {peak?.label}
        </span>
      </Head>

      {/* الأعمدة `flex` لا `svg`: الارتفاع نسبةٌ مئوية فيتبع البطاقة تلقائيًّا */}
      <div className="mt-s4 flex min-h-0 flex-1 items-end gap-[3px]">
        {days.map((d, i) => {
          const h = d.count === 0 ? 2 : Math.max(4, (d.count / max) * 100);
          const isPeak = d.count === max;
          return (
            <div
              key={d.day}
              className="group relative flex h-full flex-1 items-end"
              title={`${d.label} — ${d.count}`}
            >
              <span
                className="grow-y block w-full rounded-t-[4px] transition-[filter] group-hover:brightness-125"
                style={{
                  height: `${h}%`,
                  ["--i" as string]: i,
                  background: isPeak
                    ? CYAN
                    : "color-mix(in oklab, var(--primary) 78%, transparent)",
                  boxShadow: isPeak
                    ? `0 0 18px -2px color-mix(in oklab, ${CYAN} 70%, transparent)`
                    : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="text-fg-muted mt-s2 flex justify-between text-[0.68rem]">
        <span>{days[days.length - 1]?.label}</span>
        <span>{days[0]?.label}</span>
      </div>
    </section>
  );
}

/* ── ٣ · البنية — رادار ─────────────────────────────────────────────────
   ⚠️ الرادار صادقٌ فقط بمحاورَ متجانسة القياس. هنا كلُّ محورٍ «عددُ من
   وضعها رغبةً أولى»، ومقياسُ الجميع واحد — فالشكل مقارنةٌ صحيحة. */
function Structure({
  rows,
}: {
  rows: { label: string; first: number }[];
}) {
  const axes = rows.slice(0, 6);
  const max = Math.max(...axes.map((a) => a.first), 1);
  const R = 78;
  const C = 100;
  const pos = (i: number, k: number) => {
    const a = (i / axes.length) * Math.PI * 2 - Math.PI / 2;
    return [C + Math.cos(a) * R * k, C + Math.sin(a) * R * k];
  };
  const poly = axes
    .map((a, i) => pos(i, a.first / max).join(","))
    .join(" ");

  return (
    <section className="tile col-span-12 p-s5 lg:col-span-3">
      <Head title="البنية" />
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg viewBox="0 0 200 200" className="block h-full w-auto">
          {[0.34, 0.67, 1].map((k, ring) => (
            <polygon
              key={k}
              points={axes.map((_, i) => pos(i, k).join(",")).join(" ")}
              fill="none"
              stroke="var(--line)"
              strokeWidth={ring === 2 ? 1.2 : 0.8}
            />
          ))}
          {axes.map((a, i) => {
            const [x, y] = pos(i, 1);
            return (
              <line
                key={a.label}
                x1={C}
                y1={C}
                x2={x}
                y2={y}
                stroke="var(--line)"
                strokeWidth={0.8}
              />
            );
          })}
          <polygon
            points={poly}
            fill={CYAN}
            fillOpacity={0.24}
            stroke={CYAN}
            strokeWidth={2}
            style={{ filter: `drop-shadow(0 0 8px color-mix(in oklab, ${CYAN} 60%, transparent))` }}
          />
          {axes.map((a, i) => {
            const [x, y] = pos(i, a.first / max);
            return <circle key={a.label} cx={x} cy={y} r={3.2} fill={CYAN} />;
          })}
        </svg>
      </div>

      {/* التسميات نصًّا تحت الرسم: `SVG` لا يلفّ، والأسماء عربيةٌ طويلة */}
      <ul className="text-fg-muted mt-s3 grid grid-cols-2 gap-x-s3 gap-y-s1 text-[0.66rem] leading-tight">
        {axes.map((a, i) => (
          <li key={a.label} className="fade-up flex gap-x-s1" style={{ ["--i" as string]: i }}>
            <b dir="ltr" className="text-fg tabular-nums">{a.first}</b>
            <span className="truncate">{leaf(a.label)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── ٤ · الأعلى طلبًا ───────────────────────────────────────────────────── */

function TopWanted({
  rows,
}: {
  rows: { label: string; first: number; total: number }[];
}) {
  const top = rows.slice(0, 5);
  const max = Math.max(...top.map((r) => r.total), 1);
  return (
    <section className="tile col-span-12 p-s5 lg:col-span-3">
      {/* ⚠️ **الشرح في الترويسة لا في الذيل.** كان فقرةً أسفل البطاقة،
          فحين ضاق الارتفاع لم تتقلّص عناصرُ القائمة (ارتفاعها ذاتيّ) بل
          فاضت من صندوقها وركبت على الشرح — رأته الإدارة في شاشته العريضة.
          ورفعُه يحرّر ~٥٦px، و`overflow-y-auto` سدٌّ أخير: يُمرَّر ولا
          يُقصّ ولا يركب. */}
      <Head title="الأعلى طلبًا">
        <span className="text-fg-muted text-[0.7rem]">
          المصمت رغبةٌ أولى · الفاتح ثانيةً وثالثة
        </span>
      </Head>
      <ul className="mt-s3 flex min-h-0 flex-1 flex-col justify-between gap-y-s2 overflow-y-auto">
        {top.map((r, i) => (
          <li key={r.label} className="fade-up" style={{ ["--i" as string]: i }}>
            <div className="flex items-baseline justify-between gap-x-s2">
              <span className="truncate text-[0.76rem] font-medium">
                {leaf(r.label)}
              </span>
              <span dir="ltr" className="text-fg-muted shrink-0 text-[0.72rem] tabular-nums">
                {r.first}/{r.total}
              </span>
            </div>
            <div className="mt-s1 flex h-[7px] overflow-hidden rounded-full bg-bg-sunken">
              <span
                className="grow-x block h-full"
                style={{
                  width: `${(r.first / max) * 100}%`,
                  ["--i" as string]: i,
                  /* ⚠️ لونٌ مصمت لا تدرّج: `linear-gradient(90deg)` زاويةٌ
                     مطلقة لا تنقلب مع `RTL`، فيبدأ الغامق من اليسار
                     ويعاكس اتّجاه امتلاء الشريط. */
                  background: "var(--primary)",
                }}
              />
              <span
                className="grow-x block h-full opacity-45"
                style={{
                  width: `${((r.total - r.first) / max) * 100}%`,
                  ["--i" as string]: i,
                  background: "color-mix(in oklab, var(--sky) 55%, transparent)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── ٥ · الحالة ─────────────────────────────────────────────────────────── */

function StatusTile({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  return (
    /* ⚠️ **لا `flex-row` على `.tile`.** الصنف في `dash.css` يفرض
       `flex-direction: column` بنفس الأولوية، ويغلبه ترتيبُ التحميل —
       فبقيت البطاقة عمودًا وفاضت ٤٤px تُقصّ صامتةً تحت `overflow:hidden`.
       والصفُّ هنا في غلافٍ داخليّ فلا يتعلّق بترتيب ملفّات الأنماط. */
    <section className="tile col-span-12 p-s5 lg:col-span-6">
      <Head title="أين وصلت المراجعة" />

      <div className="mt-s3 flex min-h-0 flex-1 items-center gap-x-s5">
        <Donut
          slices={STATUSES.map((s) => ({
            key: s.key,
            label: s.label,
            value: counts[s.key] ?? 0,
            color: s.color,
          }))}
          center={total}
          caption="طلبًا"
        />

        <ul className="flex min-h-0 flex-1 flex-col justify-around gap-y-s2">
          {STATUSES.map((s, i) => {
            const v = counts[s.key] ?? 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <li
                key={s.key}
                className="fade-up flex items-center gap-x-s3"
                style={{ ["--i" as string]: i }}
              >
                <span
                  aria-hidden
                  className="size-[10px] shrink-0 rounded-full"
                  style={{
                    background: s.color,
                    boxShadow: `0 0 10px -1px color-mix(in oklab, ${s.color} 80%, transparent)`,
                  }}
                />
                <span className="w-[6.5rem] shrink-0 truncate text-[0.8rem] font-medium">
                  {s.label}
                </span>
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-bg-sunken">
                  <span
                    className="grow-x block h-full rounded-full"
                    style={{ width: `${pct}%`, background: s.color, ["--i" as string]: i }}
                  />
                </span>
                <span dir="ltr" className="w-[2.6rem] shrink-0 text-end text-[0.78rem] font-bold tabular-nums">
                  {v}
                </span>
                <span dir="ltr" className="text-fg-muted w-[2.4rem] shrink-0 text-end text-[0.72rem] tabular-nums">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ── ٦ · التوزيع على الجهات ─────────────────────────────────────────────── */

/**
 * ⚠️ **الرغبة الأولى وحدها، لا الرغبات الثلاث.**
 *
 * أول بناءٍ جمع الثلاث: صار مجموع القطع **٩٠** ومركزُ الدونات يقول **٣٠** —
 * حلقةٌ تُقرأ نسبًا من كلٍّ لا يساوي رقمها الوسطيّ، وهذا تضليلٌ لا خيارُ
 * عرض. ومع ذلك ابتلعت «أخرى» ٦٤٪ لأن سبعةَ عشرَ جهةً على خمس قطع.
 *
 * وبالرغبة الأولى: المجموع ٣٠ = المركز، و«أخرى» تنكمش، والرقم هو الذي
 * يُتّخذ به القرار أصلًا.
 */
function Costs({
  rows,
  total,
}: {
  rows: { label: string; first: number }[];
  total: number;
}) {
  const ranked = [...rows].filter((r) => r.first > 0).sort((a, b) => b.first - a.first);
  const top = ranked.slice(0, 6);
  const rest = ranked.slice(6).reduce((a, b) => a + b.first, 0);
  const slices = [
    ...top.map((r, i) => ({
      key: r.label,
      label: leaf(r.label),
      value: r.first,
      /* ⚠️ **لا `--color-success` هنا.** ألوان الحالة الثلاثة محجوزةٌ
         لدلالتها (مقبول/مراجعة/معتذَر)؛ واستعمالها «للقطعة الخامسة» يجعل
         الأخضر يعني شيئًا في حلقةٍ وشيئًا آخر في جارتها. */
      color:
        i < 3
          ? RANK[i]
          : i === 3
            ? CYAN
            : i === 4
              ? "color-mix(in oklab, var(--deep) 55%, var(--sky))"
              : "var(--ink-quiet)",
    })),
    ...(rest > 0
      ? [{ key: "أخرى", label: "بقيّة الجهات", value: rest, color: "var(--line)" }]
      : []),
  ];
  const sum = slices.reduce((a, b) => a + b.value, 0);

  return (
    <section className="tile col-span-12 p-s5 lg:col-span-3 lg:row-span-2">
      <Head title="الرغبة الأولى">
        <span className="text-fg-muted text-[0.74rem]">توزيع الطلبات</span>
      </Head>

      <div className="flex min-h-0 flex-1 items-center justify-center py-s3">
        <Donut slices={slices} center={total} caption="طلبًا" />
      </div>

      <ul className="flex flex-col gap-y-s2">
        {slices.map((s, i) => (
          <li
            key={s.key}
            className="fade-up flex items-center gap-x-s2 text-[0.74rem]"
            style={{ ["--i" as string]: i }}
          >
            <span
              aria-hidden
              className="size-[9px] shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span dir="ltr" className="text-fg-muted tabular-nums">
              {sum ? Math.round((s.value / sum) * 100) : 0}%
            </span>
            <span dir="ltr" className="w-[1.6rem] text-end font-bold tabular-nums">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── ٧ · السنة الدراسية ─────────────────────────────────────────────────── */

function Levels({ levels }: { levels: { label: string; value: number }[] }) {
  const max = Math.max(...levels.map((l) => l.value), 1);
  return (
    <section className="tile col-span-12 p-s5 lg:col-span-6">
      <Head title="السنة الدراسية" />
      <div className="mt-s4 flex min-h-0 flex-1 items-end gap-x-s4">
        {levels.map((l, i) => (
          /* ⚠️ **التسمية والرقم `shrink-0`.** قِسناهما فوجدنا صندوقًا
             ارتفاعه ١٠px حول سطرٍ ١٦px — `flex` ضغطهما ليُفسح للعمود،
             و`truncate` يحمل `overflow:hidden` فقُصّ أعلى الحروف صامتًا.
             والمرن هو **منطقة العمود** وحدها. */
          <div key={l.label} className="flex h-full min-w-0 flex-1 flex-col">
            <span
              dir="ltr"
              className="mb-s1 shrink-0 text-center text-[0.8rem] font-bold tabular-nums"
            >
              {l.value}
            </span>
            <span className="flex min-h-0 flex-1 items-end">
              <span
                className="grow-y block w-full rounded-t-[6px]"
                style={{
                  height: `${(l.value / max) * 100}%`,
                  ["--i" as string]: i,
                  background: `linear-gradient(180deg, ${CYAN}, var(--primary))`,
                  boxShadow: `0 -6px 20px -8px color-mix(in oklab, ${CYAN} 70%, transparent)`,
                }}
              />
            </span>
            <span className="text-fg-muted mt-s2 shrink-0 truncate text-center text-[0.68rem] leading-normal">
              {l.label.replace("السنة ", "")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── ٨ · الجامعات ───────────────────────────────────────────────────────── */

function Universities({ unis }: { unis: { label: string; value: number }[] }) {
  const top = unis.slice(0, 5);
  const max = Math.max(...top.map((u) => u.value), 1);
  return (
    <section className="tile col-span-12 p-s5 lg:col-span-3">
      <Head title="الجامعات">
        <span className="text-fg-muted text-[0.74rem]">
          <b dir="ltr" className="text-fg">{unis.length}</b>
        </span>
      </Head>
      {/* ⚠️ `justify-between` لا `justify-around`، و`leading-tight`:
          خمسةُ صفوفٍ بارتفاعها الطبيعي (١٤٤px) تفيض عن ١٣٧px المتاحة عند
          شاشةٍ ارتفاعها ٨٠٠. والضغطُ أولى من حذف جامعةٍ من القائمة. */}
      <ul className="mt-s3 flex min-h-0 flex-1 flex-col justify-between gap-y-s2 overflow-y-auto py-s1">
        {top.map((u, i) => (
          <li key={u.label} className="fade-up" style={{ ["--i" as string]: i }}>
            <div className="flex items-baseline justify-between gap-x-s2 leading-tight">
              <span className="truncate text-[0.74rem]">{u.label}</span>
              <span dir="ltr" className="shrink-0 text-[0.76rem] font-bold tabular-nums">
                {u.value}
              </span>
            </div>
            <div className="mt-s1 h-[6px] overflow-hidden rounded-full bg-bg-sunken">
              <span
                className="grow-x block h-full rounded-full"
                style={{
                  width: `${(u.value / max) * 100}%`,
                  ["--i" as string]: i,
                  background: i === 0 ? CYAN : "var(--primary)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── قطعٌ مشتركة ────────────────────────────────────────────────────────── */

function Head({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-baseline justify-between gap-x-s3">
      <h2 className="font-display text-fg text-[0.95rem] font-bold">{title}</h2>
      {children}
    </div>
  );
}

/**
 * دونات.
 *
 * ⚠️ القِطعُ **أقواسٌ محدودة** لا شرائح مملوءة، وبينها فجوةُ درجتين — فبلا
 * فجوةٍ تتلاصق نغمتان متقاربتان فتُقرآن قطعةً واحدة.
 */
function Donut({
  slices,
  center,
  caption,
  size = 132,
}: {
  slices: readonly { key: string; label: string; value: number; color: string }[];
  center: number;
  caption: string;
  size?: number;
}) {
  const id = useId();
  const sum = slices.reduce((a, b) => a + b.value, 0) || 1;
  const stroke = 15;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  /* ⚠️ **الإزاحاتُ تُحسب قبل الرسم لا داخل `map`.** كان مجمِّعٌ (`let acc`)
     يُزاد داخل ردّ نداء `map` — أي تعديلٌ أثناء الرسم عبر إغلاقة. يعمل ما
     دام الرسم مرّةً واحدة متتابعة، ويكسر متى قاطعت React الرسمَ أو
     استأنفته، فتُرسم القطعُ فوق بعضها. والحساب هنا خالصٌ لا يعتمد على
     ترتيب تنفيذ الرسم — ولا يشمل القطعَ الصفريّة فلا تزيح ما بعدها. */
  const arcs = slices.map((slice, i) => {
    const before = slices.slice(0, i).reduce((a, s) => a + s.value, 0);
    return {
      slice,
      i,
      len: Math.max(0, (slice.value / sum) * circ - 3),
      off: (before / sum) * circ,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="block h-auto max-h-full w-full max-w-[132px] shrink-0"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>
        {slices.map((s) => `${s.label}: ${s.value}`).join("، ")}
      </title>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--bg-sunken)"
        strokeWidth={stroke}
      />
      {arcs.map(({ slice: s, i, len, off }) => {
        if (s.value === 0) return null;
        return (
          <circle
            key={s.key}
            className="draw"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ ["--i" as string]: i, ["--len" as string]: circ }}
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2 - 5}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-fg text-[1.35rem] font-bold"
        direction="ltr"
      >
        {center}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 15}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-fg-muted text-[0.62rem]"
      >
        {caption}
      </text>
    </svg>
  );
}

/** الاسم بعد الشرطة — «لجنة كذا — وحدة كيت» تصير «وحدة كيت» */
function leaf(label: string) {
  const i = label.indexOf("—");
  return i > 0 ? label.slice(i + 1).trim() : label;
}

/** انظر `command-deck.tsx`: القيمة النهائية هي الحالة الابتدائية */
function Counter({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  /* ⚠️ **`set-state-in-effect` مُسكَتٌ هنا بحقّ.** القاعدة تمنع ضبطَ حالةٍ
     داخل أثرٍ لأنه يسلسل رسمًا بعد رسم — وهذا **بالضبط** ما يفعله عدّادٌ
     يتصاعد: إطارٌ بعد إطار عبر `requestAnimationFrame`. وليس هنا قيمةٌ
     مشتقّةٌ تُحسب في الرسم؛ القيمةُ زمنيّة. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    let raf = 0;
    let t0 = 0;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / 1000, 1);
      setShown(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    setShown(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span dir="ltr" className={className}>
      {shown}
    </span>
  );
}
