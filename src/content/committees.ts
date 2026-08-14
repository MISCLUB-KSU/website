/**
 * اللجان والوحدات — الهيكل المعتمد من عرض "اجتماع قادة المشاريع".
 *
 * هذا الهيكل يختلف عن الموقع السابق، والمعتمد هو ما هنا بقرار رئاسة النادي.
 * أبرز الفروق: "لجنة المشاريع" مستحدثة وتحتها مشاريع النادي الستة،
 * و"لجنة اللوجستيات" لم تعد ضمن الهيكل.
 *
 * ملاحظة خصوصية: أسماء رؤساء اللجان والوحدات موجودة في العرض ولم تُنقل هنا،
 * ولا تُنشر — بقرار رئاسة النادي.
 */

import type { CustomQuestion } from "./questions";

export type Unit = {
  slug: string;
  name: string;
  description: string;
  /** هل هذي الوحدة تستقبل طلبات هالترم؟ تتحكم فيها الإدارة */
  isOpen: boolean;
  /** أسئلة قائد الوحدة — تظهر لمن اختارها ضمن رغباته. انظر `questions.ts` */
  questions?: readonly CustomQuestion[];
};

/**
 * أيقونة اللجنة — تُرسم في `committee-mark.tsx`.
 *
 * ⚠️ **الاسمُ بالرسم لا بالمهمّة** (`camera` لا `media`): اللجنةُ يتغيّر
 * اسمُها ونطاقُها بين الفصول، والأيقونةُ لا تتغيّر بتغيّرهما — ومن يضيف
 * لجنةً يختار رسمًا موجودًا لا يخترع اسمًا جديدًا للمعنى نفسه.
 *
 * ⚠️ إضافة إلى نظام الهوية تنتظر اعتماد الرئاسة.
 */
export type MarkIcon = "partners" | "member" | "wallet" | "camera";

export type Committee = {
  slug: string;
  name: string;
  description: string;
  mark: MarkIcon;
  /** لجان بإشراف الرئاسة مباشرة لا تتبع نائب الرئيس */
  reportsToPresidency?: boolean;
  /** بعض اللجان تعمل ككتلة واحدة بلا وحدات فرعية */
  units: readonly Unit[];
  /**
   * وحدات **نموذج التقديم وحده** — تحلّ محلّ `units` في الرغبات لا في
   * صفحة اللجنة.
   *
   * ⚠️ **الازدواج مقصودٌ بقرارٍ صريح (١٤ أغسطس ٢٠٢٦)، لا سهوًا.** طُلب أن
   * تتغيّر خيارات اللجنة الإعلامية في النموذج إلى ستّة مساراتٍ بالمهارة
   * (كتابةٌ · جرافيك · تصوير · مونتاج · أفكار · إدارة حسابات) **وأن تبقى
   * صفحةُ اللجنة العامّة بوحداتها الثلاث كما هي**. فالحقل يفصل القائمتين
   * بدل أن تُكتب إحداهما في مكانٍ لا يخصّها.
   *
   * ⚠️ **وثمنُه أن الزائر يقرأ قائمتين للجنة واحدة** — وهذا معلومٌ ومقبولٌ
   * عند صاحب القرار. فمن أراد توحيدهما يومًا، ينقل الستّة إلى `units`
   * ويحذف هذا الحقل، ولا شيء غيرهما يتغيّر.
   *
   * ⚠️ ولا تُوضع هنا وحدةٌ لها `questions`: أسئلةُ الوحدة تُنزَّل من هذي
   * القائمة نفسِها في `preferences.ts`، فما يُكتب هنا هو ما يراه المتقدّم.
   */
  applicationUnits?: readonly Unit[];
  /**
   * أسئلة قائد اللجنة.
   *
   * · لجنةٌ بلا وحدات: تُسأل لمن اختارها، كأي رغبة.
   * · لجنةٌ بوحدات: تنزل على وحداتها كلِّها و**تُسأل مرّةً واحدة** مهما
   *   تعدّدت وحداتُها في رغبات الطالب — انظر `SharedQuestions` في
   *   `preferences.ts`. وما يخصّ وحدةً بعينها يُكتب في `unit.questions`.
   */
  questions?: readonly CustomQuestion[];
};

/**
 * أسئلة اللجنة الإعلامية — من قائدها (١١ أغسطس ٢٠٢٦).
 *
 * ⚠️ **على اللجنة لا على وحداتها، وتُسأل مرّةً واحدة.** أسئلةُ القائد عن
 * مجالات الإعلام عمومًا لا عن تصميمٍ دون تصوير، فمن يختار وحدتين منها
 * كان يُجيب الخمسةَ مرّتين. و`preferences.ts` ينزّل `committee.questions`
 * على كل وحدةٍ بمفتاح اللجنة (`SharedQuestions`) — فتُعرض كتلةً واحدة
 * وتُخزَّن مرّةً بمفتاح `committee:media`.
 */
const MEDIA_AREAS = [
  "كتابة المحتوى (كابشنات، سكربتات، مقالات)",
  "التصميم الجرافيكي (بوسترات، سوشيال ميديا)",
  "التصوير الفوتوغرافي والفيديو",
  "مونتاج الفيديو والموشن جرافيك",
  "الأفكار الإبداعية وتخطيط الحملات",
  "إدارة حسابات التواصل وتحليل الأداء",
] as const;

const MEDIA_QUESTIONS: readonly CustomQuestion[] = [
  {
    id: "gain",
    label:
      "ما المهارة أو الخبرة المحددة التي تتوقع أن تكتسبها من انضمامك لهذه اللجنة؟",
    type: "long-text",
    required: true,
  },
  {
    id: "worked-in",
    label: "اختر المجالات التي عملت فيها سابقًا",
    type: "multi-select",
    required: true,
    hint: "اختر كل ما ينطبق.",
    options: [
      ...MEDIA_AREAS,
      { value: "لم أعمل سابقًا", exclusive: true },
    ],
  },
  {
    /* الوركفلو يقول «رابط، صورة، أو ملف» — فحقلان: رفعٌ لمن ملفُّه عنده،
       ورابطٌ لمن عملُه منشورٌ في درايف أو بيهانس. وأحدهما يكفي. */
    id: "sample",
    label: "أرفق مثالًا واحدًا على عملك",
    type: "file",
    hint: "بوستر أو تصميم أو صورة من عملك.",
    showWhen: { questionId: "worked-in", equals: MEDIA_AREAS },
  },
  {
    id: "sample-link",
    label: "أو ضع رابطًا لعملك",
    type: "text",
    hint: "درايف، بيهانس، إنستقرام… تأكّد أن الرابط يفتح لدى غيرك.",
    showWhen: { questionId: "worked-in", equals: MEDIA_AREAS },
  },
  {
    id: "want",
    label: "اختر المجالات التي ترغب بالعمل فيها معنا",
    type: "multi-select",
    required: true,
    hint: "مجال أو اثنان.",
    options: MEDIA_AREAS,
  },
  /* ⚠️ **سؤال «التزامات هذا الفصل» نُقل عامًّا — ولا يُعاد هنا.**
     كان في هذي القائمة وحدها، فيُسأل من اختار الإعلامية ولا يُسأل من اختار
     غيرها. والوقتُ المتاح ليس شأنَ لجنةٍ بعينها: كلُّ قائدٍ يحتاجه ليعرف كم
     يحمّل العضو. وموضعُه الآن `COMMITMENTS` في `registration.ts` — يُسأل
     مرّةً واحدة لكل متقدّم كسؤال الخبرة السابقة. */
];

export const COMMITTEES: readonly Committee[] = [
  {
    slug: "public-relations",
    name: "لجنة العلاقات العامة والشراكات",
    mark: "partners",
    description:
      "تبني علاقات النادي مع الجهات الخارجية والرعاة، وتنظّم تواصله الداخلي.",
    reportsToPresidency: true,
    units: [
      {
        slug: "sponsorship",
        name: "وحدة الرعايات والشراكات",
        description: "التواصل مع الرعاة والجهات الداعمة وبناء الشراكات.",
        isOpen: true,
      },
      {
        slug: "visits",
        name: "وحدة الزيارات",
        description: "تنظيم الزيارات الميدانية للشركات والجهات.",
        isOpen: true,
      },
      {
        slug: "internal-comms",
        name: "وحدة التواصل الداخلي",
        description: "ربط اللجان ببعضها وضمان وصول المعلومة داخل النادي.",
        isOpen: true,
      },
    ],
  },
  {
    slug: "human-resources",
    name: "لجنة الموارد البشرية",
    mark: "member",
    description:
      "إدارة الأعضاء والمتطوعين، ومتابعة ساعاتهم، وتنظيم عمليات التسجيل.",
    units: [],
  },
  {
    slug: "finance-operations",
    name: "لجنة الموارد المالية والتنظيمية",
    mark: "wallet",
    description:
      "تنظيم الشؤون الإدارية والمالية، وتوثيق أعمال النادي وتقاريره.",
    units: [
      {
        slug: "archive",
        name: "وحدة الأرشيف والتقارير",
        description: "توثيق أعمال النادي وإعداد التقارير الدورية.",
        isOpen: true,
      },
      {
        slug: "operations",
        name: "وحدة العمليات",
        description: "تجهيز متطلبات الفعاليات وتنسيق تنفيذها.",
        isOpen: true,
      },
      {
        slug: "budget",
        name: "وحدة إدارة الميزانية",
        description: "ضبط المصروفات ومتابعة ميزانية النادي ومشاريعه.",
        isOpen: true,
      },
    ],
  },
  {
    slug: "media",
    name: "اللجنة الإعلامية",
    mark: "camera",
    description:
      "تُبرز صورة النادي وتنشر أخباره وأنشطته عبر المحتوى البصري والتسويقي.",
    questions: MEDIA_QUESTIONS,
    /* مساراتُ التقديم الستّة — انظر `applicationUnits` في نوع `Committee`
       أعلاه لسبب انفصالها عن `units`. الأوصاف صيغت هنا وتنتظر مراجعة قائد
       اللجنة؛ الأسماء كما وردت في الطلب. */
    applicationUnits: [
      {
        slug: "content-writing",
        name: "كتابة المحتوى",
        description: "كابشنات ومقالات وسكربتات للفيديو.",
        isOpen: true,
      },
      {
        slug: "graphic-design",
        name: "التصميم الجرافيكي",
        description: "بوسترات ومنشورات لحسابات التواصل.",
        isOpen: true,
      },
      {
        slug: "photography-video",
        name: "التصوير الفوتوغرافي والفيديو",
        description: "تغطية الفعاليات بالصورة والفيديو.",
        isOpen: true,
      },
      {
        slug: "video-editing",
        name: "مونتاج الفيديو والموشن جرافيك",
        description: "تركيب المادة المصوَّرة وإخراجها بالحركة.",
        isOpen: true,
      },
      {
        slug: "creative-campaigns",
        name: "الأفكار الإبداعية وتخطيط الحملات",
        description: "ابتكار الفكرة وبناء خطة الحملة الترويجية.",
        isOpen: true,
      },
      {
        slug: "social-accounts",
        name: "إدارة حسابات التواصل وتحليل الأداء",
        description: "نشر المحتوى ومتابعة أرقام الوصول والتفاعل.",
        isOpen: true,
      },
    ],
    units: [
      {
        slug: "marketing",
        name: "وحدة التسويق",
        description: "الترويج للفعاليات والبرامج وإدارة حسابات النادي.",
        isOpen: true,
      },
      {
        slug: "photography",
        name: "وحدة التصوير",
        description: "تغطية الفعاليات بالصورة والفيديو.",
        isOpen: true,
      },
      {
        slug: "design",
        name: "وحدة التصميم",
        description: "إنتاج الهويات البصرية والمواد الإبداعية.",
        isOpen: true,
      },
    ],
  },
] as const;

export const ALL_UNITS = COMMITTEES.flatMap((committee) =>
  committee.units.map((unit) => ({
    ...unit,
    committeeSlug: committee.slug,
    committeeName: committee.name,
  })),
);

export function findCommittee(slug: string): Committee | undefined {
  return COMMITTEES.find((committee) => committee.slug === slug);
}

/** اللجان التي تعمل ككتلة واحدة — يُقدَّم عليها مباشرة لا على وحدة داخلها */
export const COMMITTEES_WITHOUT_UNITS = COMMITTEES.filter(
  (committee) => committee.units.length === 0,
);

/**
 * الوحدات المستقبِلة للطلبات — يوازي `OPEN_PROJECTS` في `projects.ts`.
 *
 * ⚠️ **وُجد لأن الواجهة كانت تكذب.** كانت الرئيسية تحسب حالة التقديم من
 * `OPEN_PROJECTS` وحدها، والمشاريع الستّة مغلقة — فتقول لكل زائر «التقديم
 * مغلق حاليًا» بينما **تسع وحداتِ لجانٍ مفتوحة** ونموذجُ التقديم يقبلها.
 * أي أن الصفحة تردّ الطالب على الباب وهو مفتوح.
 */
export const OPEN_UNITS = COMMITTEES.flatMap((committee) =>
  committee.units.filter((unit) => unit.isOpen),
);
