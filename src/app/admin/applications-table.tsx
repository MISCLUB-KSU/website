"use client";

import { useMemo, useState, useTransition } from "react";

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
import {
  addNote,
  deleteNote,
  editNote,
  notifyDecision,
  passOver,
  sendPendingRejections,
  setPhase,
  setStatus,
} from "./actions";
import {
  DIRECT_STATUSES,
  INTERVIEW_CAP,
  STAGE_LABELS,
  STATUSES,
  arrivalStamp,
  choiceAtStage,
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
  /* ⚠️ **معاينةٌ للرئاسة، لا تنازلٌ عن صلاحية.** الرئاسةُ ترى الكلَّ في
     القاعدة ولا يغيّر هذا شيئًا من ذلك — يغيّر **ما تعرضه الشاشة** حتى
     يتحقّق من يوزّع الحسابات ممّا سيراه كلُّ قائدٍ قبل أن يسلّمه المفتاح.
     ولذلك يُقال في الشريط صراحةً إنها معاينة. */
  const [viewAs, setViewAs] = useState<string>("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("newest");
  const [picked, setPicked] = useState<string | null>(null);
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
          معاينة — الشاشةُ كما يراها قائدُ{" "}
          <strong>
            {SCOPE_OPTIONS.find((o) => o.value === viewAs)?.label ?? viewAs}
          </strong>
          . صلاحيّتُك لم تتغيّر، والمعروضُ وحده تغيّر.
        </p>
      )}

      <PhaseBar rows={rows} phase={phase} isAdmin={isAdmin} />

      <IntakeMeters meters={meters} />

      <Toolbar
        q={q}
        setQ={setQ}
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
            notes={notesByApp.get(current.row.id) ?? EMPTY_NOTES}
            me={me}
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
  rows,
  phase,
  isAdmin,
}: {
  rows: readonly Row[];
  phase: number;
  isAdmin: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const open = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.stage === phase && (r.status === "new" || r.status === "reviewing"),
      ).length,
    [rows, phase],
  );
  /* من ينتظر فتحَ التالية — الرقمُ الذي يبرّر الفتح */
  const waiting = useMemo(
    () => rows.filter((r) => r.stage > phase).length,
    [rows, phase],
  );

  const next = phase + 1;

  return (
    <div className="tile shrink-0 px-s4 py-s3">
      <div className="flex flex-wrap items-center gap-x-s4 gap-y-s2 text-[0.8rem]">
        <span className="font-bold">
          المرحلة {phase} — {STAGE_LABELS[phase]}
        </span>
        <span className="text-fg-muted">
          <strong dir="ltr" className="tabular-nums">
            {open}
          </strong>{" "}
          بلا قرارٍ عند هذي الرتبة
        </span>
        {waiting > 0 && (
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
      if (res.ok) setDraft("");
      else setError(res.message);
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
                            if (res.ok) setEditing(null);
                            else setError(res.message);
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
                              if (!res.ok) setError(res.message);
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
    <div className="tile shrink-0 px-s4 py-s3">
      <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2">
        <p className="text-fg-muted text-[0.7rem] font-semibold tracking-[0.1em]">
          مدعوّون للمقابلة
        </p>
        {meters.map((m) => {
          const full = m.invited >= INTERVIEW_CAP;
          return (
            <span
              key={m.value}
              title={`${m.total} عندها الآن · ${m.pending} بلا قرار`}
              className="border-line flex items-center gap-x-s2 rounded-full border px-s3 py-s1 text-[0.76rem]"
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
        <span className="text-fg-muted ms-auto text-[0.72rem]">
          إرشادٌ لا سقف — تجاوزه عند الحاجة
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
        {scopeOptions && (
          <label className="flex items-center gap-x-s2 text-[0.8rem]">
            <span className="text-fg-muted">أعاين كـ</span>
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

        <div className="-mx-s4 flex gap-x-s2 overflow-x-auto px-s4 pb-s1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-y-s2 sm:overflow-visible sm:px-0 sm:pb-0">
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

        <BulkRejectButton pending={pendingRejections} />

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
                    {row.university}
                    {row.source === "direct" && " · رابط مباشر"}
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
  onBack,
}: {
  row: Row;
  items: readonly Item[];
  pct: number;
  rivalry: Competition;
  notes: readonly Note[];
  me: string;
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
            <span
              dir="ltr"
              className="text-fg-muted ms-auto text-[0.72rem] tabular-nums"
            >
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
        {PHASE_STATUSES.map((s) => {
          const on = s.key === row.status;
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

      <PassOverButton row={row} dark={dark} />

      <NotifyButton row={row} dark={dark} />
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
function whatsappHref(row: Row): string | null {
  const digits = (row.phone ?? "").replace(/\D/g, "");
  if (!/^05\d{8}$/.test(digits)) return null;
  const intl = `966${digits.slice(1)}`;
  const first = (row.full_name ?? "").trim().split(/\s+/)[0] || "";
  const text = `مرحبًا ${first}، معك نادي نظم المعلومات الإدارية بجامعة الملك سعود بخصوص طلب عضويتك.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

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
