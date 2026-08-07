import { z } from "zod";
import {
  PREFERENCE_VALUES,
  findPreference,
  isCommitteeValue,
} from "@/content/preferences";
import { ANSWER_MAX, answerName } from "@/content/questions";

/**
 * قواعد التحقق من طلب العضوية.
 *
 * تُستعمل على الخادم أولًا — التحقق في المتصفح راحةٌ للطالب لا حاجز أمان،
 * ومن يعطّل الجافاسكربت يمرّ من فوقه.
 *
 * ملاحظة تصميمية: كل رسالة خطأ تقول **كيف يُصلَح** لا أن شيئًا خطأ فقط.
 *
 * الشكل: ثلاث خطوات لها ثلاثة مخطّطات جزئية، ومخطّط كامل يجمعها. الجزئية
 * تخدم زر «التالي» في المتصفح، والكامل هو الحكم على الخادم — ومصدرهما واحد
 * فلا يقبل أحدهما ما يرفضه الآخر.
 */

/** الأرقام الغربية فقط — لوحة مفاتيح الجوال تخرجها كذلك */
const DIGITS = /^\d+$/;

/** حروف عربية وتشكيل ومسافات — بلا لاتيني وبلا أرقام من أي نوع */
const ARABIC_ONLY = /^[ء-ْ\s]+$/;

/** تحويل الأرقام الهندية إن لصقها الطالب من مكان آخر */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\s-]/g, "");
}

export const ACADEMIC_LEVELS = [
  "السنة الأولى",
  "السنة الثانية",
  "السنة الثالثة",
  "السنة الرابعة",
  "السنة الخامسة فأكثر",
] as const;

/** يُختار حين لا تكون الجامعة في القائمة — فتُكتب يدويًا */
export const UNIVERSITY_OTHER = "جامعة أخرى";

/**
 * جامعة النادي.
 *
 * تُذكر باسمها لا بموضعها في القائمة: قواعدُ حقولٍ أخرى معلّقة بها — طول
 * الرقم الجامعي، وقائمة التخصصات — فتغييرُ ترتيب القائمة يجب ألّا يغيّرها.
 */
export const HOME_UNIVERSITY = "جامعة الملك سعود";

/**
 * الجامعات المعتمدة في القائمة.
 *
 * الترتيب كما اعتمدته إدارة النادي لا أبجديًّا: جامعة الملك سعود أولًا —
 * النادي فيها وأغلب المتقدّمين منها — ثم الحكومية ثم الأهلية.
 *
 * الأسماء **رسميّة كما تكتبها الجامعة عن نفسها**، لا كما تُتداول. تحديدًا:
 * «جامعة الفيصل» و«جامعة دار العلوم» بلا لفظ «الأهلية» — وهو وصفٌ لنوعها
 * لا جزءٌ من اسمها. الطالب يبحث عن اسم جامعته كما يعرفه من وثائقه، واسمٌ
 * مزيدٌ عليه يجعله يظنّ جامعته غير مذكورة فيختار «جامعة أخرى» بلا داعٍ.
 *
 * ⚠️ القائمة أوسع من جامعة واحدة، وقائمة التخصصات ما زالت برامج كلية إدارة
 * الأعمال بجامعة الملك سعود — فمن يختار جامعةً أخرى يمرّ عبر «تخصص آخر».
 */
export const UNIVERSITIES = [
  HOME_UNIVERSITY,
  "جامعة الإمام محمد بن سعود الإسلامية",
  "جامعة الأميرة نورة بنت عبدالرحمن",
  "جامعة الملك سعود بن عبدالعزيز للعلوم الصحية",
  "جامعة الأمير سطام بن عبدالعزيز",
  "جامعة الأمير سلطان",
  "جامعة الفيصل",
  "جامعة اليمامة",
  "جامعة دار العلوم",
  "جامعة المعرفة",
  "الجامعة العربية المفتوحة",
  UNIVERSITY_OTHER,
] as const;

/* ── الرقم الجامعي ────────────────────────────────────────────────────── */

/**
 * طول الرقم الجامعي في جامعة الملك سعود — تسع خانات، ويُفرض عليها وحدها.
 *
 * فرضُه على الجميع كان يرفض رقمًا صحيحًا عند كل جامعةٍ تعتمد طولًا غيره —
 * وهو رفضٌ لا يستطيع الطالب تجاوزه: الرقم ليس اختيارًا يُعاد كتابته.
 */
export const KSU_STUDENT_ID_LENGTH = 9;

/**
 * الحدّان اللذان يُقبل بينهما رقمُ بقيّة الجامعات.
 *
 * واسعان عمدًا: أطوال الأرقام تختلف بين الجامعات ولا قائمة موثوقة بها،
 * وحدٌّ ضيّقٌ مبنيٌّ على تخمين يعيد العطلَ الذي نصلحه. وظيفتهما صدّ خطأ
 * الكتابة (خانة واحدة، أو رقم جوال ملصوق) لا فرضُ تنسيق — والفرزُ بشريّ.
 */
export const STUDENT_ID_MIN = 4;
export const STUDENT_ID_MAX = 12;

/** يُختار حين لا يكون التخصص من برامج الكلية — فيُكتب يدويًا */
export const MAJOR_OTHER = "تخصص آخر";

/**
 * تخصصات كلية إدارة الأعمال بجامعة الملك سعود — برامج البكالوريوس السبعة.
 *
 * مأخوذة من صفحة برامج البكالوريوس في موقع الكلية (`cba.ksu.edu.sa`):
 * ستة أقسام تمنح البكالوريوس، وقسم الإدارة يمنح مسارين (الإدارة، والموارد
 * البشرية). أقسام الإدارة العامة والإدارة الصحية والتحليل الكمي لا تمنح
 * بكالوريوس في الكلية، فمن يدرس فيها يختار «تخصص آخر».
 *
 * نظم المعلومات الإدارية أولًا لأنه تخصّص النادي وأغلب المتقدّمين منه.
 */
export const MAJORS = [
  "نظم المعلومات الإدارية",
  "الإدارة",
  "إدارة الموارد البشرية",
  "التسويق",
  "المحاسبة",
  "المالية",
  "الاقتصاد",
  MAJOR_OTHER,
] as const;

export const HEARD_FROM = [
  "حسابات النادي في التواصل الاجتماعي",
  "صديق أو زميل",
  "فعالية أو معرض للنادي",
  "عضو هيئة تدريس",
  "قناة الكلية أو الجامعة",
  "مصدر آخر",
] as const;

/* ── المرفقات ─────────────────────────────────────────────────────────── */

/** خمسة ميجابايت — سيرة ذاتية أو معرض أعمال لا يتجاوزها إلا بصور غير مضغوطة */
export const CV_MAX_BYTES = 5 * 1024 * 1024;

export const CV_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;

/** ما يُعرض للطالب ويُمرَّر إلى `accept` — مشتقّ من القائمة أعلاه لا مكرّر عنها */
export const CV_ACCEPT = CV_TYPES.join(",");

/**
 * فحص المرفق.
 *
 * منفصل عن `zod` لأن الملف يصل كـ `File` داخل `FormData` لا كنصّ، ولأن
 * المتصفح يرسل ملفًا فارغًا باسم فارغ حين لا يختار الطالب شيئًا — وهذا
 * ليس خطأً، المرفق اختياري.
 */
export function validateCvFile(file: unknown): string | undefined {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > CV_MAX_BYTES) {
    return "حجم الملف أكبر من 5 ميجابايت — اضغطه أو ضع رابطًا بدلًا عنه";
  }
  if (!(CV_TYPES as readonly string[]).includes(file.type)) {
    return "الصيغ المقبولة: PDF أو PNG أو JPG";
  }
  return undefined;
}

/* ── الروابط ──────────────────────────────────────────────────────────── */

/** الطالب يلصق `linkedin.com/in/…` بلا بروتوكول غالبًا — نُكمله له */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * لا يُقبل إلا `http`/`https`.
 * `javascript:` و`data:` روابط تنفّذ كودًا، وهذا الرابط يُعرض لاحقًا للجنة
 * الفرز في لوحة الإدارة — فمصدره الطالب ولا يُوثَق به.
 */
function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

function isLinkedinUrl(value: string): boolean {
  const url = parseHttpUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

/** حقل رابط اختياري — الفراغ مقبول، وما عداه لا بد أن يكون رابطًا سليمًا */
function optionalUrl(message: string, extra?: (value: string) => boolean) {
  return z
    .string()
    .trim()
    .transform(normalizeUrl)
    .refine(
      (value) =>
        value === "" ||
        (parseHttpUrl(value) !== undefined && (!extra || extra(value))),
      { message },
    );
}

/* ── الحقول ───────────────────────────────────────────────────────────── */

const choiceField = (position: string) =>
  z
    .string()
    .min(1, `اختر ${position}`)
    .refine((v) => PREFERENCE_VALUES.includes(v), {
      message: "الخيار غير معروف — اختر من القائمة",
    });

const personalShape = {
  fullName: z
    .string()
    .trim()
    .min(1, "اكتب اسمك الثلاثي كما هو في النظام الأكاديمي")
    .min(5, "الاسم قصير — اكتبه ثلاثيًا")
    .max(80, "الاسم طويل — اكتبه ثلاثيًا بلا ألقاب"),

  /* الطول يتبع الجامعة، ويُحكم عليه في `refinePersonal` — وهنا الحدّان
     الواسعان وحدهما. ما دون `STUDENT_ID_MIN` أو فوق `STUDENT_ID_MAX` خطأ
     كتابةٍ لا اختلافُ تنسيق، ولا جامعة تعتمده. */
  studentId: z
    .string()
    .transform(normalizeDigits)
    .pipe(
      z
        .string()
        /* الفراغ أولًا: بدونه يرى الطالبُ رسالةَ «أرقام فقط» على حقل لم يكتب فيه شيئًا */
        .min(1, "اكتب رقمك الجامعي")
        .regex(DIGITS, "الرقم الجامعي أرقام فقط، بلا مسافات أو شرطات")
        .min(STUDENT_ID_MIN, "الرقم الجامعي أقصر من أي رقم جامعي حقيقي")
        .max(STUDENT_ID_MAX, "الرقم الجامعي أطول من أي رقم جامعي حقيقي"),
    ),

  /* عشر خانات تبدأ بـ 1 للمواطن أو 2 للمقيم — نفس قاعدة أبشر */
  nationalId: z
    .string()
    .transform(normalizeDigits)
    .pipe(
      z
        .string()
        .min(1, "اكتب رقم الهوية أو الإقامة")
        .regex(DIGITS, "رقم الهوية أرقام فقط، بلا مسافات أو شرطات")
        .length(10, "رقم الهوية عشر خانات")
        .regex(/^[12]/, "رقم الهوية يبدأ بـ 1 للمواطن أو 2 للمقيم"),
    ),

  /* يبدأ بـ 05 ومجموعه عشر خانات */
  phone: z
    .string()
    .transform(normalizeDigits)
    .pipe(
      z
        .string()
        .min(1, "اكتب رقم جوالك")
        .regex(DIGITS, "رقم الجوال أرقام فقط")
        .length(10, "رقم الجوال عشر خانات")
        .startsWith("05", "رقم الجوال يبدأ بـ 05"),
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "اكتب بريدك الإلكتروني")
    .email("صيغة البريد غير صحيحة — مثال: name@ksu.edu.sa"),

  university: z.enum(UNIVERSITIES, {
    errorMap: () => ({ message: "اختر جامعتك" }),
  }),

  /* لا تُطلب إلا مع «جامعة أخرى» — الشرط في `refinePersonal` أدناه */
  universityOther: z
    .string()
    .trim()
    .max(60, "اسم الجامعة طويل — اكتبه كما هو رسميًا")
    .optional()
    .or(z.literal("")),

  level: z.enum(ACADEMIC_LEVELS, {
    errorMap: () => ({ message: "اختر مستواك الدراسي" }),
  }),

  major: z.enum(MAJORS, {
    errorMap: () => ({ message: "اختر تخصصك" }),
  }),

  /* لا يُطلب إلا مع «تخصص آخر» — الشرط في `refinePersonal` أدناه */
  majorOther: z
    .string()
    .trim()
    .max(60, "اسم التخصص طويل — اكتبه كما هو في اسم القسم")
    .optional()
    .or(z.literal("")),
};

const preferencesShape = {
  choice1: choiceField("رغبتك الأولى"),
  choice2: choiceField("رغبتك الثانية"),
  choice3: choiceField("رغبتك الثالثة"),
};

const finalShape = {
  why: z
    .string()
    .trim()
    .min(1, "اكتب سبب اختيارك لهذي الرغبات")
    .min(30, "وضّح أكثر — سطران أو ثلاثة تكفي")
    .max(600, "اختصر إلى 600 حرف"),

  heardFrom: z.enum(HEARD_FROM, {
    errorMap: () => ({ message: "اختر كيف سمعت عن النادي" }),
  }),

  portfolio: optionalUrl(
    "الرابط غير صحيح — تأكّد أنه يبدأ بـ https:// ويفتح لدى غيرك",
  ),

  linkedin: optionalUrl(
    "ضع رابط حسابك في LinkedIn — مثال: https://linkedin.com/in/username",
    isLinkedinUrl,
  ),

  /* خانة الاختيار لا تُرسل أصلًا إن لم تُعلَّم، فالغياب = عدم موافقة */
  agree: z.literal("on", {
    errorMap: () => ({ message: "لا بد من الموافقة على شروط العضوية للمتابعة" }),
  }),
};

/* ── الشروط المركّبة ──────────────────────────────────────────────────── */

type PersonalValues = {
  studentId?: string;
  university?: string;
  universityOther?: string;
  major?: string;
  majorOther?: string;
};

/**
 * شرط حقلٍ نصّي يفتحه خيار «أخرى».
 *
 * القاعدة واحدة للجامعة والتخصص فتُكتب مرّة: الحقل لا يُطلب إلا حين يُختار
 * «أخرى»، وحينها لا بدّ أن يكون مكتوبًا كاملًا وبالعربية. والرسائل تُمرَّر
 * من الخارج لأن كلًّا منهما يقول للطالب **كيف يُصلَح حقله هو** لا قاعدةً عامة.
 */
function requireOther(
  ctx: z.RefinementCtx,
  path: string,
  value: string | undefined,
  messages: { empty: string; short: string; latin: string },
): void {
  const other = (value ?? "").trim();
  const message = !other
    ? messages.empty
    : other.length < 4
      ? messages.short
      : !ARABIC_ONLY.test(other)
        ? messages.latin
        : undefined;

  if (message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  }
}

function refinePersonal(v: PersonalValues, ctx: z.RefinementCtx): void {
  /* التسع خانات قاعدةُ جامعة الملك سعود وحدها.
     `v.studentId` هنا مطبَّعٌ ومفحوصٌ أصلًا — لا يصل الشرطُ إلا بعد نجاح
     مخطّط الحقل، فيكفي قياس طوله. */
  if (
    v.university === HOME_UNIVERSITY &&
    v.studentId &&
    v.studentId.length !== KSU_STUDENT_ID_LENGTH
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studentId"],
      message: "الرقم الجامعي في جامعة الملك سعود تسع خانات",
    });
  }

  if (v.university === UNIVERSITY_OTHER) {
    requireOther(ctx, "universityOther", v.universityOther, {
      empty: "اكتب اسم جامعتك كاملًا بالعربية",
      short: "اكتب اسم الجامعة كاملًا لا مختصرًا",
      latin: "اكتب اسم الجامعة بالعربية — بلا حروف لاتينية ولا أرقام",
    });
  }

  if (v.major === MAJOR_OTHER) {
    requireOther(ctx, "majorOther", v.majorOther, {
      empty: "اكتب اسم تخصصك كاملًا بالعربية كما هو في اسم القسم",
      short: "اكتب اسم التخصص كاملًا لا مختصرًا",
      latin: "اكتب اسم التخصص بالعربية — بلا حروف لاتينية ولا أرقام",
    });
  }
}

type PreferenceValues = { choice1?: string; choice2?: string; choice3?: string };

function refinePreferences(v: PreferenceValues, ctx: z.RefinementCtx): void {
  const chosen = [v.choice1, v.choice2, v.choice3];

  chosen.forEach((value, index) => {
    if (!value) return;
    if (chosen.slice(0, index).includes(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [`choice${index + 1}`],
        message: "اخترتها في رغبة سابقة — اختر غيرها",
      });
    }
  });

  /* الشرط لا يُفحص إلا بعد اكتمال الثلاث، وإلا ظهر خطأٌ عن نقصٍ لم يقع بعد */
  const filled = chosen.filter((value): value is string => Boolean(value));
  if (filled.length === chosen.length && !filled.some(isCommitteeValue)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["choice1"],
      message: "لا بد أن تكون إحدى رغباتك الثلاث لجنة أو وحدة داخلها",
    });
  }
}

/* ── المخطّطات ────────────────────────────────────────────────────────── */

/**
 * مخطّطات الخطوات — يستعملها زر «التالي» ليتحقّق من خطوته وحدها.
 * الترتيب يطابق `STEPS`، والخطوة الأخيرة لا زرّ «تالي» لها فيحكم عليها
 * الخادم وحده — وتبقى في القائمة ليظلّ الفهرس واحدًا في الملفين.
 */
export const STEP_SCHEMAS: readonly z.ZodTypeAny[] = [
  z.object(personalShape).superRefine(refinePersonal),
  z.object(preferencesShape).superRefine(refinePreferences),
  z.object(finalShape),
] as const;

export const registrationSchema = z
  .object({ ...personalShape, ...preferencesShape, ...finalShape })
  .superRefine((v, ctx) => {
    refinePersonal(v, ctx);
    refinePreferences(v, ctx);
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

/* ── الخطوات ──────────────────────────────────────────────────────────── */

export const STEPS = [
  {
    title: "البيانات الشخصية",
    fields: [
      "fullName",
      "studentId",
      "nationalId",
      "phone",
      "email",
      "university",
      "universityOther",
      "level",
      "major",
      "majorOther",
    ],
  },
  { title: "اللجان والمشاريع", fields: ["choice1", "choice2", "choice3"] },
  {
    title: "الأسئلة والمرفقات",
    fields: ["why", "heardFrom", "cv", "portfolio", "linkedin", "agree"],
  },
] as const;

export const STEP_COUNT = STEPS.length;

/**
 * الخطوة التي يقع فيها الحقل — تُستعمل للقفز إلى أول خطوة فيها خطأ بعد
 * ردّ الخادم. إجابات أسئلة القادة كلها في الخطوة الأخيرة، وأسماؤها مولّدة
 * فلا تُذكر في `STEPS`.
 */
export function stepOfField(name: string): number {
  const index = STEPS.findIndex((step) =>
    (step.fields as readonly string[]).includes(name),
  );
  return index === -1 ? STEP_COUNT - 1 : index;
}

/* ── إجابات أسئلة القادة ──────────────────────────────────────────────── */

/**
 * التحقّق من إجابات الأسئلة التي كتبها قادة الرغبات المختارة.
 *
 * خارج `zod` لأن الأسئلة نفسها بيانات لا مخطّط: تتغيّر بتغيّر رغبات الطالب،
 * ولا تُعرف أسماء حقولها قبل قراءة اختياره.
 */
export function validateAnswers(
  choices: readonly string[],
  read: (name: string) => string,
): { answers: Record<string, string>; errors: Record<string, string> } {
  const answers: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const choice of choices) {
    const preference = findPreference(choice);
    if (!preference?.questions) continue;

    for (const question of preference.questions) {
      const name = answerName(choice, question.id);
      const value = read(name).trim();
      answers[name] = value;

      if (!value) {
        if (question.required) errors[name] = "أجب عن هذا السؤال للمتابعة";
        continue;
      }
      if (value.length > ANSWER_MAX) {
        errors[name] = `اختصر إلى ${ANSWER_MAX} حرف`;
        continue;
      }
      if (
        question.type === "select" &&
        !(question.options ?? []).includes(value)
      ) {
        errors[name] = "اختر إجابة من القائمة";
      }
    }
  }

  return { answers, errors };
}

/* ── حالة النموذج ─────────────────────────────────────────────────────── */

/** نتيجة الإرسال التي تعود للواجهة */
export type RegistrationState = {
  ok: boolean;
  message: string;
  /**
   * خطأ لكل حقل — المفتاح اسم الحقل.
   * `string` لا `keyof RegistrationInput` لأن أسماء حقول أسئلة القادة مولّدة.
   */
  errors: Record<string, string>;
  /** ما أدخله الطالب، ليُعاد ملؤه بدل أن يكتبه من جديد */
  values: Record<string, string>;
};

export const emptyState: RegistrationState = {
  ok: false,
  message: "",
  errors: {},
  values: {},
};
