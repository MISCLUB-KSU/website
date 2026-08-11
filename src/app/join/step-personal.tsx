"use client";

import { useState } from "react";

import { RadioGroup, SelectField, TextField } from "@/components/ui/field";
import {
  ACADEMIC_LEVELS,
  HOME_UNIVERSITY,
  MAJOR_OTHER,
  MAJORS,
  UNIVERSITIES,
  UNIVERSITY_OTHER,
} from "@/lib/registration";
import { StepPanel } from "./step-panel";

/**
 * الخطوة الأولى — البيانات الشخصية.
 *
 * الجامعة والتخصص قائمتان لهما خيار «أخرى» يفتح حقلًا نصّيًا: القائمة تضبط
 * الشائع، والحقل يستوعب ما خرج عنه بلا أن تطول القائمة بلا نهاية. تعليمات
 * الكتابة **فوق** الحقل لا تحته: الطالب يقرأ الشرط قبل أن يكتب، لا بعد أن
 * يُرفض ما كتبه.
 *
 * الجامعة قبل المستوى والتخصص — الأعمّ يُسأل قبل الأخصّ.
 */

type StepPersonalProps = {
  index: number;
  current: number;
  values: Record<string, string>;
  errors: Record<string, string>;
};

export function StepPersonal({
  index,
  current,
  values: v,
  errors: e,
}: StepPersonalProps) {
  /* الحقل غير متحكَّم به (`defaultValue`) والحالة مرآةٌ له تفتح حقل
     «تخصص آخر» لا أكثر. السبب: React يستدعي `form.reset()` تلقائيًا بعد كل
     `Server Action`، والقائمة المتحكَّم بها لا تستعيد اختيارها بعده —
     تُفرَّغ في الصفحة بينما تظنّ الحالة أنها ممتلئة. */
  const [major, setMajor] = useState(v.major ?? "");
  const [university, setUniversity] = useState(v.university ?? "");

  /* الرقم الجامعي تسع خانات في جامعة الملك سعود وحدها — والإرشاد يتبع
     القاعدة الفعلية، فمثالٌ بتسع خانات أمام طالبِ جامعةٍ أخرى يجعله يظنّ
     رقمه خطأً وهو صحيح. */
  const isHome = university === HOME_UNIVERSITY;

  return (
    <StepPanel
      index={index}
      current={current}
      title="البيانات الشخصية"
      lede="بياناتك تصل إلى إدارة النادي وحدها، وتُستعمل لمراجعة الطلب والتواصل معك."
    >
      <TextField
        id="fullName"
        label="الاسم الثلاثي"
        required
        defaultValue={v.fullName}
        error={e.fullName}
        /* بلا سطر إرشاد — قرار حسام. والمعنى لم يضع: النائبُ داخل الحقل
           يُري الشكل الثلاثيّ، ورسالةُ الخطأ تقول «كما هو في النظام
           الأكاديمي» لمن كتب غير ذلك. */
        placeholder="الاسم الأول · اسم الأب · اسم العائلة"
        autoComplete="name"
      />

      {/* قبل الرقم الجامعي لا بعده: طولُ الرقم يتبع الجامعة، فلو سُئل عنها
          بعده لكتب رقمه على إرشادٍ لا يخصّه ثم رُدَّ عليه. */}
      <SelectField
        key={`university-${v.university ?? ""}`}
        id="university"
        label="الجامعة"
        required
        placeholder="اختر جامعتك"
        options={UNIVERSITIES.map((u) => ({ value: u, label: u }))}
        defaultValue={v.university}
        onChange={(event) => setUniversity(event.target.value)}
        error={e.university}
      />

      {university === UNIVERSITY_OTHER && (
        <div className="flex flex-col gap-s3">
          {/* التعليمات فوق الحقل — شرطٌ يُقرأ قبل الكتابة لا بعد الرفض */}
          <div className="border-s-2 border-accent bg-bg-sunken px-s4 py-s3">
            <p className="text-[0.84rem] leading-relaxed text-fg-muted">
              اكتب اسم الجامعة{" "}
              <strong className="font-semibold text-fg">كاملًا ورسميًا</strong>{" "}
              و<strong className="font-semibold text-fg">بالعربية</strong>.
              <br />
              مثال: «جامعة الملك عبدالعزيز» — لا «الملك عبدالعزيز» ولا{" "}
              <span dir="ltr">KAU</span>.
            </p>
          </div>

          <TextField
            id="universityOther"
            label="اسم الجامعة"
            required
            defaultValue={v.universityOther}
            error={e.universityOther}
            placeholder="جامعة الملك عبدالعزيز"
          />
        </div>
      )}

      <div className="grid gap-s5 sm:grid-cols-2">
        <TextField
          id="studentId"
          label="الرقم الجامعي"
          required
          defaultValue={v.studentId}
          error={e.studentId}
          hint={isHome ? "تسع خانات." : "كما هو مسجّل في جامعتك — أرقام فقط."}
          /* المثال يطابق الشرط حرفيًا — تسع خانات لا عشر. ويُحذف عند غير
             جامعة الملك سعود: لا شرط طولٍ هناك، ومثالٌ بطولٍ بعينه يوهم بشرط. */
          placeholder={isHome ? "441234567" : undefined}
          inputMode="numeric"
          dir="ltr"
          className="text-start"
        />
        <TextField
          id="nationalId"
          label="رقم الهوية أو الإقامة"
          required
          defaultValue={v.nationalId}
          error={e.nationalId}
          hint={
            <>
              عشر خانات، تبدأ بـ <span dir="ltr">1</span> للمواطن أو{" "}
              <span dir="ltr">2</span> للمقيم.
            </>
          }
          placeholder="1012345678"
          inputMode="numeric"
          dir="ltr"
          className="text-start"
        />
      </div>

      <div className="grid gap-s5 sm:grid-cols-2">
        <TextField
          id="phone"
          label="رقم الجوال"
          required
          defaultValue={v.phone}
          error={e.phone}
          hint={
            <>
              يبدأ بـ <span dir="ltr">05</span>.
            </>
          }
          placeholder="0512345678"
          inputMode="tel"
          dir="ltr"
          className="text-start"
          autoComplete="tel"
        />
        <TextField
          id="email"
          label="البريد الإلكتروني"
          required
          type="email"
          defaultValue={v.email}
          error={e.email}
          hint="نرسل نتيجة الطلب عليه."
          placeholder="name@ksu.edu.sa"
          dir="ltr"
          className="text-start"
          autoComplete="email"
        />
      </div>

      <RadioGroup
        /* المفتاح يتغيّر مع القيمة المُعادة من الخادم فيُعاد تركيب الحقل
           وتُستعاد قيمته — React لا يعيد تطبيق defaultValue بعد التركيب. */
        key={`level-${v.level ?? ""}`}
        name="level"
        /* ⚠️ «السنة» لا «المستوى» — الخياراتُ نفسُها في `ACADEMIC_LEVELS`
           «السنة الأولى … السنة الخامسة فأكثر»، فالتسميةُ كانت تخالف
           قيمَها. غُيّرت في اللوحة والنموذج معًا (١١ أغسطس ٢٠٢٦). */
        legend="السنة الدراسية"
        required
        options={ACADEMIC_LEVELS}
        defaultValue={v.level}
        error={e.level}
      />

      <SelectField
        key={`major-${v.major ?? ""}`}
        id="major"
        label="التخصص"
        required
        placeholder="اختر التخصص"
        options={MAJORS.map((m) => ({ value: m, label: m }))}
        defaultValue={v.major}
        onChange={(event) => setMajor(event.target.value)}
        error={e.major}
        hint="برامج بكالوريوس كلية إدارة الأعمال بجامعة الملك سعود — ومن يدرس غيرها يختار «تخصص آخر»."
      />

      {major === MAJOR_OTHER && (
        <div className="flex flex-col gap-s3">
          {/* التعليمات فوق الحقل — شرطٌ يُقرأ قبل الكتابة لا بعد الرفض */}
          <div className="border-s-2 border-accent bg-bg-sunken px-s4 py-s3">
            <p className="text-[0.84rem] leading-relaxed text-fg-muted">
              اكتب اسم التخصص{" "}
              <strong className="font-semibold text-fg">كاملًا ورسميًا</strong>{" "}
              كما هو مكتوب في اسم قسمك، و
              <strong className="font-semibold text-fg">بالعربية</strong>.
              <br />
              مثال: «الإدارة الصحية» — لا «صحية» ولا{" "}
              <span dir="ltr">Health Administration</span>.
            </p>
          </div>

          <TextField
            id="majorOther"
            label="اسم التخصص"
            required
            defaultValue={v.majorOther}
            error={e.majorOther}
            placeholder="الإدارة الصحية"
          />
        </div>
      )}
    </StepPanel>
  );
}
