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
/**
 * حالاتُ الطلب — **من مصدر الموقع نفسِه، لا نسخةٌ ثانية هنا**.
 *
 * ⚠️ **وهذا تصحيحُ عطبٍ وقع.** كانت القائمةُ مكتوبةً هنا يدويًّا، فافترقت
 * عن نسخة الموقع في ثلاثة مواضعَ خلال شهرٍ واحد: `shortlisted` **ترفضها
 * القاعدة**، و`referred` مفقودةٌ وهي التي وعدت بها الإدارةُ القادة، و«مرفوض»
 * حيث تقول الأخرى «معتذَر عنه» — والتلطيفُ كان مقصودًا. ولم ينكشف شيءٌ منها
 * إلّا بلقطةٍ عابرة.
 *
 * والملفُّ المصدرُ بياناتٌ صرفة بلا استيرادٍ يخصّ Next، فيُقرأ من هنا كما
 * تُقرأ `preferences.ts`.
 */
export {
  APPLICATION_STATUSES as STATUSES,
  DIRECT_STATUSES,
  statusLabel,
} from "../../../../src/content/statuses";
