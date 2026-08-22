import { findPreference, questionBlocks } from "@/content/preferences";
import { answerName } from "@/content/questions";
import { statusLabel } from "@/content/statuses";
import { MAJOR_OTHER } from "@/lib/registration";

import { completeness } from "./scoring";
import {
  STAGE_LABELS,
  choiceAtStage,
  interviewDayLabel,
  interviewTime,
  type Row,
} from "./stats";

/**
 * **صفوفُ الطلبات جدولًا نصّيًّا يفتحه Excel.**
 *
 * ⚠️ **ملفٌّ واحدٌ لبابين.** يقرؤه زرُّ التصدير في اللوحة، ويقرؤه المسارُ
 * الحيُّ (`/feed.csv`) الذي يسحب منه Excel تلقائيًّا. ولو بُني الجدولُ في
 * كلٍّ منهما على حدة لافترق العمودان بعد أوّل تعديل، فيجد الفريقُ ملفَّه
 * اليدويَّ يخالف ملفَّه المرتبط.
 *
 * ⚠️ **ولا رقمَ أحوالٍ فيه — وهذا شرطُ وجوده.** الجدولُ يخرج من النظام إلى
 * ملفٍّ يملكه فردٌ ويُشارَك برابط ويبقى عنده بعد أن يترك النادي. فيخرج ما
 * يلزم للتقييم، ويبقى ما لا يلزمه داخل القاعدة وحدها.
 */

/** ما يخرج في الجدول — أقلُّ ما يكفي، ولا `national_id` بينه */
export type RosterRow = Pick<
  Row,
  | "id"
  | "full_name"
  | "student_id"
  | "major"
  | "major_other"
  | "level"
  | "phone"
  | "email"
  | "linkedin"
  | "portfolio"
  | "cv_path"
  | "choice1"
  | "choice2"
  | "choice3"
  | "stage"
  | "status"
  | "interview_at"
  | "why"
  | "answers"
  | "created_at"
>;

const FIXED = [
  "وقت التقديم",
  "اسم المقدم",
  "الرقم الجامعي",
  "التخصص",
  "السنة الدراسية",
  "الجوال",
  "البريد",
  "LinkedIn",
  "معرض الأعمال",
  "سيرة ذاتية",
  "الجهة",
  "الرتبة",
  "حالة الطلب",
  "تاريخ المقابلة",
  "وقت المقابلة",
  "الدوافع",
] as const;

/**
 * ⚠️ **أعمدةُ الأسئلة اتّحادُ أسئلة الجهة التي هم عندها الآن** لا الرغبات
 * الثلاث — وإلّا صارت الأعمدةُ عشراتٍ أكثرُها فارغ.
 *
 * ⚠️ **وترتيبُها ثابتٌ بترتيب ورودها.** لو تبدّل ترتيبُ الأعمدة بين
 * تحديثٍ وآخر لانزاحت أعمدةُ الفريق اليدويّة عن صفوفها — والمسارُ الحيُّ
 * يُحدَّث تلقائيًّا، فلا أحدَ ينتبه إلى الانزياح حتى يقع الخطأ.
 */
function answerColumns(rows: readonly RosterRow[]): Map<string, string> {
  const cols = new Map<string, string>();
  for (const row of rows) {
    const at = choiceAtStage(row);
    if (!at) continue;
    for (const block of questionBlocks([at])) {
      for (const q of block.questions) {
        const key = answerName(block.key, q.id);
        if (key in (row.answers ?? {}) && !cols.has(key)) cols.set(key, q.label);
      }
    }
  }
  return cols;
}

/* ⚠️ **الاقتباسُ على كلّ خانة.** الدوافعُ تحمل فواصلَ وأسطرًا جديدة،
   وخانةٌ غيرُ مقتبَسة تكسر الصفَّ فتنزاح الأعمدةُ كلُّها بعدها. */
const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * ⚠️ **`﻿` في الرأس ليست زينة.** بدونها يقرأ Excel على ويندوز الملفَّ
 * بترميز الجهاز فيصير العربيُّ رموزًا — وهو أشهرُ عطبٍ في `CSV` العربيّ.
 */
export function rosterCsv(rows: readonly RosterRow[]): string {
  const answerCols = answerColumns(rows);
  const head = [...FIXED, ...answerCols.values()];

  const body = rows.map((row) => {
    const at = choiceAtStage(row);
    const answers = row.answers ?? {};
    return [
      arrivalStampSafe(row.created_at),
      row.full_name,
      row.student_id,
      row.major === MAJOR_OTHER ? (row.major_other ?? row.major) : row.major,
      row.level,
      row.phone,
      row.email,
      row.linkedin ?? "",
      row.portfolio ?? "",
      row.cv_path ? "نعم" : "لا",
      findPreference(at)?.fullLabel ?? at,
      STAGE_LABELS[row.stage] ?? "",
      statusLabel(row.status),
      row.interview_at ? interviewDayLabel(row.interview_at) : "",
      row.interview_at ? interviewTime(row.interview_at) : "",
      row.why,
      ...[...answerCols.keys()].map((k) => answers[k] ?? ""),
    ];
  });

  return (
    "﻿" + [head, ...body].map((r) => r.map(cell).join(",")).join("\r\n")
  );
}

/** يومُ الوصول وساعتُه بتوقيت الرياض — وفراغٌ لطابعٍ لا يُقرأ */
function arrivalStampSafe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${interviewDayLabel(iso)} ${interviewTime(iso)}`;
}


/* ── جدولُ المسار الحيّ ─────────────────────────────────────────────────── */

/**
 * **أعمدةُ الملفّ المرتبط — بأسماء الفريق لا بأسمائنا.**
 *
 * ⚠️ **سلّمت قيادةُ المشروع ورقةَ حقولٍ محدّدة، فهذا نقلُها حرفًا بحرف.**
 * وملفٌّ مرتبطٌ تختلف عناوينُه عمّا اتّفق عليه الفريق يُعاد ترتيبُه يدويًّا
 * كلَّ تحديث — فيسقط الربطُ من أوّل أسبوع.
 *
 * ⚠️ **و«رقم الطلب» أوّلًا بطلبهم الصريح**: «استخدم ID الطلب الموجود
 * بالموقع، **وليس الهوية الوطنية**». وهو المفتاحُ الذي تُربط به ملاحظاتُهم
 * بصفوفها إن أرادوا `VLOOKUP`.
 *
 * ⚠️ **وأربعةُ حقولٍ من ورقتهم ليست هنا عمدًا** — قرارُ اجتماع الفرز،
 * والدورُ المقترح، وملاحظاتُ الاجتماع، والمسؤول. تلك قراراتُهم هم، ولا
 * يعرفها النظام. وإخراجُها أعمدةً فارغةً أسوأُ من تركها: نطاقُ
 * `IMPORTDATA` **يُكتب فوقه في كلّ تحديث**، فما يكتبونه داخله يُمحى.
 * فتبقى أعمدتُهم **خارج** النطاق، إلى جانبه.
 *
 * ⚠️ **والترتيبُ بالأقدم أوّلًا يحمي محاذاتَهم**: الصفوفُ الجديدة تُضاف في
 * الذيل ولا تزحزح ما فوقها، فتبقى ملاحظاتُهم المجاورة أمام أصحابها.
 */
const FEED_FIELDS: readonly {
  header: string;
  value: (row: RosterRow) => string;
}[] = [
  { header: "رقم الطلب", value: (r) => r.id },
  { header: "اسم المتقدم", value: (r) => r.full_name },
  {
    /* ⚠️ **يُقرأ من أجوبة الجهة لا من عمودٍ خاصّ.** السؤالُ مطروحٌ في
       النموذج منذ البداية، والأدوارُ السبعةُ هي نفسُها التي في ورقتهم. */
    header: "الدور المقدم عليه",
    value: (r) => appliedRole(r),
  },
  {
    /**
     * ⚠️ **هذا «اكتمالُ الملفّ» لا درجةَ تقييم.** ورقتُهم تقول «الدرجة
     * الظاهرة في لوحة الموقع»، وهي هذي — تقيس **ما أرفقه المتقدّم**
     * (سيرة، دافع مفصَّل، معرض، لينكدإن، أجوبة القادة) لا جودةَ ما كتب.
     * فمتقدّمٌ ممتازٌ بلا لينكدإن ينزل رقمُه، وضعيفٌ مكتملُ المرفقات يرتفع.
     * تُقرأ إشارةً إلى **ما ينقص الملفّ**، لا حكمًا على صاحبه.
     */
    header: "نسبة التقييم",
    value: (r) => String(completeness(r as Row).pct),
  },
  { header: "LinkedIn", value: (r) => r.linkedin ?? "" },
  { header: "حالة الطلب", value: (r) => statusLabel(r.status) },
  {
    header: "تاريخ المقابلة",
    value: (r) => (r.interview_at ? interviewDayLabel(r.interview_at) : ""),
  },
  {
    header: "وقت المقابلة",
    value: (r) => (r.interview_at ? interviewTime(r.interview_at) : ""),
  },
  {
    /* ⚠️ **ما يعرفه النظامُ من ورقتهم هو «تم التحديد» وحدَه.** أمّا «تمت
       المقابلة» و«اعتذر» و«لم يحضر» فوقائعُ بعد اللقاء لا أثرَ لها عندنا
       — فتُترك لهم في عمودهم. والفراغُ هنا يقول «لم يُحدَّد» صراحةً. */
    header: "حالة المقابلة",
    value: (r) => (r.interview_at ? "تم التحديد" : "لم يُحدَّد"),
  },
  {
    /* ⚠️ **«القرار النهائي» عندنا حالتان لا ثلاث.** مفرداتُهم «قبول /
       احتياط / رفض»، و«الاحتياط» قرارُ اجتماعهم لا حالةٌ في القاعدة. */
    header: "القرار النهائي",
    value: (r) =>
      r.status === "accepted" ? "قبول" : r.status === "rejected" ? "رفض" : "",
  },
];

/**
 * **الدورُ المختار داخل الجهة.**
 *
 * ⚠️ **يُقرأ من مفاتيح الأجوبة المحفوظة لا من تعريف الأسئلة وحدَه.** قِيس
 * على القاعدة: كلُّ طلبات Impact (٨٥) تحمل `q__project:impact__role`،
 * ولا واحدَ منها يحمل مفاتيحَ الأسئلة المعرَّفة اليوم لهذي الجهة في
 * `projects.ts`. فبناءُ العمود على التعريف وحدَه يُخرجه فارغًا على كلّ
 * صفٍّ — وهو ما وقع في أوّل قياسٍ لهذا الملفّ.
 *
 * فالبحثُ بثلاث مراتب: مفتاحٌ ينتهي بـ`__role` (وهو اسمُه في القاعدة)، ثم
 * أوّلُ سؤالِ اختيارٍ واحدٍ معرَّفٍ له جواب، ثم فراغ.
 */
function appliedRole(row: RosterRow): string {
  const at = choiceAtStage(row);
  if (!at) return "";
  const answers = row.answers ?? {};

  const direct = Object.keys(answers).find(
    (k) => k.startsWith(`q__${at}__`) && k.endsWith("__role"),
  );
  if (direct && answers[direct]) return answers[direct];

  for (const block of questionBlocks([at])) {
    for (const q of block.questions) {
      if (q.type !== "select" && q.type !== "choice-cards") continue;
      const v = answers[answerName(block.key, q.id)];
      if (v) return v;
    }
  }
  return "";
}

/** جدولُ المسار الحيّ — أعمدةُ الفريق وحدها، بترتيبها */
export function feedCsv(rows: readonly RosterRow[]): string {
  const head = FEED_FIELDS.map((f) => f.header);
  const body = rows.map((r) => FEED_FIELDS.map((f) => f.value(r)));
  return (
    "\uFEFF" + [head, ...body].map((r) => r.map(cell).join(",")).join("\r\n")
  );
}
