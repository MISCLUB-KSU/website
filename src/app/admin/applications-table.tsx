"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import { COMMITTEES } from "@/content/committees";
import { findPreference, questionBlocks } from "@/content/preferences";
import { PROJECTS } from "@/content/projects";
import {
  answerName,
  splitAnswer,
  type QuestionType,
} from "@/content/questions";
import { isolateLatin } from "@/lib/bidi";
import { useHydrated } from "@/lib/use-hydrated";
import { useStore } from "./store";
import {
  addNote,
  deleteNote,
  editNote,
  notifyDecision,
  passOver,
  passOverMany,
  sendPendingRejections,
  setInterview,
  setPhase,
  setStatus,
  setStatusMany,
} from "./actions";
import {
  DIRECT_STATUSES,
  INTERVIEW_CAP,
  INTERVIEW_MINUTES,
  STAGE_LABELS,
  STATUSES,
  arrivalStamp,
  choiceAtStage,
  fromRiyadhInput,
  interviewClashes,
  interviewLabel,
  whatsappHref,
  toRiyadhInput,
  inScopes,
  openOnly,
  type Note,
  type Row,
} from "./stats";

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

type Props = {
  rows: readonly Row[];
  notes: readonly Note[];
  /** أعلى رتبةٍ فُتح العملُ عليها */
  phase: number;
  /** نطاقاتُ القارئ — فارغةٌ للرئاسة، وهي ترى الكلّ */
  scopes: readonly string[];
  isAdmin: boolean;
  /** بريدُ القارئ — به يُعرف ما يملك تعديلَه */
  me: string;
};

/**
 * الحالاتُ التي تُضبط بزرّ — الخمسُ مقصوصةٌ على ثلاث.
 *
 * ⛔ «معتذَر عنه» لا زرَّ لها: مسارُها «لا يناسب لجنتي» وحده، فالقاعدةُ
 * هي التي تقرّر أهو نزولٌ إلى رغبةٍ تالية أم اعتذارٌ نهائيّ. و«محال
 * للثانية» زالت — النزولُ صار `stage + 1`.
 *
 * وتُقصّ هنا مرّةً واحدةً فتتبعها أزرارُ القرار ورقائقُ الترشيح معًا.
 */
const PHASE_STATUSES = STATUSES.filter((s) => DIRECT_STATUSES.includes(s.key));

/** طابورُ المرحلة الأولى، أو كلُّ من ذكرني في رغباته الثلاث */
type Queue = "first" | "all";

/**
 * النطاقاتُ التسعة — **مبنيّةٌ من المحتوى لا مكتوبةٌ يدويًّا**.
 *
 * لجنةٌ واحدةٌ لكلٍّ من الأربع (وحداتُها تدخل بمطابقة البادئة)، ومشروعٌ
 * لكلّ مشروعٍ مفتوح. ولو أُغلق مشروعٌ أو فُتح آخر تتبعُه هذي القائمةُ
 * وحدَها — ونسخُها يدويًّا كان يعني معاينةً لجهةٍ لم تعد تستقبل.
 */
const SCOPE_OPTIONS: readonly { value: string; label: string }[] = [
  ...COMMITTEES.map((c) => ({
    value: `committee:${c.slug}`,
    label: c.name,
  })),
  ...PROJECTS.filter((p) => p.applicationState === "open").map((p) => ({
    value: `project:${p.slug}`,
    label: p.name,
  })),
];

type Meter = {
  value: string;
  label: string;
  /** كم هم عند هذي الجهة الآن */
  total: number;
  /** كم منهم مدعوٌّ للمقابلة */
  invited: number;
  /** وكم لم يُحسم أمرُه بعد — صفرٌ يعني أن الجهة فرغت */
  pending: number;
};

const SORTS = [
  /**
   * ⚠️ **افتراضُ القائد — لا «الأحدث».**
   *
   * «الأحدث» ترتيبُ **صندوقِ وارد**: يجيب «ما الجديد؟». وشغلُ القائد عكسُه
   * تمامًا — طابورٌ له آخِرٌ يجب أن يفرغ، ومن دخل أوّلًا وُعد بنتيجةٍ خلال
   * أسبوعين قبل غيره. فترتيبُ الأحدث يدفن **الأطولَ انتظارًا** في الذيل،
   * وهم بالضبط من يجب أن يُبدأ بهم.
   *
   * فهذا يرتّب على سؤالين لا على وقت الوصول: **هل بقي فيه شغل؟** (من لم
   * يُقرأ، ثم من دُعي ولم يُحسم، ثم المحسوم أخيرًا) ثم **من أطال
   * الانتظار؟** (الأقدمُ أوّلًا داخل كل مرتبة).
   */
  { key: "triage", label: "الأولى بالبدء" },
  { key: "newest", label: "الأحدث" },
  { key: "oldest", label: "الأقدم" },
  /* ⚠️ **من له موعدٌ أوّلًا ثم الأقرب.** بلا هذا الشرط تتصدّر القائمةَ
     صفوفٌ بلا موعدٍ لأن `null` يُقارَن كأنه أصغر — فيبحث القائدُ عمّن
     عنده اليوم في آخر ستّةٍ وأربعين. */
  { key: "interview", label: "الأقرب موعدًا" },
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

type Item = {
  label: string;
  ok: boolean;
  weight: number;
  /**
   * نصيبُ البند من وزنه (٠..١) — لبندٍ يُنجَز على أجزاء.
   *
   * ⚠️ **وبلاها كان بندُ الأجوبة يساوي بين من ترك واحدًا ومن ترك الكلّ.**
   * كان `ok: requiredAsked.every(...)` — أي صفرًا من عشرين لمن أجاب ثلاثةً
   * من أربعة. ومقيسٌ من القاعدة (١٩ أغسطس ٢٠٢٦) أن **٩٩ من ٢٦١** تركوا
   * جوابًا واحدًا على الأقلّ فارغًا، فالحالةُ الوسطى هي الغالبة لا النادرة.
   */
  part?: number;
};

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
    const done = requiredAsked.filter((a) => a.value.trim().length > 0).length;
    items.push({
      /* العددُ في الوسم: «٣ من ٤» تقول للقائد **ما الناقص** لا «لم يكتمل» */
      label: `أجوبة القادة (${done} من ${requiredAsked.length})`,
      ok: done === requiredAsked.length,
      part: done / requiredAsked.length,
      weight: 20,
    });
  }
  const max = items.reduce((a, b) => a + b.weight, 0);
  const got = items.reduce(
    (a, b) => a + b.weight * (b.part ?? (b.ok ? 1 : 0)),
    0,
  );
  return { items, pct: max ? Math.round((got / max) * 100) : 0 };
}

/**
 * مرتبةُ البدء — **الأصغرُ يُقرأ أوّلًا**.
 *
 * ⚠️ **بلا `Date.now()` عمدًا.** هذا يُحسب في الرسم، والرسمُ يقع على الخادم
 * ثم يُعاد على العميل. فساعةٌ في المقارنة تعني ترتيبين مختلفين للحظتين
 * مختلفتين — أي **اختلافُ ترطيبٍ** يعيد React رسمَ القائمة كلَّها ويصرخ في
 * الطرفية. والحالةُ وحدها تكفي: «فات موعدُه» ظاهرٌ في الصفّ بعلامته.
 */
function triageRank(row: Row): number {
  /* محسومٌ = لا شغلَ فيه. يبقى في القائمة ليُراجَع، ويُدفع إلى الذيل */
  if (row.status === "accepted" || row.status === "rejected") return 2;
  /* دُعي للمقابلة ولم يُحسم — شغلٌ بدأ ولم ينتهِ */
  if (row.status === "reviewing") return 1;
  /* لم يُفتح بعد — وهذا أوّلُ ما يُبدأ به */
  return 0;
}

/**
 * مقتطفٌ حول موضع المطابقة — **يقول للقائد لماذا ظهر هذا الصفّ**.
 *
 * ⚠️ بلا المقتطف يرى صفًّا لا يطابق اسمُه ولا لجنتُه ما كتب، فيظنّ الترشيحَ
 * معطوبًا. والدافعُ قد يبلغ مئاتِ الحروف، فيُقصّ حول الموضع لا من أوّله.
 */
function snip(text: string, needle: string): string {
  const at = text.toLowerCase().indexOf(needle);
  if (at === -1) return "";
  const from = Math.max(0, at - 24);
  const to = Math.min(text.length, at + needle.length + 48);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${to < text.length ? "…" : ""}`;
}

/** كلُّ نصٍّ حرٍّ في الصفّ: الدافعُ ثم أجوبةُ القادة */
function freeText(row: Row): string[] {
  return [row.why ?? "", ...Object.values(row.answers ?? {})];
}

/**
 * أوّلُ نصٍّ حرٍّ يطابق — ومقتطفٌ منه.
 *
 * ⚠️ **ولا يُبنى بـ`askedQuestions`.** تلك تمرّ على كتل الأسئلة لتردّ كلَّ
 * جوابٍ إلى سؤاله، وهي محسوبةٌ أصلًا في `completeness` لكلّ صفّ — فاستدعاؤها
 * ثانيةً **مع كلّ حرفٍ يُكتب في البحث** يضاعف عملًا لا يظهر منه إلّا مقتطف.
 * والقيمُ الخام تكفي للمطابقة والاقتطاف.
 */
function textHit(row: Row, needle: string): string {
  for (const text of freeText(row)) {
    const found = snip(text, needle);
    if (found) return found;
  }
  return "";
}

/* ── الجذر ──────────────────────────────────────────────────────────────── */

export function ApplicationsTable({
  rows,
  notes,
  phase,
  scopes,
  isAdmin,
  me,
}: Props) {
  const [q, setQ] = useState("");
  const [status, setStatusFilter] = useState<string>("all");
  /* ⚠️ **«الرغبة الأولى» هي الافتراض لا «الكلّ».** القائدُ يستقبل من ذكره
     ثانيةً وثالثةً أيضًا، وقبولُ أحدهم قبل أن يقابله قائدُ رغبته الأولى
     يُبطل ترتيبَ الرغبات كلَّه — وهو ما تقوم عليه خطّةُ الموسم. فالطابورُ
     يفتح على من اختارك **أوّلًا**، والبقيّةُ خلف تبديلٍ مقصود. */
  const [queue, setQueue] = useState<Queue>("first");
  /** أيشمل البحثُ الدافعَ وأجوبةَ القادة؟ مطفأٌ افتراضيًّا — التعليل عند `extra` */
  const [inText, setInText] = useState(false);
  /* ⚠️ **معاينةٌ للرئاسة، لا تنازلٌ عن صلاحية.** الرئاسةُ ترى الكلَّ في
     القاعدة ولا يغيّر هذا شيئًا من ذلك — يغيّر **ما تعرضه الشاشة** حتى
     يتحقّق من يوزّع الحسابات ممّا سيراه كلُّ قائدٍ قبل أن يسلّمه المفتاح.
     ولذلك يُقال في الشريط صراحةً إنها معاينة. */
  const [viewAs, setViewAs] = useState<string>("");
  /* المحدَّدون للفعل الجماعيّ — بالمعرّف لا بالفهرس، فالترتيبُ يتغيّر */
  const [picked2, setPicked2] = useState<ReadonlySet<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const rosterRef = useRef<HTMLUListElement>(null);
  /* ⚠️ **الافتراضُ يتبع الدور.** القائدُ يفرغ طابورًا فيبدأ بـ«الأولى
     بالبدء»؛ والرئاسةُ تراقب الوارد فيبقى «الأحدث» أنفعَ لها. */
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>(
    isAdmin ? "newest" : "triage",
  );
  const [picked, setPicked] = useState<string | null>(null);
  /** لوحُ الاختصارات — يُفتح بـ«؟» أو بالزرّ في الشريط */
  const [help, setHelp] = useState(false);
  /**
   * معاينةُ السيرة داخل الملفّ — **والحالةُ هنا لا في `Dossier`**.
   *
   * ⚠️ `Dossier` يُعاد تركيبُه عند كل متقدّم (`key={row.id}`)، فحالتُه تموت
   * معه. ولو سكنت هناك لَفتح القائدُ المعاينةَ لكلّ واحدٍ من التسعةِ
   * والستّين — وهو بالضبط النقرُ الذي بُنيت لتلغيه. فتُفتح مرّةً، ثم
   * `j`/`k` تمرّ على السِّيَر واحدةً بعد أخرى وهي مفتوحة.
   */
  const [cvOpen, setCvOpen] = useState(false);
  /**
   * التمريرُ بالمفتاح **مسلَّحٌ على معرَّفٍ بعينه** لا على «مسلَّح/غير مسلَّح».
   *
   * ⚠️ لو كان منطقيًّا لَوقع هذا: يضغط `p` على فلان، ثم `j` فينتقل لغيره،
   * ثم `p` ثانيةً يقصد بها تسليحَ الجديد — **فتُمرَّر على الجديد بلا
   * تأكيد**. وبالمعرَّف: انتقالُه يُبطل التسليح من نفسِه.
   */
  const [passArm, setPassArm] = useState<string | null>(null);
  /** نتيجةُ آخرِ فعلٍ بالمفتاح — الزرُّ يقولها عنده، والمفتاحُ لا زرَّ له */
  const [keyNote, setKeyNote] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const live = useHydrated();

  /* ⚠️ **الرئاسةُ بلا نطاق، وكلُّ جهةٍ لها.** `inScopes` على مصفوفةٍ
     فارغة تُرجع «لا» دائمًا، فلولا هذا الاستثناء لفتحت الرئاسةُ طابورًا
     فارغًا على ٢٤٠ طلبًا. */
  /* النطاقُ المعروض: المعاينةُ إن اختيرت، وإلّا نطاقُ القارئ نفسِه */
  const asScopes = useMemo(
    () => (viewAs ? [viewAs] : scopes),
    [viewAs, scopes],
  );
  /* ورئاسةٌ تعاين تُعامَل معاملةَ القائد — وإلّا لَما رُشّح شيء */
  const asAdmin = isAdmin && !viewAs;

  /* ⚠️ **`choiceAtStage` لا `choice1`.** الطابورُ يعرض من هو **عندك
     الآن** — ومن نزل إليك كرغبةٍ ثانية هو عندك بقدر من اختارك أوّلًا.
     وتثبيتُه على `choice1` كان يُخفي المرحلةَ الثانية كلَّها عن أصحابها. */
  /* ⚠️ **و`stage <= phase` معها.** القاعدةُ تمنع العملَ على رتبةٍ لم
     تُفتح؛ فعرضُها في الطابور يضع أمام القائد أشخاصًا كلُّ زرٍّ عليهم
     يُردّ — «الطلب غير متاح» بلا سببٍ مفهوم. والمنعُ يُقال بألّا يُعرضوا،
     ويبقون في «كلُّ من ذكرك» لمن أراد أن يستبق. */
  const pool = useMemo(() => {
    if (queue === "all" || asAdmin) return rows;
    return rows.filter(
      (r) => r.stage <= phase && inScopes(choiceAtStage(r), asScopes),
    );
  }, [rows, queue, asScopes, asAdmin, phase]);

  const scored = useMemo(
    () => pool.map((r) => ({ row: r, ...completeness(r) })),
    [pool],
  );

  /* ⚠️ **المزاحمةُ على كلّ الصفوف لا على البِركة.** «يزاحمك ثمانية» حقيقةٌ
     عن الجهة، لا عن الشاشة المعروضة — وحسبُها على المرشَّح يجعل الرقم
     يتغيّر كلّما بدّل القائدُ الطابور. */
  const rivalry = useMemo(() => competitionOf(rows), [rows]);

  /* تُجمَّع مرّةً لا لكلّ ملفٍّ يُفتح — الترتيبُ تصاعديٌّ من الاستعلام */
  const notesByApp = useMemo(() => {
    const m = new Map<string, Note[]>();
    for (const n of notes) {
      const list = m.get(n.application_id);
      if (list) list.push(n);
      else m.set(n.application_id, [n]);
    }
    return m;
  }, [notes]);

  /**
   * مدخلُ كلّ جهةٍ في نطاق القارئ — **الجهةُ وحدةُ العدّ لا القائد**.
   *
   * يُحسب من `rows` لا من `pool`: المدعوّون حقيقةٌ عن الوحدة لا عمّا
   * يعرضه الطابورُ الآن، فتبديلُ العرض لا يحرّك الرقم.
   */
  const meters = useMemo<Meter[]>(() => {
    const m = new Map<
      string,
      { total: number; invited: number; pending: number }
    >();
    for (const r of rows) {
      /* على الجهة التي هو عندها الآن — فمن نزل يُحسب على مضيفه الجديد */
      const at = choiceAtStage(r);
      if (!at) continue;
      if (!asAdmin && (r.stage > phase || !inScopes(at, asScopes))) continue;
      const e = m.get(at) ?? { total: 0, invited: 0, pending: 0 };
      e.total += 1;
      if (r.status === "reviewing") e.invited += 1;
      /* «بلا قرار» = لم يُقبل ولم يُمرَّر. وهو الرقمُ الذي تُقفَل به مرحلة */
      if (r.status === "new" || r.status === "reviewing") e.pending += 1;
      m.set(at, e);
    }
    /* ⚠️ **الاسمُ القصير للقائد، والكاملُ للرئاسة.** القائدُ يرى وحداتِ
       لجنةٍ واحدة، فتكرارُ اسم اللجنة ثلاثَ مرّاتٍ يبتلع السطر ولا يفرّق
       شيئًا. والرئاسةُ ترى سبعَ عشرة جهةً من لجانٍ شتّى، وفيها أسماءُ
       وحداتٍ متشابهة («وحدة التصميم» و«التصميم الجرافيكي») — فيلزمها
       الكامل. */
    return [...m.entries()]
      .map(([value, v]) => ({
        value,
        label: asAdmin ? prefName(value) : prefShort(value),
        ...v,
      }))
      .sort((a, b) => b.invited - a.invited || b.total - a.total);
  }, [rows, asScopes, asAdmin, phase]);

  /**
   * أرقامُ شريط المرحلة — **على نطاق القارئ لا على النادي كلِّه**.
   *
   * ⚠️ **عطبٌ رُصد في لقطةٍ قبل النشر:** كان الشريطُ يعدّ من `rows` كلِّها،
   * فيقول لقائد الإعلامية «٦٢ بلا قرار» وطابورُه ٢٣ — والفرقُ من ذكروه
   * ثانيةً وثالثةً وليسوا شغلَه الآن. رقمٌ كهذا يجعل القائدَ يظنّ أن أمامه
   * ثلاثةَ أضعاف ما أمامه.
   *
   * و«بلا قرار» يُجمع من العدّادات نفسِها فلا يفترق رقمٌ عن رقم.
   */
  const stagePending = useMemo(
    () => meters.reduce((a, m) => a + m.pending, 0),
    [meters],
  );

  /** ومن نزل ولم تُفتح رتبتُه بعد — بالنطاق نفسِه */
  const stageWaiting = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.stage > phase &&
          (asAdmin || inScopes(choiceAtStage(r), asScopes)),
      ).length,
    [rows, phase, asAdmin, asScopes],
  );

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

    /**
     * **البحثُ في الدوافع — وضعٌ يُطلَب، لا توسيعٌ صامتٌ للبحث.**
     *
     * ⚠️ **السببُ مقيسٌ لا مخشيّ.** التضمينُ في نصٍّ حرٍّ عربيٍّ يطابق داخلَ
     * الكلمات: قِيس على القاعدة (١٩ أغسطس ٢٠٢٦) أن **«علي»** يطابق سبعةَ
     * أسماء و**ثمانيةً وعشرين** دافعًا — «التعليم» و«عليها» و«عليّ». فطيُّه
     * في البحث العاديّ يجعل من يبحث عن شخصٍ اسمه عليّ يرى ٣٥ صفًّا بدل ٧،
     * **وضجيجًا أربعةَ أضعاف الإشارة**، بلا أن يفهم لماذا.
     *
     * وفي المقابل «تصميم» يطابق **صفرَ اسمٍ واثني عشرَ دافعًا**، و«تسويق»
     * صفرًا وستّة — أي أن الوضعين نافعان وكلٌّ في سؤاله. فيُفصلان بمفتاح،
     * وتُقال المطابقةُ في الصفّ حتى لا يُقرأ الصفُّ بلا سبب ظهوره.
     *
     * وهو أنفعُ ما يكون لمن لا سيرةَ له — و**١٩٠ من ٢٥٩** بلا سيرة، فالدافعُ
     * كلُّ ما عنهم.
     */
    const extra =
      inText && needle
        ? scored.filter(({ row: r }) => {
            if (status !== "all" && r.status !== status) return false;
            if (out.some((x) => x.row.id === r.id)) return false;
            return freeText(r).some((t) => t.toLowerCase().includes(needle));
          })
        : [];

    const s = [...out, ...extra];
    if (sort === "triage")
      /* ⚠️ **الاستقرارُ محسوبٌ لا متروك.** `sort` في JS مستقرّة، والمصفوفةُ
         داخلةٌ مرتّبةً بالأحدث — فمن تساوت مرتبتُهم يخرجون بالأحدث، وهو
         عكسُ المقصود. فالأقدمُ يُطلب صراحةً بالمقارنة الثانية. */
      s.sort(
        (a, b) =>
          triageRank(a.row) - triageRank(b.row) ||
          Date.parse(a.row.created_at) - Date.parse(b.row.created_at),
      );
    else if (sort === "oldest") s.reverse();
    else if (sort === "name")
      s.sort((a, b) => a.row.full_name.localeCompare(b.row.full_name, "ar"));
    else if (sort === "full") s.sort((a, b) => b.pct - a.pct);
    else if (sort === "interview")
      s.sort((a, b) => {
        const x = a.row.interview_at;
        const y = b.row.interview_at;
        if (!x && !y) return 0;
        if (!x) return 1;
        if (!y) return -1;
        return Date.parse(x) - Date.parse(y);
      });

    /* ⚠️ **المقتطفُ لمن ظهر بالدافع وحدَه.** من طابق اسمُه أو لجنتُه ظهورُه
       مفهوم، فلا يُقتطع سطرُه لأجل تفسيرٍ لا يحتاجه. */
    const onlyText = new Set(extra.map((x) => x.row.id));
    return s.map((x) => ({
      ...x,
      hit: onlyText.has(x.row.id) ? textHit(x.row, needle) : "",
    }));
  }, [scored, q, status, sort, inText]);

  /* ⚠️ المختارُ **يتبع ما يُعرض**: لو أخفاه الترشيح انتقل الاختيار لأول
     ظاهر. ولولا ذلك لبقي الملفّ يعرض متقدّمًا غائبًا عن القائمة. */
  const current = shown.find((s) => s.row.id === picked) ?? shown[0] ?? null;

  /**
   * موضعُ المفتوح في الطابور — **و«التالي» بلا رجوعٍ إلى القائمة**.
   *
   * ⚠️ **رُصد في الرحلة لا في الشيفرة:** على الجوّال يملأ الملفُّ الشاشةَ
   * وتنزوي القائمة، فدورةُ القائد لكلّ متقدّم: افتح ← قرِّر ← **ارجع ←
   * ابحث عن موضعك ← افتح التالي**. ثلاثُ لمساتٍ زائدةٍ في كلّ دورة، وفي
   * طابورٍ من ٥٧ تصير ١٧١ لمسةً لا تقرّر شيئًا. و«ارجع» أسوأُها: القائمةُ
   * تعود إلى رأسها فيبحث بعينه عن آخرِ من قرأ.
   *
   * وعلى الحاسب `j`/`k` تحلّها — لكن من لم يفتح لوحَ الاختصارات لا يعلم،
   * ولا لوحةَ مفاتيح على الجوّال أصلًا.
   */
  /**
   * من يتعارض موعدُه مع المفتوح — **للمفتوح وحدَه لا لكلّ الصفوف**.
   *
   * ⚠️ حسابُه لكلّ صفٍّ يعني مقارنةَ كلّ موعدٍ بكلّ موعدٍ في كلّ رسم؛
   * والقائدُ لا يقرأ إلّا ملفًّا واحدًا. ولوحُ المقابلات يمسح الكلَّ مرّةً
   * واحدةً بطريقةٍ أرخص لأنه يعرض الكلّ أصلًا.
   */
  const clash = useMemo(
    () =>
      current
        ? interviewClashes(rows, current.row).map((r) => r.full_name)
        : [],
    [rows, current],
  );

  /**
   * كم مدعوًّا في **جهة المفتوح** — يُقال عند زرّ الدعوة لا في شريطٍ فوقه.
   *
   * ⚠️ **الرقمُ كان معروضًا ولم يكن يُقرأ في وقته.** شريطُ «مدعوّون
   * للمقابلة» فوق الشاشة يعرض `١٥/١٥` ملوَّنًا، لكنّ القائدَ حين يضغط
   * «دعوة لمقابلة» يكون ناظرًا إلى الملفّ لا إلى الشريط — فيدعو السادسَ
   * عشرَ وهو لا يدري. والعددُ ينفع حيث يقع القرار.
   */
  const capInvited = useMemo(() => {
    if (!current) return null;
    const at = choiceAtStage(current.row);
    return meters.find((m) => m.value === at)?.invited ?? null;
  }, [current, meters]);

  /** كم في نطاق القارئ أصلًا — به يُفرَّق «فرغ طابورُك» عن «لا طلبَ لك» */
  const scopeTotal = useMemo(
    () => meters.reduce((a, m) => a + m.total, 0),
    [meters],
  );

  const at = current ? shown.findIndex((x) => x.row.id === current.row.id) : -1;
  const step = useCallback(
    (delta: number) => {
      const next = shown[at + delta];
      if (next) setPicked(next.row.id);
    },
    [shown, at],
  );

  /* ⚠️ **المحدَّدون يُقصّون على المعروض.** من حُدّد ثم أخفاه بحثٌ أو ترشيحٌ
     يبقى في المجموعة ويُصيبه الفعلُ الجماعيّ وهو غائبٌ عن العين — وهذا
     أسوأُ ما يقع في تحديدٍ متعدّد: تغيّرُ حالةِ من لم تره. */
  const selected = useMemo(
    () => shown.filter((x) => picked2.has(x.row.id)).map((x) => x.row.id),
    [shown, picked2],
  );

  const toggle = useCallback((id: string) => {
    setPicked2((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /**
   * لوحةُ المفاتيح — **لمن يفرز ستّةً وأربعين لا لمن يفتح واحدًا**.
   *
   * ⚠️ **ولا تعمل داخل حقلٍ يُكتب فيه.** ملاحظةُ مقابلةٍ فيها حرف «ج» كانت
   * ستقفز بالاختيار وتضبط حالة، ورقمٌ في البحث كان سيغيّر قرارًا. فيُفحص
   * هدفُ الحدث أوّلًا، وتُترك المعدِّلات (Ctrl/Cmd) للمتصفّح.
   *
   * 🔴 **و`e.code` لا `e.key` — وهذا ليس تفصيلًا هنا.** `e.key` يُرجع
   * **الحرفَ المكتوب** لا الزرَّ المضغوط. فقائدٌ لوحتُه على العربية يضغط
   * زرّ `j` فيصل الحدثُ بـ«ت»، و`k` بـ«ن»، و`x` بـ«ء» — فلا يطابق شيئًا،
   * و**الاختصاراتُ كلُّها ميّتةٌ عنده بلا رسالةِ خطأ**. وأكثرُ من يفرز
   * طلبات نادٍ عربيٍّ لوحتُه على العربية. و`e.code` اسمُ الزرّ في الهيكل
   * (`KeyJ`) فلا يتبدّل بتبدّل اللغة.
   *
   * وتبقى `Escape` والأسهم على `e.key`: أسماؤها لا تتبع تخطيطًا أصلًا.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);

      if (e.key === "Escape") {
        /* ⚠️ **ترتيبُ التراجع: الأعلى طبقةً أوّلًا.** اللوحُ يغطّي الشاشة،
           فـ`Escape` عليه تعني «أغلقه» لا «ألغِ تحديد العشرين خلفه». */
        if (help) {
          setHelp(false);
          return;
        }
        /* ⚠️ **Escape داخل حقلٍ يخرج منه، ولا يُلغي التحديد.** لو ألغاه
           لضاع تحديدُ عشرين بضغطةٍ يقصد بها الخروجَ من مربّع البحث. فأوّلُ
           ضغطةٍ تُخرجه، والثانيةُ — وقد صار خارجَ الحقل — تُلغي. */
        if (typing) {
          (t as HTMLElement).blur();
          return;
        }
        setPassArm(null);
        setPicked2(new Set());
        return;
      }

      /* «؟» = Shift على زرّ `/` — والزرُّ نفسُه في كل تخطيط */
      if (e.code === "Slash" && e.shiftKey && !typing) {
        e.preventDefault();
        setHelp((v) => !v);
        return;
      }
      /* ⚠️ و«/» **لا تعمل واللوحُ مفتوح**: تُركّز حقلًا خلف طبقةٍ تغطّيه،
         فيكتب القائدُ ولا يرى ما يكتب. و«؟» وحدها تعبر لأنها تُغلقه. */
      if (e.code === "Slash" && !e.shiftKey && !typing && !help) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing || help) return;

      const at = shown.findIndex((x) => x.row.id === current?.row.id);
      const go = (i: number) => {
        const next = shown[Math.max(0, Math.min(shown.length - 1, i))];
        if (next) setPicked(next.row.id);
      };

      /* ⚠️ **كلُّ مفتاحٍ غيرِ `p` ينزع التسليح.** وإلّا بقي مسلَّحًا في
         الخلفية بينما يقرأ القائدُ ويبحث، ثم وقعت ضغطةُ `p` بعد دقائق
         على تسليحٍ نسيَه. */
      /* ⚠️ ونتيجةُ التمرير تزول معه. اللوحةُ مبنيّةٌ على ألّا تُمرَّر
         الصفحة، وكلُّ سطرٍ هنا يُخصم من ارتفاع القائمة — فرسالةٌ تبقى
         بعد أن قُرئت تقتطع صفًّا من كل شاشة إلى أن يُعاد التحميل. */
      if (e.code !== "KeyP") {
        setPassArm(null);
        setKeyNote(null);
      }

      if (e.code === "KeyJ" || e.key === "ArrowDown") {
        e.preventDefault();
        go(at + 1);
      } else if (e.code === "KeyK" || e.key === "ArrowUp") {
        e.preventDefault();
        go(at - 1);
      } else if (e.code === "KeyC") {
        /* معاينةُ السيرة — تبديلٌ لا فتحٌ لواحد، فتبقى على من بعده */
        e.preventDefault();
        setCvOpen((v) => !v);
      } else if (e.code === "KeyX") {
        if (current) {
          e.preventDefault();
          toggle(current.row.id);
        }
      } else if (e.code === "KeyP") {
        /**
         * **التمرير — وهو الفعلُ الذي كان وحدَه بلا مفتاح.**
         *
         * ⚠️ **بخطوتين كالزرّ، لا بضغطةٍ واحدة.** ضبطُ الحالة (`1`‑`3`)
         * يُنقض بضغطةٍ أخرى، أمّا التمريرُ فينقل الصفَّ **خارج نطاق
         * القائد** — فلا يقدر على ردّه بنفسه. وضغطةٌ واحدةٌ على مفتاحٍ
         * مجاورٍ لا تكفي لقرارٍ كهذا.
         */
        if (!current) return;
        e.preventDefault();
        const row = current.row;
        if (row.status === "accepted" || row.status === "rejected") {
          setKeyNote({ ok: false, text: "قرارُه نهائيٌّ ولا يُنقض بتمرير" });
          return;
        }
        if (passArm !== row.id) {
          setKeyNote(null);
          setPassArm(row.id);
          return;
        }
        setPassArm(null);
        void passOver(row.id).then((res) =>
          setKeyNote({ ok: res.ok, text: res.message }),
        );
      } else if (
        e.code === "Digit1" ||
        e.code === "Digit2" ||
        e.code === "Digit3"
      ) {
        const key = {
          Digit1: "new",
          Digit2: "reviewing",
          Digit3: "accepted",
        }[e.code];
        if (current && key) {
          e.preventDefault();
          void setStatus(current.row.id, key);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, current, toggle, help, passArm]);

  /* المختارُ يُجلب إلى المرأى حين يُنقل بالمفاتيح — وإلّا تحرّك اختيارٌ
     لا يُرى في قائمةٍ من ستّةٍ وأربعين. */
  useEffect(() => {
    if (!current) return;
    rosterRef.current
      ?.querySelector(`[data-id="${current.row.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of pool) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [pool]);

  const kpis = useMemo(
    () => ({
      waiting: (counts.new ?? 0) + (counts.reviewing ?? 0),
      decided: (counts.accepted ?? 0) + (counts.rejected ?? 0),
      withCv: pool.filter((r) => r.cv_path).length,
      avg: scored.length
        ? Math.round(scored.reduce((a, b) => a + b.pct, 0) / scored.length)
        : 0,
    }),
    [counts, scored, pool],
  );

  /* ⚠️ **يُحسب من الصفوف الواصلة لا باستعلامٍ ثانٍ.** الصفوفُ مقصوصةٌ
     بـ`RLS` أصلًا، فالعدُّ هنا يخصّ نطاق قارئه تلقائيًّا — وهو نفسُ ما
     سترسله الدالّة. واستعلامٌ ثانٍ يُدخل احتمالَ أن يختلف العددُ المعروض
     عمّا يُرسَل. */
  const pendingRejections = useMemo(
    () =>
      rows.filter((r) => r.status === "rejected" && !r.decision_mailed_at)
        .length,
    [rows],
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
      <Kpis {...kpis} total={pool.length} />

      {/* ⚠️ **يُقال إنها معاينة، ولا يُترك للاستنتاج.** رئاسةٌ نسيت أنها
          تعاين تقرأ «٤٦ طلبًا» فتظنّها حصيلةَ النادي كلِّه — وهي حصيلةُ
          لجنةٍ واحدة. والرقمُ الخطأُ هنا يُغلق فرزًا قبل أوانه. */}
      {viewAs && (
        <p
          className="tile shrink-0 px-s4 py-s2 text-[0.78rem] font-medium"
          style={{
            borderColor: "color-mix(in oklab, var(--d-cyan) 55%, transparent)",
            background: "color-mix(in oklab, var(--d-cyan) 12%, transparent)",
          }}
        >
          تشوف الآن شاشةَ قائدِ{" "}
          <strong>
            {SCOPE_OPTIONS.find((o) => o.value === viewAs)?.label ?? viewAs}
          </strong>
          . صلاحيّتُك لم تتغيّر، والمعروضُ وحده تغيّر.
        </p>
      )}

      <PhaseBar
        phase={phase}
        open={stagePending}
        waiting={stageWaiting}
        scopeTotal={scopeTotal}
        isAdmin={isAdmin}
      />

      <IntakeMeters meters={meters} />

      <Toolbar
        q={q}
        setQ={setQ}
        searchRef={searchRef}
        status={status}
        setStatus={setStatusFilter}
        sort={sort}
        setSort={setSort}
        counts={counts}
        total={pool.length}
        showing={shown.length}
        pendingRejections={pendingRejections}
        queue={queue}
        setQueue={setQueue}
        showQueue={!asAdmin}
        beyondFirst={rows.length - pool.length}
        scopeOptions={isAdmin ? SCOPE_OPTIONS : null}
        viewAs={viewAs}
        setViewAs={setViewAs}
        inText={inText}
        setInText={setInText}
        onHelp={() => setHelp(true)}
      />

      {/* ⚠️ **أرضيةُ ارتفاعٍ تحت `flex-1`.** الشاشةُ مبنيّةٌ على ألّا
          تُمرَّر الصفحة، فكلُّ بكسلٍ في الرأس يُخصم من هنا — وعلى شاشةٍ
          قصيرةٍ يهبط الجدولُ إلى صفرٍ فلا يُبلَغ أصلًا (رُصد في الإنتاج:
          «ما أقدر أنزل تحت أبدًا»). فبأرضيّةٍ ثابتة يفيض اللوحُ على الصفحة
          فتُمرَّر قليلًا بدل أن يختفي — تدهورٌ لطيفٌ لا انهيار. */}
      {/* ⚠️ **التسليحُ يُرى، ولا يبقى في الذاكرة وحدها.** الزرُّ يتبدّل
          نصُّه عند تسليحه فيرى القائدُ أنه مسلَّح؛ والمفتاحُ لا شكلَ له —
          فبلا هذا السطر يضغط `p` مرّتين ظانًّا الأولى ضاعت، أو ينساها
          فيمرّر من لم يقصد. والاسمُ فيه صراحةً: التأكيدُ على شخصٍ بعينه. */}
      {passArm && current?.row.id === passArm && (
        <p
          role="status"
          className="tile shrink-0 px-s4 py-s2 text-[0.8rem] font-medium"
          style={{
            borderColor: "color-mix(in oklab, var(--warning) 55%, transparent)",
            background: "color-mix(in oklab, var(--warning) 12%, transparent)",
          }}
        >
          اضغط <b>p</b> ثانيةً لتمرير <strong>{current.row.full_name}</strong>{" "}
          إلى رغبته التالية · <b>Esc</b> للتراجع
        </p>
      )}

      {/* نتيجةُ التمرير بالمفتاح — تُقرأ ثم تزول بأوّل تمريرٍ تالٍ */}
      {keyNote && (
        <p
          role="status"
          className={`tile shrink-0 px-s4 py-s2 text-[0.8rem] font-medium ${
            keyNote.ok ? "" : "text-danger"
          }`}
        >
          {keyNote.text}
        </p>
      )}

      <BulkBar
        ids={selected}
        allShown={shown.length}
        onClear={() => setPicked2(new Set())}
        onAll={() => setPicked2(new Set(shown.map((x) => x.row.id)))}
      />

      <div className="grid min-h-[24rem] flex-1 gap-s3 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <Roster
          items={shown}
          currentId={current?.row.id ?? null}
          onPick={setPicked}
          selected={picked2}
          onToggle={toggle}
          listRef={rosterRef}
        />
        {current ? (
          <Dossier
            key={current.row.id}
            row={current.row}
            items={current.items}
            pct={current.pct}
            rivalry={rivalry}
            notes={notesByApp.get(current.row.id) ?? EMPTY_NOTES}
            me={me}
            clash={clash}
            capInvited={capInvited}
            cvOpen={cvOpen}
            onCvToggle={() => setCvOpen((v) => !v)}
            onBack={() => setPicked(null)}
            at={at}
            of={shown.length}
            onStep={step}
          />
        ) : (
          <section className="tile items-center justify-center p-s7 text-center">
            <p className="text-fg-muted">لا طلبَ يطابق البحث.</p>
          </section>
        )}
      </div>

      {help && <KeysHelp onClose={() => setHelp(false)} />}
    </div>
  );
}

/**
 * لوحُ الاختصارات — **يُفتح بـ«؟» وبزرٍّ، ولا يُترك للتخمين**.
 *
 * ⚠️ **السببُ مقيسٌ لا مفترَض:** لا قائدَ واحدٌ في `staff` حتى اليوم — فكلُّ
 * من سيفتح هذي الشاشة يفتحها **أوّلَ مرّة، وبلا من يشرح**. والدليلُ الوحيد
 * قبل هذا اللوح سطرٌ رماديٌّ بحجم 0.72rem فوق القائمة، **مخفيٌّ دون `lg`** —
 * أي أن من فتحها من جوّاله لم يكن يعلم أن للوحة اختصاراتٍ أصلًا.
 *
 * ⚠️ **ويُعرض على الجوّال أيضًا، وفيه سطرٌ يقول إنها للحاسب.** لوحٌ يُخفى
 * على الجوّال يترك قارئَه يظنّ أن لا شيء هناك؛ ولوحٌ يُعرض بلا هذا السطر
 * يجعله يجرّب مفاتيحَ لا لوحةَ له بها. فالصدقُ أوضحُ من الإخفاء.
 */
function KeysHelp({ onClose }: { onClose: () => void }) {
  const rows: readonly { keys: string; what: string }[] = [
    { keys: "j / k", what: "انتقل للتالي · للسابق (والأسهم مثلُها)" },
    { keys: "1 · 2 · 3", what: "جديد · دعوةٌ لمقابلة · مقبول" },
    { keys: "p", what: "مرِّره لرغبته التالية — بضغطتين، والثانيةُ تأكيد" },
    { keys: "c", what: "اعرض سيرته داخل الملفّ — وتبقى مفتوحةً لمن بعده" },
    { keys: "x", what: "حدِّده لفعلٍ جماعيّ (ثم اختر من الشريط)" },
    { keys: "/", what: "اقفز إلى البحث" },
    { keys: "Esc", what: "اخرج من الحقل · ألغِ التحديد · أغلق هذا اللوح" },
    { keys: "؟", what: "افتح هذا اللوح وأغلقه" },
  ];
  return (
    /* ⚠️ الطبقةُ تُغلق بالنقر خارجَها — ومن نقر داخلَها لا يُغلق عليه
       اللوحُ وهو يقرأ، فالتوقّفُ على الحاوية لا على الجذر. */
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_oklab,var(--charcoal)_62%,transparent)] p-s4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="اختصارات اللوحة"
        onClick={(e) => e.stopPropagation()}
        className="tile max-h-full w-full max-w-[30rem] overflow-y-auto p-s5"
      >
        <div className="mb-s4 flex items-start justify-between gap-x-s4">
          <div>
            <h2 className="text-[1.05rem] font-bold">اختصارات اللوحة</h2>
            <p className="text-fg-muted mt-1 text-[0.76rem]">
              تعمل على الحاسب وأنت خارج حقول الكتابة.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-full bg-bg-sunken px-s4 text-[0.78rem] font-semibold"
          >
            إغلاق
          </button>
        </div>

        <dl className="flex flex-col gap-s2">
          {rows.map((r) => (
            <div
              key={r.keys}
              className="flex items-baseline gap-x-s3 border-t border-line pt-s2"
            >
              <dt
                dir="ltr"
                className="text-fg w-[5.5rem] shrink-0 text-[0.8rem] font-bold"
              >
                {r.keys}
              </dt>
              <dd className="text-fg-muted text-[0.82rem] leading-relaxed">
                {r.what}
              </dd>
            </div>
          ))}
        </dl>

        {/* ⚠️ **يُقال للجوّال ما يفعله بدلَها.** بلا هذا يقرأ قائدُ الجوّال
            لوحًا لا ينطبق عليه ويظنّ اللوحةَ ناقصةً في يده. */}
        <p className="text-fg-muted mt-s4 border-t border-line pt-s3 text-[0.78rem] leading-relaxed lg:hidden">
          على الجوّال لا لوحةَ مفاتيح: افتح الطلب من القائمة، والقرارُ
          وأزرارُه داخل ملفّه.
        </p>
      </div>
    </div>
  );
}

/* ── الفعل الجماعيّ ──────────────────────────────────────────────────────── */

/**
 * شريطُ الأفعال الجماعيّة — يظهر عند أوّل تحديدٍ ويختفي بزواله.
 *
 * ⚠️ **الحاجةُ مقيسةٌ لا مفترَضة.** أكبرُ طابورٍ في الموسم ٤٦ (العلاقات
 * العامة)، ودعوةُ خمسةَ عشرَ للمقابلة تعني **خمسَ عشرةَ نقرةً على خمس عشرة
 * شاشة**. وهنا ثلاثُ نقرات: حدِّد · اضغط · أكِّد.
 *
 * ⚠️ **والتمريرُ بضغطتين ويقول ما سيقع.** «لا يناسب لجنتي» على عشرين
 * دفعةً واحدة قرارٌ لا يُسترجع — فالنصُّ يقول العدد، والنتيجةُ تُفصَّل
 * بعده: كم نزل وكم اعتُذر عنه نهائيًّا.
 */
function BulkBar({
  ids,
  allShown,
  onClear,
  onAll,
}: {
  ids: readonly string[];
  allShown: number;
  onClear: () => void;
  onAll: () => void;
}) {
  const { patchRows } = useStore();
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (ids.length === 0) {
    /* ⚠️ **لا يظهر على الجوّال: لا لوحةَ مفاتيحَ تُشرح.** ٣٥px تُدفع بها
       القائمةُ لأجل نصٍّ لا يُطبَّق على الجهاز الذي يقرؤه. */
    return allShown > 1 ? (
      <p className="text-fg-muted hidden shrink-0 px-s2 text-[0.72rem] lg:block">
        حدِّد عدّةً لتغييرِ حالتهم دفعةً · أو بالمفاتيح:{" "}
        <b className="text-fg">j</b>/<b className="text-fg">k</b> تنقّل ·{" "}
        <b className="text-fg">x</b> تحديد · <b className="text-fg">1‑3</b>{" "}
        حالة · <b className="text-fg">p</b> تمرير · <b className="text-fg">/</b>{" "}
        بحث · <b className="text-fg">؟</b> الكلّ
      </p>
    ) : null;
  }

  const act = (run: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const res = await run();
      setArmed(false);
      setNote({ ok: res.ok, text: res.message });
      if (res.ok) onClear();
    });

  return (
    <div
      className="tile shrink-0 px-s4 py-s2"
      style={{
        borderColor: "color-mix(in oklab, var(--d-cyan) 55%, transparent)",
        background: "color-mix(in oklab, var(--d-cyan) 10%, transparent)",
      }}
    >
      <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2 text-[0.8rem]">
        <b className="tabular-nums" dir="ltr">
          {ids.length}
        </b>
        <span className="text-fg-muted">محدَّدون</span>

        {ids.length < allShown && (
          <button
            type="button"
            onClick={onAll}
            className="text-accent min-h-9 text-[0.78rem] font-semibold underline underline-offset-4"
          >
            حدِّد المعروضين ({allShown})
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="text-fg-muted min-h-9 text-[0.78rem] underline underline-offset-4"
        >
          ألغِ التحديد
        </button>

        <span className="ms-auto flex flex-wrap items-center gap-x-s2 gap-y-s2">
          {PHASE_STATUSES.map((st) => (
            <button
              key={st.key}
              type="button"
              disabled={pending}
              onClick={() =>
                act(() =>
                  setStatusMany(ids, st.key).then((r) => {
                    /* ⚠️ **`r.ids` لا `ids`.** `RLS` تقصّ داخل الاستعلام،
                       فمن ليس عند رتبة القائد لم يُحدَّث — وهو نفسُه
                       الفرقُ الذي تقوله الرسالة «وتُخطّيت ٣». */
                    if (r.ok) patchRows(r.ids, { status: r.status });
                    return { ok: r.ok, message: r.message };
                  }),
                )
              }
              className="min-h-10 rounded-xl border px-s3 text-[0.78rem] font-semibold transition-opacity hover:opacity-100 disabled:opacity-40"
              style={{
                borderColor: `color-mix(in oklab, ${st.color} 50%, transparent)`,
              }}
            >
              {st.label}
            </button>
          ))}

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!armed) {
                setArmed(true);
                setNote(null);
                return;
              }
              act(() =>
                passOverMany(ids).then((r) => ({
                  ok: r.ok,
                  message: r.message,
                })),
              );
            }}
            className="min-h-10 rounded-xl border px-s3 text-[0.78rem] font-semibold transition-opacity disabled:opacity-40"
            style={{
              borderColor: armed
                ? "color-mix(in oklab, var(--danger) 65%, transparent)"
                : "var(--line-strong)",
              background: armed
                ? "color-mix(in oklab, var(--danger) 14%, transparent)"
                : "transparent",
            }}
          >
            {pending
              ? "…يُنفَّذ"
              : armed
                ? `تأكيد: مرِّر ${ids.length} — من انتهت رغباتُه يُعتذر عنه`
                : "لا يناسب لجنتي"}
          </button>
        </span>
      </div>

      {note && (
        <p
          role="status"
          className={`mt-s1 text-[0.78rem] ${note.ok ? "text-success" : "text-danger"}`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}

/* ── المرحلة ─────────────────────────────────────────────────────────────── */

/**
 * شريطُ المرحلة — يقرؤه الجميع، ولا يفتح المرحلةَ إلّا الرئاسة.
 *
 * ⚠️ **والقرارُ لا يُتّخذ أعمى.** «الرئاسةُ تقفل المرحلة» جملةٌ سهلة، لكن
 * على أيّ أساس؟ فيُعرض ما تبقّى **بلا قرارٍ عند الرتبة المفتوحة**: صفرٌ
 * يعني أن كلَّ قائدٍ فرغ، وعددٌ كبيرٌ يعني أن الفتحَ سيسبق شغلًا قائمًا —
 * فيملأ قادةُ الرتبة التالية نصيبَهم من دفعةٍ ناقصة.
 *
 * ⚠️ **ويُقال للقائد أيضًا وإن لم يملك الزرّ.** من لا يعرف أيَّ مرحلةٍ
 * نحن فيها لا يفهم لماذا لا يستطيع العملَ على من يراه في «كلُّ من ذكرك».
 */
function PhaseBar({
  phase,
  open,
  waiting,
  scopeTotal,
  isAdmin,
}: {
  phase: number;
  /** بلا قرارٍ عند الرتبة المفتوحة — في نطاق القارئ */
  open: number;
  /** نزلوا ولم تُفتح رتبتُهم — في نطاقه أيضًا */
  waiting: number;
  /** كم في نطاقه أصلًا — به يُفرَّق «فرغتَ» عن «لا طلبَ لك» */
  scopeTotal: number;
  isAdmin: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const next = phase + 1;

  return (
    <div className="tile shrink-0 px-s4 py-s3">
      <div className="flex flex-wrap items-center gap-x-s4 gap-y-s2 text-[0.8rem]">
        <span className="font-bold">
          المرحلة {phase} — {STAGE_LABELS[phase]}
        </span>
        {/**
         * **لحظةُ الإغلاق — «٠ بلا قرار» ليست جوابًا على «هل انتهيت؟».**
         *
         * ⚠️ الصفرُ رقمٌ يُقرأ بين رقمين، ولا يقول للقائد إنه **فرغ**؛
         * فيبقى يفتح اللوحةَ كلَّ يومٍ يتفقّد شيئًا انتهى. والجملةُ تقول
         * الحالَ وتقول **ما بعدها** — ومن ينتظر فتحَ الرئاسة يعرف أن
         * الانتظارَ ليس تقصيرًا منه.
         *
         * ⚠️ **و`scopeTotal` يفرّق حالتين يخلطهما الصفر:** من أنهى شغلَه،
         * ومن لا طلبَ في نطاقه أصلًا (نطاقٌ خطأ في `staff`، أو جهةٌ لم
         * يذكرها أحد). و«فرغ طابورُك» في الثانية تطمئنُ من يجب أن يقلق.
         */}
        {!isAdmin && open === 0 && scopeTotal === 0 ? (
          <span className="text-fg-muted">
            لا طلبَ في نطاقك بعد — راجع الرئاسةَ إن كان ينبغي أن يصلك شيء.
          </span>
        ) : !isAdmin && open === 0 ? (
          <span className="font-semibold" style={{ color: "var(--st-accepted)" }}>
            ✓ فرغ طابورُك — لا أحدَ بلا قرارٍ عند رتبتك
            {waiting > 0 && ` · وينتظر ${waiting} فتحَ المرحلة ${phase + 1}`}
          </span>
        ) : (
          <span className="text-fg-muted">
            <strong dir="ltr" className="tabular-nums">
              {open}
            </strong>{" "}
            بلا قرارٍ عند هذي الرتبة
          </span>
        )}
        {/* ⚠️ لا يتكرّر: جملةُ «فرغ طابورُك» أعلاه تقول المنتظرين معها */}
        {waiting > 0 && !(!isAdmin && open === 0 && scopeTotal > 0) && (
          <span className="text-fg-muted">
            ·{" "}
            <strong dir="ltr" className="tabular-nums">
              {waiting}
            </strong>{" "}
            نزلوا وينتظرون فتحَ التالية
          </span>
        )}

        {isAdmin && next <= 3 && (
          <div className="ms-auto flex items-center gap-x-s3">
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
                  const res = await setPhase(next);
                  setArmed(false);
                  setNote({ ok: res.ok, text: res.message });
                });
              }}
              className={`min-h-11 rounded-xl border px-s4 text-[0.8rem] font-semibold transition-opacity lg:min-h-10 ${
                pending ? "opacity-50" : "opacity-90 hover:opacity-100"
              }`}
              style={{
                borderColor: armed
                  ? "color-mix(in oklab, var(--warning) 60%, transparent)"
                  : "var(--line-strong)",
                background: armed
                  ? "color-mix(in oklab, var(--warning) 12%, transparent)"
                  : "transparent",
              }}
            >
              {pending
                ? "…تُفتح"
                : armed
                  ? open > 0
                    ? `تأكيد رغم ${open} بلا قرار — افتح المرحلة ${next}`
                    : `تأكيد: افتح المرحلة ${next}`
                  : `افتح المرحلة ${next}`}
            </button>
            {armed && !pending && (
              <button
                type="button"
                onClick={() => setArmed(false)}
                className="text-fg-muted min-h-11 px-s2 text-[0.78rem] underline underline-offset-4 lg:min-h-10"
              >
                تراجع
              </button>
            )}
          </div>
        )}
      </div>

      {/* ⚠️ **لا تُرجَع مرحلة.** يُقال قبل الضغط لا بعده. */}
      {isAdmin && armed && (
        <p className="text-fg-muted mt-s2 text-[0.76rem]">
          لا تُرجَع مرحلةٌ فُتحت — من نزل لا يصعد بإغلاقها.
        </p>
      )}
      {note && (
        <p
          role="status"
          className={`mt-s2 text-[0.8rem] ${note.ok ? "text-success" : "text-danger"}`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}

/* ── ملاحظات المراجعة ───────────────────────────────────────────────────── */

/** مرجعٌ ثابتٌ للفارغ — مصفوفةٌ جديدةٌ كلَّ رسمةٍ تُبطل الحفظ في `Dossier` */
const EMPTY_NOTES: readonly Note[] = [];

/**
 * «قبل ساعتين» — **بعد الترطيب وحده**.
 *
 * ⚠️ الوقتُ النسبيُّ يُحسب من ساعة الجهاز، وساعةُ الخادم غيرُها؛ فحسبُه في
 * أوّل رسمةٍ يجعل نصَّ الخادم يخالف نصَّ العميل فيصرخ React بعدم تطابق.
 * ولذلك يُعرض بعد الترطيب، وقبله يبقى مكانُه فارغًا.
 */
function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 2) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "قبل ساعة" : `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return days === 1 ? "قبل يوم" : `قبل ${days} يومًا`;
}

/**
 * ملاحظاتُ الطاقم على متقدّمٍ واحد — **سجلٌّ يُضاف إليه**.
 *
 * ⚠️ **ولذلك لا حقلَ واحدًا يُكتب فوقه.** رئيسُ اللجنة ونائبُه يدخلان
 * بالنطاق نفسِه ويقابلان في اليوم نفسِه؛ فحقلٌ مشتركٌ يعني أن يمحو أحدُهما
 * ملاحظةَ الآخر بلا أن يعلم — وملاحظةُ مقابلةٍ ضاعت لا تُستعاد إلّا بإعادة
 * المقابلة. والتعليلُ الكامل في هجرة `application_notes`.
 *
 * ⚠️ **والتعديلُ والحذفُ للكاتب وحده — تفرضه القاعدة لا هذي الشاشة.**
 * وإخفاءُ الزرّ هنا راحةٌ للعين لا حراسة: من صنع الاستدعاء بيده تردّه
 * السياسة، ومقيسٌ أن الردّ يقع فعلًا.
 */
function NotesBlock({
  rowId,
  notes,
  me,
}: {
  rowId: string;
  notes: readonly Note[];
  me: string;
}) {
  const { putNote, dropNote } = useStore();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const live = useHydrated();

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    start(async () => {
      setError("");
      const res = await addNote(rowId, body);
      /* ⚠️ **الملاحظةُ من ردّ الخادم لا من المسوَّدة.** الكاتبُ واسمُه
         و`created_at` تكتبها محفِّزاتٌ في القاعدة — فملاحظةٌ نبنيها هنا
         تحمل اسمًا مخمَّنًا يتبدّل تحت عين كاتبها عند أوّل جلب. */
      if (res.ok) {
        putNote(res.note);
        setDraft("");
      } else setError(res.message);
    });
  };

  return (
    <Block title={`ملاحظات المراجعة${notes.length ? ` (${notes.length})` : ""}`}>
      {notes.length === 0 && (
        <p className="text-fg-muted text-[0.84rem]">
          لا ملاحظةَ بعد — اكتب ما دار في المقابلة ليقرأه من يراجع بعدك.
        </p>
      )}

      {notes.length > 0 && (
        <ul className="mb-s3 flex flex-col gap-s2">
          {notes.map((n) => {
            const mine = n.author_email === me;
            const open = editing === n.id;
            return (
              <li key={n.id} className="bg-bg-sunken rounded-xl p-s3">
                <p className="text-fg-muted mb-s1 flex flex-wrap items-center gap-x-s2 text-[0.72rem]">
                  <span className="font-semibold">{n.author_name}</span>
                  {/* الوقتُ بعد الترطيب — انظر `ago` */}
                  {live && <span>· {ago(n.created_at)}</span>}
                  {live && n.updated_at && <span>· عُدّلت</span>}
                </p>

                {open ? (
                  <>
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="border-line text-fg w-full rounded-xl border bg-transparent p-s2 text-[0.86rem] leading-relaxed"
                    />
                    <div className="mt-s2 flex gap-x-s3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            setError("");
                            const res = await editNote(n.id, editDraft);
                            if (res.ok) {
                              /* `updated_at` من `touch_note` لا من هنا */
                              putNote(res.note);
                              setEditing(null);
                            } else setError(res.message);
                          })
                        }
                        className="text-accent min-h-9 text-[0.8rem] font-semibold"
                      >
                        احفظ
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-fg-muted min-h-9 text-[0.8rem]"
                      >
                        تراجع
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[0.88rem] leading-relaxed whitespace-pre-wrap">
                      {n.body}
                    </p>
                    {mine && (
                      <div className="mt-s1 flex gap-x-s3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(n.id);
                            setEditDraft(n.body);
                          }}
                          className="text-fg-muted min-h-9 text-[0.76rem] underline underline-offset-4"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              setError("");
                              const res = await deleteNote(n.id);
                              if (res.ok) dropNote(res.id);
                              else setError(res.message);
                            })
                          }
                          className="text-fg-muted min-h-9 text-[0.76rem] underline underline-offset-4"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="ما دار في المقابلة، وما لاحظتَه…"
        className="border-line text-fg placeholder:text-fg-muted/70 mt-s2 w-full rounded-xl border bg-transparent p-s3 text-[0.86rem] leading-relaxed"
      />
      <div className="mt-s2 flex items-center gap-x-s3">
        <button
          type="button"
          disabled={pending || draft.trim().length === 0}
          onClick={submit}
          className={`border-line-strong min-h-11 rounded-xl border px-s4 text-[0.82rem] font-semibold transition-opacity lg:min-h-10 ${
            pending || draft.trim().length === 0
              ? "opacity-40"
              : "opacity-90 hover:opacity-100"
          }`}
        >
          {pending ? "…يُحفظ" : "أضف ملاحظة"}
        </button>
        {/* ⚠️ **يُقال إنها تُرى.** من ظنّها خاصّةً كتب فيها ما لا يقوله
            أمام زميله — والسجلُّ يُقرأ من كلّ من يرى الطلب. */}
        <span className="text-fg-muted text-[0.72rem]">
          يقرؤها كلُّ من يرى هذا الطلب
        </span>
      </div>

      {error && (
        <p role="alert" className="text-danger mt-s2 text-[0.8rem]">
          {error}
        </p>
      )}
    </Block>
  );
}

/* ── مدخلُ الجهات ────────────────────────────────────────────────────────── */

/**
 * كم دُعي إلى المقابلة في كل جهة — **والرقمُ يُعرض ولا يمنع**.
 *
 * ⚠️ **الجهةُ وحدةُ العدّ، لا القائد.** رئيسُ لجنةٍ نطاقُه ثلاثُ وحدات
 * يرى ثلاثةَ عدّادات: لكلِّ وحدةٍ مدخلُها. وعدّادٌ واحدٌ له كان يعني أن
 * تبتلع وحدةٌ نصيبَ أختها ولا يظهر ذلك في رقمٍ واحد.
 *
 * ⚠️ **ورئيسُ اللجنة ونائبُه يريان العدّادَ نفسَه، وهذا صواب** — الوحدةُ
 * لها مدخلٌ واحدٌ مهما تعدّد من يضغط. ولو أردنا فصلَ نصيب كلٍّ منهما
 * لاحتجنا عمودًا يسجّل مَن دعا، وهو ما لا تحتاجه المرحلة.
 */
function IntakeMeters({ meters }: { meters: Meter[] }) {
  if (meters.length === 0) return null;
  return (
    /* ⚠️ **صفٌّ واحدٌ يُسحب أفقيًّا، لا التفافٌ.** الرئاسةُ ترى سبعَ عشرة
       جهةً، فالالتفافُ يجعلها أربعةَ صفوفٍ تأكل ≈٢٥٠px من ارتفاعٍ ثابت —
       واللوحةُ مبنيّةٌ على ألّا تُمرَّر الصفحة، فالمأكولُ يُخصم من الجدول
       نفسِه حتى يختفي تحت الطيّة ولا يُبلَغ. رُصد في لقطةٍ من الإنتاج:
       «ما أقدر أنزل تحت أبدًا».
       والسحبُ هو نفسُ ما تفعله رقائقُ الحالة أسفلَه منذ البداية. */
    <div className="tile shrink-0 px-s4 py-s2">
      <div className="-mx-s4 flex items-center gap-x-s3 overflow-x-auto px-s4 [scrollbar-width:none]">
        <p className="text-fg-muted shrink-0 text-[0.7rem] font-semibold tracking-[0.1em]">
          مدعوّون للمقابلة
        </p>
        {meters.map((m) => {
          const full = m.invited >= INTERVIEW_CAP;
          return (
            <span
              key={m.value}
              title={`${m.total} عندها الآن · ${m.pending} بلا قرار`}
              className="border-line flex shrink-0 items-center gap-x-s2 rounded-full border px-s3 py-s1 text-[0.76rem]"
              style={
                full
                  ? {
                      borderColor:
                        "color-mix(in oklab, var(--warning) 55%, transparent)",
                      background:
                        "color-mix(in oklab, var(--warning) 12%, transparent)",
                    }
                  : undefined
              }
            >
              <span className="opacity-80">{m.label}</span>
              <span dir="ltr" className="font-bold tabular-nums">
                {m.invited}/{INTERVIEW_CAP}
              </span>
              {/* ⚠️ **علامةُ الفراغ هي ما تُقفَل به المرحلة.** الرئاسةُ
                  تمسح الشريطَ بعينها: كلُّها مُعلَّمة ⇒ لا أحدَ ينتظر
                  قرارًا، فالفتحُ لا يسبق شغلًا قائمًا. */}
              {m.pending === 0 && (
                <span
                  aria-label="فرغت"
                  title="لا أحدَ بلا قرارٍ هنا"
                  style={{ color: "var(--st-accepted)" }}
                >
                  ✓
                </span>
              )}
            </span>
          );
        })}
        {/* ⚠️ **يُقال إنه إرشادٌ لا سقف.** الإدارة قالت «يمديك أقلّ، وفي
            حالات استثناء يمديك أعلى» — فلونٌ تحذيريٌّ بلا هذي الكلمة
            يُقرأ منعًا، فيتوقّف قائدٌ عن دعوةٍ يملكها. */}
        <span className="text-fg-muted shrink-0 ps-s2 text-[0.72rem]">
          إرشادٌ لا سقف
        </span>
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
    {
      label: "بانتظار المراجعة",
      value: waiting,
      of: total,
      tint: "var(--color-warning)",
    },
    { label: "حُسم", value: decided, of: total, tint: "var(--color-success)" },
    { label: "بسيرة ذاتية", value: withCv, of: total, tint: "var(--d-cyan)" },
    {
      label: "متوسّط الاكتمال",
      value: avg,
      of: 100,
      tint: "var(--primary)",
      pctOnly: true,
    },
  ];
  return (
    /* ⚠️ **على الجوّال صفٌّ يُسحب لا شبكةُ ٢×٢.** الشبكةُ كانت تأكل ≈300px
       فوق الطيّة قبل أوّل طلب، والبطاقاتُ الأربعُ **ملخَّصٌ** لا وجهة —
       ولها تبويبُها «اللوحة» أصلًا. والسحبُ الأفقيّ يُبقيها في متناول
       الإبهام بارتفاعِ بطاقةٍ واحدة. الحاسبُ يبقى شبكةَ أربعة. */
    /* ⚠️ **تُخفى على الجوّال — ٧٨px مقيسة.** الأربعةُ كلُّها معروضةٌ في
       تبويب «اللوحة» بتفصيلٍ أوفى، وهنا تدفع القائمةَ تحت الطيّة على شاشةٍ
       ٨٤٤px. والقائدُ يفتح «الطلبات» ليفرز لا ليقرأ نِسبًا. */
    <ul className="-mx-s4 hidden shrink-0 snap-x snap-mandatory gap-s3 overflow-x-auto px-s4 pb-s2 [scrollbar-width:none] sm:flex lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
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
                <p className="text-fg-muted truncate text-[0.72rem]">
                  {c.label}
                </p>
                <p className="flex items-baseline gap-x-s2">
                  <span
                    dir="ltr"
                    className="text-xl leading-none font-bold tabular-nums"
                  >
                    {c.pctOnly ? `${c.value}%` : c.value}
                  </span>
                  {!c.pctOnly && (
                    <span
                      dir="ltr"
                      className="text-fg-muted text-[0.72rem] tabular-nums"
                    >
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
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
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

/**
 * **إرسالُ الرفض بالجملة.**
 *
 * ⚠️ **يستدعي الخادمَ مرارًا حتى يفرغ المتبقّي — لا مرّةً واحدة.** الدالّةُ
 * تُرسل عشرين في الاستدعاء الواحد (مهلةُ الدالّة وحدُّ المزوّد، والتعليل
 * عند `BATCH`)، فبضع مئاتٍ تحتاج عشراتِ الجولات. والحلقةُ هنا لا هناك:
 * استدعاءٌ واحدٌ طويلٌ يُقطع في منتصفه فيضيع خبرُ ما أُرسل.
 *
 * ⚠️ **ولا عدّادَ تقدّمٍ محلّيّ يُعتمد عليه.** كلُّ جولةٍ تسأل القاعدةَ عن
 * المتبقّي وتعرض ردَّها. فلو أغلق القائدُ التبويبَ ثم عاد، أو عمل قائدان
 * معًا، بقي الرقمُ صادقًا — والحارسُ الحقيقيّ `decision_mailed_at` في
 * القاعدة لا شيءٌ في هذي الشاشة.
 *
 * ⚠️ **والتأكيدُ على خطوتين.** ضغطةٌ واحدةٌ تُخرج مئاتِ الرسائل التي لا
 * تُستردّ. فالأولى تُسلّح والثانية تُنفّذ، ويظهر العددُ في نصّ التأكيد.
 */
function BulkRejectButton({ pending }: { pending: number }) {
  const { patchRows } = useStore();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(0);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (pending === 0 && !note) return null;

  async function run() {
    setBusy(true);
    setArmed(false);
    setNote(null);
    setDone(0);

    let sentTotal = 0;
    let failedTotal = 0;

    /* حدُّ جولاتٍ صريح: حارسٌ من حلقةٍ لا تنتهي لو ردّت القاعدةُ متبقّيًا
       ثابتًا (ختمٌ يفشل مرارًا مثلًا) — فتتوقّف وتقول ما جرى. */
    for (let round = 0; round < 60; round++) {
      const res = await sendPendingRejections();
      /* ⚠️ **يُرقَّع في كلّ جولةٍ لا بعد الحلقة.** الحلقةُ قد تطول دقائقَ
         على دفعةٍ كبيرة، والعدّادُ فوقها يتحرّك — فلو تأخّر الترقيعُ إلى
         النهاية لبقي «ينتظر الإرسال» ثابتًا بينما تُرسَل الرسائل فعلًا. */
      for (const st of res.stamped)
        patchRows([st.id], { decision_mailed_at: st.at });
      sentTotal += res.sent;
      failedTotal += res.failed;
      setDone(sentTotal);
      setLeft(res.remaining);

      if (!res.ok && res.sent === 0) {
        setBusy(false);
        setNote({ ok: false, text: res.message });
        return;
      }
      if (res.remaining === 0 || res.sent === 0) break;
    }

    setBusy(false);
    setNote({
      ok: failedTotal === 0,
      text:
        failedTotal === 0
          ? `أُرسل ${sentTotal} رفضًا`
          : `أُرسل ${sentTotal}، وتعذّر ${failedTotal} — أعد المحاولة`,
    });
  }

  return (
    <div className="flex items-center gap-x-s2">
      <button
        type="button"
        disabled={busy || pending === 0}
        onClick={() => (armed ? void run() : setArmed(true))}
        className={`min-h-11 lg:min-h-10 rounded-xl border px-s4 text-[0.82rem] font-semibold transition-opacity ${
          busy ? "opacity-50" : "opacity-90 hover:opacity-100"
        }`}
        style={{
          borderColor: armed
            ? "color-mix(in oklab, var(--danger) 60%, transparent)"
            : "var(--line-strong)",
          background: armed
            ? "color-mix(in oklab, var(--danger) 12%, transparent)"
            : "transparent",
        }}
      >
        {busy
          ? `…يُرسل ${done}${left !== null ? ` · بقي ${left}` : ""}`
          : armed
            ? `تأكيد: أرسل ${pending} رفضًا بالبريد`
            : `أرسل الرفض للمتبقّين (${pending})`}
      </button>

      {armed && !busy && (
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="text-fg-muted min-h-11 lg:min-h-10 px-s2 text-[0.8rem]"
        >
          تراجع
        </button>
      )}

      {note && (
        <span
          role="status"
          className="text-[0.8rem]"
          style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}
        >
          {note.text}
        </span>
      )}
    </div>
  );
}

function Toolbar({
  q,
  setQ,
  status,
  setStatus,
  sort,
  setSort,
  searchRef,
  counts,
  total,
  showing,
  pendingRejections,
  queue,
  setQueue,
  showQueue,
  beyondFirst,
  scopeOptions,
  viewAs,
  setViewAs,
  inText,
  setInText,
  onHelp,
}: {
  q: string;
  setQ: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  status: string;
  setStatus: (v: string) => void;
  sort: (typeof SORTS)[number]["key"];
  setSort: (v: (typeof SORTS)[number]["key"]) => void;
  counts: Record<string, number>;
  total: number;
  showing: number;
  pendingRejections: number;
  queue: Queue;
  setQueue: (v: Queue) => void;
  /** الرئاسةُ ترى الكلَّ أصلًا، فالتبديلُ لها بلا أثر — فيُخفى */
  showQueue: boolean;
  beyondFirst: number;
  /** للرئاسة وحدها — و`null` لغيرها فلا يُرسم المحدّد */
  scopeOptions: readonly { value: string; label: string }[] | null;
  viewAs: string;
  setViewAs: (v: string) => void;
  /** أيشمل البحثُ الدافعَ وأجوبةَ القادة؟ — التعليل عند حسابه في الجذر */
  inText: boolean;
  setInText: (v: boolean) => void;
  /** يفتح لوحَ الاختصارات — نفسُه الذي يفتحه مفتاح «؟» */
  onHelp: () => void;
}) {
  return (
    <div className="tile shrink-0">
      <div className="flex flex-wrap items-center gap-x-s4 gap-y-s3 px-s4 py-s3">
        <label className="flex min-w-[13rem] grow items-center gap-x-s2 rounded-xl border border-line bg-bg-sunken px-s3">
          <span className="sr-only">ابحث في الطلبات</span>
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسمٍ أو رقمٍ جامعيّ أو لجنة…  (اضغط / )"
            className="text-fg placeholder:text-fg-muted/70 min-h-10 w-full bg-transparent text-[0.85rem]"
          />
        </label>

        {/* ⚠️ **مفتاحٌ لا توسيعٌ صامت.** «علي» يطابق ٧ أسماء و٢٨ دافعًا
            («التعليم» · «عليها») — فطيُّه في البحث العاديّ يغرق من يبحث عن
            شخص. و«تصميم» يطابق صفرَ اسمٍ و١٢ دافعًا. سؤالان مختلفان،
            فمفتاحان. والتعليلُ الكامل عند حسابه في الجذر. */}
        <button
          type="button"
          onClick={() => setInText(!inText)}
          aria-pressed={inText}
          title="يبحث أيضًا في «لماذا يريد الانضمام» وفي أجوبة أسئلة القادة — نافعٌ للبحث عن مهارةٍ أو اهتمام"
          /* ⚠️ **بلا `bg-sunken` في حال الإطفاء.** الغائرُ الليليُّ `#101218`
             شبهُ أسود، فالمفتاحُ كان يقع على لوح الشريط كأنه **ثقبٌ** لا
             ضابط — وهو أدكنُ من كلّ ما حوله. فالحدُّ وحدَه يكفي ليُقرأ
             ضابطًا، والخلفيّةُ تُملأ عند التشغيل وحدَه لتقول إنه مُشغَّل. */
          className="min-h-11 lg:min-h-10 shrink-0 rounded-xl border px-s3 text-[0.78rem] font-semibold transition-colors"
          style={
            inText
              ? {
                  borderColor: "var(--accent)",
                  background:
                    "color-mix(in oklab, var(--accent) 14%, transparent)",
                  color: "var(--accent)",
                }
              : {
                  borderColor: "var(--line-control)",
                  background: "transparent",
                  color: "var(--fg-muted)",
                }
          }
        >
          وفي النصوص
        </button>

        {/* ⚠️ **صفٌّ واحدٌ يُسحب على الجوّال لا التفافٌ على ثلاثة صفوف.**
            الستّةُ كانت تلتفّ فتأكل ≈250px أخرى فوق الطيّة. */}
        {scopeOptions && (
          <label className="flex items-center gap-x-s2 text-[0.8rem]">
            <span className="text-fg-muted">أعرض كـ</span>
            <select
              value={viewAs}
              onChange={(e) => setViewAs(e.target.value)}
              className="border-line bg-bg-sunken text-fg min-h-11 rounded-xl border px-s3 text-[0.82rem] lg:min-h-10"
            >
              <option value="">الرئاسة — كلّ الطلبات</option>
              {scopeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* ⚠️ **مبدّلُ الطابور ورقائقُ الحالة في صفٍّ واحدٍ يُسحب على
            الجوّال.** كانا صفّين ملتفّين (≈٩٠px)، وكلاهما يُمسح بالإصبع
            أفقيًّا لا رأسيًّا. و`sm:contents` تُذيب هذي الحاوية على
            الشاشات الواسعة فيعود التخطيطُ الأصليّ بلا نسخةٍ ثانية منه. */}
        <div className="-mx-s4 flex shrink-0 items-center gap-x-s2 overflow-x-auto px-s4 [scrollbar-width:none] sm:contents">
        {showQueue && (
          <div role="tablist" aria-label="الطابور" className="seg shrink-0">
            <button
              role="tab"
              type="button"
              aria-selected={queue === "first"}
              className="seg-item"
              onClick={() => setQueue("first")}
            >
              عندي الآن
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={queue === "all"}
              className="seg-item"
              onClick={() => setQueue("all")}
              title="كلُّ من ذكرك في رغباته الثلاث — للاطّلاع؛ ولا يُعمل إلّا على من هو عند رتبتك"
            >
              كلُّ من ذكرك
              {beyondFirst > 0 && (
                <span dir="ltr" className="ms-s2 tabular-nums opacity-60">
                  +{beyondFirst}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="flex gap-x-s2 sm:flex-wrap sm:gap-y-s2">
          <Chip
            label="الكلّ"
            count={total}
            active={status === "all"}
            onClick={() => setStatus("all")}
          />
          {/* ⚠️ **الرقائقُ تتبع الأزرار.** لو عُرضت الخمسُ هنا والقرارُ
              ثلاثةٌ هناك، لبحث القائدُ عن «معتذَر عنه» فوجد صفرًا دائمًا
              وظنّ اللوحة معطوبة. */}
          {PHASE_STATUSES.map((s) => (
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
        </div>

        <BulkRejectButton pending={pendingRejections} />

        {/* ⚠️ **الترتيبُ والعدّادُ يُخفيان على الجوّال.** شريطُ الأدوات قيس
            ٢٥٠px — أكبرَ كتلةٍ في الرأس كلِّه — لأنه يلتفّ إلى أربعة صفوف.
            والبحثُ ومبدّلُ الطابور ورقائقُ الحالة هي ما يُستعمل بالإصبع؛
            والترتيبُ ضبطٌ يُعدَّل مرّةً ثم يُنسى، و«٤٦ من ٤٦» رقمٌ مكرَّرٌ
            في الرقائق فوقه. */}
        <label className="hidden items-center gap-x-s2 text-[0.8rem] sm:flex">
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

        {/* ⚠️ **زرٌّ لا مفتاحٌ وحده.** «؟» لا يُكتشف بالتجريب — ومن لا
            يعرف أن ثمّة لوحًا لن يضغط مفتاحَه. والزرُّ يظهر على الجوّال
            أيضًا لأن اللوح يشرح الشاشةَ لا المفاتيحَ وحدها. */}
        <button
          type="button"
          onClick={onHelp}
          aria-label="اختصارات اللوحة وكيف تعمل"
          title="اختصارات اللوحة (؟)"
          /* الحدُّ وحدَه كمفتاح «وفي النصوص» — لا غائرٌ شبهُ أسودَ بجانبه */
          className="text-fg-muted hover:text-fg min-h-11 lg:min-h-10 shrink-0 rounded-xl border px-s3 text-[0.82rem] font-bold transition-colors"
          style={{ borderColor: "var(--line-control)" }}
        >
          ؟
        </button>

        <p className="text-fg-muted ms-auto hidden text-[0.78rem] sm:block">
          <span dir="ltr" className="tabular-nums">
            {showing}
          </span>{" "}
          من{" "}
          <span dir="ltr" className="tabular-nums">
            {total}
          </span>
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
  selected,
  onToggle,
  listRef,
}: {
  /** `hit` مقتطفٌ من الدافع لمن ظهر به وحدَه — فارغٌ لغيره */
  items: readonly { row: Row; pct: number; hit?: string }[];
  currentId: string | null;
  onPick: (id: string) => void;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
}) {
  return (
    <section className="tile apps-roster min-h-0">
      <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-s2">
        {items.map(({ row, pct, hit }, i) => {
          const s = STATUSES.find((x) => x.key === row.status);
          const on = row.id === currentId;
          const marked = selected.has(row.id);
          return (
            /* ⚠️ **الصندوقُ خارج الزرّ لا داخله.** زرٌّ داخل زرٍّ تركيبٌ
               غيرُ صالح: المتصفّحُ يفكّه فيسقط أحدُهما، وقارئُ الشاشة
               يُعلن عنصرًا واحدًا لفعلين. فالصفُّ صارّ حاويًا لهما. */
            <li key={row.id} data-id={row.id} className="flex items-center">
              <label
                className={`grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg transition-opacity ${
                  marked ? "opacity-100" : "opacity-45 hover:opacity-100"
                }`}
              >
                <span className="sr-only">حدِّد {row.full_name}</span>
                <input
                  type="checkbox"
                  checked={marked}
                  onChange={() => onToggle(row.id)}
                  className="size-4 accent-[var(--d-cyan)]"
                />
              </label>
              <button
                type="button"
                onClick={() => onPick(row.id)}
                /* ⚠️ `aria-current` سمةٌ مُعدَّدة لا منطقية — تمريرُ
                   `true` يُطلق تحذير React ويكتب قيمةً لا يعرفها القارئ. */
                aria-current={on ? "true" : undefined}
                className={`fade-up relative flex min-w-0 flex-1 items-center gap-x-s3 rounded-xl px-s3 py-s3 text-start transition-colors ${
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
                  <span
                    dir="ltr"
                    className="text-[0.6rem] font-bold tabular-nums"
                  >
                    {pct}
                  </span>
                </Arc>

                <span className="min-w-0 flex-1">
                  <span className="text-fg block truncate text-[0.86rem] font-semibold">
                    {row.full_name}
                  </span>
                  <span className="text-fg-muted block truncate text-[0.72rem]">
                    {/* ⚠️ **الموعدُ يزيح الجامعة ولا يُضاف تحتها.** الصفُّ
                        سطران وحسب؛ وثالثٌ يقصّر القائمةَ المرئيّة. ومن له
                        موعدٌ اليوم، موعدُه أهمُّ من جامعته. */}
                    {/* ⚠️ **المقتطفُ يزيح الجامعةَ ولا يُضاف تحتها** —
                        كالموعد تمامًا، والسببُ واحد: الصفُّ سطران، وثالثٌ
                        يقصّر القائمةَ المرئيّة. ومن ظهر بدافعه، **سببُ
                        ظهوره أهمُّ من جامعته** في تلك اللحظة. */}
                    {hit ? (
                      <span style={{ color: "var(--st-new)" }}>«{hit}»</span>
                    ) : row.interview_at ? (
                      <span style={{ color: "var(--st-reviewing)" }}>
                        ◷ {interviewLabel(row.interview_at)}
                      </span>
                    ) : (
                      <>
                        {row.university}
                        {row.source === "direct" && " · رابط مباشر"}
                      </>
                    )}
                  </span>
                </span>

                <span
                  aria-hidden
                  className="size-[9px] shrink-0 rounded-full"
                  style={{
                    background: s?.color,
                    boxShadow: `0 0 8px -1px ${s?.color}`,
                  }}
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
  notes,
  me,
  clash,
  capInvited,
  cvOpen,
  onCvToggle,
  onBack,
  at,
  of,
  onStep,
}: {
  row: Row;
  items: readonly Item[];
  pct: number;
  rivalry: Competition;
  notes: readonly Note[];
  me: string;
  /** أسماءُ من يتعارض موعدُهم مع موعده — تُقال عند الحقل لا في القائمة */
  clash: readonly string[];
  /** كم مدعوًّا في جهته الآن — و`null` لمن لا جهةَ له في المقاييس */
  capInvited: number | null;
  /** أمعاينةُ السيرة مفتوحة؟ الحالةُ في الأب فتبقى عبر المتقدّمين */
  cvOpen: boolean;
  onCvToggle: () => void;
  onBack: () => void;
  /** موضعُه في المعروض (صفريّ) وعددُ المعروض — «٣ من ٥٧» */
  at: number;
  of: number;
  /** ‎+1 للتالي و‎-1 للسابق — الأبُ يحرس الطرفين */
  onStep: (delta: number) => void;
}) {
  const s = STATUSES.find((x) => x.key === row.status);
  const asked = askedQuestions(row);

  return (
    <section className="tile apps-dossier min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="tile-ink fade-up relative rounded-b-none px-s5 py-s5 sm:px-s6">
          {/* ⚠️ **صفٌّ واحد: الرجوعُ والموضعُ والانتقال.** والانتقالُ يظهر
              على الحاسب أيضًا وإن كانت `j`/`k` أسرع — فمن لم يفتح لوحَ
              الاختصارات لا يعلم بها، وزرٌّ يُرى يعلّم مفتاحًا لا يُرى. */}
          <div className="mb-s4 flex items-center justify-between gap-x-s3">
            {/* رجوعٌ إلى القائمة — على الجوّال وحده، فالحاسبُ يعرض اللوحين معًا */}
            <button
              type="button"
              onClick={onBack}
              className="-ms-s2 inline-flex min-h-11 items-center gap-x-s2 px-s2 text-[0.82rem] font-semibold lg:hidden"
            >
              <svg
                viewBox="0 0 20 20"
                width="16"
                height="16"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 4l6 6-6 6" />
              </svg>
              كل الطلبات
            </button>

            <div className="ms-auto flex items-center gap-x-s2">
              {/* ⚠️ **الموضعُ يُعرض، فـ«كم بقي» سؤالُ من يفرغ طابورًا.**
                  وهو على المعروض لا على الطابور كلِّه — فمن رشّح «جديد»
                  يقرأ موضعَه فيما رشّح، لا في ما أخفاه. */}
              <span
                dir="ltr"
                className="text-[0.74rem] tabular-nums opacity-60"
                aria-label={`المعروض ${at + 1} من ${of}`}
              >
                {at + 1}/{of}
              </span>
              {/* ⚠️ **يُعطَّل عند الطرف ولا يُخفى.** زرٌّ يختفي يزحزح
                  أخاه تحت الإصبع في اللحظة التي يُضغط فيها. */}
              <button
                type="button"
                onClick={() => onStep(-1)}
                disabled={at <= 0}
                className="min-h-11 rounded-full px-s3 text-[0.78rem] font-semibold transition-opacity disabled:opacity-30"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => onStep(1)}
                disabled={at < 0 || at >= of - 1}
                className="min-h-11 rounded-full px-s3 text-[0.78rem] font-semibold transition-opacity disabled:opacity-30"
                style={{ background: "rgba(255,255,255,.12)" }}
              >
                التالي
              </button>
            </div>
          </div>
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
              {/* ⚠️ **الرتبةُ تُقال، ولا تُترك للقائد يحزرها.** من نزل
                  إليك كرغبةٍ ثانية لم يخترك أوّلًا — وقراءتُه كأنه فاضل
                  بينك وبين غيرك واختارك تظلمه وتظلم قرارَك. */}
              {row.stage > 1 && (
                <p
                  className="mt-s2 inline-flex items-center gap-x-s2 rounded-full border px-s3 py-s1 text-[0.74rem] font-semibold"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--st-referred) 55%, transparent)",
                    background:
                      "color-mix(in oklab, var(--st-referred) 16%, transparent)",
                  }}
                >
                  <span
                    aria-hidden
                    className="size-[7px] rounded-full"
                    style={{ background: "var(--st-referred)" }}
                  />
                  نزل إليك — {STAGE_LABELS[row.stage]} عنده، وأولاه{" "}
                  <PreferenceName value={row.choice1} />
                </p>
              )}
              {row.source === "direct" && (
                <p
                  className="mt-s2 inline-flex items-center gap-x-s2 rounded-full border px-s3 py-s1 text-[0.74rem]"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--d-cyan) 55%, transparent)",
                    background:
                      "color-mix(in oklab, var(--d-cyan) 16%, transparent)",
                  }}
                >
                  <span
                    aria-hidden
                    className="size-[7px] rounded-full"
                    style={{ background: "var(--d-cyan)" }}
                  />
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
                <span
                  dir="ltr"
                  className="text-[0.95rem] font-bold tabular-nums"
                >
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
          <div
            className="mt-s5 border-t pt-s4"
            style={{
              borderColor: "color-mix(in oklab, var(--snow) 16%, transparent)",
            }}
          >
            <StatusPicker
              row={row}
              clash={clash}
              capInvited={capInvited}
              dark
            />
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
            {/* ⚠️ **فوق كلِّ شيءٍ في هذا العمود.** المراجعُ العائدُ يسأل
                «وش قلنا عنه المرّة اللي راحت؟» قبل أن يقرأ الملفّ من أوّله
                — ولوحُ ملاحظاتٍ أسفلَ عمودٍ طويلٍ لا يُقرأ إلّا بحثًا. */}
            <NotesBlock rowId={row.id} notes={notes} me={me} />

            <Checklist items={items} />

            <Block title="المرفقات والروابط">
              <div className="flex flex-wrap gap-s2">
                <LinkPill
                  href={row.cv_path ? `/admin/cv/${row.id}` : null}
                  label="السيرة الذاتية"
                />
                {/* ⚠️ **لا يظهر لمن لا سيرةَ له** — وهم الأكثر: تسعةٌ
                    وستّون من ٢٥٩ رفعوا سيرةً (مقيسٌ من القاعدة، ١٩ أغسطس
                    ٢٠٢٦). فزرٌّ دائمٌ يَعِد بما لا يوجد في ثلاثة أرباع
                    الملفّات. */}
                {row.cv_path && (
                  <button
                    type="button"
                    onClick={onCvToggle}
                    aria-expanded={cvOpen}
                    className="border-line bg-bg-sunken text-fg min-h-11 lg:min-h-9 rounded-full border px-s4 text-[0.78rem] font-semibold"
                  >
                    {cvOpen ? "أخفِ المعاينة" : "اعرضها هنا"}{" "}
                    <span className="opacity-50">c</span>
                  </button>
                )}
                {/* المشاريع بابان: ملفٌّ مرفوع ورابطٌ منشور — وأحدهما يكفي،
                    فيُعرضان معًا ويغيب ما لم يُملأ. */}
                <LinkPill
                  href={
                    row.projects_path
                      ? `/admin/cv/${row.id}?kind=projects`
                      : null
                  }
                  label="ملفّ المشاريع"
                />
                <LinkPill href={row.portfolio} label="رابط الأعمال" external />
                <LinkPill href={row.linkedin} label="لينكدإن" external />
              </div>

              {/**
               * **معاينةُ السيرة في مكانها — والبديلُ تبويبةٌ لكلّ متقدّم.**
               *
               * ⚠️ **تعمل لأن الرابط يُوقَّع بلا `download`** — فيخدم
               * التخزينُ الملفَّ بنوعه (`application/pdf` أو صورة) بلا
               * ترويسة `Content-Disposition: attachment`، فيرسمه المتصفّح
               * داخل الإطار بدل أن ينزّله. ولو أُضيف `download: true` يومًا
               * في `cv/[id]/route.ts` **لانقلبت هذي المعاينةُ تنزيلًا
               * صامتًا عند كلّ فتح** — فلا يُضاف.
               *
               * ⚠️ **ومغلقةٌ افتراضيًّا.** التوقيعُ صالحٌ دقيقةً واحدة
               * والملفُّ حتى ٢م.ب، فرسمُها مع كلّ `j` يحمّل الشبكةَ على من
               * لا يقرأ السِّيَر أصلًا. فيفتحها من يريدها مرّةً وتبقى.
               */}
              {cvOpen && row.cv_path && (
                <div className="mt-s3">
                  {/* ⚠️ **`key` على المعرّف.** بلاها يعيد React استعمالَ
                      الإطار نفسِه بين متقدّمين، فيبقى المستندُ السابق
                      معروضًا حتى يكتمل تحميلُ الجديد — أي **سيرةُ غيرِه
                      أمام عينه** وهو يقرّر. */}
                  <iframe
                    key={row.id}
                    src={`/admin/cv/${row.id}`}
                    title={`السيرة الذاتية — ${row.full_name}`}
                    className="border-line bg-bg-sunken h-[26rem] w-full rounded-xl border lg:h-[32rem]"
                  />
                  <p className="text-fg-muted mt-s1 text-[0.72rem]">
                    تعذّر العرض؟ افتحها من «السيرة الذاتية» أعلاه — بعض
                    المتصفّحات لا ترسم PDF داخل الصفحة.
                  </p>
                </div>
              )}
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
                {/* التزاماتُ الفصل: يقرؤها القائد ليعرف كم يحمّل العضو.
                    و«—» للصفوف السابقة للعمود، لا لمن لا التزام له —
                    ذاك يقول «لا يوجد» صراحةً. */}
                <div>
                  <dt className="text-fg-muted text-[0.7rem]">
                    التزامات الفصل
                  </dt>
                  <dd>{row.commitments?.join(" · ") || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-fg-muted text-[0.7rem]">تاريخ التقديم</dt>
                  <dd dir="ltr" className="tabular-nums">
                    {arrivalStamp(row.created_at)}
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
function ChoiceLadder({ row, rivalry }: { row: Row; rivalry: Competition }) {
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
                style={{
                  background: meta.color,
                  color: meta.ink,
                  boxShadow: `0 4px 14px -6px ${meta.color}`,
                }}
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
                  يزاحمه{" "}
                  <span dir="ltr">
                    {Math.max(0, (rivalry.get(c) ?? 1) - 1)}
                  </span>
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
        {items.map((it, i) => {
          /* ⚠️ **ثلاثُ حالاتٍ لا حالتان.** «—» لمن لم يبدأ و«✓» لمن أتمّ
             سواءٌ عندهما «◐» لمن أجاب بعضًا — ولو جُمعا لعاد البندُ يكذب
             على من ترك سؤالًا واحدًا كأنه لم يجب شيئًا. */
          const partial = !it.ok && (it.part ?? 0) > 0;
          const mark = it.ok ? "✓" : partial ? "◐" : "—";
          const tone = it.ok
            ? "var(--color-success)"
            : partial
              ? "var(--st-reviewing)"
              : "var(--fg-muted)";
          return (
          <li
            key={it.label}
            className="fade-up flex items-center gap-x-s2 text-[0.82rem]"
            style={{ ["--i" as string]: i }}
          >
            <span
              aria-hidden
              className="flex size-[18px] shrink-0 items-center justify-center rounded-md text-[0.68rem] font-bold"
              style={{
                background:
                  it.ok || partial
                    ? `color-mix(in oklab, ${tone} 18%, transparent)`
                    : "var(--bg-sunken)",
                color: tone,
              }}
            >
              {mark}
            </span>
            <span className={it.ok || partial ? "" : "text-fg-muted"}>
              {it.label}
            </span>
            <span
              dir="ltr"
              className="text-fg-muted ms-auto text-[0.72rem] tabular-nums"
            >
              {it.weight}
            </span>
          </li>
          );
        })}
      </ul>
    </Block>
  );
}

function StatusPicker({
  row,
  clash,
  capInvited,
  dark,
}: {
  row: Row;
  clash: readonly string[];
  /** المدعوّون في جهته الآن — يُقال عند الزرّ لا في شريطٍ فوق الشاشة */
  capInvited: number | null;
  dark?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const { patchRows } = useStore();
  /**
   * ⚠️ **الزرُّ يستجيب قبل الخادم — وإلّا بدا معطوبًا.**
   *
   * `setStatus` فعلٌ خادميّ يتبعه `revalidatePath("/admin")`، والصفحةُ
   * `force-dynamic`: فكلُّ ضغطةٍ تعيد جلب **٢٤٧ طلبًا وملاحظاتِها** ثم
   * ترسم الشجرة من جديد. فيمضي ما بين نصف ثانيةٍ وثانيتين قبل أن يتلوّن
   * الزرّ — والقائدُ يظنّ أن ضغطتَه ضاعت **فيضغط ثانيةً**.
   *
   * فالحالةُ المعروضةُ تسبق الردّ. وإن فشل الفعلُ رجعت وحدَها إلى
   * `row.status` (هذا ما يفعله `useOptimistic` عند انتهاء الانتقال)،
   * ويظهر سببُ الفشل نصًّا تحتها — فلا يبقى قرارٌ كاذبٌ على الشاشة.
   */
  const [shown, showNow] = useOptimistic(row.status);

  return (
    <div>
      <p
        className={`mb-s2 text-[0.72rem] font-semibold tracking-[0.1em] ${dark ? "opacity-60" : "text-fg-muted"}`}
      >
        قرار المراجعة
      </p>
      <div className="flex flex-wrap gap-s2">
        {PHASE_STATUSES.map((s) => {
          const on = s.key === shown;
          /* ⚠️ **الإحالة مستحيلةٌ بلا وجهة.** من دخل برابطٍ مباشر لا رغبةَ
             ثانيةَ له (`choice2` فارغة)، فالزرّ يُعطَّل ويُقال السبب — لا
             يُخفى، وإلّا ظنّ القائد أن اللوحة معطوبة. */
          const noTarget = s.key === "referred" && !row.choice2;
          return (
            <button
              key={s.key}
              type="button"
              title={
                noTarget ? "لا رغبةَ ثانية — وصل الطلب برابطٍ مباشر" : undefined
              }
              disabled={pending || on || noTarget}
              aria-current={on ? "true" : undefined}
              onClick={() =>
                start(async () => {
                  setError("");
                  showNow(s.key);
                  const res = await setStatus(row.id, s.key);
                  /* ⚠️ **بالمُرجَع لا بالمطلوب.** الخادمُ يُرجع ما كتبه
                     فعلًا؛ وترقيعُنا بما طلبناه يلوّن صفًّا رُدّ. */
                  if (res.ok) patchRows([res.id], { status: res.status });
                  else setError(res.message);
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

      {/**
       * **بلوغُ الإرشاد يُقال عند الزرّ — وكان يُعرض فوق الشاشة وحدَه.**
       *
       * ⚠️ شريطُ «مدعوّون للمقابلة» يعرض `١٥/١٥` ملوَّنًا في رأس اللوحة،
       * لكنّ القائدَ حين يضغط «دعوة لمقابلة» يكون ناظرًا إلى **الملفّ** لا
       * إلى الشريط — فيدعو السادسَ عشرَ وهو لا يدري أنه تجاوز.
       *
       * ⚠️ **ولا يُعطَّل الزرُّ ولا يُمنع.** الإدارة قالت «يمديك أقلّ، وفي
       * حالات استثناء يمديك أعلى» — فالمنعُ يخالف القرارَ نفسَه، والصمتُ
       * يجعل التجاوزَ يقع بلا علم. فيُقال ويُترك القرار.
       */}
      {capInvited !== null &&
        capInvited >= INTERVIEW_CAP &&
        row.status !== "reviewing" && (
          <p
            role="status"
            className="mt-s2 text-[0.76rem] leading-relaxed"
            style={{ color: dark ? "var(--sky)" : "var(--warning)" }}
          >
            ⚠️ بلغت جهتُه <strong>{capInvited}</strong> مدعوًّا، والإرشاد{" "}
            {INTERVIEW_CAP} — ولك أن تتجاوزه.
          </p>
        )}

      <InterviewField row={row} clash={clash} dark={dark} />

      <PassOverButton row={row} dark={dark} />

      <NotifyButton row={row} dark={dark} />
    </div>
  );
}

/**
 * موعدُ المقابلة.
 *
 * ⚠️ **كان يُكتب في الملاحظات نصًّا.** «قابلته الثلاثاء ٤ عصرًا» تُقرأ ولا
 * تُرتَّب ولا تُذكِّر — ومن يفتح اللوحة صباحًا لا يعرف من عنده اليوم إلّا
 * بقراءة كلّ ملاحظة. وبحقلٍ صريح يصير «الأقرب موعدًا» ترتيبًا، والموعدُ
 * وسمًا في القائمة.
 *
 * ⚠️ **ولا يظهر لمن حُسم أمرُه** — موعدُ مقابلةٍ لمقبولٍ أو معتذَرٍ عنه
 * ليس شيئًا يُضبط.
 */
function InterviewField({
  row,
  clash,
  dark,
}: {
  row: Row;
  clash: readonly string[];
  dark?: boolean;
}) {
  const { patchRows } = useStore();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  /**
   * ⚠️ **الحقلُ الخام لا يُعرض إلّا عند التحرير — وهذا سببُه.**
   *
   * `datetime-local` الفارغ يرسم نائبَه بنفسه: **`dd/mm/yyyy, --:--`** —
   * نصٌّ لاتينيٌّ بصيغةٍ إنجليزيّة، لا يُترجَم ولا يُستبدل ولا يُنسَّق
   * (المتصفّحُ يرسمه من لغة النظام لا من `lang` الصفحة). فيقع في شاشةٍ
   * عربيّةٍ كاملة كأنه عطبٌ في الرسم، ولا يقول للقائد **ماذا يُفعل به**.
   *
   * فصار: نصٌّ عربيٌّ يقول الحال، وزرٌّ يقول الفعل — والحقلُ الخام يظهر
   * لحظةَ الحاجة إليه وحدَها.
   */
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (row.status === "accepted" || row.status === "rejected") return null;

  const save = (iso: string | null) =>
    start(async () => {
      setNote("");
      const res = await setInterview(row.id, iso);
      if (res.ok) {
        patchRows([res.id], { interview_at: res.interview_at });
        setEditing(false);
      }
      setNote(res.message);
    });

  const open = () => {
    setEditing(true);
    /* التقويمُ يُفتح بعد أن يُركَّب الحقل — و`showPicker` ترمي على متصفّحٍ
       لا يعرفها أو خارج تفاعلِ مستخدم، فتُبتلع: الحقلُ ظاهرٌ على كل حال. */
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try {
        el.showPicker();
      } catch {
        /* لا شيء — النقرُ على الحقل يفتحه */
      }
    });
  };

  const muted = dark ? "rgba(255,255,255,.5)" : "var(--fg-muted)";
  const chip = `min-h-11 lg:min-h-10 rounded-full px-s3 text-[0.78rem] font-semibold transition-opacity disabled:opacity-40`;
  const chipStyle = dark
    ? { background: "rgba(255,255,255,.12)" }
    : { background: "var(--bg-sunken)" };

  return (
    <div
      className="mt-s4 border-t pt-s3"
      style={{ borderColor: dark ? "rgba(255,255,255,.14)" : "var(--line)" }}
    >
      <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2 text-[0.8rem]">
        <span
          className="font-semibold"
          style={{ color: dark ? "rgba(255,255,255,.72)" : "var(--fg-muted)" }}
        >
          موعد المقابلة
        </span>

        {editing ? (
          <input
            ref={inputRef}
            type="datetime-local"
            /* ⚠️ **`ltr` صراحةً.** صيغةُ الحقل لاتينيّةٌ يرسمها المتصفّح،
               وتركُها ترث `rtl` من الصفحة يقلب ترتيبَ خاناتها بصريًّا. */
            dir="ltr"
            disabled={pending}
            defaultValue={toRiyadhInput(row.interview_at)}
            onChange={(e) => {
              /**
               * ⚠️ **الفراغُ لا يُحفظ من هنا — والمسحُ زرٌّ مستقلّ.**
               *
               * `datetime-local` يُرجع `""` ما دام أيُّ خانةٍ ناقصة. فمن
               * بدأ يكتب اليومَ قبل الشهر أطلق حدثًا بقيمةٍ فارغة —
               * **فيُمسح موعدٌ محفوظٌ وهو ينوي تعديله**، ولا شيء يقول له.
               * فالفراغُ هنا يُتجاهَل، والمسحُ فعلٌ مقصودٌ بزرّه.
               */
              const iso = fromRiyadhInput(e.target.value);
              if (iso) save(iso);
            }}
            /* ⚠️ **لا إغلاقَ عند `blur`.** فتحُ تقويم المتصفّح ينقل التركيزَ
               عن الحقل في بعض المتصفّحات — فإغلاقُه على `blur` يُخفي الحقلَ
               في اللحظة التي فُتح لأجلها. والخروجُ يقع بأحد اثنين: حفظٌ
               ناجح، أو الانتقالُ إلى متقدّمٍ آخر (يُعاد تركيبُ الملفّ
               بـ`key`، فتعود الحالةُ إلى أصلها). */
            className="min-h-11 rounded-xl border px-s3 text-[0.82rem] lg:min-h-10"
            /**
             * 🔴 **اللونُ صريحٌ ولا يُترك لـ`text-fg` — وهذي كانت علّةً لا
             * ذوقًا.** `.tile-ink` يضبط `color: var(--snow)` **ولا يعيد
             * تعريف توكن `--fg`**؛ و`text-fg` يقرأ التوكن لا اللونَ
             * الموروث. فداخل لوحٍ حبريٍّ داكن كان يعطي **لونَ الصفحة** —
             * أي حبرًا داكنًا على داكن في الوضع الفاتح، **وهو الافتراض في
             * هذا الموقع**. فالتاريخُ المكتوب كان يختفي.
             *
             * ⚠️ و`colorScheme` معه لا بدلَه: هو وحدَه يجعل المتصفّح يرسم
             * نائبَ الحقل وأيقونةَ التقويم بلوحةٍ ليليّة، ولا يمسّ لونَ
             * القيمة التي نضبطها هنا.
             */
            style={{
              color: dark ? "var(--snow)" : "var(--fg)",
              borderColor: dark
                ? "rgba(255,255,255,.34)"
                : "var(--line-strong)",
              background: dark ? "rgba(255,255,255,.06)" : "transparent",
              colorScheme: dark ? "dark" : undefined,
            }}
          />
        ) : row.interview_at ? (
          <>
            <span className="font-semibold" style={{ color: "var(--st-reviewing)" }}>
              ◷ {interviewLabel(row.interview_at)}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={open}
              className={chip}
              style={chipStyle}
            >
              غيّر
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(null)}
              className={chip}
              style={chipStyle}
            >
              امسح
            </button>
          </>
        ) : (
          <>
            <span style={{ color: muted }}>لم يُحدَّد</span>
            <button
              type="button"
              disabled={pending}
              onClick={open}
              className={chip}
              style={chipStyle}
            >
              حدِّد موعدًا
            </button>
          </>
        )}

        {/* ⚠️ **بتوقيت الرياض يُقال صراحةً.** القائدُ المسافرُ يكتب ما يراه
            على ساعته ويظنّه محفوظًا كما كتبه. */}
        <span className="text-[0.72rem]" style={{ color: muted }}>
          {pending ? "…يُحفظ" : note || "بتوقيت الرياض"}
        </span>
      </div>

      {/**
       * ⚠️ **تنبيهٌ لا منع.** لا عمودَ لمدّة المقابلة، والثلاثون دقيقةً
       * افتراضٌ (`INTERVIEW_MINUTES`) — فقد يقصد القائدُ التتابعَ الضيّق،
       * وقد يقابله اثنان من اللجنة معًا. والمنعُ يفرض عليه جدولًا لا يعرفه
       * من كتب الشيفرة؛ والسكوتُ يجعله يحجز اثنين في وقتٍ واحدٍ ولا يدري
       * إلّا والطالبان على الباب.
       *
       * ⚠️ **والأسماءُ تُقال لا العدد** — «يتعارض مع موعدٍ آخر» يدفعه يبحث
       * في خمسة عشر موعدًا عن أيِّها؛ والاسمُ يحسمها في سطر.
       */}
      {clash.length > 0 && (
        <p
          role="status"
          className="mt-s2 text-[0.76rem] leading-relaxed"
          style={{ color: dark ? "var(--sky)" : "var(--warning)" }}
        >
          ⚠️ يتداخل مع {clash.join(" · ")} — داخل {INTERVIEW_MINUTES} دقيقة.
        </p>
      )}
    </div>
  );
}

/**
 * **«لا يناسب لجنتي»** — ولا تقول «معتذَر عنه».
 *
 * ⚠️ **الفرقُ ليس لفظيًّا.** لو بقي الزرُّ «معتذَر عنه» لظنّ القائدُ أنه
 * يُخرج المتقدّمَ من النادي وهو يرقّيه إلى رغبته التالية — **فيتردّد
 * شفقةً فيعطّل السلّم كلَّه**، أو يضغطه ظانًّا أنه أنهى أمره. والنتيجةُ
 * تُقال بعد الضغط لا قبله، لأن القاعدةَ وحدها تعرف أبقيت له رغبةٌ أم لا.
 *
 * ⚠️ **وضغطتان لا واحدة.** النزولُ يُخرج المتقدّمَ من يدك فورًا — لا
 * تستطيع استرجاعه بنفسك بعدها، فالتأكيدُ يُقال فيه ما سيحدث.
 */
function PassOverButton({ row, dark }: { row: Row; dark?: boolean }) {
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  /* قرارٌ نهائيّ: لا تمريرَ بعده — والدالّةُ ترفضه أيضًا */
  if (row.status === "accepted" || row.status === "rejected") return null;

  /* هل بعدها رغبة؟ يُقال للقائد قبل أن يضغط — والقاعدةُ هي الفاصل */
  const next = [row.choice2, row.choice3][row.stage - 1] ?? "";
  const last = row.stage >= 3 || !next.trim();

  return (
    <div
      className="mt-s4 border-t pt-s3"
      style={{ borderColor: dark ? "rgba(255,255,255,.14)" : "var(--line)" }}
    >
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
              const res = await passOver(row.id);
              setArmed(false);
              setNote({ ok: res.ok, text: res.message });
            });
          }}
          className={`inline-flex min-h-11 items-center rounded-xl border px-s4 text-[0.82rem] font-semibold transition-opacity lg:min-h-10 ${
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
            ? "…يُمرَّر"
            : armed
              ? last
                ? "تأكيد: لا رغبةَ بعدها — يُعتذر عنه نهائيًّا"
                : `تأكيد: ينزل إلى ${prefName(next)} ويخرج من يدك`
              : "لا يناسب لجنتي"}
        </button>

        {armed && !pending && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="min-h-11 px-s2 text-[0.8rem] underline underline-offset-4 opacity-70 lg:min-h-10"
          >
            تراجع
          </button>
        )}

        {!armed && !note && (
          <span
            className="text-[0.74rem]"
            style={{
              color: dark ? "rgba(255,255,255,.55)" : "var(--fg-muted)",
            }}
          >
            {last
              ? "آخرُ رغباته — الضغطُ اعتذارٌ نهائيّ"
              : `ينزل إلى ${prefName(next)}`}
          </span>
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

/**
 * إرسالُ النتيجة إلى الطالب — **خطوتان لا واحدة**.
 *
 * ⚠️ **البريدُ لا يُسحب.** ضغطةٌ واحدةٌ خاطئة على «رفض» ترسل رفضًا لطالبٍ
 * لم يُرفض؛ فالضغطة الأولى تُسلّح والثانية تُرسل، والنصُّ يقول لمن يُرسَل
 * وبأي قرار — لا «إرسال» غفلًا.
 *
 * ولا يظهر أصلًا قبل ضبط القرار: `new` و`reviewing` لا نتيجةَ فيهما.
 */
/**
 * رابطُ واتساب للمتقدّم — **القناةُ المعتمَدة للنتيجة** (١٦ أغسطس ٢٠٢٦،
 * بقرار الإدارة: «القبول راح يكون على الواتس»).
 *
 * ⚠️ **يفتح المحادثةَ ولا يُرسل.** `wa.me` تضع النصّ في صندوق الكتابة
 * والقائدُ يقرؤه ويعدّله ويضغط إرسال — فلا تخرج رسالةٌ باسم النادي بضغطةٍ
 * واحدةٍ بلا مراجعة، ولا سيّما أن نصّ القبول يختلف من لجنةٍ إلى أخرى.
 *
 * والرقمُ يُحوَّل من `05XXXXXXXX` إلى `9665XXXXXXXX`: واتساب لا يقبل الصفرَ
 * المحلّيّ. والمخطّطُ في `registration.ts` يضمن الصيغة (عشرُ خاناتٍ تبدأ
 * بـ05)، فلا حاجةَ لتخمينٍ هنا — ومع ذلك يُفحص الطول قبل البناء: صفٌّ قديم
 * أو مستوردٌ قد لا يلتزمها، ورابطٌ مكسورٌ يفتح واتساب على رقمٍ غير موجود.
 */
function NotifyButton({ row, dark }: { row: Row; dark?: boolean }) {
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const decision = STATUSES.find((s) => s.key === row.status);
  const wa = whatsappHref(row);
  if (!NOTIFIABLE_STATUSES.includes(row.status)) return null;

  return (
    <div
      className="mt-s4 border-t pt-s3"
      style={{ borderColor: dark ? "rgba(255,255,255,.14)" : "var(--line)" }}
    >
      <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2">
        {/* ⚠️ **قناةٌ لكلّ قرار — والخلطُ بينهما يفضح النتيجة** (١٦ أغسطس
            ٢٠٢٦، بقرار الإدارة):

              القبول  →  واتساب   (شخصيّ، ويفتح المحادثة التي تليه)
              الرفض   →  بريد     (موحَّد، ويُرسَل بالجملة)

            ولذلك **لا يُذكر للمتقدّم أين تصله النتيجة** في الموقع كلِّه:
            لو عُلم أن القبول واتساب، لصار وصولُ بريدٍ إعلانَ رفضٍ قبل أن
            يُفتح. فمن أرسل قبولًا بالبريد أو رفضًا بالواتساب كسر الفصل
            للجميع لا لمتقدّمه وحده. */}
        <p
          className="w-full text-[0.75rem]"
          style={{ color: dark ? "rgba(255,255,255,.55)" : "var(--fg-muted)" }}
        >
          القبول واتساب · الرفض بريد
        </p>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-x-s2 rounded-xl border px-s4 text-[0.82rem] font-semibold transition-opacity hover:opacity-100 lg:min-h-10 opacity-90"
            style={{
              borderColor: dark
                ? "rgba(255,255,255,.28)"
                : "var(--line-strong)",
              background: dark
                ? "rgba(255,255,255,.06)"
                : "color-mix(in oklab, var(--accent) 8%, transparent)",
            }}
          >
            افتح واتساب المتقدّم (للقبول)
          </a>
        )}
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
              ? `تأكيد: أرسل «${decision?.label ?? row.status}» بريدًا إلى ${row.email}`
              : "أرسل النتيجة بالبريد (للرفض)"}
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

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

/** الاسمُ داخل مجموعته — «وحدة الزيارات» لا «لجنة العلاقات… — وحدة الزيارات» */
function prefShort(value: string) {
  return findPreference(value)?.label ?? value;
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
    out.push({
      key,
      title: null,
      label: null,
      type: null,
      required: false,
      value,
    });
  }
  return out;
}
