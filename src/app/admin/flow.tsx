"use client";

import { useEffect, useMemo, useState } from "react";

import { findPreference } from "@/content/preferences";
import type { Row } from "./stats";

/**
 * مخطّط التدفّق — **من أي جامعةٍ يأتي الطلب، وإلى أي لجنةٍ يذهب**.
 *
 * الأعمدة والحلقات تجيب «كم»؛ وهذا يجيب «من أين إلى أين» — وهو سؤالٌ لا
 * يظهر في أي رسمٍ آخر في اللوحة: أن نصف طلبات لجنةٍ بعينها تأتي من جامعةٍ
 * واحدة معلومةٌ تُغيّر خطّة الاستقطاب.
 *
 * ⚠️ **الرغبة الأولى وحدها** تُرسم. لو رُسمت الثلاث لصار مجموعُ الشرائط
 * ثلاثةَ أضعاف عدد الطلبات، ولقرأ الرائي «٩٠ متقدّمًا» وهم ثلاثون.
 *
 * ── قرارٌ لونيّ ──────────────────────────────────────────────────────────
 * الشرائط بلونٍ واحد لا بألوانٍ مصنّفة. السُّمك يحمل المقدار، والعقدة
 * المسمّاة تحمل الهوية — فلا حاجة للّون. ولو لُوّنت ستُّ جامعاتٍ من عائلةٍ
 * زرقاء واحدة لسقط الفصل عند عمى الألوان. الإبراز بالتمرير هو ما يفصل.
 */

const W = 1000;
/* ⚠️ عرضُ العقدة بوحدات `viewBox` **يُضغط أفقيًّا** لأن الرسم يُمدّد
   بـ`preserveAspectRatio="none"`: عرضُ الحاوية ~٦٢٥px على `viewBox` عرضه
   ١٠٠٠، فكل وحدةٍ أفقيّةٍ تُرى ٠٫٦٢ منها. و١٣ كانت تُرى ٨px فيختفي الميلان
   وتُقرأ العقدة شريطًا مستقيمًا. */
const NODE_W = 24;
const PAD_Y = 10;
const MIN_GAP = 7;
/* أقصى ما يُعرض من كل جهة قبل ضمّ الذيل في «أخرى».
   ⚠️ عند ٧ صارت «أخرى» أكبرَ عقدةٍ في جهة المقاصد (١٠ من ٣٠) — والمجمَّع
   الغُفل يتصدّر الرسم فيُفقده معناه. */
const TOP_N_SRC = 7;
const TOP_N_DST = 10;

type Node = {
  key: string;
  label: string;
  value: number;
  y: number;
  h: number;
};

type Ribbon = {
  key: string;
  from: string;
  to: string;
  value: number;
  y0: number;
  y1: number;
  h0: number;
  h1: number;
};

export function FlowChart({ rows }: { rows: readonly Row[] }) {
  const [hot, setHot] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);

  const model = useMemo(() => build(rows), [rows]);
  if (!model) return null;

  const { sources, targets, ribbons, height } = model;

  return (
    <figure
      className={`m-0 ${live ? "flow-live" : ""} ${hot ? "flow-dim" : ""}`}
      onMouseLeave={() => setHot(null)}
    >
      <figcaption className="mb-s4 flex flex-wrap items-baseline justify-between gap-x-s5 gap-y-s2">
        <h2 className="font-display text-fg text-lg font-bold">من أين إلى أين</h2>
        <p className="text-fg-muted text-[0.8rem]">
          الجامعة ← الرغبة الأولى · سُمك الشريط عددُ الطلبات
        </p>
      </figcaption>

      {/* ⚠️ **التسميات `HTML` لا `SVG`.** جرّبناها داخل الرسم فخرجت
          **اثنتا عشرة تسميةً عن الإطار**: `<text>` لا يلفّ ولا يُقصّ، واسمٌ
          مثل «لجنة العلاقات العامة والشراكات — وحدة الزيارات» أطولُ من أي
          هامشٍ معقول. وهنا يلفّها المتصفّح ويقصّها بنقاطٍ ويضبط حجمها
          استقلالًا عن تحجيم `viewBox`.

          والعرض الأدنى مع `overflow-x` تمريرٌ داخليّ: مخطّطُ تدفّقٍ مضغوطٌ
          في ٣٩٠px يصير خطوطًا متشابكة لا معنى لها. */}
      <div className="-mx-s2 overflow-x-auto px-s2">
        <div
          className="grid min-w-[50rem] items-stretch gap-x-s4"
          style={{ gridTemplateColumns: "minmax(0,12.5rem) minmax(0,1fr) minmax(0,14rem)" }}
        >
          <LabelColumn
            nodes={sources}
            height={height}
            side="start"
            hot={hot}
            onHot={setHot}
          />

          <svg
            viewBox={`0 0 ${W} ${height}`}
            preserveAspectRatio="none"
            className="block w-full"
            style={{ height: `${height}px` }}
            role="img"
            aria-label={`تدفّق ${rows.length} طلبًا من ${sources.length} جهةً إلى ${targets.length} لجنةً حسب الرغبة الأولى`}
          >
            {/* الشرائط أولًا فالعقد فوقها */}
            {ribbons.map((r, i) => (
              <path
                key={r.key}
                className={`ribbon ${hot === r.from || hot === r.to ? "ribbon-on" : ""}`}
                style={{ ["--i" as string]: i }}
                d={ribbonPath(r)}
                fill="var(--sky)"
                fillOpacity={0.42}
              >
                <title>{`${r.from} ← ${r.to}: ${r.value}`}</title>
              </path>
            ))}

            {sources.map((n) => (
              <NodeMark key={n.key} node={n} side="start" hot={hot} />
            ))}
            {targets.map((n) => (
              <NodeMark key={n.key} node={n} side="end" hot={hot} />
            ))}
          </svg>

          <LabelColumn
            nodes={targets}
            height={height}
            side="end"
            hot={hot}
            onHot={setHot}
          />
        </div>
      </div>
    </figure>
  );
}

/**
 * عمودُ التسميات — كلُّ تسميةٍ عند منتصف عقدتها.
 *
 * وهي **الزرّ** الذي يُبرِز التدفّق، لا العلامة النحيلة في الرسم: هدفٌ
 * بعرض العمود وارتفاعٍ محسوس، ويصله لوحُ المفاتيح.
 */
function LabelColumn({
  nodes,
  height,
  side,
  hot,
  onHot,
}: {
  nodes: readonly Node[];
  height: number;
  side: "start" | "end";
  hot: string | null;
  onHot: (k: string | null) => void;
}) {
  return (
    <div className="relative" style={{ height: `${height}px` }}>
      {nodes.map((n) => (
        <button
          key={n.key}
          type="button"
          onMouseEnter={() => onHot(n.key)}
          onFocus={() => onHot(n.key)}
          onBlur={() => onHot(null)}
          onClick={() => onHot(hot === n.key ? null : n.key)}
          aria-pressed={hot === n.key}
          /* ⚠️ **هدفُ اللمس 44px على الجوّال.** قِيس 24px، والعُقدُ مطويّةٌ عند
             ١١ عقدةً كحدٍّ أقصى فالمسافةُ بينها ≥54px — فـ44 تتّسع بلا تداخل.
             والزرُّ شفّافٌ أصلًا، فالتغييرُ في مساحة اللمس لا في المظهر. */
          className={`absolute flex min-h-11 lg:min-h-6 w-full items-center gap-x-s2 py-[3px] text-[0.78rem] leading-tight transition-opacity ${
            side === "start" ? "justify-end text-end" : "justify-start text-start"
          } ${hot && hot !== n.key ? "opacity-40" : "opacity-100"}`}
          style={{
            top: `${((n.y + n.h / 2) / height) * 100}%`,
            transform: "translateY(-50%)",
            [side === "start" ? "insetInlineStart" : "insetInlineEnd"]: 0,
          }}
        >
          <span
            dir="ltr"
            className="text-fg shrink-0 font-bold tabular-nums"
          >
            {n.value}
          </span>
          <NodeLabel label={n.label} align={side} />
        </button>
      ))}
    </div>
  );
}

/* ── العقدة ─────────────────────────────────────────────────────────────
   ⚠️ العقدة **متوازي أضلاعٍ بزاوية الشعار** لا مستطيل — وهذا موضع الميلان
   البنيويّ في هذا الرسم. ولا نصَّ فيها ولا تفاعل: التسمية في `LabelColumn`
   هي الهدف، فالعلامة عرضُها ١٣ وحدةً لا تصلح هدفًا لفأرةٍ ولا لإصبع. */
function NodeMark({
  node,
  side,
  hot,
}: {
  node: Node;
  side: "start" | "end";
  hot: string | null;
}) {
  /* في `RTL` يقرأ التدفّق من اليمين لليسار: المصدر يمينًا والمقصد يسارًا.
     و`viewBox` يبقى بإحداثيّات `LTR`، فنقلبها هنا صراحةً. */
  const x = side === "start" ? W - NODE_W : 0;
  const lean = Math.min(node.h * 0.34, 16);

  return (
    <g className={`flow-node ${hot === node.key ? "flow-node-on" : ""}`}>
      <title>
        {node.label} — {node.value}
      </title>
      <polygon
        points={`${x},${node.y + lean} ${x + NODE_W},${node.y} ${x + NODE_W},${node.y + node.h} ${x},${node.y + node.h + lean}`}
        fill={side === "start" ? "var(--deep)" : "var(--primary)"}
      />
    </g>
  );
}

/**
 * تسميةُ عقدة — **سطران كاملان لا سطرٌ مقصوص.**
 *
 * ⚠️ قِسنا `line-clamp-2` فوجدنا **خمسَ تسمياتٍ مقصوصة**: «لجنة العلاقات
 * العامة والشراكات — وحدة الزيارات» لا تسع سطرين بهذا العرض. والاسمُ
 * المقصوص يُفقد العقدةَ هويّتها، وهي كلُّ وظيفة التسمية.
 *
 * فتُشقّ عند الشرطة: اللجنة الأمّ خافتةً فوق، والوحدة صريحةً تحت. كلاهما
 * كاملٌ، والعين تمسك الوحدة أولًا وهي المميِّزة.
 */
function NodeLabel({
  label,
  align,
}: {
  label: string;
  align: "start" | "end";
}) {
  const i = label.indexOf("—");
  const parent = i > 0 ? label.slice(0, i).trim() : null;
  const leaf = i > 0 ? label.slice(i + 1).trim() : label;
  return (
    <span className={`min-w-0 ${align === "start" ? "text-end" : "text-start"}`}>
      {/* ⚠️ بلا `opacity-75` أدناه: `--fg-muted` معايَرٌ على 7.13:1 نهارًا،
          والشفافيةُ فوقه تُنزله إلى **4.01:1** مقيسة — تحت العتبة عند
          10.88px. ونجح ليلًا مصادفةً، وهذا ما تحذّر منه قاعدةُ «التباين
          يُقاس في الوضعين». */}
      {parent && (
        <span className="text-fg-muted block text-[0.68rem] leading-tight">
          {parent}
        </span>
      )}
      <span className="text-fg block leading-tight">{leaf}</span>
    </span>
  );
}

/** منحنى تكعيبيّ بين شريحتَي المصدر والمقصد */
function ribbonPath(r: Ribbon): string {
  const x0 = W - NODE_W;
  const x1 = NODE_W;
  const cx = (x0 + x1) / 2;
  return [
    `M ${x0},${r.y0}`,
    `C ${cx},${r.y0} ${cx},${r.y1} ${x1},${r.y1}`,
    `L ${x1},${r.y1 + r.h1}`,
    `C ${cx},${r.y1 + r.h1} ${cx},${r.y0 + r.h0} ${x0},${r.y0 + r.h0}`,
    "Z",
  ].join(" ");
}

/* ── بناء النموذج ──────────────────────────────────────────────────────── */

function build(rows: readonly Row[]) {
  if (rows.length === 0) return null;

  const pairs = new Map<string, number>();
  const srcTotal = new Map<string, number>();
  const dstTotal = new Map<string, number>();

  for (const r of rows) {
    const src = r.university;
    const dst = findPreference(r.choice1)?.fullLabel ?? r.choice1;
    if (!src || !dst) continue;
    srcTotal.set(src, (srcTotal.get(src) ?? 0) + 1);
    dstTotal.set(dst, (dstTotal.get(dst) ?? 0) + 1);
    /* ⚠️ الفاصل `\u0000` صراحةً لا مسافة: أسماء الجامعات واللجان
       فيها مسافات، والشقّ عليها يقطعها ويولّد جهاتٍ وهمية. */
    const k = `${src}\u0000${dst}`;
    pairs.set(k, (pairs.get(k) ?? 0) + 1);
  }

  /* ضمُّ الذيل في «أخرى» بدل قصّه: القصّ يُخفي طلبات موجودة، والضمّ يبقي
     المجموع صادقًا — ومجموعُ الشرائط يساوي عدد الطلبات دائمًا. */
  const foldSrc = folder(srcTotal, TOP_N_SRC);
  const foldDst = folder(dstTotal, TOP_N_DST);

  const s = tally(srcTotal, foldSrc);
  const d = tally(dstTotal, foldDst);
  if (s.length === 0 || d.length === 0) return null;

  const rowsCount = rows.length;
  const height = Math.max(
    260,
    Math.min(620, Math.max(s.length, d.length) * 54 + PAD_Y * 2),
  );

  const sources = layout(s, height, rowsCount);
  const targets = layout(d, height, rowsCount);

  const srcCursor = new Map(sources.map((n) => [n.key, n.y]));
  const dstCursor = new Map(targets.map((n) => [n.key, n.y]));
  const byKey = (ns: Node[]) => new Map(ns.map((n) => [n.key, n]));
  const sMap = byKey(sources);
  const dMap = byKey(targets);

  /* ترتيبُ الرسم بالحجم تنازليًّا: الشريط السميك أسفلَ الرصّة فلا يحجب
     نظيره النحيل ويجعله غير قابلٍ للتمرير. */
  const ribbons: Ribbon[] = [];
  /* ⚠️ **تُدمج الأزواج بعد الضمّ لا قبله.** ضمُّ الذيل يحوّل عدّة لجانٍ
     إلى «أخرى»، فتنشأ عدّةُ شرائطَ بين الجامعة نفسها و«أخرى» تحمل المفتاح
     ذاته — رصدَه المتصفّح تكرارًا في `key`. والدمج يجعلها شريطًا واحدًا
     بسُمكها المجموع: أصدق بصريًّا وأقلّ عناصر في الشجرة. */
  const merged = new Map<string, { src: string; dst: string; v: number }>();
  for (const [k, v] of pairs) {
    const [rawSrc, rawDst] = k.split("\u0000");
    const src = foldSrc(rawSrc);
    const dst = foldDst(rawDst);
    const mk = `${src}\u0000${dst}`;
    const cur = merged.get(mk);
    if (cur) cur.v += v;
    else merged.set(mk, { src, dst, v });
  }
  const entries = [...merged.values()].sort((a, b) => b.v - a.v);

  for (const e of entries) {
    const sn = sMap.get(e.src);
    const dn = dMap.get(e.dst);
    if (!sn || !dn) continue;
    const h0 = (e.v / sn.value) * sn.h;
    const h1 = (e.v / dn.value) * dn.h;
    const y0 = srcCursor.get(e.src) ?? sn.y;
    const y1 = dstCursor.get(e.dst) ?? dn.y;
    srcCursor.set(e.src, y0 + h0);
    dstCursor.set(e.dst, y1 + h1);
    ribbons.push({
      key: `${e.src}→${e.dst}`,
      from: e.src,
      to: e.dst,
      value: e.v,
      y0,
      y1,
      h0,
      h1,
    });
  }

  return { sources, targets, ribbons, height };
}

/** يُرجع دالّةً تُحوّل ما دون العتبة إلى «أخرى» */
function folder(totals: Map<string, number>, topN: number) {
  const keep = new Set(
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([k]) => k),
  );
  return (k: string) => (keep.has(k) ? k : "أخرى");
}

function tally(totals: Map<string, number>, fold: (k: string) => string) {
  const out = new Map<string, number>();
  for (const [k, v] of totals) {
    const f = fold(k);
    out.set(f, (out.get(f) ?? 0) + v);
  }
  return [...out.entries()]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * توزيع الارتفاعات.
 *
 * ⚠️ الفجوات تُخصم **قبل** التوزيع لا بعده. لو وُزّع الارتفاع كاملًا ثم
 * أُضيفت الفجوات لتجاوزت الرصّةُ حدَّ الرسم وخرجت آخرُ عقدةٍ عن الإطار.
 */
function layout(
  items: readonly { key: string; label: string; value: number }[],
  height: number,
  total: number,
): Node[] {
  const gaps = MIN_GAP * Math.max(0, items.length - 1);
  const usable = Math.max(40, height - PAD_Y * 2 - gaps);
  let y = PAD_Y;
  return items.map((it) => {
    const h = Math.max(8, (it.value / total) * usable);
    const node = { ...it, y, h };
    y += h + MIN_GAP;
    return node;
  });
}
