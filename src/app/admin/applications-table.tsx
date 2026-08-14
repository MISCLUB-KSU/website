"use client";

import { useMemo, useState, useTransition } from "react";

import { findPreference, questionBlocks } from "@/content/preferences";
import {
  answerName,
  splitAnswer,
  type QuestionType,
} from "@/content/questions";
import { isolateLatin } from "@/lib/bidi";
import { useHydrated } from "@/lib/use-hydrated";
import { notifyDecision, setStatus } from "./actions";
import { STATUSES, openOnly, type Row } from "./stats";

/**
 * الحالاتُ التي يُراسَل عليها الطالب — نسخةُ العميل من `NOTIFIABLE`.
 *
 * ⚠️ **لا يُستورَد من `email/templates.ts`:** ذاك ملفٌّ `server-only`
 * ويجرّ معه عميلَ Resend إلى حزمة المتصفّح — أو يكسر البناء.
 */
const NOTIFIABLE_STATUSES: readonly string[] = [
  "accepted",
  "rejected",
  "referred",
];

/**
 * الطلبات — **ملفُّ مراجعةٍ لا قائمة**.
 *
 * القائمة تُخبرك أن ثلاثين طلبًا وصلت؛ والمراجعة تحتاج أن ترى **متقدّمًا
 * واحدًا كاملًا** في لحظة: رغباته مرتّبةً بأوزانها، ودافعه، وما أرفقه، وأين
 * وصل ملفّه. فالشاشة مقسومة: الأسماء يمينًا وملفُّ المختار يسارًا.
 *
 * ⚠️ **بلا تمريرٍ للصفحة.** التمرير داخل العمودين وحدهما، فيبقى شريط
 * الأدوات وبطاقات الأرقام ثابتةً مهما طالت القائمة.
 *
 * ── ما لم يتغيّر ────────────────────────────────────────────────────────
 * · تغييرُ الحالة يمرّ بعميل الجلسة فتحكمه `RLS`.
 * · كلُّ حالةٍ تحمل اسمها نصًّا — اللون ثانويّ.
 * · لا حقلَ يُخفى: الدافع والأجوبة والروابط والهوية كلُّها معروضة.
 */

type Props = { rows: readonly Row[] };

const SORTS = [
  { key: "newest", label: "الأحدث" },
  { key: "oldest", label: "الأقدم" },
  { key: "name", label: "الاسم" },
  { key: "full", label: "الأكمل ملفًّا" },
] as const;

/**
 * شارات الرغبات الثلاث.
 *
 * ⚠️ **لكلِّ شارةٍ لونُ حبرها معها — ولا يُفترض الثلجيّ للجميع.** كان
 * النصُّ ثلجيًّا على الثلاث، فوقع على السماويّ بنسبة **2.23:1** مقيسة:
 * السماويُّ لونٌ **فاتح** لا يحمل نصًّا أبيض. والكحليُّ عليه 5.84:1.
 * (الأولى 12.80:1 والثانية 7.71:1 — كلُّها مقيسةٌ لا مقدَّرة.)
 */
const RANK_META = [
  { label: "رغبة أولى", color: "var(--deep)", ink: "var(--snow)" },
  { label: "رغبة ثانية", color: "var(--primary)", ink: "var(--snow)" },
  { label: "رغبة ثالثة", color: "var(--sky)", ink: "var(--deep)" },
] as const;

/** كم متقدّمًا يزاحم على كل جهة — يُحسب مرّةً لكل الصفوف */
type Competition = Map<string, number>;

function competitionOf(rows: readonly Row[]): Competition {
  const m: Competition = new Map();
  /* ⚠️ المزاحمة **على المفاضلين وحدهم**: من دخل برابطٍ مباشر لم يزاحم
     أحدًا على شيء، ما عُرض عليه بديلٌ أصلًا. */
  for (const r of openOnly(rows))
    for (const c of [r.choice1, r.choice2, r.choice3])
      if (c) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

/* ── اكتمال الملفّ ──────────────────────────────────────────────────────
   ⚠️ **مقياسٌ معلَنُ البنود لا درجةٌ غامضة.** يُحسب على ما **ينطبق** فقط:
   من لم يُسأل سؤالًا لا يُخصم لعدم إجابته. والبنود تُعرض للمراجع نصًّا في
   بطاقةٍ مستقلّة حتى لا يكون الرقم صندوقًا أسود يُحكم به على متقدّم. */
const WHY_ENOUGH = 120;

type Item = { label: string; ok: boolean; weight: number };

function completeness(row: Row): { items: Item[]; pct: number } {
  const asked = askedQuestions(row);
  const items: Item[] = [
    { label: "سيرة ذاتية", ok: !!row.cv_path, weight: 30 },
    {
      label: `دافعٌ مفصَّل (${WHY_ENOUGH}+ حرفًا)`,
      ok: (row.why ?? "").trim().length >= WHY_ENOUGH,
      weight: 25,
    },
    { label: "معرض أعمال", ok: !!row.portfolio, weight: 15 },
    { label: "لينكدإن", ok: !!row.linkedin, weight: 10 },
  ];
  /* ⚠️ **المطلوبةُ وحدها تُحسب.** السؤال الاختياريُّ يُخزَّن بقيمةٍ فارغة
     لمن تركه، فحسبُ الجميع كان يهبط بدرجة كل من لم يملأ حقلًا لم يُطلب
     منه — وهو نقضُ قاعدة «من لم يُسأل لا يُخصم» المكتوبة أعلاه. */
  const requiredAsked = asked.filter((a) => a.required);
  if (requiredAsked.length > 0) {
    items.push({
      label: "أجوبة القادة",
      ok: requiredAsked.every((a) => a.value.trim().length > 0),
      weight: 20,
    });
  }
  const max = items.reduce((a, b) => a + b.weight, 0);
  const got = items.reduce((a, b) => a + (b.ok ? b.weight : 0), 0);
  return { items, pct: max ? Math.round((got / max) * 100) : 0 };
}

/* ── الجذر ──────────────────────────────────────────────────────────────── */

export function ApplicationsTable({ rows }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("newest");
  const [picked, setPicked] = useState<string | null>(null);
  const live = useHydrated();

  const scored = useMemo(
    () => rows.map((r) => ({ row: r, ...completeness(r) })),
    [rows],
  );

  const rivalry = useMemo(() => competitionOf(rows), [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = scored.filter(({ row: r }) => {
      if (status !== "all" && r.status !== status) return false;
      if (!needle) return true;
      return [
        r.full_name,
        r.student_id,
        r.email,
        r.phone,
        r.university,
        r.major,
        prefName(r.choice1),
        prefName(r.choice2),
        prefName(r.choice3),
      ].some((f) => (f ?? "").toLowerCase().includes(needle));
    });
    const s = [...out];
    if (sort === "oldest") s.reverse();
    else if (sort === "name")
      s.sort((a, b) => a.row.full_name.localeCompare(b.row.full_name, "ar"));
    else if (sort === "full") s.sort((a, b) => b.pct - a.pct);
    return s;
  }, [scored, q, status, sort]);

  /* ⚠️ المختارُ **يتبع ما يُعرض**: لو أخفاه الترشيح انتقل الاختيار لأول
     ظاهر. ولولا ذلك لبقي الملفّ يعرض متقدّمًا غائبًا عن القائمة. */
  const current = shown.find((s) => s.row.id === picked) ?? shown[0] ?? null;

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [rows]);

  const kpis = useMemo(
    () => ({
      waiting: (counts.new ?? 0) + (counts.reviewing ?? 0),
      decided: (counts.accepted ?? 0) + (counts.rejected ?? 0),
      withCv: rows.filter((r) => r.cv_path).length,
      avg: scored.length
        ? Math.round(scored.reduce((a, b) => a + b.pct, 0) / scored.length)
        : 0,
    }),
    [counts, scored, rows],
  );

  /* ⚠️ **على الجوّال تنقّلٌ لا تراصّ.** التخطيطُ سيّدٌ وتفصيلٌ جنبًا لجنب
     على الحاسب؛ وعلى الجوّال كانا ينهاران فوق بعضهما فيقع الملفُّ أسفل
     قائمةٍ من ٣٦ طلبًا — أي أن فتحَ طلبٍ لا يُرى أثرُه. فصار: القائمةُ
     وحدها، ثم يملأ الملفُّ الشاشةَ عند الاختيار، ويعود بزرّ.

     والتبديلُ بـ`data-open` وCSS لا بقياس عرضٍ في جافاسكربت: قياسُ العرض
     يُرجع قيمةَ الخادم أوّلًا فيومض التخطيطُ الخطأ عند الترطيب. */
  const openOnPhone = picked !== null;

  return (
    <div
      data-open={openOnPhone ? "true" : "false"}
      className={`apps flex h-full min-h-0 flex-col gap-s3 ${live ? "dash-live" : ""}`}
    >
      <Kpis {...kpis} total={rows.length} />

      <Toolbar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatusFilter}
        sort={sort}
        setSort={setSort}
        counts={counts}
        total={rows.length}
        showing={shown.length}
      />

      <div className="grid min-h-0 flex-1 gap-s3 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <Roster
          items={shown}
          currentId={current?.row.id ?? null}
          onPick={setPicked}
        />
        {current ? (
          <Dossier
            key={current.row.id}
            row={current.row}
            items={current.items}
            pct={current.pct}
            rivalry={rivalry}
            onBack={() => setPicked(null)}
          />
        ) : (
          <section className="tile items-center justify-center p-s7 text-center">
            <p className="text-fg-muted">لا طلبَ يطابق البحث.</p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── شريط الأرقام ───────────────────────────────────────────────────────── */

function Kpis({
  total,
  waiting,
  decided,
  withCv,
  avg,
}: {
  total: number;
  waiting: number;
  decided: number;
  withCv: number;
  avg: number;
}) {
  const cards = [
    { label: "بانتظار المراجعة", value: waiting, of: total, tint: "var(--color-warning)" },
    { label: "حُسم", value: decided, of: total, tint: "var(--color-success)" },
    { label: "بسيرة ذاتية", value: withCv, of: total, tint: "var(--d-cyan)" },
    { label: "متوسّط الاكتمال", value: avg, of: 100, tint: "var(--primary)", pctOnly: true },
  ];
  return (
    /* ⚠️ **على الجوّال صفٌّ يُسحب لا شبكةُ ٢×٢.** الشبكةُ كانت تأكل ≈300px
       فوق الطيّة قبل أوّل طلب، والبطاقاتُ الأربعُ **ملخَّصٌ** لا وجهة —
       ولها تبويبُها «اللوحة» أصلًا. والسحبُ الأفقيّ يُبقيها في متناول
       الإبهام بارتفاعِ بطاقةٍ واحدة. الحاسبُ يبقى شبكةَ أربعة. */
    <ul className="-mx-s4 flex shrink-0 snap-x snap-mandatory gap-s3 overflow-x-auto px-s4 pb-s2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
      {cards.map((c, i) => {
        const pct = c.of ? Math.round((c.value / c.of) * 100) : 0;
        return (
          <li
            key={c.label}
            /* `shrink-0` + عرضٌ ثابت: بدونهما تنكمش البطاقاتُ الأربعُ في
               عرض الشاشة فيضيع السحبُ ولا يُقرأ رقم. */
            className="tile fade-up w-[62vw] max-w-[15rem] shrink-0 snap-start lg:w-auto lg:max-w-none"
            style={{ ["--i" as string]: i }}
          >
            <div className="flex items-center gap-x-s3 px-s4 py-s3">
              <Arc pct={pct} color={c.tint} size={44} />
              <div className="min-w-0">
                <p className="text-fg-muted truncate text-[0.72rem]">{c.label}</p>
                <p className="flex items-baseline gap-x-s2">
                  <span dir="ltr" className="text-xl leading-none font-bold tabular-nums">
                    {c.pctOnly ? `${c.value}%` : c.value}
                  </span>
                  {!c.pctOnly && (
                    <span dir="ltr" className="text-fg-muted text-[0.72rem] tabular-nums">
                      {pct}%
                    </span>
                  )}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** حلقةٌ — القوسُ خطٌّ متقطّع فتُتاح حركةُ الرسم بلا إخفاء القيمة */
function Arc({
  pct,
  color,
  size = 44,
  stroke = 5,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const len = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-sunken)"
          strokeWidth={stroke}
        />
        <circle
          className="draw"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len} ${c - len}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            ["--len" as string]: c,
            filter: `drop-shadow(0 0 5px color-mix(in oklab, ${color} 60%, transparent))`,
          }}
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center">
          {children}
        </span>
      )}
    </span>
  );
}

/* ── شريط الأدوات ───────────────────────────────────────────────────────── */

function Toolbar({
  q,
  setQ,
  status,
  setStatus,
  sort,
  setSort,
  counts,
  total,
  showing,
}: {
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  sort: (typeof SORTS)[number]["key"];
  setSort: (v: (typeof SORTS)[number]["key"]) => void;
  counts: Record<string, number>;
  total: number;
  showing: number;
}) {
  return (
    <div className="tile shrink-0">
      <div className="flex flex-wrap items-center gap-x-s4 gap-y-s3 px-s4 py-s3">
        <label className="flex min-w-[13rem] grow items-center gap-x-s2 rounded-xl border border-line bg-bg-sunken px-s3">
          <span className="sr-only">ابحث في الطلبات</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسمٍ أو رقمٍ جامعيّ أو لجنة…"
            className="text-fg placeholder:text-fg-muted/70 min-h-10 w-full bg-transparent text-[0.85rem]"
          />
        </label>

        {/* ⚠️ **صفٌّ واحدٌ يُسحب على الجوّال لا التفافٌ على ثلاثة صفوف.**
            الستّةُ كانت تلتفّ فتأكل ≈250px أخرى فوق الطيّة. */}
        <div className="-mx-s4 flex gap-x-s2 overflow-x-auto px-s4 pb-s1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-y-s2 sm:overflow-visible sm:px-0 sm:pb-0">
          <Chip
            label="الكلّ"
            count={total}
            active={status === "all"}
            onClick={() => setStatus("all")}
          />
          {STATUSES.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              count={counts[s.key] ?? 0}
              color={s.color}
              active={status === s.key}
              onClick={() => setStatus(s.key)}
            />
          ))}
        </div>

        <label className="flex items-center gap-x-s2 text-[0.8rem]">
          <span className="text-fg-muted">الترتيب</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="border-line bg-bg-sunken text-fg min-h-11 lg:min-h-10 rounded-xl border px-s3 text-[0.82rem]"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <p className="text-fg-muted ms-auto text-[0.78rem]">
          <span dir="ltr" className="tabular-nums">{showing}</span> من{" "}
          <span dir="ltr" className="tabular-nums">{total}</span>
        </p>
      </div>
    </div>
  );
}

function Chip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 shrink-0 items-center gap-x-s2 rounded-full border px-s3 text-[0.8rem] transition-all lg:min-h-10 ${
        active
          ? "border-deep bg-deep text-snow"
          : "border-line bg-bg-sunken hover:bg-line-quiet"
      }`}
    >
      {color && (
        <span
          aria-hidden
          className="size-[8px] shrink-0 rounded-full"
          style={{ background: active ? "currentColor" : color }}
        />
      )}
      <span className="font-medium">{label}</span>
      <span dir="ltr" className="tabular-nums opacity-70">
        {count}
      </span>
    </button>
  );
}

/* ── القائمة ────────────────────────────────────────────────────────────── */

function Roster({
  items,
  currentId,
  onPick,
}: {
  items: readonly { row: Row; pct: number }[];
  currentId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <section className="tile apps-roster min-h-0">
      <ul className="min-h-0 flex-1 overflow-y-auto p-s2">
        {items.map(({ row, pct }, i) => {
          const s = STATUSES.find((x) => x.key === row.status);
          const on = row.id === currentId;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onPick(row.id)}
                /* ⚠️ `aria-current` سمةٌ مُعدَّدة لا منطقية — تمريرُ
                   `true` يُطلق تحذير React ويكتب قيمةً لا يعرفها القارئ. */
                aria-current={on ? "true" : undefined}
                className={`fade-up relative flex w-full items-center gap-x-s3 rounded-xl px-s3 py-s3 text-start transition-colors ${
                  on ? "bg-bg-sunken" : "hover:bg-bg-sunken"
                }`}
                style={{ ["--i" as string]: Math.min(i, 14) }}
              >
                {/* مؤشّرُ الاختيار — شريطٌ متوهّج على الحافّة الابتدائية */}
                <span
                  aria-hidden
                  className={`absolute inset-y-s2 start-0 w-[3px] rounded-full transition-opacity ${
                    on ? "opacity-100" : "opacity-0"
                  }`}
                  style={{
                    background: "var(--d-cyan)",
                    boxShadow: "0 0 10px 0 var(--d-cyan)",
                  }}
                />

                {/* ⚠️ الحلقة **للاكتمال وحده** بلونٍ محايد. كانت تلبس لون
                    الحالة فصار الشكلُ الواحد يحمل معنيين — قوسُه اكتمالٌ
                    ولونُه حالة — والنقطةُ إلى جانبه تحمل الحالة أصلًا. */}
                <Arc pct={pct} color="var(--primary)" size={36} stroke={4}>
                  <span dir="ltr" className="text-[0.6rem] font-bold tabular-nums">
                    {pct}
                  </span>
                </Arc>

                <span className="min-w-0 flex-1">
                  <span className="text-fg block truncate text-[0.86rem] font-semibold">
                    {row.full_name}
                  </span>
                  <span className="text-fg-muted block truncate text-[0.72rem]">
                    {row.university}
                    {row.source === "direct" && " · رابط مباشر"}
                  </span>
                </span>

                <span
                  aria-hidden
                  className="size-[9px] shrink-0 rounded-full"
                  style={{ background: s?.color, boxShadow: `0 0 8px -1px ${s?.color}` }}
                />
                <span className="sr-only">{s?.label}</span>
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="text-fg-muted p-s6 text-center text-[0.85rem]">
            لا طلبَ يطابق البحث.
          </li>
        )}
      </ul>
    </section>
  );
}

/* ── ملفُّ المتقدّم ───────────────────────────────────────────────────────── */

function Dossier({
  row,
  items,
  pct,
  rivalry,
  onBack,
}: {
  row: Row;
  items: readonly Item[];
  pct: number;
  rivalry: Competition;
  onBack: () => void;
}) {
  const s = STATUSES.find((x) => x.key === row.status);
  const asked = askedQuestions(row);

  return (
    <section className="tile apps-dossier min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="tile-ink fade-up relative rounded-b-none px-s5 py-s5 sm:px-s6">
          {/* رجوعٌ إلى القائمة — على الجوّال وحده، فالحاسبُ يعرض اللوحين معًا */}
          <button
            type="button"
            onClick={onBack}
            className="mb-s4 -ms-s2 inline-flex min-h-11 items-center gap-x-s2 px-s2 text-[0.82rem] font-semibold lg:hidden"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 4l6 6-6 6" />
            </svg>
            كل الطلبات
          </button>
          <div className="flex flex-wrap items-start justify-between gap-x-s5 gap-y-s4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl leading-tight font-bold">
                {row.full_name}
              </h2>
              <p className="mt-s2 text-[0.84rem] opacity-75">
                {row.university_other || row.university} · {row.level} ·{" "}
                {row.major_other || row.major}
              </p>
              {/* ⚠️ **يُقال صراحةً لا يُستنتج.** من دخل برابطٍ مباشر لم يُعرض
                  عليه بديل، فرغبتُه الأولى ليست تفضيلًا. ولولا هذا السطر
                  لقرأها المراجع كما يقرأ رغبةَ من فاضل بين سبعة عشر خيارًا. */}
              {row.status === "referred" && row.choice2 && (
                <p className="mt-s2 text-[0.84rem] font-semibold">
                  ← محال إلى <PreferenceName value={row.choice2} />
                </p>
              )}
              {row.source === "direct" && (
                <p className="mt-s2 inline-flex items-center gap-x-s2 rounded-full border px-s3 py-s1 text-[0.74rem]"
                   style={{ borderColor: "color-mix(in oklab, var(--d-cyan) 55%, transparent)",
                            background: "color-mix(in oklab, var(--d-cyan) 16%, transparent)" }}>
                  <span aria-hidden className="size-[7px] rounded-full" style={{ background: "var(--d-cyan)" }} />
                  وصل برابطٍ مباشر — جهةٌ واحدة بلا مفاضلة
                </p>
              )}
              <p className="mt-s3 flex flex-wrap items-center gap-x-s4 gap-y-s1 text-[0.78rem] opacity-70">
                <span dir="ltr">{row.student_id}</span>
                <span dir="ltr">{row.phone}</span>
                <span dir="ltr">{row.email}</span>
              </p>
            </div>

            <div className="flex items-center gap-x-s4">
              <Arc pct={pct} color="var(--d-cyan)" size={72} stroke={7}>
                <span dir="ltr" className="text-[0.95rem] font-bold tabular-nums">
                  {pct}%
                </span>
              </Arc>
              <div>
                <p className="text-[0.68rem] opacity-60">اكتمال الملفّ</p>
                <span
                  className="tag mt-s1"
                  style={{
                    background: `color-mix(in oklab, ${s?.color} 30%, transparent)`,
                    borderColor: `color-mix(in oklab, ${s?.color} 60%, transparent)`,
                  }}
                >
                  {s?.label ?? row.status}
                </span>
              </div>
            </div>
          </div>

          {/* ⚠️ **القرار في الرأس لا في ذيل العمود.** كان أسفلَ العمود
              الأيسر فبقي فراغٌ واسعٌ تحت «الدافع»، والأهمّ أنه **الفعل
              الذي فُتحت الصفحة لأجله** — فمكانه حيث تقع العين أولًا. */}
          <div className="mt-s5 border-t pt-s4" style={{ borderColor: "color-mix(in oklab, var(--snow) 16%, transparent)" }}>
            <StatusPicker row={row} dark />
          </div>
        </header>

        <div className="grid gap-s5 p-s5 sm:p-s6 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-s5">
            <ChoiceLadder row={row} rivalry={rivalry} />

            <Block title="لماذا يريد الانضمام">
              <p className="text-[0.9rem] leading-relaxed">{row.why || "—"}</p>
            </Block>

            {/* ⚠️ **خارج مقياس الاكتمال عمدًا.** «لا خبرة» ليست نقصًا في
                الطلب بل صفةٌ في المتقدّم — وخصمُ نقاطٍ عليها يجعل المقياس
                يفاضل بين الأشخاص لا بين الطلبات، ويعاقب طالب السنة الأولى
                على أنه طالبُ سنةٍ أولى. */}
            <Block title="خبرة سابقة">
              {row.has_club_experience ? (
                <p className="text-[0.9rem] leading-relaxed">
                  {row.club_experience || "—"}
                </p>
              ) : (
                <p className="text-[0.9rem] text-fg-muted">
                  لا خبرة سابقة — هذي أوّل تجربة له.
                </p>
              )}
            </Block>

            {asked.length > 0 && (
              <Block title="أسئلة القادة">
                <ul className="flex flex-col gap-s3">
                  {asked.map((a) => (
                    <li key={a.key} className="rounded-xl bg-bg-sunken p-s3">
                      <p className="text-fg-muted text-[0.72rem]">
                        {a.label ? (
                          <>
                            {isolateLatin(a.title ?? "")} — {a.label}
                          </>
                        ) : (
                          <>
                            <span dir="ltr" lang="en">
                              {a.key}
                            </span>{" "}
                            (سؤالٌ لم يعد معرَّفًا)
                          </>
                        )}
                      </p>
                      {/* ⚠️ الإجابة المتعدّدة تُشقّ رقائقَ لا تُعرض سطرًا
                          ملتصقًا: الفاصل سطرٌ جديد، وعرضُه خامًا يجعل
                          «القيادة تنظيم الفعاليات» تُقرأ إجابةً واحدة. */}
                      {(() => {
                        /* ⚠️ **المرفقُ مسارٌ في المستودع لا نصٌّ يُقرأ.**
                           عرضُه خامًا يكشف بنية التخزين ولا يفتح شيئًا —
                           فيُعرض زرَّ تنزيلٍ يمرّ من `/admin/answer` حيث
                           يُفحص النطاق ثم يُوقَّع الرابط لدقيقة. */
                        if (a.type === "file") {
                          return a.value ? (
                            <a
                              href={`/admin/answer/${row.id}?key=${encodeURIComponent(a.key)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent mt-s1 inline-flex min-h-9 items-center text-[0.86rem] font-semibold underline underline-offset-4"
                            >
                              افتح المرفق
                            </a>
                          ) : (
                            <p className="text-fg-muted mt-s1 text-[0.86rem]">
                              بلا مرفق
                            </p>
                          );
                        }

                        const parts = splitAnswer(a.value);
                        if (parts.length === 0)
                          return (
                            <p className="text-fg-muted mt-s1 text-[0.86rem]">
                              بلا إجابة
                            </p>
                          );
                        if (parts.length === 1)
                          return (
                            <p className="text-fg mt-s1 text-[0.86rem] leading-relaxed">
                              {parts[0]}
                            </p>
                          );
                        return (
                          <ul className="mt-s2 flex flex-wrap gap-s2">
                            {parts.map((part) => (
                              <li
                                key={part}
                                className="border-line text-fg rounded-full border px-s3 py-s1 text-[0.78rem]"
                              >
                                {part}
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
          </div>

          <div className="flex flex-col gap-s5">
            <Checklist items={items} />

            <Block title="المرفقات والروابط">
              <div className="flex flex-wrap gap-s2">
                <LinkPill
                  href={row.cv_path ? `/admin/cv/${row.id}` : null}
                  label="السيرة الذاتية"
                />
                {/* المشاريع بابان: ملفٌّ مرفوع ورابطٌ منشور — وأحدهما يكفي،
                    فيُعرضان معًا ويغيب ما لم يُملأ. */}
                <LinkPill
                  href={
                    row.projects_path ? `/admin/cv/${row.id}?kind=projects` : null
                  }
                  label="ملفّ المشاريع"
                />
                <LinkPill href={row.portfolio} label="رابط الأعمال" external />
                <LinkPill href={row.linkedin} label="لينكدإن" external />
              </div>
            </Block>

            <Block title="بياناتٌ أخرى">
              <dl className="grid grid-cols-2 gap-s3 text-[0.82rem]">
                <div>
                  <dt className="text-fg-muted text-[0.7rem]">رقم الهوية</dt>
                  <dd dir="ltr">{row.national_id || "—"}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted text-[0.7rem]">عرف عنّا من</dt>
                  <dd>{row.heard_from || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-fg-muted text-[0.7rem]">تاريخ التقديم</dt>
                  <dd dir="ltr" className="tabular-nums">
                    {new Date(row.created_at).toLocaleString("ar-SA")}
                  </dd>
                </div>
              </dl>
            </Block>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ── سُلّم الرغبات ────────────────────────────────────────────────────────
   ⚠️ **الشريط يحمل المزاحمة لا الرتبة.**
   أول بناءٍ جعل عرضه ١٠٠٪ ثم ٦٦٪ ثم ٤٠٪ بحسب الرتبة — وهذا شريطٌ يبدو
   قياسًا وليس بقياس: العينُ تقرأ الطول كمّيّةً، والرتبةُ يحملها الرقم
   المرقوم بجانبه أصلًا، فكان الطول زخرفًا يكذب.
   وصار يحمل **كم متقدّمًا يزاحم على الجهة نفسها** — رقمٌ يخصّ القرار:
   جهةٌ عليها سبعة غيرُ جهةٍ عليها واحد. */
function ChoiceLadder({
  row,
  rivalry,
}: {
  row: Row;
  rivalry: Competition;
}) {
  /* ⚠️ الفارغتان تُحذفان لا تُعرضان فارغتين: الرابط المباشر لا رغبةَ ثانيةً
     فيه ولا ثالثة، وعرضُ درجتين خاويتين يوحي بنقصٍ في الطلب لا بطبيعته. */
  const choices = [row.choice1, row.choice2, row.choice3].filter(Boolean);
  const peak = Math.max(1, ...[...rivalry.values()]);
  return (
    <Block title="الرغبات">
      <ol className="flex flex-col gap-s3">
        {choices.map((c, i) => {
          const meta = RANK_META[i];
          return (
            <li
              key={i}
              className="fade-up flex items-center gap-x-s3"
              style={{ ["--i" as string]: i }}
            >
              <span
                dir="ltr"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[0.8rem] font-bold"
                style={{ background: meta.color, color: meta.ink, boxShadow: `0 4px 14px -6px ${meta.color}` }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.86rem] font-medium">
                  <PreferenceName value={c} />
                </span>
                <span className="mt-s1 block h-[6px] overflow-hidden rounded-full bg-bg-sunken">
                  <span
                    className="grow-x block h-full rounded-full"
                    style={{
                      width: `${((rivalry.get(c) ?? 0) / peak) * 100}%`,
                      background: meta.color,
                      ["--i" as string]: i,
                    }}
                  />
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className="text-fg-muted block text-[0.68rem]">
                  {meta.label}
                </span>
                <span className="block text-[0.72rem] font-semibold">
                  يزاحمه <span dir="ltr">{Math.max(0, (rivalry.get(c) ?? 1) - 1)}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </Block>
  );
}

function Checklist({ items }: { items: readonly Item[] }) {
  return (
    <Block title="بنود الاكتمال">
      <ul className="flex flex-col gap-s2">
        {items.map((it, i) => (
          <li
            key={it.label}
            className="fade-up flex items-center gap-x-s2 text-[0.82rem]"
            style={{ ["--i" as string]: i }}
          >
            <span
              aria-hidden
              className="flex size-[18px] shrink-0 items-center justify-center rounded-md text-[0.68rem] font-bold"
              style={{
                background: it.ok
                  ? "color-mix(in oklab, var(--color-success) 18%, transparent)"
                  : "var(--bg-sunken)",
                color: it.ok ? "var(--color-success)" : "var(--fg-muted)",
              }}
            >
              {it.ok ? "✓" : "—"}
            </span>
            <span className={it.ok ? "" : "text-fg-muted"}>{it.label}</span>
            <span dir="ltr" className="text-fg-muted ms-auto text-[0.72rem] tabular-nums">
              {it.weight}
            </span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function StatusPicker({ row, dark }: { row: Row; dark?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <p
        className={`mb-s2 text-[0.72rem] font-semibold tracking-[0.1em] ${dark ? "opacity-60" : "text-fg-muted"}`}
      >
        قرار المراجعة
      </p>
      <div className="flex flex-wrap gap-s2">
        {STATUSES.map((s) => {
          const on = s.key === row.status;
          /* ⚠️ **الإحالة مستحيلةٌ بلا وجهة.** من دخل برابطٍ مباشر لا رغبةَ
             ثانيةَ له (`choice2` فارغة)، فالزرّ يُعطَّل ويُقال السبب — لا
             يُخفى، وإلّا ظنّ القائد أن اللوحة معطوبة. */
          const noTarget = s.key === "referred" && !row.choice2;
          return (
            <button
              key={s.key}
              type="button"
              title={noTarget ? "لا رغبةَ ثانية — وصل الطلب برابطٍ مباشر" : undefined}
              disabled={pending || on || noTarget}
              aria-current={on ? "true" : undefined}
              onClick={() =>
                start(async () => {
                  setError("");
                  const res = await setStatus(row.id, s.key);
                  if (!res.ok) setError(res.message);
                })
              }
              className={`flex min-h-11 lg:min-h-10 items-center gap-x-s2 rounded-xl border px-s4 text-[0.82rem] font-semibold transition-all ${
                on
                  ? "cursor-default"
                  : noTarget
                    ? "cursor-not-allowed opacity-30"
                    : "opacity-70 hover:opacity-100"
              }`}
              style={{
                background: on
                  ? `color-mix(in oklab, ${s.color} ${dark ? 34 : 16}%, transparent)`
                  : "transparent",
                borderColor: `color-mix(in oklab, ${s.color} ${on ? 65 : dark ? 46 : 34}%, transparent)`,
                boxShadow: on ? `0 6px 22px -12px ${s.color}` : undefined,
              }}
            >
              <span
                aria-hidden
                className="size-[9px] shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p
          role="alert"
          className={`mt-s2 text-[0.8rem] ${dark ? "text-snow" : "text-danger"}`}
        >
          {error}
        </p>
      )}

      <NotifyButton row={row} dark={dark} />
    </div>
  );
}

/**
 * إرسالُ النتيجة إلى الطالب — **خطوتان لا واحدة**.
 *
 * ⚠️ **البريدُ لا يُسحب.** ضغطةٌ واحدةٌ خاطئة على «رفض» ترسل رفضًا لطالبٍ
 * لم يُرفض؛ فالضغطة الأولى تُسلّح والثانية تُرسل، والنصُّ يقول لمن يُرسَل
 * وبأي قرار — لا «إرسال» غفلًا.
 *
 * ولا يظهر أصلًا قبل ضبط القرار: `new` و`reviewing` لا نتيجةَ فيهما.
 */
function NotifyButton({ row, dark }: { row: Row; dark?: boolean }) {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const decision = STATUSES.find((s) => s.key === row.status);
  if (!NOTIFIABLE_STATUSES.includes(row.status)) return null;

  return (
    <div className="mt-s4 border-t pt-s3" style={{ borderColor: dark ? "rgba(255,255,255,.14)" : "var(--line)" }}>
      <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              setNote(null);
              return;
            }
            start(async () => {
              const res = await notifyDecision(row.id);
              setArmed(false);
              setNote({ ok: res.ok, text: res.message || "تعذّر الإرسال" });
            });
          }}
          className={`inline-flex min-h-11 lg:min-h-10 items-center gap-x-s2 rounded-xl border px-s4 text-[0.82rem] font-semibold transition-opacity ${
            pending ? "opacity-50" : "opacity-85 hover:opacity-100"
          }`}
          style={{
            borderColor: armed
              ? "color-mix(in oklab, var(--danger) 60%, transparent)"
              : dark
                ? "rgba(255,255,255,.28)"
                : "var(--line-strong)",
            background: armed
              ? "color-mix(in oklab, var(--danger) 14%, transparent)"
              : "transparent",
          }}
        >
          {pending
            ? "جارٍ الإرسال…"
            : armed
              ? `تأكيد: أرسل «${decision?.label ?? row.status}» إلى ${row.email}`
              : "أرسل النتيجة للطالب"}
        </button>

        {armed && !pending && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="min-h-11 lg:min-h-10 px-s2 text-[0.8rem] underline underline-offset-4 opacity-70"
          >
            تراجع
          </button>
        )}
      </div>

      {note && (
        <p
          role="status"
          className={`mt-s2 text-[0.8rem] ${note.ok ? (dark ? "text-snow" : "text-success") : dark ? "text-snow" : "text-danger"}`}
        >
          {note.ok ? "✓ " : ""}
          {note.text}
        </p>
      )}
    </div>
  );
}

/* ── قطعٌ صغيرة ─────────────────────────────────────────────────────────── */

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-fg-muted mb-s2 text-[0.72rem] font-semibold tracking-[0.1em]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function LinkPill({
  href,
  label,
  external,
}: {
  href: string | null | undefined;
  label: string;
  external?: boolean;
}) {
  /* ⚠️ بلا `opacity-60`: اللونُ `--fg-muted` مضبوطٌ أصلًا على 6.76:1،
     والشفافيةُ فوقه تُنزله إلى **3.33:1** مقيسة — تحت العتبة. */
  if (!href)
    return (
      <span className="text-fg-muted rounded-full border border-line bg-bg-sunken px-s3 py-s2 text-[0.78rem]">
        {label} — لا يوجد
      </span>
    );
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="hover:border-deep hover:bg-deep hover:text-snow rounded-full border border-line bg-bg-sunken px-s3 py-s2 text-[0.78rem] font-semibold transition-colors"
    >
      {label}
    </a>
  );
}

/** للبحث وحده — نصٌّ صِرف بلا عناصر */
function prefName(value: string) {
  return findPreference(value)?.fullLabel ?? value;
}

/** قيمةٌ لا يعرفها النظام تُعلَّم ولا تُبتلع صامتة، وتُعزَل `ltr` */
function PreferenceName({ value }: { value: string }) {
  const found = findPreference(value);
  if (found) return <>{found.fullLabel}</>;
  return (
    <>
      <span dir="ltr" lang="en">
        {value}
      </span>{" "}
      <span className="text-fg-muted">(قيمة لا تُعرف)</span>
    </>
  );
}

type Asked = {
  key: string;
  /** الجهة التي سُئل عنها — رغبةٌ أو لجنةٌ تشترك فيها وحداتُها */
  title: string | null;
  label: string | null;
  type: QuestionType | null;
  required: boolean;
  value: string;
};

/**
 * ردُّ الإجابات إلى أسئلتها.
 *
 * ⚠️ لا يُشقّ المفتاح نصًّا — قيمة الرغبة نفسها تحمل `:` و`/`. بل يُبنى
 * بـ`answerName` لكل سؤالٍ في كتل الطالب ثم يُبحث عنه. وما بقي من مفاتيح
 * بلا سؤال يُعرض معلَّمًا لا يُسقط.
 *
 * ⚠️ **`questionBlocks` لا المرورُ على الرغبات الثلاث.** أسئلةُ اللجنة
 * تُخزَّن بمفتاح اللجنة لا بمفتاح الوحدة، فالمرورُ على الرغبات يبني
 * مفاتيحَ لا وجود لها في `answers` — فتسقط الأجوبةُ كلُّها إلى ذيل
 * «سؤالٌ لم يعد معرَّفًا».
 */
function askedQuestions(row: Row): Asked[] {
  const answers = row.answers ?? {};
  const out: Asked[] = [];
  const seen = new Set<string>();

  for (const block of questionBlocks([row.choice1, row.choice2, row.choice3])) {
    for (const q of block.questions) {
      const key = answerName(block.key, q.id);
      if (seen.has(key) || !(key in answers)) continue;
      seen.add(key);
      out.push({
        key,
        title: block.title,
        label: q.label,
        type: q.type,
        required: !!q.required,
        value: answers[key],
      });
    }
  }
  for (const [key, value] of Object.entries(answers)) {
    if (seen.has(key)) continue;
    out.push({ key, title: null, label: null, type: null, required: false, value });
  }
  return out;
}
