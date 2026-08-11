/**
 * الهيكل القيادي — أسماء القيادات لكل فصل دراسي.
 *
 * ⚠️ **هذا الملفّ استثناءٌ مقصودٌ من قاعدة «لا أسماء» في `content/people.ts`.**
 * القاعدة هناك قائمةٌ ولم تُلغَ: `LEADERS` تبقى فارغة، ولا يُنشر اسمٌ في أي
 * مادّةٍ أخرى. والاستثناء هنا بقرار حسام (١١ أغسطس ٢٠٢٦) وسببه أن **الهيكل
 * القيادي منشورٌ رسميًّا من النادي نفسه** كل فصل — بطاقةٌ مصمَّمة تُنشر على
 * حسابات النادي وفيها الأسماء والمسمّيات. فالأسماء هنا ليست كشفًا جديدًا،
 * بل نقلٌ لما نشره النادي.
 *
 * وحدُّ الاستثناء: **هذا الملفّ وصفحة `/about/structure` وحدها**. لا تُنقل
 * أسماءٌ منه إلى صفحةٍ أخرى ولا إلى مستندٍ يُصدَّر بلا قرارٍ جديد.
 *
 * ── قواعد التحرير ────────────────────────────────────────────────────────
 * · **`role` نصٌّ كاملٌ لا قالب.** «رئيسة النادي» و«نائب رئيس النادي» تُكتب
 *   حرفيًّا؛ لا يُركّب المسمّى برمجيًّا من الاسم، لأن التذكير والتأنيث لا
 *   يُستنتجان من اسمٍ بأمان — ومسمّى الشخص من حقّه لا من خوارزميّة.
 * · **`linkedin` لا يُخمَّن ولا يُبحث عنه.** يُضاف رابطًا رابطًا حين يصل من
 *   صاحبه. من لا رابط له لا يظهر له زر — لا يُترك زرٌّ ميّت.
 * · **الفصل لقطةٌ تاريخية.** أسماء اللجان تُخزَّن هنا نصًّا لكل فصل ولا
 *   تُستورَد من `content/committees.ts`: ذاك يصف الهيكل **الحالي** ويغذّي
 *   نموذج التقديم والتحقّق على الخادم، وهذا يحفظ ما كان. ولذلك تجد في فصل
 *   ١٤٤٧-٢ «لجنة اللوجستيات» وهي ليست في الهيكل الحالي — وهذا صحيحٌ لا خطأ.
 *
 * ── إضافة فصلٍ جديد ──────────────────────────────────────────────────────
 * أدرج الفصل الجديد **في رأس `LEADERSHIP_TERMS`**. الصفحة تعرض `[0]` وحده،
 * فلا يلزم تعديل مكوّنٍ واحد.
 */

export type LeadershipPerson = {
  name: string;
  /** المسمّى كاملًا بصيغة صاحبه — «قائدة وحدة التصميم» */
  role: string;
  /** رابط لينكدإن كما أرسله صاحبه. لا يُخمَّن. */
  linkedin?: string;
};

export type LeadershipUnit = {
  name: string;
  /** قائمة لا شخصٌ واحد — بعض الوحدات قادها اثنان */
  leaders: readonly LeadershipPerson[];
};

export type LeadershipCommittee = {
  /** مفتاح React ومرساةٌ في الصفحة — لا علاقة له بـ`committees.ts` */
  slug: string;
  name: string;
  head: LeadershipPerson;
  deputies?: readonly LeadershipPerson[];
  units: readonly LeadershipUnit[];
};

export type LeadershipProject = {
  slug: string;
  /** الاسم اللاتيني كما يُكتب رسميًّا — يُعرض داخل `dir="ltr"` */
  name: string;
  manager: LeadershipPerson;
  deputies: readonly LeadershipPerson[];
};

export type LeadershipTerm = {
  /** معرّف تقني — "1447-2" */
  id: string;
  /** كما يُكتب للقارئ — «الفصل الدراسي الثاني ١٤٤٧هـ» */
  label: string;
  president: LeadershipPerson;
  vicePresident: LeadershipPerson;
  committees: readonly LeadershipCommittee[];
  projects: readonly LeadershipProject[];
};

/**
 * الأحدث أوّلًا. الصفحة تعرض `[0]`.
 *
 * 🚧 **هيكل الفصل القادم لم يصل بعد.** حين يصل يُدرَج في الرأس، ويُنقل
 * هذا التعليق معه.
 */
export const LEADERSHIP_TERMS: readonly LeadershipTerm[] = [
  {
    id: "1447-2",
    label: "الفصل الدراسي الثاني ١٤٤٧هـ",

    president: { name: "دانه أبوزيد", role: "رئيسة النادي" },
    vicePresident: { name: "فيصل الصقري", role: "نائب رئيس النادي" },

    committees: [
      {
        slug: "admin-finance",
        name: "اللجنة الإدارية والمالية",
        head: { name: "عبدالرحمن شبيبه", role: "رئيس اللجنة" },
        deputies: [{ name: "ريم المطيري", role: "نائبة رئيس اللجنة" }],
        units: [
          {
            name: "وحدة الأنشطة",
            leaders: [
              { name: "عبدالعزيز الرويلي", role: "قائد وحدة الأنشطة" },
            ],
          },
          {
            name: "وحدة المالية",
            /* ⚠️ في البطاقة الرسمية ظهر اسمان تحت «وحدة المالية» نفسها.
               نُقلا كما هما بانتظار تأكيد حسام: قد يكون أحدهما لوحدةٍ
               أخرى قُرئ اسمها خطأً. */
            leaders: [
              { name: "جنا الزبن", role: "قائدة وحدة المالية" },
              { name: "أثير الهاشل", role: "قائدة وحدة المالية" },
            ],
          },
        ],
      },
      {
        slug: "logistics",
        name: "لجنة اللوجستيات",
        head: { name: "حسام المطيري", role: "رئيس اللجنة" },
        deputies: [{ name: "عبدالعزيز الجبيري", role: "نائب رئيس اللجنة" }],
        units: [
          {
            name: "وحدة التنظيم",
            leaders: [{ name: "أحمد قبلي", role: "قائد وحدة التنظيم" }],
          },
          {
            name: "وحدة الإعداد",
            leaders: [{ name: "ندى البقمي", role: "قائدة وحدة الإعداد" }],
          },
        ],
      },
      {
        slug: "media",
        name: "لجنة الإعلام",
        head: { name: "وريف العبداللطيف", role: "رئيسة اللجنة" },
        deputies: [{ name: "سعود العشري", role: "نائب رئيس اللجنة" }],
        units: [
          {
            name: "وحدة التصميم",
            leaders: [{ name: "ديمه البرغش", role: "قائدة وحدة التصميم" }],
          },
          {
            name: "وحدة التسويق",
            leaders: [{ name: "أديم العثمان", role: "قائدة وحدة التسويق" }],
          },
        ],
      },
      {
        slug: "relations",
        name: "لجنة العلاقات",
        head: { name: "أسامة الحناكي", role: "رئيس اللجنة" },
        deputies: [{ name: "ريما الثاقب", role: "نائبة رئيس اللجنة" }],
        units: [
          {
            name: "وحدة الزيارات",
            leaders: [{ name: "ريهام الشمراني", role: "قائدة وحدة الزيارات" }],
          },
          {
            name: "وحدة الرعايات",
            leaders: [{ name: "الجوهرة الحسن", role: "قائدة وحدة الرعايات" }],
          },
        ],
      },
      {
        slug: "human-resources",
        name: "لجنة الموارد البشرية",
        head: { name: "ضحى الفارس", role: "رئيسة اللجنة" },
        deputies: [{ name: "الجوهرة الكثيري", role: "نائبة رئيس اللجنة" }],
        units: [
          {
            name: "وحدة المتابعة",
            leaders: [{ name: "ليان الريس", role: "قائدة وحدة المتابعة" }],
          },
          {
            name: "وحدة التسجيل",
            leaders: [{ name: "سعيد الدوسري", role: "قائد وحدة التسجيل" }],
          },
        ],
      },
    ],

    projects: [
      {
        slug: "misology",
        name: "MISology",
        /* ⚠️ قراءة اسم العائلة تحتاج تأكيدًا — «العربدي» في البطاقة. */
        manager: { name: "عبدالعزيز العربدي", role: "مدير المشروع" },
        deputies: [
          { name: "شموخ الشايع", role: "نائبة مدير المشروع" },
          { name: "ريما الطمره", role: "نائبة مدير المشروع" },
        ],
      },
      {
        slug: "datathon",
        name: "Datathon",
        manager: { name: "رغد الجويعي", role: "مديرة المشروع" },
        deputies: [
          { name: "جودي الغامدي", role: "نائبة مدير المشروع" },
          { name: "عمر العنقري", role: "نائب مدير المشروع" },
        ],
      },
      {
        slug: "learnx",
        name: "LearnX",
        manager: { name: "لمى القحطاني", role: "مديرة المشروع" },
        deputies: [
          { name: "ريناد العجلان", role: "نائبة مدير المشروع" },
          { name: "أحمد العبداللطيف", role: "نائب مدير المشروع" },
        ],
      },
    ],
  },
];

/** الفصل المعروض — رأس القائمة */
export function newestTerm(): LeadershipTerm {
  return LEADERSHIP_TERMS[0];
}

/** عدد من في الهيكل — يُحسب ولا يُكتب يدويًّا فيتخلّف عن البيانات */
export function countPeople(term: LeadershipTerm): number {
  const committeeCount = term.committees.reduce(
    (sum, committee) =>
      sum +
      1 +
      (committee.deputies?.length ?? 0) +
      committee.units.reduce((unitSum, unit) => unitSum + unit.leaders.length, 0),
    0,
  );

  const projectCount = term.projects.reduce(
    (sum, project) => sum + 1 + project.deputies.length,
    0,
  );

  return 2 + committeeCount + projectCount;
}
