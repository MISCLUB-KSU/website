/**
 * صفُّ الطلب — **مطابقٌ لـ`Row` في `src/app/admin/stats.ts`** بمشروع Next.
 *
 * ⚠️ **نسختان لنوعٍ واحد، وهذا دَينٌ مقصودٌ لا سهو.** التطبيقان لا يتشاركان
 * `tsconfig` (لكلٍّ إعدادُه وحدوده)، واستيرادُ نوعٍ من مشروعٍ آخر يجرّ معه
 * سلسلةَ استيراداتٍ من `@/content/preferences` لا مكانَ لها هنا. والبديل
 * توليدُ الأنواع من القاعدة (`supabase gen types`) — وهو الصواب حين تكتمل
 * اللوحة، ويُذكر هنا حتى لا يُنسى.
 *
 * وحتى ذلك: **الملفّان يُعدَّلان معًا**. عمودٌ يُضاف في هجرةٍ يظهر في
 * الاثنين أو لا يظهر في واحدٍ فيُقرأ `undefined` بلا خطأ ترجمة.
 */
export type Application = {
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
  receipt_mailed_at: string | null;

  /**
   * ⚠️ **رقمُ الأحوال — أخطرُ حقلٍ في هذا النوع.**
   *
   * لا يُطبع في سجلّ، ولا يدخل رسالةَ خطأ، ولا يُصدَّر في تقرير. وقاعدةُ
   * المستودع في هذا صريحة، ولوحةُ Next تلتزمها. ويُعرض هنا في ملفّ
   * المتقدّم وحده لأنّ اللجنة تحتاجه للتحقّق — لا في الجدول.
   */
  national_id: string;

  university_other: string | null;
  major_other: string | null;
  why: string;
  heard_from: string;
  has_club_experience: boolean;
  club_experience: string | null;
  club_experience_level: string | null;
  club_perception: string | null;
  club_expectation: string | null;
  projects_path: string | null;
  commitments: string[];
  answers: Record<string, string>;
  portfolio: string | null;
  linkedin: string | null;
  /** `open` نموذجٌ بثلاث رغبات · `direct` رابطٌ مباشر لجهةٍ واحدة */
  source: string;
};

/**
 * حالاتُ الطلب — **بالقيم نفسِها المخزَّنة في القاعدة**، لا بترجمةٍ حرّة.
 * الوسمُ للعرض وحده، والقيمةُ هي ما يُكتب في العمود.
 */
export const STATUSES = [
  { value: "new", label: "جديد" },
  { value: "reviewing", label: "قيد المراجعة" },
  { value: "shortlisted", label: "مرشَّح" },
  { value: "accepted", label: "مقبول" },
  { value: "rejected", label: "مرفوض" },
] as const;

export type StatusValue = (typeof STATUSES)[number]["value"];

/** وسمُ الحالة للعرض — والمجهولةُ تُعرض كما هي لا تُبتلع */
export function statusLabel(value: string): string {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}
