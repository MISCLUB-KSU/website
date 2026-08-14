import { findPreference } from "@/content/preferences";

/**
 * حساب أرقام اللوحة.
 *
 * دوالٌّ صرفة تأخذ الصفوف وتُخرج ما يُرسم — لا استعلامَ فيها ولا حالة. سببان:
 * الصفوف تصل مقصوصةً بـ`RLS` (قائدٌ يرى نطاقه)، فالحساب على ما وصل هو
 * الصحيح؛ ولأنها صرفة تُقرأ ويُتحقّق منها بلا تشغيل قاعدة.
 */

export type Row = {
  id: string;
  created_at: string;
  full_name: string;
  student_id: string;
  phone: string;
  email: string;
  university: string;
  level: string;
  major: string;
  choice1: string;
  choice2: string;
  choice3: string;
  status: string;
  cv_path: string | null;
  /* ما يُعرض في تفصيل الصفّ — محفوظٌ منذ البداية ولم يكن يُعرض */
  national_id: string;
  university_other: string | null;
  major_other: string | null;
  why: string;
  heard_from: string;
  /** خبرةٌ سابقة في عملٍ طلابيّ أو تطوّعيّ — والتفاصيل `null` لمن لا خبرة له */
  has_club_experience: boolean;
  club_experience: string | null;
  /** درجتُها: `multiple` · `single` · `none`. `null` في الصفوف السابقة للعمود */
  club_experience_level: string | null;
  /** وجوابا من لا خبرة له — `null` لمن له خبرة، بالتقابل نفسِه */
  club_perception: string | null;
  club_expectation: string | null;
  /** ملفّ المشاريع السابقة — والرابط البديل في `portfolio` */
  projects_path: string | null;
  /** التزامات الفصل — `'{}'` في الصفوف السابقة للعمود */
  commitments: string[];
  answers: Record<string, string>;
  portfolio: string | null;
  linkedin: string | null;
  /** `open` نموذجٌ بثلاث رغبات · `direct` رابطٌ مباشر لجهةٍ واحدة */
  source: string;
};

/**
 * ⚠️ **الطلبُ يُحسب من الطلبات المفتوحة وحدها.**
 *
 * «الرغبة الأولى» في النموذج المفتوح **تفضيلٌ بين بدائل**؛ وفي الرابط
 * المباشر **هي الخيار الوحيد المعروض** — فالمتقدّم لم يفاضل أصلًا. وخلطُهما
 * يجعل جهةً استقطبت عشرين شخصًا برابطها تبدو أكثرَ جهةٍ مطلوبة في النادي،
 * ويُري قائدَها «يزاحمك عشرون» فيرفض مرشّحًا جيّدًا لسببٍ لا وجود له.
 *
 * والمباشرون لا يُخفَون: يظهرون في الجدول وفي عدّاد الإجمالي وفي كل رقمٍ
 * لا يقيس **المفاضلة**. وهذا الفصلُ هو ما تُشترى به الميزة كلّها.
 */
export function openOnly(rows: readonly Row[]): readonly Row[] {
  return rows.filter((r) => r.source !== "direct");
}

/* ── الحالات ────────────────────────────────────────────────────────────
   الخامسة «محال للثانية» وعدت بها الإدارة القادة — والوجهة `choice2` نفسها
   يكتبها المتقدّم، فلا يختارها القائد. والقيم من `dash.css` حيث القياس.

   ⚠️ **هذا الترتيب مقيسٌ لا مذوَّق.** مدقّق `dataviz` قاس الأزواج المتجاورة:
   بترتيب (جديد · مراجعة · مقبول · معتذَر) يتلاصق الأخضر والأحمر فيهبط
   الفصل إلى ΔE 7.2 عند عمى الأحمر — داخل نطاق الخطر. وبهذا الترتيب يصير
   أسوأ زوجٍ (كهرماني↔أخضر) عند 8.2 — يجتاز. لا يُعاد الترتيب بلا إعادة
   القياس.

   ولأن الأخضر والمحايد يسقطان في «أرضية التشبّع» (يُقرآن رماديين)، **كل
   حالةٍ تحمل اسمها نصًّا دائمًا** — اللون ثانويّ لا وحيد. */
export const STATUSES = [
  { key: "accepted", label: "مقبول", color: "var(--st-accepted)" },
  { key: "reviewing", label: "قيد المراجعة", color: "var(--st-reviewing)" },
  { key: "new", label: "جديد", color: "var(--st-new)" },
  { key: "referred", label: "محال للثانية", color: "var(--st-referred)" },
  { key: "rejected", label: "معتذَر عنه", color: "var(--st-rejected)" },
] as const;

/* ⚠️ الرتب تدرّجٌ كمّيّ من الخمسة الرسمية: عائلةٌ واحدة **رتيبةُ الإضاءة** من الأدكن للأفتح،
   فالرغبة الأولى أثقل وزنًا بصريًّا. ليست ألوانًا مصنّفة تُبدَّل كيفما اتّفق —
   قلبُ الترتيب يقلب المعنى. */
export const RANK_COLORS = [
  "var(--deep)", // الرغبة الأولى — الأدكن، فهي الأثقل وزنًا
  "var(--primary)",
  "var(--sky)",
] as const;

export const RANK_LABELS = ["رغبة أولى", "رغبة ثانية", "رغبة ثالثة"] as const;

export function countBy<T extends string>(
  rows: readonly Row[],
  pick: (r: Row) => T,
): Map<T, number> {
  const out = new Map<T, number>();
  for (const r of rows) {
    const k = pick(r);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export type DemandRow = {
  value: string;
  label: string;
  first: number;
  second: number;
  third: number;
  total: number;
};

/**
 * الطلب على كل لجنة ومشروع، **مفصولًا بالرتبة**.
 *
 * المجموع وحده يضلّل: جهةٌ اختارها عشرون ثالثةً ليست كجهةٍ اختارها عشرة
 * أولى. والقائد يقرّر بـ«كم واحدًا وضعني أوّلًا» لا بعدد من مرّ عليه.
 * فالعمود مكدَّسٌ بالرتب، والترتيب بالأولى ثم بالمجموع.
 */
export function demand(rows: readonly Row[]): DemandRow[] {
  const map = new Map<string, DemandRow>();
  rows = openOnly(rows);
  const bump = (value: string, rank: 0 | 1 | 2) => {
    if (!value) return;
    const existing = map.get(value) ?? {
      value,
      label: findPreference(value)?.fullLabel ?? value,
      first: 0,
      second: 0,
      third: 0,
      total: 0,
    };
    if (rank === 0) existing.first += 1;
    else if (rank === 1) existing.second += 1;
    else existing.third += 1;
    existing.total += 1;
    map.set(value, existing);
  };
  for (const r of rows) {
    bump(r.choice1, 0);
    bump(r.choice2, 1);
    bump(r.choice3, 2);
  }
  return [...map.values()].sort(
    (a, b) => b.first - a.first || b.total - a.total,
  );
}

export type DayPoint = { day: string; label: string; count: number };

/**
 * الوصول يومًا بيوم — **بأيّامٍ فارغة لا بقفزٍ فوقها**.
 *
 * لو رُسمت الأيام التي وصل فيها طلبٌ فقط، لظهر يومان بينهما أسبوعٌ صامت
 * متجاورين، فيُقرأ الخطّ صعودًا متّصلًا وهو انقطاع. المحور زمنيٌّ متّصل.
 */
export function perDay(rows: readonly Row[]): DayPoint[] {
  if (rows.length === 0) return [];
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    const d = new Date(r.created_at);
    const k = key(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    const t = Date.parse(`${k}T00:00:00Z`);
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const out: DayPoint[] = [];
  for (let t = min; t <= max; t += 86_400_000) {
    const d = new Date(t);
    out.push({
      day: key(d),
      label: d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }),
      count: counts.get(key(d)) ?? 0,
    });
  }
  return out;
}

/** ترتيب المستويات كما تُقرأ لا أبجديًّا */
export const LEVEL_ORDER = [
  "السنة الأولى",
  "السنة الثانية",
  "السنة الثالثة",
  "السنة الرابعة",
  "السنة الخامسة فأكثر",
] as const;
