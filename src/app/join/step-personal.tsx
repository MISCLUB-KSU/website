"use client";

import { useState } from "react";

import { RadioGroup, SelectField, TextField } from "@/components/ui/field";
import { ACADEMIC_LEVELS, MAJOR_OTHER, MAJORS } from "@/lib/registration";
import { StepPanel } from "./step-panel";

/**
 * الخطوة الأولى — البيانات الشخصية.
 *
 * التخصص قائمةٌ ببرامج بكالوريوس كلية إدارة الأعمال، و«تخصص آخر» يفتح حقلًا
 * نصّيًا لمن يدرس خارجها. تعليمات الكتابة **فوق** الحقل لا تحته: الطالب يقرأ
 * الشرط قبل أن يكتب، لا بعد أن يُرفض ما كتبه.
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
        hint="كما هو مسجّل في النظام الأكاديمي."
        placeholder="الاسم الأول · اسم الأب · اسم العائلة"
        autoComplete="name"
      />

      <div className="grid gap-s5 sm:grid-cols-2">
        <TextField
          id="studentId"
          label="الرقم الجامعي"
          required
          defaultValue={v.studentId}
          error={e.studentId}
          hint="تسع خانات."
          /* المثال يطابق الشرط حرفيًا — تسع خانات لا عشر */
          placeholder="441234567"
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
        legend="المستوى الدراسي"
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
        hint="برامج بكالوريوس كلية إدارة الأعمال — ومن يدرس خارجها يختار «تخصص آخر»."
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
