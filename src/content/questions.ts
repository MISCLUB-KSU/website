/**
 * أسئلة قادة اللجان والمشاريع.
 *
 * كل قائد لجنة أو وحدة أو مشروع يضيف أسئلته هنا — في `questions` داخل
 * الوحدة أو اللجنة أو المشروع الذي يقوده. النموذج يعرضها تلقائيًا لمن
 * اختار ذلك الخيار ضمن رغباته الثلاث، ويتحقّق منها على الخادم.
 *
 * من لا يريد أسئلة يترك الحقل غائبًا — لا يُكتب مصفوفة فارغة، الغياب أوضح.
 *
 * قاعدة على `id`: هو المفتاح الذي تُخزَّن به الإجابة مع الطلب. تغييره بعد
 * فتح التقديم يفصل الإجابات القديمة عن سؤالها، فيُعامَل كأنه ثابت.
 * ويكفي أن يكون فريدًا داخل الخيار الواحد لا في الموقع كله.
 */

export type QuestionType =
  | "text"
  | "long-text"
  | "select"
  | "multi-select"
  /** اختيارٌ مفرد ببطاقاتٍ تعرض تفاصيل كل خيار — للمناصب ونحوها */
  | "choice-cards"
  /**
   * مرفقٌ يرفعه الطالب — نموذجُ عملٍ ونحوه.
   *
   * ⚠️ **الإجابة المخزَّنة مسارُ الملفّ في المستودع لا اسمَه ولا محتواه.**
   * ولا يُعرف المسار قبل إدراج الصفّ، فالرفع يقع **بعد** الإدراج ثم
   * يُرقَّع `answers` — انظر `saveApplication` في `join/actions.ts`.
   */
  | "file";

/**
 * خيارٌ **موصوف** لا مجرّد قيمة.
 *
 * ⚠️ جاء من وركفلو Impact: سبعةُ مناصبَ لكلٍّ مسؤولياتٌ وعددُ مقاعد،
 * والطالب لا يستطيع الاختيار قبل قراءتها. وقائمةٌ منسدلة تُخفيها خلف
 * سطرٍ واحد — فيختار الاسم الذي يعجبه لا العمل الذي يناسبه.
 */
export type QuestionOption = {
  value: string;
  /** مسؤوليات المنصب — تُعرض بنودًا تحت اسمه */
  details?: readonly string[];
  /** عدد المقاعد المتاحة — يُذكر صراحةً فالطالب يقدّر فرصته */
  seats?: number;
  /**
   * خيارُ نفيٍ لا يجتمع مع غيره — «لا يوجد»، «لم أعمل في أيٍّ منها».
   *
   * ⚠️ **وُلد مع جعل السؤال مطلوبًا.** المطلوبُ بلا خيارِ نفيٍ يحبس من لا
   * ينطبق عليه شيء؛ وخيارُ النفي بلا حصرٍ يسمح بـ«لا يوجد» و«تدريب» معًا
   * فيقرأ القائدُ إجابةً تناقض نفسها. الحصرُ يُطبَّق في الواجهة **وعلى
   * الخادم** — الواجهة راحةٌ لا حارس.
   */
  exclusive?: boolean;
};

/** الخياراتُ الحصرية وحدها — للواجهة وللتحقّق */
export function exclusiveValues(
  options: readonly (string | QuestionOption)[] | undefined,
): string[] {
  return (options ?? [])
    .filter((o): o is QuestionOption => typeof o !== "string" && !!o.exclusive)
    .map((o) => o.value);
}

/** القيم وحدها — للتحقّق ولمطابقة ما وصل من النموذج */
export function optionValues(
  options: readonly (string | QuestionOption)[] | undefined,
): string[] {
  return (options ?? []).map((o) => (typeof o === "string" ? o : o.value));
}

/** توحيدُ الشكلين إلى كائنٍ واحد للعرض */
export function asOption(option: string | QuestionOption): QuestionOption {
  return typeof option === "string" ? { value: option } : option;
}

/**
 * فاصلُ الإجابات المتعدّدة داخل القيمة المخزَّنة.
 *
 * ⚠️ **سطرٌ جديد لا فاصلةٌ ولا نقطة.** حقولُ الاختيار سطرٌ واحد لا يحتمل
 * سطرًا جديدًا، فالفاصل لا يمكن أن يظهر داخل خيارٍ ولا داخل نصّ «أخرى».
 * وأي فاصلٍ مرئيّ (`،` أو ` · `) قد يرد في نصّ القائد نفسه فيشقّ إجابةً
 * واحدة إلى اثنتين.
 */
export const ANSWER_SEP = "\n";

/** شقُّ إجابةٍ متعدّدة إلى قيمها — يصلح للمفردة أيضًا */
export function splitAnswer(value: string): string[] {
  return value.split(ANSWER_SEP).map((v) => v.trim()).filter(Boolean);
}

export type CustomQuestion = {
  /** مفتاح ثابت — لا يتغيّر بعد فتح التقديم */
  id: string;
  /** نصّ السؤال كما يراه الطالب */
  label: string;
  type: QuestionType;
  /**
   * خيارات `select` و`multi-select` و`choice-cards`.
   *
   * نصٌّ بسيط، أو كائنٌ موصوف حين يحتاج الخيار شرحًا. والشكلان يتعايشان
   * فلا يُعاد كتابة ما كُتب قبلُ.
   */
  options?: readonly (string | QuestionOption)[];
  /** الغياب يعني اختياري */
  required?: boolean;
  /** سطر توضيحي تحت الحقل */
  hint?: string;

  /**
   * يسمح بخيار «أخرى» بنصٍّ حرّ — لـ`select` و`multi-select`.
   *
   * يُخزَّن النصُّ كما كتبه الطالب بين القيم، لا مسبوقًا بكلمة «أخرى»:
   * القائد يريد ما كتبه لا وسمَ الحقل.
   */
  allowOther?: boolean;

  /**
   * **التفرّع.** لا يظهر السؤال إلّا إذا كانت إجابةُ السؤال المذكور
   * إحدى هذي القيم.
   *
   * ⚠️ **مستوًى واحد لا شجرة.** `questionId` يشير إلى سؤالٍ في الخيار
   * نفسه، ولا يجوز أن يشير إلى سؤالٍ مشروط هو الآخر — وإلّا صار الظهور
   * سلسلةً يصعب على القائد تتبّعها وعلى النظام التحقّق منها. وسؤالٌ
   * مخفيٌّ **لا يُطلب ولا تُحفظ إجابته**، فلا يُخصم على من لم يُسأل.
   */
  showWhen?: {
    questionId: string;
    equals: readonly string[];
  };
};

/** هل يظهر السؤال بحسب ما أُجيب قبله؟ */
export function isVisible(
  question: CustomQuestion,
  answerOf: (questionId: string) => string,
): boolean {
  if (!question.showWhen) return true;
  const picked = splitAnswer(answerOf(question.showWhen.questionId));
  return picked.some((v) => question.showWhen!.equals.includes(v));
}

/**
 * الحد الأقصى لطول الإجابة النصّية.
 * سؤال القائد وسيلة فرز لا مقال — والطالب يجاوب على أسئلة رغباته الثلاث.
 */
export const ANSWER_MAX = 400;

/**
 * اسم حقل الإجابة في النموذج.
 *
 * يجمع الخيار والسؤال في مفتاح واحد لأن السؤال نفسه قد يتكرّر بالمعرّف
 * ذاته تحت خيارين (`experience` مثلًا)، ولو حُفظ بالمعرّف وحده لدهس
 * جوابُ الرغبة الثالثة جوابَ الأولى.
 */
export function answerName(preferenceValue: string, questionId: string): string {
  return `q__${preferenceValue}__${questionId}`;
}
