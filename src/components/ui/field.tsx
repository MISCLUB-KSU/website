"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { SelectMenu } from "./select-menu";

/**
 * حقول النموذج — مطابقة لمكتبة المكوّنات.
 *
 * ثلاث قواعد لا تُخالَف:
 *  · لكل حقل تسمية ظاهرة فوقه، لا نائبًا عنها داخله
 *  · الخطأ يظهر تحت حقله لا في أعلى الصفحة، ويُعلَن بـ role="alert"
 *  · المثال داخل الحقل يطابق شرط القبول حرفيًا
 */

/**
 * ⚠️ **أدوارٌ لا ألوانَ خام.** كانت هنا خمسةُ ألوانِ لوحةٍ ثابتة
 * (`bg-white` · `text-charcoal` · `border-sky-200` · `bg-sky-50` مرّتين)
 * فبقيت الحقولُ **بيضاءَ ناصعة على أرضيةٍ فحميّة** في الوضع الداكن —
 * والصفحةُ حولها داكنة. وهو عطلُ `text-deep` نفسه: لونُ لوحةٍ حيث يجب
 * دورٌ ينقلب.
 *
 * والقيم النهاريّة **لم تتغيّر بشعرة**: `--surface-raised` نهارًا `#ffffff`
 * و`--ink` هو الفحميّ و`--line-field` هو `sky-200` نفسه.
 *
 * ⚠️ و`focus:` صار `accent` لا `primary`: الأزرقُ الأساسيّ على حقلٍ ليليّ
 * `#212530` يعطي 1.9:1 — مؤشّرُ تركيزٍ لا يُرى، ومن يتنقّل بالكيبورد يضيع.
 * و`--accent` نهارًا هو `primary` نفسه، فلا شيء يتغيّر في النهار.
 */
const BASE =
  "w-full min-h-[46px] bg-bg-raised px-3.5 py-3 text-[0.95rem] text-fg " +
  "border-[1.5px] border-line-field transition-colors duration-150 " +
  "placeholder:text-fg-muted/70 hover:border-sky " +
  "focus:border-accent focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-bg-sunken disabled:text-fg-muted " +
  /* ⚠️ **السمة `[readonly]` لا الصنف `read-only:`.** الزائفةُ `:read-only`
     في CSS تطابق كلَّ ما ليس قابلًا للتحرير — و`<select>` ليس قابلًا
     للتحرير أبدًا، فكانت **كلُّ قائمةٍ منسدلة** تلبس ثوب «للقراءة فقط».
     نهارًا مرّ الخطأ لأن الثوب كان `sky-50` (#f3f8fc) أفتحَ من أن يُرى،
     وليلًا صار غائرًا `#101218` **أدكنَ من الصفحة نفسها**: الحقولُ ترتفع
     والقائمةُ تغوص. والسمةُ تطابق ما وُسم فعلًا، وهو المقصود. */
  "[&[readonly]]:bg-bg-sunken [&[readonly]]:border-dashed";

const INVALID = "border-danger hover:border-danger focus:border-danger";

type LabelProps = {
  htmlFor: string;
  /** يلزم حين يشير إليه ضابطٌ آخر بـ`aria-labelledby` — كقائمتنا المنسدلة */
  id?: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
};

export function Label({
  htmlFor,
  id,
  children,
  required,
  optional,
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      id={id}
      className="text-ink-label mb-1.5 block text-sm font-semibold"
    >
      {children}
      {required && (
        <span className="text-danger font-bold" aria-hidden="true">
          {" "}
          *
        </span>
      )}
      {optional && (
        <span className="text-fg-muted text-xs font-normal"> (اختياري)</span>
      )}
    </label>
  );
}

type HintProps = { id: string; error?: string; children?: ReactNode };

export function Hint({ id, error, children }: HintProps) {
  if (!error && !children) return null;
  return (
    <p
      id={id}
      /* role=alert يجعل قارئ الشاشة ينطق الخطأ فور ظهوره */
      {...(error ? { role: "alert" } : {})}
      className={
        "mt-1.5 text-[0.82rem] leading-relaxed " +
        (error ? "text-danger font-medium" : "text-fg-muted")
      }
    >
      {error ?? children}
    </p>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
};

export function TextField({
  id,
  label,
  error,
  hint,
  required,
  optional,
  className = "",
  ...rest
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <Label htmlFor={id} required={required} optional={optional}>
        {label}
      </Label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? hintId : undefined}
        className={`${BASE} ${error ? INVALID : ""} ${className}`}
        {...rest}
      />
      <Hint id={hintId} error={error}>
        {hint}
      </Hint>
    </div>
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
};

export function TextArea({
  id,
  label,
  error,
  hint,
  optional,
  className = "",
  ...rest
}: TextAreaProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <textarea
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? hintId : undefined}
        className={`${BASE} min-h-[110px] resize-y leading-relaxed ${error ? INVALID : ""} ${className}`}
        {...rest}
      />
      <Hint id={hintId} error={error}>
        {hint}
      </Hint>
    </div>
  );
}

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  placeholder: string;
  options?: readonly { value: string; label: string }[];
  /** بديلٌ عن `options`: خياراتٌ مجمَّعة داخل `<optgroup>` */
  groups?: readonly {
    label: string;
    options: readonly { value: string; label: string; disabled?: boolean }[];
  }[];
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
};

export function SelectField({
  id,
  label,
  placeholder,
  options,
  groups,
  error,
  hint,
  required,
  className = "",
  ...rest
}: SelectFieldProps) {
  const hintId = `${id}-hint`;
  const labelId = `${id}-label`;
  const nativeRef = useRef<HTMLSelectElement>(null);

  /* ⚠️ **بعد التحميل لا قبله.** لو رُسمت قائمتُنا على الخادم لظهرت لمن
     عطّل الجافاسكربت زرًّا لا يفتح شيئًا — والنموذج كلُّه مبنيٌّ على أن
     يعمل بدونه. فالأصليّة هي المرسومة أوّلًا، وتُستبدل حين يثبت أن
     الجافاسكربت يعمل فعلًا. */
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);

  /* القيمة تُقرأ من الأصليّة نفسها لا من حالةٍ موازية: الحقل قد يكون
     مضبوطًا من أبيه (أسئلة القادة) أو غيرَ مضبوط (الجامعة والتخصّص)،
     والأصليّةُ صادقةٌ في الحالين. */
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(nativeRef.current?.value ?? "");
  }, [rest.value, rest.defaultValue, enhanced]);

  const menuGroups = groups ?? [{ label: "", options: options ?? [] }];

  return (
    <div>
      <Label htmlFor={id} id={labelId} required={required}>
        {label}
      </Label>
      <div className="relative">
        <select
          ref={nativeRef}
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? hintId : undefined}
          /* مخفيّةٌ عن العين وعن قارئ الشاشة حين تحلّ قائمتُنا محلّها —
             ولا تُنزع: المخفيُّ يُرسَل مع النموذج، والمعطَّل لا يُرسَل. */
          {...(enhanced ? { "aria-hidden": true, tabIndex: -1 } : {})}
          className={
            enhanced
              ? "pointer-events-none absolute inset-0 h-full w-full opacity-0"
              : `${BASE} cursor-pointer appearance-none ps-11 ${error ? INVALID : ""} ${className}`
          }
          {...rest}
        >
          <option value="">{placeholder}</option>
          {groups
            ? groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
        </select>

        {enhanced ? (
          <SelectMenu
            nativeRef={nativeRef}
            placeholder={placeholder}
            groups={menuGroups}
            value={value}
            onPick={setValue}
            invalid={!!error}
            disabled={rest.disabled}
            labelId={labelId}
          />
        ) : (
          /* السهم في نهاية الحقل — أي يساره في الاتجاه من اليمين لليسار.
             لا يُرسم مع قائمتنا: لها سهمُها الذي يدور عند الفتح. */
          <svg
            viewBox="0 0 20 20"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
            className="text-fg-muted pointer-events-none absolute start-4 top-1/2 -translate-y-1/2"
          >
            <path
              d="M4 7l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
            />
          </svg>
        )}
      </div>
      <Hint id={hintId} error={error}>
        {hint}
      </Hint>
    </div>
  );
}

type CheckFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: ReactNode;
  hint?: React.ReactNode;
  error?: string;
};

/** مساحة اللمس هي الصف كامل — 44px، لا المربّع وحده */
export function CheckField({
  id,
  label,
  hint,
  error,
  className = "",
  ...rest
}: CheckFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <label
        htmlFor={id}
        className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1.5"
      >
        <input
          id={id}
          name={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? hintId : undefined}
          className={
            "mt-0.5 size-[21px] shrink-0 appearance-none border-[1.5px] bg-bg-raised " +
            "transition-colors duration-150 " +
            /* ⚠️ المعلَّم يبقى `primary` لا `accent`: علامةُ الصحّ ثلجيّةٌ
               **محفورةٌ في الـSVG** أدناه، وليلًا يصير `accent` سماويًّا
               فاتحًا فتختفي العلامةُ عليه (1.9:1). الأزرقُ الأساسيّ يبقى
               داكنًا في الوضعين، فتبقى العلامةُ مقروءة. */
            "checked:bg-primary checked:border-primary " +
            "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22><path d=%22M3 8.5l3.5 3.5L13 5%22 stroke=%22%23f9f9f9%22 stroke-width=%222.2%22 stroke-linecap=%22square%22/></svg>')] " +
            "checked:bg-center checked:bg-no-repeat " +
            (error ? "border-danger " : "border-sky ") +
            className
          }
          {...rest}
        />
        <span className="text-[0.95rem] leading-snug">{label}</span>
      </label>
      <Hint id={hintId} error={error}>
        {hint}
      </Hint>
    </div>
  );
}

type FileFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
};

/**
 * حقل المرفق.
 *
 * زرّ الاختيار يُنسَّق عبر `file:` لا يُستبدل بزرّ مزيّف فوق حقل مخفي —
 * الحقل الأصلي يعمل بلوحة المفاتيح وقارئ الشاشة، والمزيّف يكسر الاثنين.
 */
export function FileField({
  id,
  label,
  error,
  hint,
  optional,
  className = "",
  ...rest
}: FileFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <input
        id={id}
        name={id}
        type="file"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? hintId : undefined}
        className={
          `${BASE} cursor-pointer py-2.5 ${error ? INVALID : ""} ` +
          "file:me-3 file:min-h-[30px] file:cursor-pointer file:border-0 " +
          "file:bg-bg-sunken file:px-3 file:py-1.5 file:text-[0.82rem] " +
          "file:font-semibold file:text-accent " +
          className
        }
        {...rest}
      />
      <Hint id={hintId} error={error}>
        {hint}
      </Hint>
    </div>
  );
}

type RadioGroupProps = {
  name: string;
  legend: string;
  options: readonly string[];
  defaultValue?: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
};

export function RadioGroup({
  name,
  legend,
  options,
  defaultValue,
  error,
  hint,
  required,
}: RadioGroupProps) {
  const hintId = `${name}-hint`;
  return (
    <fieldset aria-describedby={error || hint ? hintId : undefined}>
      <legend className="text-ink-label mb-2 text-sm font-semibold">
        {legend}
        {required && (
          <span className="text-danger font-bold" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </legend>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1"
          >
            <input
              type="radio"
              name={name}
              value={opt}
              defaultChecked={defaultValue === opt}
              /* الدائرة استثناء مقصود من حدّة الهوية — التمييز عن خانة
                 الاختيار المتعدد عادةٌ راسخة، وكسرها يربك الطالب */
              className={
                "size-[21px] shrink-0 appearance-none rounded-full border-[1.5px] bg-bg-raised " +
                "transition-colors duration-150 " +
                /* ⚠️ عكسُ خانة الاختيار: هنا الحلقةُ هي العلامة و**قلبُها
                   خلفيةُ العنصر نفسها**. فلو بقيت `primary` ليلًا لصارت
                   حلقةً داكنة حول قلبٍ داكن — كتلةً واحدة لا يُعرف
                   أمُختارةٌ هي أم لا. و`accent` يصير سماويًّا ليلًا فتُقرأ
                   الحلقة، وهو `primary` نفسه نهارًا فلا شيء يتغيّر. */
                "checked:border-[6px] checked:border-accent " +
                (error ? "border-danger" : "border-sky")
              }
            />
            <span className="text-[0.95rem]">{opt}</span>
          </label>
        ))}
      </div>
      <Hint id={hintId} error={error}>
        {hint}
      </Hint>
    </fieldset>
  );
}
