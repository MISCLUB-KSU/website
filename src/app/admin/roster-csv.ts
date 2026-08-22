import { findPreference, questionBlocks } from "@/content/preferences";
import { answerName } from "@/content/questions";
import { statusLabel } from "@/content/statuses";
import { MAJOR_OTHER } from "@/lib/registration";

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
