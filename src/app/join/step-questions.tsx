"use client";

import {
  CheckField,
  FileField,
  SelectField,
  TextArea,
  TextField,
} from "@/components/ui/field";
import { findPreference } from "@/content/preferences";
import { ANSWER_MAX, answerName, type CustomQuestion } from "@/content/questions";
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
function domId(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, "-");
}

type AnswerFieldProps = {
  choice: string;
  question: CustomQuestion;
  values: Record<string, string>;
  errors: Record<string, string>;
};

function AnswerField({
  choice,
  question,
  values: v,
  errors: e,
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

  if (question.type === "select") {
    return (
      <SelectField
        {...shared}
        key={`${name}-${v[name] ?? ""}`}
        placeholder="اختر إجابة"
        options={(question.options ?? []).map((option) => ({
          value: option,
          label: option,
        }))}
      />
    );
  }

  if (question.type === "long-text") {
    return <TextArea {...shared} maxLength={ANSWER_MAX} />;
  }

  return <TextField {...shared} maxLength={ANSWER_MAX} />;
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

            {preference.questions.map((question) => (
              <AnswerField
                key={question.id}
                choice={choice}
                question={question}
                values={v}
                errors={e}
              />
            ))}
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
