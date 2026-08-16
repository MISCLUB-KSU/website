"use client";

import { useState } from "react";

import {
  CheckField,
  FileField,
  SelectField,
  TextArea,
  TextField,
} from "@/components/ui/field";
import { questionBlocks } from "@/content/preferences";
import {
  answerName,
  asOption,
  exclusiveValues,
  isVisible,
  optionValues,
  splitAnswer,
  type CustomQuestion,
} from "@/content/questions";
import { isolateLatin } from "@/lib/bidi";
import {
  ANSWER_FILE_ACCEPT,
  ANSWER_FILE_MAX_BYTES,
  CLUB_EXPERIENCE,
  CLUB_EXPERIENCE_NO,
  COMMITMENTS,
  COMMITMENT_NONE,
  CV_ACCEPT,
  CV_MAX_MB,
  validateAnswerFile,
  validateCvFile,
  hasClubExperience,
  HEARD_FROM,
} from "@/lib/registration";
import { StepPanel } from "./step-panel";

/**
 * الخطوة الثالثة — الأسئلة والمرفقات.
 *
 * أسفلها أسئلة قادة الرغبات الثلاث، كلٌّ تحت عنوان رغبته: كل قائد يقرأ
 * جواب من رشّحه لوحدته بدل أن يقرأ جوابًا كُتب لغيره. من لم يكتب قائدها
 * أسئلة لا تظهر لها كتلة أصلًا.
 */

const SLOT_ORDINALS = ["الأولى", "الثانية", "الثالثة"] as const;

/**
 * عنوانُ كتلةِ الأسئلة بترتيب رغباتها.
 *
 * ⚠️ **المثنّى لفظٌ لا عطف.** كتلةُ اللجنة تخصّ أكثرَ من رغبة، و«الرغبة
 * الأولى والرغبة الثانية» عربيّةٌ ركيكة — والصواب «الرغبتان الأولى
 * والثانية». نفس قاعدة `seatsLabel` أدناه.
 */
function slotsLabel(slots: readonly number[]): string {
  const names = slots.map((slot) => SLOT_ORDINALS[slot] ?? "");
  if (names.length === 1) return `الرغبة ${names[0]}`;
  if (names.length === 2) return `الرغبتان ${names[0]} و${names[1]}`;
  return `الرغبات ${names.join(" و")}`;
}

/**
 * معرّف صالح لسمة `id`.
 * اسم الحقل يحمل قيمة الرغبة بنقطتيها وشرطتها المائلة، وهي حروف تكسر
 * محدّدات `CSS` — فالاسم يُرسل كما هو، والمعرّف يُنقّى.
 */
/**
 * عددُ المقاعد بصيغته العربية الصحيحة.
 *
 * ⚠️ **المثنّى لا يسبقه رقم**: «مقعدان» لا «٢ مقعدان» — وهو ما ظهر أول
 * مرّة. والمفرد كذلك. والثلاثة إلى العشرة جمعُ قلّة «مقاعد»، وما فوقها
 * تمييزٌ مفرد منصوب «مقعدًا».
 */
function seatsLabel(n: number): string {
  if (n === 1) return "مقعدٌ واحد";
  if (n === 2) return "مقعدان";
  if (n <= 10) return `${n} مقاعد`;
  return `${n} مقعدًا`;
}

function domId(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "-");
}

type AnswerFieldProps = {
  /** مفتاح الكتلة — قيمةُ الرغبة، أو مفتاحُ اللجنة لأسئلتها المشتركة */
  choice: string;
  question: CustomQuestion;
  values: Record<string, string>;
  errors: Record<string, string>;
  /** ما اختير الآن — لازمٌ للتفرّع ولإبقاء المربّعات مؤشَّرة بعد ردّ الخادم */
  picked: string[];
  onPick: (values: string[]) => void;
};

function AnswerField({
  choice,
  question,
  values: v,
  errors: e,
  picked,
  onPick,
}: AnswerFieldProps) {
  const name = answerName(choice, question.id);
  const shared = {
    id: domId(name),
    name,
    label: question.label,
    defaultValue: v[name],
    error: e[name],
    hint: question.hint,
    placeholder: question.placeholder,
    required: question.required,
    optional: !question.required,
  };

  /* ⚠️ **الاختيار المتعدّد مربّعاتٌ لا قائمةٌ متعدّدة.** قائمة `multiple`
     تخفي خياراتها خلف تمرير، ولمسُها على الجوّال يحتاج `Ctrl` لا وجود له.
     والمربّعات كلُّها ظاهرة، وكلٌّ هدفٌ مستقلّ. */
  /* ⚠️ **لا `{...shared}` هنا: فيه `defaultValue`، وحقلُ الملفّ لا يقبلها**
     — المتصفّح يمنع ضبط قيمة حقل ملفّ برمجيًّا، وReact ترمي عليها. ولهذا
     أيضًا لا يُعاد المرفقُ بعد خطأ في حقلٍ آخر: يعيد الطالب اختيارَه.
     وهذا مقبولٌ ما دام السؤال اختياريًّا — وسؤالٌ مطلوبٌ من نوع ملفّ
     يحتاج تفكيرًا آخر قبل أن يُكتب. */
  if (question.type === "file") {
    return (
      <FileField
        id={domId(name)}
        name={name}
        label={question.label}
        accept={ANSWER_FILE_ACCEPT}
        validate={validateAnswerFile}
        required={question.required}
        optional={!question.required}
        error={e[name]}
        hint={
          <>
            {question.hint ? `${question.hint} ` : null}
            {/* ⚠️ الرقم مشتقٌّ لا مكتوب: كان «٥» ثابتًا فبقي كاذبًا حين
                نزل الحدُّ إلى ٢ — والطالب يصدّق ما يقرأ تحت الحقل. */}
            <span dir="ltr">PDF</span> أو صورة، حتى{" "}
            <span dir="ltr">{ANSWER_FILE_MAX_BYTES / (1024 * 1024)}</span>{" "}
            ميجابايت.
          </>
        }
      />
    );
  }

  if (question.type === "multi-select") {
    const options = optionValues(question.options);
    /* خيارُ النفي لا يجتمع مع غيره — انظر `exclusive` في `questions.ts` */
    const exclusives = new Set(exclusiveValues(question.options));
    const negated = picked.some((p) => exclusives.has(p));
    const other = picked.find((p) => !options.includes(p)) ?? "";
    return (
      /* ⚠️ `aria-invalid` على المجموعة — بدونها لا يجدها نقلُ التركيز.
           رسائلُ هذا الملفّ كلُّها `role="alert"` بلا `aria-invalid`،
           و`registration-form.tsx` يبحث عن `[aria-invalid="true"]`
           داخل الخطوة المعروضة. فتظهر الرسالةُ ولا يتحرّك التركيز
           ولا التمرير — والخطأُ قد يكون خارج الشاشة. */
      <fieldset
        className="flex flex-col gap-s2"
        aria-invalid={e[name] ? true : undefined}
      >
        <legend className="mb-1 text-sm font-semibold text-fg">
          {question.label}
          {question.required && (
            <span className="font-bold text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
          {!question.required && (
            <span className="text-[0.875rem] font-normal text-fg-muted">
              {" "}
              (اختياري)
            </span>
          )}
        </legend>
        {question.hint && (
          <p className="text-[0.875rem] text-fg-muted">{question.hint}</p>
        )}

        <div className="grid gap-s2 sm:grid-cols-2">
          {options.map((option) => {
            const on = picked.includes(option);
            return (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center gap-x-s3 border px-s3 text-[0.95rem] transition-colors ${
                  on
                    ? "border-accent bg-accent/10"
                    : "border-line hover:bg-bg-sunken"
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={option}
                  checked={on}
                  onChange={(event) => {
                    if (!event.target.checked) {
                      onPick(picked.filter((p) => p !== option));
                      return;
                    }
                    /* «لا يوجد» يمسح ما قبله، وأيُّ خيارٍ حقيقيّ يمسحه */
                    onPick(
                      exclusives.has(option)
                        ? [option]
                        : [...picked.filter((p) => !exclusives.has(p)), option],
                    );
                  }}
                  className="size-4 shrink-0 accent-accent"
                />
                {option}
              </label>
            );
          })}
        </div>

        {/* حقل «أخرى» يُرفع مع خيار النفي — والمرفوع لا يُرسل، فلا يصل
            إلى القائد «لا يوجد» ومعها التزامٌ مكتوب */}
        {question.allowOther && !negated && (
          <TextField
            id={domId(`${name}__other`)}
            name={`${name}__other`}
            label="أخرى — اكتبها"
            optional
            defaultValue={other}
          />
        )}

        {e[name] && (
          <p role="alert" className="text-[0.875rem] text-danger">
            {e[name]}
          </p>
        )}
      </fieldset>
    );
  }

  /* ⚠️ **بطاقاتٌ لا قائمة.** المنصب يُختار بعد قراءة مسؤولياته وعدد
     مقاعده؛ وقائمةٌ منسدلة تخفيهما فيختار الطالب الاسمَ الذي يعجبه لا
     العملَ الذي يناسبه. وهي `radio` حقيقية — تعمل بلا جافاسكربت. */
  if (question.type === "choice-cards") {
    return (
      /* ⚠️ `aria-invalid` على المجموعة — بدونها لا يجدها نقلُ التركيز.
           رسائلُ هذا الملفّ كلُّها `role="alert"` بلا `aria-invalid`،
           و`registration-form.tsx` يبحث عن `[aria-invalid="true"]`
           داخل الخطوة المعروضة. فتظهر الرسالةُ ولا يتحرّك التركيز
           ولا التمرير — والخطأُ قد يكون خارج الشاشة. */
      <fieldset
        className="flex flex-col gap-s3"
        aria-invalid={e[name] ? true : undefined}
      >
        <legend className="mb-1 text-sm font-semibold text-fg">
          {question.label}
          {question.required && (
            <span className="font-bold text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
        </legend>
        {question.hint && (
          <p className="text-[0.875rem] text-fg-muted">{question.hint}</p>
        )}

        {/* ⚠️ **استعلامُ حاويةٍ لا نقطةُ شاشة.** `sm:grid-cols-2` تقيس
            **الشاشة**، وهذي البطاقات تعيش في عمودٍ قد يكون 296px على شاشةٍ
            1440 (نموذج الرابط المباشر بعموديه). فكانت تنقسم عمودين داخل
            عمودٍ ضيّق: **125px للبطاقة** — لا يسع بندًا من مسؤولياتها.
            و`@container` يقيس ما حولها فعلًا، فتنقسم حين يتّسع المكان
            لا حين تتّسع الشاشة. */}
        <div className="@container">
          <div className="grid gap-s3 @md:grid-cols-2">
            {(question.options ?? []).map((raw) => {
            const option = asOption(raw);
            const on = picked[0] === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col gap-s2 border p-s4 transition-colors ${
                  on
                    ? "border-accent bg-accent/8"
                    : "border-line hover:bg-bg-sunken"
                }`}
              >
                <span className="flex items-start gap-x-s3">
                  <input
                    type="radio"
                    name={name}
                    value={option.value}
                    checked={on}
                    onChange={() => onPick([option.value])}
                    className="mt-1 size-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.95rem] font-semibold text-fg">
                      {option.value}
                    </span>
                    {option.seats !== undefined && (
                      <span className="block text-[0.875rem] text-fg-muted">
                        {seatsLabel(option.seats)}
                      </span>
                    )}
                  </span>
                </span>

                {option.details && option.details.length > 0 && (
                  <ul className="flex list-disc flex-col gap-s1 ps-s6 text-[0.875rem] leading-relaxed text-fg-muted">
                    {option.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </label>
              );
            })}
          </div>
        </div>

        {e[name] && (
          <p role="alert" className="text-[0.875rem] text-danger">
            {e[name]}
          </p>
        )}
      </fieldset>
    );
  }

  if (question.type === "select") {
    return (
      <>
        <SelectField
          {...shared}
          key={`${name}-${v[name] ?? ""}`}
          placeholder="اختر إجابة"
          value={picked[0] ?? ""}
          onChange={(event) => onPick([event.target.value])}
          options={optionValues(question.options).map((option) => ({
            value: option,
            label: option,
          }))}
        />
        {question.allowOther && (
          <TextField
            id={domId(`${name}__other`)}
            name={`${name}__other`}
            label="أخرى — اكتبها"
            optional
          />
        )}
      </>
    );
  }

  if (question.type === "long-text") {
    return <TextArea {...shared} />;
  }

  return <TextField {...shared} />;
}

/**
 * أسئلةُ خيارٍ واحد — **وهي التي تملك حالة التفرّع**.
 *
 * ⚠️ الحالة هنا لا في `AnswerField`: السؤال المشروط يقرأ إجابة سؤالٍ آخر،
 * فلا بدّ من موضعٍ يجمعهما. والقيم الابتدائية من ردّ الخادم (`values`) حتى
 * لا يضيع ما اختاره الطالب حين يعود النموذج بخطأٍ في حقلٍ بعيد.
 */
function QuestionSet({
  choice,
  questions,
  values: v,
  errors: e,
}: {
  choice: string;
  questions: readonly CustomQuestion[];
  values: Record<string, string>;
  errors: Record<string, string>;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        splitAnswer(v[answerName(choice, q.id)] ?? ""),
      ]),
    ),
  );

  const answerOf = (questionId: string) =>
    (picked[questionId] ?? []).join("\n");

  return (
    <>
      {questions.map((question) =>
        /* ⚠️ المخفيّ **لا يُرسم أصلًا** لا يُعطَّل: الحقل المعطَّل لا يُرسل
           في `FormData`، لكنه يبقى مرئيًّا فيربك من لا يعنيه السؤال. */
        isVisible(question, answerOf) ? (
          <AnswerField
            key={question.id}
            choice={choice}
            question={question}
            values={v}
            errors={e}
            picked={picked[question.id] ?? []}
            onPick={(next) =>
              setPicked((current) => ({ ...current, [question.id]: next }))
            }
          />
        ) : null,
      )}
    </>
  );
}

type StepQuestionsProps = {
  index: number;
  current: number;
  choices: readonly string[];
  values: Record<string, string>;
  errors: Record<string, string>;
};

/**
 * سؤال الخبرة السابقة — عامٌّ لكل متقدّم مهما كانت رغباته.
 *
 * ⚠️ **أزرارٌ لا قائمةٌ منسدلة.** خياران اثنان، والقائمة تخفيهما خلف نقرةٍ
 * وتزيد خطوةً على جوّالٍ بلا فائدة. وهي `radio` حقيقية تعمل بلا جافاسكربت،
 * والتفاصيل وحدها هي التي تحتاج الحالة.
 */
function ClubExperience({
  values: v,
  errors: e,
}: {
  values: Record<string, string>;
  errors: Record<string, string>;
}) {
  const [answer, setAnswer] = useState(v.clubExperience ?? "");

  return (
    <>
      {/* ⚠️ `aria-invalid` على المجموعة — بدونها لا يجدها نقلُ التركيز.
          رسائلُ هذا الملفّ كلُّها `role="alert"` بلا `aria-invalid`،
          و`registration-form.tsx` يبحث عن `[aria-invalid="true"]` داخل
          الخطوة المعروضة. فتظهر الرسالةُ ولا يتحرّك التركيز ولا التمرير —
          والخطأُ قد يكون خارج الشاشة. */}
      <fieldset
        className="flex flex-col gap-s2"
        aria-invalid={e.clubExperience ? true : undefined}
      >
        {/* ⚠️ `text-ink-label` لا `text-fg`: هذا عنوانُ حقلٍ في مستوى
            «لماذا اخترت» و«كيف سمعت عنّا» المحيطَين به، فيلبس لباسهما.
            وعناوينُ أسئلة القادة أدناه تبقى `text-fg` — تلك داخل صندوقٍ
            مستقلٍّ لرغبةٍ بعينها، لا في مستوى النموذج. */}
        <legend className="text-ink-label mb-1 text-sm font-semibold">
          سبق أن شاركت في نادٍ أو لجنة أو عمل تطوّعي؟
          <span className="font-bold text-danger" aria-hidden>
            {" "}
            *
          </span>
        </legend>

        {/* ⚠️ الطمأنة قبل الخيار لا بعده: من يقرأ السؤال ثم «نعم/لا» مباشرةً
            يقرأ «لا» نقصًا، فيبالغ في «نعم» ويفسد الحقل الذي أُنشئ للفرز. */}
        <p className="text-[0.875rem] text-fg-muted">
          أي عمل طلابي أو تطوّعي: نادٍ في الجامعة، لجنة، مبادرة، فريق مدرسي. وإن
          لم يسبق لك — لا يضرّك، وأكثر من ينضمّ إلينا يبدأ من هنا.
        </p>

        {/* ⚠️ عمودٌ واحد لا عمودان: «نعم» صارت خيارين بنصوصٍ طويلة («نعم،
            في أكثر من تجربة»)، وعمودان يقصّانها أو يتركان الثالث وحيدًا في
            صفّ — وكلاهما يُقرأ خللًا لا تصميمًا. */}
        <div className="grid gap-s2">
          {CLUB_EXPERIENCE.map((option) => {
            const on = answer === option;
            return (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center gap-x-s3 border px-s3 text-[0.95rem] transition-colors ${
                  on
                    ? "border-accent bg-accent/10"
                    : "border-line hover:bg-bg-sunken"
                }`}
              >
                <input
                  type="radio"
                  name="clubExperience"
                  value={option}
                  checked={on}
                  onChange={() => setAnswer(option)}
                  className="size-4 shrink-0 accent-accent"
                />
                {option}
              </label>
            );
          })}
        </div>

        {e.clubExperience && (
          <p role="alert" className="text-[0.875rem] text-danger">
            {e.clubExperience}
          </p>
        )}
      </fieldset>
      {/* المخفيّ لا يُرسم أصلًا — كما في أسئلة القادة. ولأنه غير مرسوم فهو
          غير مُرسَل، و`refineFinal` لا يطلبه إلا ممّن قال «نعم». */}
      {hasClubExperience(answer) && (
        <TextArea
          id="clubExperienceDetails"
          label="أي جهة؟ وما كان دورك فيها؟"
          required
          defaultValue={v.clubExperienceDetails}
          error={e.clubExperienceDetails}
          hint="اسم الجهة، ودورك، والمدّة إن ذكرتها."
          placeholder="مثال: نادي ريادة الأعمال — عضو لجنة التنظيم، فصلين."
        />
      )}

      {/* ⚠️ **ومن قال «لا» يُسأل سؤالَيه — لا يمرّ بلا شيءٍ يُقرأ عنه.**
          كان يمرّ، فتصل لجنةَ الفرز ورقةٌ عن طالبٍ بلا خبرةٍ وبلا كلمةٍ
          منه سوى «لماذا اخترت هذي الرغبات». والسؤالان لا يقيسان خبرة —
          يقيسان **الفهم والتوقّع**، وهما ما يُفرز به من لا سجلَّ له.

          ⚠️ **وكان لهما سقفٌ ٢٥٠ حرفًا وللأوّل ٤٠٠** — موازنةً بين
          المسارين لئلّا يصير «لا» أثقل فيدفع المتردّد إلى «نعم». ورُفعت
          السقوف كلُّها في ١٥ أغسطس ٢٠٢٦، والموازنةُ باقيةٌ بلا عدد:
          مسارُ «لا» حقلان ومسارُ «نعم» حقلٌ واحد، ولا يُطالَب أيٌّ منهما
          بطولٍ معيّن. انظر التعليل عند `why` في `registration.ts`. */}
      {answer === CLUB_EXPERIENCE_NO && (
        <>
          <TextArea
            id="clubPerception"
            label="ما تصوّرك عن الأندية الجامعية؟"
            required
            defaultValue={v.clubPerception}
            error={e.clubPerception}
            hint="ما الذي تتوقّعه منها، أو ما الذي سمعته عنها. لا جواب صحيح وآخر خطأ."
            placeholder="مثال: مكان أتعلّم فيه شغلًا حقيقيًّا خارج المحاضرات، وأعرف ناسًا يشتغلون مثلي."
          />
          <TextArea
            id="clubExpectation"
            label="وماذا تتوقّع أن تعمل معنا؟"
            required
            defaultValue={v.clubExpectation}
            error={e.clubExpectation}
            hint="أي عملٍ تتخيّل نفسك فيه — ولو لم تجرّبه بعد."
            placeholder="مثال: أساعد في تنظيم الفعاليات، وأتعلّم التصميم على مشروعٍ حقيقيّ."
          />
        </>
      )}
    </>
  );
}

/**
 * التزاماتُ الفصل — سؤالٌ عامٌّ، مربّعاتٌ لا قائمة.
 *
 * ⚠️ **«لا يوجد» حصريّةٌ في الواجهة وعلى الخادم.** الواجهةُ تمسح البقيّة
 * حين تُختار وتُمسح حين يُختار غيرُها، فلا يرى القائدُ إجابةً تناقض نفسها.
 * والحصرُ يُعاد فحصُه في `refineFinal` — الواجهةُ راحةٌ لا حارس.
 *
 * ⚠️ **والقيم تُقرأ من `values` مشقوقةً بـ`ANSWER_SEP`.** ردُّ الخادم يعيد
 * ما أُرسل نصًّا واحدًا، فبلا الشقّ يعود من أشّر ثلاثةً فيجد واحدًا.
 */
function Commitments({
  values: v,
  errors: e,
}: {
  values: Record<string, string>;
  errors: Record<string, string>;
}) {
  const [picked, setPicked] = useState<string[]>(() =>
    splitAnswer(v.commitments ?? ""),
  );

  function toggle(option: string) {
    setPicked((current) => {
      if (option === COMMITMENT_NONE) {
        return current.includes(option) ? [] : [option];
      }
      const without = current.filter((c) => c !== COMMITMENT_NONE);
      return without.includes(option)
        ? without.filter((c) => c !== option)
        : [...without, option];
    });
  }

  return (
    <fieldset
      className="flex flex-col gap-s2"
      aria-invalid={e.commitments ? true : undefined}
    >
      <legend className="text-ink-label mb-1 text-sm font-semibold">
        هل لديك التزامات أخرى هذا الفصل؟
        <span className="font-bold text-danger" aria-hidden>
          {" "}
          *
        </span>
      </legend>

      <p className="text-[0.875rem] text-fg-muted">
        اختر كل ما ينطبق، أو «لا يوجد». لا يُخصم عليك التزامُك — يعرف به
        القائد كم يحمّلك.
      </p>

      <div className="grid gap-s2 sm:grid-cols-3">
        {COMMITMENTS.map((option) => {
          const on = picked.includes(option);
          return (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center gap-x-s3 border px-s3 text-[0.95rem] transition-colors ${
                on ? "border-accent bg-accent/10" : "border-line hover:bg-bg-sunken"
              }`}
            >
              <input
                type="checkbox"
                name="commitments"
                value={option}
                checked={on}
                onChange={() => toggle(option)}
                className="size-4 shrink-0 accent-accent"
              />
              {option}
            </label>
          );
        })}
      </div>

      {e.commitments && (
        <p role="alert" className="text-[0.875rem] text-danger">
          {e.commitments}
        </p>
      )}
    </fieldset>
  );
}

export function StepQuestions({
  index,
  current,
  choices,
  values: v,
  errors: e,
}: StepQuestionsProps) {
  return (
    <StepPanel
      index={index}
      current={current}
      title="الأسئلة والمرفقات"
      lede="آخر خطوة. المرفقات اختيارية، لكنها تعطي لجنة الفرز صورة أوضح عنك."
    >
      {/* ⚠️ **ولا `maxLength` ولا تلميحَ طولٍ — بقرار الإدارة (١٥ أغسطس).**
          كان التلميح «سطران أو ثلاثة»، والنائبُ «اكتب بإيجاز»، و`maxLength`
          يقطع الكتابة عند ٦٠٠ بلا رسالة. ورفعُ الحدّ من المخطّط وحده لا
          يكفي: التلميحُ يبقى يقول للطالب كم يكتب، فيكتب بقدره وإن قَبِل
          الخادمُ أكثر. فالحدُّ يُرفع من الثلاثة معًا أو لا يُرفع. */}
      <TextArea
        id="why"
        label="لماذا اخترت هذي الرغبات؟"
        required
        defaultValue={v.why}
        error={e.why}
        hint="ما الذي تتقنه، وما الذي تودّ تعلّمه معنا — واكتب على راحتك."
        placeholder="اكتب ما تشاء…"
      />

      <ClubExperience values={v} errors={e} />

      <Commitments values={v} errors={e} />

      <SelectField
        key={`heardFrom-${v.heardFrom ?? ""}`}
        id="heardFrom"
        label="كيف سمعت عن النادي؟"
        required
        placeholder="اختر مصدرًا"
        options={HEARD_FROM.map((source) => ({ value: source, label: source }))}
        defaultValue={v.heardFrom}
        error={e.heardFrom}
      />

      {/* ⚠️ **المشاريع أوّلًا ثم السيرة — بترتيب الوركفلو لا بترتيب البناء.**
          وهما صندوقان لا صندوق: كانا مجموعين تحت «السيرة الذاتية أو معرض
          الأعمال» فيقرأهما الطالب بديلين — يرفع أحدهما ويمضي. والوركفلو
          يريدهما شيئين: نموذجَ عملٍ يدلّ على ما يصنع، وسيرةً تدلّ على أين
          كان. وكلاهما اختياريّ فلا يُثقل الفصلُ أحدًا. */}
      <fieldset className="flex flex-col gap-s3">
        <legend className="mb-1 text-sm font-semibold text-fg">
          مشاريعك السابقة
          <span className="text-[0.875rem] font-normal text-fg-muted">
            {" "}
            (اختياري)
          </span>
        </legend>

        <FileField
          id="projectsFile"
          label="ارفع ملفًا"
          accept={CV_ACCEPT}
          validate={validateCvFile}
          error={e.projectsFile}
          hint={
            <>
              <span dir="ltr">PDF</span> أو صورة، حتى{" "}
              <span dir="ltr">{CV_MAX_MB}</span> ميجابايت.
            </>
          }
        />

        <p className="text-[0.875rem] text-fg-muted">أو ضع رابطًا بدلًا عنه:</p>

        <TextField
          id="portfolio"
          label="رابط أعمالك أو معرضها"
          optional
          type="url"
          defaultValue={v.portfolio}
          error={e.portfolio}
          hint="تأكّد أن الرابط يفتح لدى غيرك، لا لديك وحدك."
          placeholder="https://drive.google.com/…"
          dir="ltr"
          className="text-start"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-s3">
        <legend className="mb-1 text-sm font-semibold text-fg">
          السيرة الذاتية
          <span className="text-[0.875rem] font-normal text-fg-muted">
            {" "}
            (اختياري)
          </span>
        </legend>

        {/* ⚠️ **ولا حقلَ رابطٍ هنا.** `portfolio` واحدٌ في النموذج ومكانُه
            صندوقُ المشاريع أعلاه — وتكرارُه بالمعرّف نفسِه يجعل `<label for>`
            يشير إلى عنصرين، فيصير نقرُ الوسم يفتح الحقلَ الخطأ، ويرسل
            المتصفّح قيمتين لاسمٍ واحد فتصل الأولى وتضيع الثانية. */}
        <FileField
          id="cv"
          label="ارفع ملفًا"
          accept={CV_ACCEPT}
          validate={validateCvFile}
          error={e.cv}
          hint={
            <>
              <span dir="ltr">PDF</span> أو صورة، حتى{" "}
              <span dir="ltr">{CV_MAX_MB}</span> ميجابايت.
            </>
          }
        />
      </fieldset>

      <TextField
        id="linkedin"
        label="رابط حسابك في LinkedIn"
        optional
        type="url"
        defaultValue={v.linkedin}
        error={e.linkedin}
        placeholder="https://linkedin.com/in/username"
        dir="ltr"
        className="text-start"
      />

      {questionBlocks(choices).map((block) => (
        <fieldset
          key={block.key}
          className="flex flex-col gap-s5 border border-line bg-bg-raised p-s4"
        >
          <legend className="px-s2 text-[0.875rem] font-semibold text-fg-muted">
            {slotsLabel(block.slots)}: {isolateLatin(block.title)}
          </legend>

          <QuestionSet
            choice={block.key}
            questions={block.questions}
            values={v}
            errors={e}
          />
        </fieldset>
      ))}

      <CheckField
        /* الموافقة تبقى معلّمة بعد خطأ في حقل آخر — الطالب وافق فعلًا،
           وإجباره على إعادتها احتكاكٌ بلا سبب. */
        key={`agree-${v.agree ?? ""}`}
        id="agree"
        defaultChecked={v.agree === "on"}
        error={e.agree}
        label={
          <>
            أوافق على شروط العضوية
            <span className="font-bold text-danger" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="mt-0.5 block text-[0.875rem] text-fg-muted">
              وأتعهّد بصحة البيانات المُدخلة.
            </span>
          </>
        }
      />

      {/* ⚠️ **سطرُ الطمأنة هنا على الجوّال، وفي شريط الإرسال على الحاسب.**
          كان في الشريط الملتصق وحده فيلتفّ سطرًا ثانيًا: «السابق» 91.5px
          و«أرسل الطلب» 123.3px والسطر 191.1px بفاصلَين = 437.9px في 335px
          متاحة. فيصير الشريط **164.6px = ٢٠٪ من شاشة 375×812** مقيمًا فوق
          كلّ تمريرةٍ في الخطوة الأخيرة، بينما هو 99px في الخطوتين قبلها.
          وموضعُه بعد «أوافق» يبقيه ملاصقًا للإرسال في ترتيب القراءة، وهو
          طمأنةٌ تُقرأ مرّةً لا شارةٌ تلزم البقاء. والحاسب لا يتغيّر: نسخةُ
          الشريط `hidden lg:block` وهذه `lg:hidden`، فلا تظهران معًا. */}
      <p className="text-[0.875rem] text-fg-muted lg:hidden">
        تصلك النتيجة على بريدك خلال أسبوع.
      </p>
    </StepPanel>
  );
}
