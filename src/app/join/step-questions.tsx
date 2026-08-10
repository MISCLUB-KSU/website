"use client";

import { useState } from "react";

import {
  CheckField,
  FileField,
  SelectField,
  TextArea,
  TextField,
} from "@/components/ui/field";
import { findPreference } from "@/content/preferences";
import {
  ANSWER_MAX,
  answerName,
  asOption,
  isVisible,
  optionValues,
  splitAnswer,
  type CustomQuestion,
} from "@/content/questions";
import { isolateLatin } from "@/lib/bidi";
import { CV_ACCEPT, HEARD_FROM } from "@/lib/registration";
import { StepPanel } from "./step-panel";

/**
 * الخطوة الثالثة — الأسئلة والمرفقات.
 *
 * أسفلها أسئلة قادة الرغبات الثلاث، كلٌّ تحت عنوان رغبته: كل قائد يقرأ
 * جواب من رشّحه لوحدته بدل أن يقرأ جوابًا كُتب لغيره. من لم يكتب قائدها
 * أسئلة لا تظهر لها كتلة أصلًا.
 */

const SLOT_NAMES = ["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"] as const;

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
    required: question.required,
    optional: !question.required,
  };

  /* ⚠️ **الاختيار المتعدّد مربّعاتٌ لا قائمةٌ متعدّدة.** قائمة `multiple`
     تخفي خياراتها خلف تمرير، ولمسُها على الجوّال يحتاج `Ctrl` لا وجود له.
     والمربّعات كلُّها ظاهرة، وكلٌّ هدفٌ مستقلّ. */
  if (question.type === "multi-select") {
    const options = optionValues(question.options);
    const other = picked.find((p) => !options.includes(p)) ?? "";
    return (
      <fieldset className="flex flex-col gap-s2">
        <legend className="mb-1 text-sm font-semibold text-fg">
          {question.label}
          {question.required && (
            <span className="font-bold text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
          {!question.required && (
            <span className="text-xs font-normal text-fg-muted"> (اختياري)</span>
          )}
        </legend>
        {question.hint && (
          <p className="text-[0.82rem] text-fg-muted">{question.hint}</p>
        )}

        <div className="grid gap-s2 sm:grid-cols-2">
          {options.map((option) => {
            const on = picked.includes(option);
            return (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center gap-x-s3 border px-s3 text-[0.88rem] transition-colors ${
                  on ? "border-accent bg-accent/10" : "border-line hover:bg-bg-sunken"
                }`}
              >
                <input
                  type="checkbox"
                  name={name}
                  value={option}
                  checked={on}
                  onChange={(event) =>
                    onPick(
                      event.target.checked
                        ? [...picked, option]
                        : picked.filter((p) => p !== option),
                    )
                  }
                  className="size-4 shrink-0 accent-accent"
                />
                {option}
              </label>
            );
          })}
        </div>

        {question.allowOther && (
          <TextField
            id={domId(`${name}__other`)}
            name={`${name}__other`}
            label="أخرى — اكتبها"
            optional
            defaultValue={other}
            maxLength={ANSWER_MAX}
          />
        )}

        {e[name] && (
          <p role="alert" className="text-[0.84rem] text-danger">
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
      <fieldset className="flex flex-col gap-s3">
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
          <p className="text-[0.82rem] text-fg-muted">{question.hint}</p>
        )}

        <div className="grid gap-s3 sm:grid-cols-2">
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
                    <span className="block text-[0.92rem] font-semibold text-fg">
                      {option.value}
                    </span>
                    {option.seats !== undefined && (
                      <span className="block text-[0.78rem] text-fg-muted">
                        {seatsLabel(option.seats)}
                      </span>
                    )}
                  </span>
                </span>

                {option.details && option.details.length > 0 && (
                  <ul className="flex list-disc flex-col gap-s1 ps-s6 text-[0.82rem] leading-relaxed text-fg-muted">
                    {option.details.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </label>
            );
          })}
        </div>

        {e[name] && (
          <p role="alert" className="text-[0.84rem] text-danger">
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
            maxLength={ANSWER_MAX}
          />
        )}
      </>
    );
  }

  if (question.type === "long-text") {
    return <TextArea {...shared} maxLength={ANSWER_MAX} />;
  }

  return <TextField {...shared} maxLength={ANSWER_MAX} />;
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
      questions.map((q) => [q.id, splitAnswer(v[answerName(choice, q.id)] ?? "")]),
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
      <TextArea
        id="why"
        label="لماذا اخترت هذي الرغبات؟"
        required
        defaultValue={v.why}
        error={e.why}
        hint="سطران أو ثلاثة: ما الذي تتقنه، وما الذي تودّ تعلّمه معنا."
        placeholder="اكتب بإيجاز…"
        maxLength={600}
      />

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

      <fieldset className="flex flex-col gap-s3">
        <legend className="mb-1 text-sm font-semibold text-fg">
          السيرة الذاتية أو معرض الأعمال
          <span className="text-xs font-normal text-fg-muted"> (اختياري)</span>
        </legend>

        <FileField
          id="cv"
          label="ارفع ملفًا"
          accept={CV_ACCEPT}
          error={e.cv}
          hint={
            <>
              <span dir="ltr">PDF</span> أو صورة، حتى{" "}
              <span dir="ltr">5</span> ميجابايت.
            </>
          }
        />

        <p className="text-[0.8rem] text-fg-muted">أو ضع رابطًا بدلًا عنه:</p>

        <TextField
          id="portfolio"
          label="رابط السيرة الذاتية أو معرض الأعمال"
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

      {choices.map((choice, slot) => {
        const preference = choice ? findPreference(choice) : undefined;
        if (!preference?.questions?.length) return null;

        return (
          <fieldset
            key={choice}
            className="flex flex-col gap-s5 border border-line bg-bg-raised p-s4"
          >
            <legend className="px-s2 text-[0.82rem] font-semibold text-fg-muted">
              {SLOT_NAMES[slot]}: {isolateLatin(preference.fullLabel)}
            </legend>

            <QuestionSet
              choice={choice}
              questions={preference.questions}
              values={v}
              errors={e}
            />
          </fieldset>
        );
      })}

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
            <span className="mt-0.5 block text-[0.84rem] text-fg-muted">
              وأتعهّد بصحة البيانات المُدخلة.
            </span>
          </>
        }
      />
    </StepPanel>
  );
}
