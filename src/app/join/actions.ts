"use server";

import {
  CLUB_EXPERIENCE_YES,
  emptyState,
  registrationSchema,
  validateAnswers,
  validateCvFile,
  type RegistrationInput,
  type RegistrationState,
} from "@/lib/registration";
import { findDirectTarget, findPreference } from "@/content/preferences";
import { ANSWER_SEP } from "@/content/questions";
import { sendMail } from "@/lib/email/client";
import { applicationReceived } from "@/lib/email/templates";
import {
  ANSWER_FILES_PREFIX,
  CV_BUCKET,
  createAdminClient,
} from "@/lib/supabase/admin";

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
  "university",
  "universityOther",
  "level",
  "major",
  "majorOther",
  "choice1",
  "choice2",
  "choice3",
  "why",
  /* ⚠️ **الخبرة السابقة وتفاصيلها كانتا ساقطتين من القائمة.** من أخطأ في
     حقلٍ آخر كان يرجع فيجد سؤال الخبرة فارغًا وتفاصيلَه ممحوّةً — ثم يُخطَّأ
     على تركه إيّاه. وهو حقلٌ يُكتب فيه سطرٌ كامل، فمحوُه ليس هيّنًا. */
  "clubExperience",
  "clubExperienceDetails",
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

  /* ⚠️ **الاختيار المتعدّد يُجمع بالفاصل لا يُدهس بآخر قيمة.** المرورُ على
     `entries` يعطي صفًّا لكل مربّعٍ مؤشَّر بالاسم نفسه، وإسنادٌ مباشرٌ يبقي
     الأخيرَ وحده — فمن أشّر ثلاثةً وأخطأ في حقلٍ بعيد كان يرجع فيجد واحدًا.
     و`splitAnswer` في الواجهة يشقّه بـ`ANSWER_SEP` نفسِه. */
  for (const key of new Set(formData.keys())) {
    if (!key.startsWith(ANSWER_PREFIX)) continue;
    out[key] = formData
      .getAll(key)
      .filter((value): value is string => typeof value === "string")
      .join(ANSWER_SEP);
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

  /* ⚠️ **الوضع يُمرَّر إلى المخطّط لا يُحسب بجانبه.** أول بناءٍ حسبه في
     متغيّرٍ محلّيّ ولم يضعه في `safeParse`، فرآه المخطّط `open` افتراضًا
     وطالب برغبتين ثانية وثالثة لا وجود لهما في الرابط المباشر — خطآن
     على حقلين لا يُرسمان أصلًا، فلا يرى الطالب لهما أثرًا في الصفحة. */
  const mode = text(formData, "mode") === "direct" ? "direct" : "open";

  const parsed = registrationSchema.safeParse({
    mode,
    fullName: text(formData, "fullName"),
    studentId: text(formData, "studentId"),
    nationalId: text(formData, "nationalId"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    university: text(formData, "university"),
    universityOther: text(formData, "universityOther"),
    level: text(formData, "level"),
    major: text(formData, "major"),
    majorOther: text(formData, "majorOther"),
    choice1: text(formData, "choice1"),
    choice2: text(formData, "choice2"),
    choice3: text(formData, "choice3"),
    why: text(formData, "why"),
    /* ⚠️ **كانا ساقطين من هنا — والنموذجُ كلُّه لا يُرسَل بسببهما.**
       `clubExperience` حقلٌ مطلوبٌ في المخطّط (`z.enum`)، وغيابُه عن كائن
       `safeParse` يجعله `undefined` في **كلِّ** طلب — فيُردّ كلُّ متقدّمٍ
       بخطأ «أخبرنا: هل سبق أن شاركت…» مهما أجاب. لا يُنزع أحدُهما عن
       الآخر: `refineFinal` يقرأ التفاصيل بحسب الجواب. */
    clubExperience: text(formData, "clubExperience"),
    clubExperienceDetails: text(formData, "clubExperienceDetails"),
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
  /* ⚠️ **إذنُ الرابط المباشر يُفحص هنا لا في المتصفّح.**
     `mode` حقلُ نموذجٍ يرسله العميل، فأي أحدٍ يستطيع إرسال `mode=direct`
     برغبةٍ واحدة إلى النموذج العامّ ويتخطّى شرط «إحدى رغباتك لجنة». والفحصُ
     الحاسم أن تكون الجهةُ **رايتُها مرفوعة** في `findDirectTarget` — وهي
     بياناتُ خادمٍ لا يمسّها العميل. */
  if (mode === "direct") {
    const target = findDirectTarget(
      text(formData, "choice1").replace(":", "/").split("/"),
    );
    if (!target) {
      errors.choice1 = "هذا الرابط لا يشير إلى جهةٍ تقبل التقديم المباشر";
    }
  }

  const answers = validateAnswers(
    [
      text(formData, "choice1"),
      text(formData, "choice2"),
      text(formData, "choice3"),
    ],
    /* ⚠️ **`getAll` لا `get`.** الاختيار المتعدّد يرسل قيمةً لكل مربّعٍ
       مؤشَّر بالاسم نفسه، و`get` يعيد الأولى فتضيع البقيّة صامتةً. */
    (name) => formData.getAll(name).map((v) => (typeof v === "string" ? v : "")),
    (name) => formData.get(name),
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
      answerFiles: answers.files,
      cv: formData.get("cv"),
      mode,
    });
  } catch (error) {
    /* ⚠️ **التكرار ليس عطلًا بل جوابٌ للطالب.** الفهرسان الشرطيّان في
       القاعدة يمنعان طلبين لنفس الهوية في النموذج المفتوح، وطلبين لنفس
       الهوية والجهة في الرابط المباشر. ولولا التقاطُه هنا لقرأ الطالب
       «تعذّر الإرسال… حاول مرة أخرى» فأعاد المحاولة أبدًا. */
    if (isDuplicate(error)) {
      return {
        ok: false,
        errors: {},
        values,
        message:
          mode === "direct"
            ? "سبق أن قدّمت على هذه الجهة برقم الهوية نفسه."
            : "سبق أن وصلنا طلبك برقم الهوية نفسه. راسلنا إن أردت تعديله.",
      };
    }
    /* لا نكشف تفاصيل العطل للطالب، ونطمئنه أن ما كتبه لم يضع */
    return {
      ok: false,
      errors: {},
      values,
      message:
        "تعذّر إرسال الطلب — بياناتك محفوظة في الصفحة. حاول مرة أخرى بعد قليل.",
    };
  }

  /* ⚠️ **بعد الحفظ، ولا يُنتظر منه شيء.** بريدُ التأكيد لطفٌ لا شرطُ قبول:
     الطلبُ في القاعدة فعلًا، وإسقاطُ «وصل طلبك» لأن مزوّد البريد تعثّر
     يجعل الطالب يعيد التقديم على طلبٍ وصل — فيُردّ بـ«سبق أن قدّمت».
     و`sendMail` لا يرمي أصلًا (انظر `email/client.ts`)، وهذا حزامٌ ثانٍ. */
  try {
    await sendMail(
      applicationReceived({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        choices: [
          parsed.data.choice1,
          parsed.data.choice2,
          parsed.data.choice3,
        ]
          .filter(Boolean)
          .map((value) => findPreference(value)?.fullLabel ?? value),
      }),
    );
  } catch (error) {
    console.error("[registration] وصل الطلب ولم يُرسَل بريد التأكيد", error);
  }

  return {
    ok: true,
    errors: {},
    values: {},
    message: "وصل طلبك. سنراسلك على بريدك خلال أسبوع.",
  };
}

/** رمزُ خرق التفرّد في `Postgres` — يصل عبر `PostgrestError.code` */
function isDuplicate(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

type Attachments = {
  /** إجابات أسئلة القادة — المفتاح `q__<الرغبة>__<معرّف السؤال>` */
  answers: Record<string, string>;
  /** مرفقاتُ أسئلة القادة بأسماء حقولها — تُرفع بعد الإدراج */
  answerFiles: Record<string, File>;
  /** المرفق كما وصل — `File` أو `null` إن لم يرفع الطالب شيئًا */
  cv: FormDataEntryValue | null;
  /** `open` نموذجٌ بثلاث رغبات · `direct` رابطٌ لجهةٍ واحدة */
  mode: "open" | "direct";
};

/**
 * الحفظ الفعلي — قاعدة البيانات أوّلًا ثم المرفق.
 *
 * **الترتيب مقصود.** لو رُفع المرفق أوّلًا ثم فشل الإدراج، بقي ملفٌّ يتيمٌ
 * في المستودع بلا صفٍّ يشير إليه — لا يُعرف صاحبه ولا يُحذف. والعكس أهون:
 * صفٌّ بلا مرفق يبقى طلبًا صالحًا يُقرأ ويُراجَع، والسيرة **اختيارية**
 * أصلًا في `registration.ts`.
 *
 * ⚠️ **وفشل المرفق لا يُسقط الطلب.** يُسجَّل في سجلّ الخادم ويمضي: أن يصل
 * الطلب بلا سيرةٍ خيرٌ من أن يُردّ الطالب بخطأ بعد أن ملأ ثلاث خطوات —
 * والسيرة تُطلب منه لاحقًا. أما فشل الإدراج فيُرمى، لأن «وصل طلبك» على
 * لا شيء خداعٌ صريح.
 */
async function saveApplication(
  data: RegistrationInput,
  attachments: Attachments,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("applications")
    .insert({
      full_name: data.fullName,
      student_id: data.studentId,
      national_id: data.nationalId,
      phone: data.phone,
      email: data.email,
      university: data.university,
      university_other: data.universityOther || null,
      level: data.level,
      major: data.major,
      major_other: data.majorOther || null,
      choice1: data.choice1,
      choice2: data.choice2,
      choice3: data.choice3,
      why: data.why,
      heard_from: data.heardFrom,
      /* ⚠️ **بوليان في القاعدة ونصٌّ في النموذج.** اللوحة تفرز على العمود،
         ومقارنةُ نصٍّ عربيّ حرفًا بحرف تكسر بمسافةٍ زائدة أو همزةٍ مختلفة.
         والتفاصيل `null` لمن قال «لا» — لا سلسلةً فارغة تُقرأ إجابةً خاوية. */
      has_club_experience: data.clubExperience === CLUB_EXPERIENCE_YES,
      club_experience:
        data.clubExperience === CLUB_EXPERIENCE_YES
          ? data.clubExperienceDetails
          : null,
      answers: attachments.answers,
      portfolio: data.portfolio || null,
      linkedin: data.linkedin || null,
      source: attachments.mode,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[registration] فشل إدراج الطلب", error);
    /* ⚠️ **خرقُ التفرّد يُمرَّر بجسمه لا مغلَّفًا.** تغليفُه في `Error` عامّ
       يمحو `code` فيضيع الفرق بين «سبق أن قدّمت» و«عطلٌ في الخادم»، ويقرأ
       الطالبُ «حاول مرة أخرى» فيعيد المحاولة أبدًا بلا نتيجة. */
    if (error?.code === "23505") throw error;
    throw new Error("تعذّر حفظ الطلب");
  }

  await uploadAnswerFiles(supabase, row.id, attachments);

  const cv = attachments.cv;
  if (!(cv instanceof File) || cv.size === 0) return;

  /* اسم الملفّ من معرّف الصفّ لا من اسم الطالب: اسمٌ عربيٌّ أو فيه شرطة
     مائلة يكسر المسار، ومعرّفُ الصفّ يربط الملفّ بصاحبه بلا لبس. */
  const extension = cv.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${row.id}.${extension}`;

  const upload = await supabase.storage
    .from(CV_BUCKET)
    .upload(path, cv, { contentType: cv.type, upsert: true });

  if (upload.error) {
    console.error("[registration] وصل الطلب ولم تُرفع السيرة", {
      id: row.id,
      error: upload.error.message,
    });
    return;
  }

  const link = await supabase
    .from("applications")
    .update({ cv_path: path })
    .eq("id", row.id);

  if (link.error) {
    console.error("[registration] رُفعت السيرة ولم يُربط مسارها", {
      id: row.id,
      path,
      error: link.error.message,
    });
  }
}

/**
 * رفعُ مرفقات أسئلة القادة، ثم كتابةُ مساراتها في `answers`.
 *
 * ⚠️ **المسار من معرّف الصفّ وترتيبٍ عدديّ لا من اسم الحقل.** اسم الحقل
 * يحمل قيمةَ الرغبة بنقطتيها وشرطتها المائلة، وتنقيتُها لمفتاح مستودعٍ
 * تُسقط الفرقَ بين قيمتين مختلفتين فيدهس مرفقٌ مرفقًا. والمسارُ لا يُقرأ
 * عكسًا أصلًا: اللوحة تقرأ القيمة المخزَّنة في `answers`، لا تشتقّ الاسم
 * من المسار.
 *
 * ⚠️ **وتحديثٌ واحدٌ لا واحدٌ لكل ملفّ.** `answers` عمود `jsonb` كامل،
 * فكتابتُه مرّتين متتاليتين تدهس الثانيةُ الأولى.
 *
 * وفشلُ الرفع لا يُسقط الطلب — نفس قاعدة السيرة الذاتية أعلاه.
 */
async function uploadAnswerFiles(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  attachments: Attachments,
): Promise<void> {
  const entries = Object.entries(attachments.answerFiles);
  if (entries.length === 0) return;

  const paths: Record<string, string> = {};

  for (const [index, [name, file]] of entries.entries()) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${ANSWER_FILES_PREFIX}/${id}/${index}.${extension}`;

    const upload = await supabase.storage
      .from(CV_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (upload.error) {
      console.error("[registration] وصل الطلب ولم يُرفع مرفق سؤال", {
        id,
        name,
        error: upload.error.message,
      });
      continue;
    }
    paths[name] = path;
  }

  if (Object.keys(paths).length === 0) return;

  const link = await supabase
    .from("applications")
    .update({ answers: { ...attachments.answers, ...paths } })
    .eq("id", id);

  if (link.error) {
    console.error("[registration] رُفعت مرفقات الأسئلة ولم تُربط مساراتها", {
      id,
      error: link.error.message,
    });
  }
}
