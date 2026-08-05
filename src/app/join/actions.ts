"use server";

import {
  emptyState,
  registrationSchema,
  validateAnswers,
  validateCvFile,
  type RegistrationInput,
  type RegistrationState,
} from "@/lib/registration";

/**
 * استقبال طلب العضوية.
 *
 * يُنفَّذ على الخادم دائمًا — التحقق في المتصفح راحةٌ للطالب لا حاجز أمان.
 * من يعطّل الجافاسكربت يصل إلى هنا مباشرةً عبر إرسال النموذج العادي.
 */

/** الحقول التي تُعاد للطالب عند الخطأ حتى لا يكتبها من جديد */
const ECHOED = [
  "fullName",
  "studentId",
  "nationalId",
  "phone",
  "email",
  "level",
  "major",
  "majorOther",
  "choice1",
  "choice2",
  "choice3",
  "why",
  "heardFrom",
  "portfolio",
  "linkedin",
  "agree",
] as const;

/** إجابات أسئلة القادة — أسماؤها مولّدة، فتُلتقط بالسابقة لا بالقائمة */
const ANSWER_PREFIX = "q__";

/**
 * ما يُعاد ملؤه بعد خطأ.
 *
 * المرفق وحده لا يُعاد — المتصفح لا يسمح بضبط قيمة حقل ملف برمجيًا، ولو
 * ادّعينا بقاءه لأرسل الطالبُ طلبًا بلا سيرة ذاتية وهو يظنّها مرفقة.
 */
function echo(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ECHOED) {
    const value = formData.get(key);
    if (typeof value === "string") out[key] = value;
  }
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(ANSWER_PREFIX) && typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function submitRegistration(
  _prev: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const values = echo(formData);

  /* مصيدة الآليات: حقل مخفي يملؤه الروبوت ولا يراه الطالب.
     أهدأ من CAPTCHA ولا يعطّل من يستعمل قارئ الشاشة. */
  if (formData.get("website")) {
    return { ...emptyState, ok: true, message: "وصل طلبك." };
  }

  const parsed = registrationSchema.safeParse({
    fullName: text(formData, "fullName"),
    studentId: text(formData, "studentId"),
    nationalId: text(formData, "nationalId"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    level: text(formData, "level"),
    major: text(formData, "major"),
    majorOther: text(formData, "majorOther"),
    choice1: text(formData, "choice1"),
    choice2: text(formData, "choice2"),
    choice3: text(formData, "choice3"),
    why: text(formData, "why"),
    heardFrom: text(formData, "heardFrom"),
    portfolio: text(formData, "portfolio"),
    linkedin: text(formData, "linkedin"),
    agree: text(formData, "agree"),
  });

  const errors: Record<string, string> = {};
  for (const issue of parsed.success ? [] : parsed.error.issues) {
    const key = String(issue.path[0]);
    if (key && !errors[key]) errors[key] = issue.message;
  }

  const cvError = validateCvFile(formData.get("cv"));
  if (cvError) errors.cv = cvError;

  /* أسئلة القادة تتبع الرغبات المختارة، وتُفحص مع بقية الحقول لا بعدها:
     لو انتظرت قبول المخطّط كاملًا لظهرت أخطاؤها في جولة ثانية، فيصلح
     الطالب حقولًا ثم يُفاجأ بأسئلة لم تكن ظاهرة له.
     الرغبة غير المعروفة تتخطّاها `validateAnswers` بلا أسئلة. */
  const answers = validateAnswers(
    [
      text(formData, "choice1"),
      text(formData, "choice2"),
      text(formData, "choice3"),
    ],
    (name) => text(formData, name),
  );
  Object.assign(errors, answers.errors);

  const count = Object.keys(errors).length;
  /* `!parsed.success` مذكور صراحةً وإن كان يستلزم `count > 0` دائمًا:
     بدونه لا يضيّق TypeScript النوع، فيحتاج ما بعده إلى تأكيدٍ يدوي
     يبطل الفائدة من الفحص أصلًا. */
  if (!parsed.success || count > 0) {
    return {
      ok: false,
      errors,
      values,
      message:
        count === 1
          ? "حقل واحد يحتاج تصحيحًا — راجعه أدناه."
          : `${count} حقول تحتاج تصحيحًا — راجعها أدناه.`,
    };
  }

  try {
    await saveApplication(parsed.data, {
      answers: answers.answers,
      cv: formData.get("cv"),
    });
  } catch {
    /* لا نكشف تفاصيل العطل للطالب، ونطمئنه أن ما كتبه لم يضع */
    return {
      ok: false,
      errors: {},
      values,
      message:
        "تعذّر إرسال الطلب — بياناتك محفوظة في الصفحة. حاول مرة أخرى بعد قليل.",
    };
  }

  return {
    ok: true,
    errors: {},
    values: {},
    message: "وصل طلبك. سنراسلك على بريدك خلال أسبوع.",
  };
}

type Attachments = {
  /** إجابات أسئلة القادة — المفتاح `q__<الرغبة>__<معرّف السؤال>` */
  answers: Record<string, string>;
  /** المرفق كما وصل — `File` أو `null` إن لم يرفع الطالب شيئًا */
  cv: FormDataEntryValue | null;
};

/**
 * الحفظ الفعلي.
 *
 * مؤقتًا: تسجيل على الخادم فقط، ريثما تُربط قاعدة البيانات.
 * لا يُكتب شيء في مكان دائم بعد — ولا يُرفع المرفق إلى أي تخزين.
 *
 * ⚠️ قبل فتح التقديم: يجب ربط قاعدة البيانات و`Supabase Storage` للمرفق.
 * بدونهما يرى الطالب «وصل طلبك» ولا يصل شيء — وهذا خلاف صوت النادي.
 */
async function saveApplication(
  data: RegistrationInput,
  attachments: Attachments,
): Promise<void> {
  if (!process.env.SUPABASE_URL) {
    console.info("[registration] لم تُربط قاعدة البيانات بعد", {
      studentId: data.studentId,
      choices: [data.choice1, data.choice2, data.choice3],
      answerCount: Object.keys(attachments.answers).length,
      hasCv: attachments.cv instanceof File && attachments.cv.size > 0,
    });
    return;
  }
  throw new Error("لم يُنفَّذ حفظ الطلبات في قاعدة البيانات بعد");
}
