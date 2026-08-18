"use client";

import { useState } from "react";

import { SelectField } from "@/components/ui/field";
import { useHydrated } from "@/lib/use-hydrated";
import {
  PREFERENCES,
  PREFERENCE_GROUPS,
  PREFERENCE_SECTIONS,
  isCommitteeValue,
  type Preference,
  type PreferenceSection,
} from "@/content/preferences";
import { PROJECTS } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";
import { StepPanel } from "./step-panel";

/**
 * الخطوة الثانية — **الاختيار من بطاقاتٍ لا من قوائم منسدلة**.
 *
 * ⚠️ كانت ثلاث قوائم منسدلة، فرفضتها الإدارة: «ما بي طريقة عرض اختيار كذا…
 * أبغى كل مشروع وكل لجنة مكتوب الوصف عندها واختيارها». والقائمة المنسدلة
 * تُخفي الوصف خلف سطرٍ واحد — فيختار الطالب **الاسم الذي يعجبه لا العمل
 * الذي يناسبه**، وأسماء الوحدات متشابهة أصلًا.
 *
 * فالجهات كلّها معروضةٌ ببطاقات: الاسم والوصف وزرُّ الاختيار. والنقرة
 * تُسنِد الرتبة التالية الشاغرة، ونقرةٌ ثانية تسحبها وتُصعِّد ما بعدها —
 * فلا تبقى فجوةٌ في الترتيب.
 *
 * ⚠️⚠️ **ويعمل بلا جافاسكربت**: الخادم يرسم القوائم المنسدلة، وبعد
 * التركيب تحلّ البطاقات محلّها. فمن تعطّل عنده السكربت يبقى أمام قوائمَ
 * تعمل — والنموذج كلُّه مبنيٌّ على ذلك.
 */

const RANKS = ["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"] as const;
const SLOTS = ["رغبتك الأولى", "رغبتك الثانية", "رغبتك الثالثة"] as const;
/* شارةُ القسم المطويّ — تُسرد بلا أرقام، فلا مطابقةَ مفردٍ ومثنّى وجمع */
const RANKS_SHORT = ["الأولى", "الثانية", "الثالثة"] as const;

/* ألوان الرتب — تدرّجٌ رتيب الإضاءة، الأولى أدكن فهي الأثقل وزنًا */
const RANK_TINT = ["var(--deep)", "var(--primary)", "var(--sky)"] as const;

/**
 * جهاتٌ تُعرَّف ولا تُختار — بابُ تسجيلها في قناتها هي (`applyAt`).
 *
 * ⚠️ **ليست `Preference` ولا تدخل `PREFERENCES`.** لو صارت خيارًا لَدخلت
 * قيمتُها القاعدةَ رغبةً، ولَظهرت في «الطلب» و«الطلب على الجهات» فأرت قائدًا
 * منافسةً على جهةٍ لا يُقدَّم عليها هنا أصلًا. فهي بطاقةٌ ساكنة بلا زرّ.
 */
const INITIATIVES = PROJECTS.filter((project) => project.applyAt);

type StepPreferencesProps = {
  index: number;
  current: number;
  choices: readonly string[];
  onChange: (slot: number, value: string) => void;
  values: Record<string, string>;
  errors: Record<string, string>;
};

export function StepPreferences({
  index,
  current,
  choices,
  onChange,
  values: v,
  errors: e,
}: StepPreferencesProps) {
  /* ⚠️ **البطاقات والقوائم لا تتعايشان في الصفحة نفسها.**
     أول بناءٍ عرض الاثنتين — القوائم في `.js-off` والحقول الخفيّة بعدها —
     وكلاهما بالاسم `choice1`. و`FormData.get` يُرجع **الأولى** لا الأخيرة،
     و`display:none` لا يمنع الإرسال. فكان التحقّق يقرأ القائمة الفارغة
     ويرفض «التالي» مهما اخترتَ من البطاقات.

     والعلاج أن تُرسم واحدةٌ فقط: الخادم يرسم القوائم (فتعمل بلا جافاسكربت)،
     وبعد التركيب تحلّ البطاقات محلّها. والتبديل في `useEffect` لا في
     المُهيّئ حتى يطابق أولُ رسمٍ ما جاء من الخادم. */
  const live = useHydrated();

  const complete = choices.every(Boolean);
  const rankOf = (value: string) => choices.indexOf(value);

  /* ⚠️ **يوازي `refinePreferences` في `registration.ts` حرفًا بحرف.** لو
     افترق الطرفان لرأى المتقدّم تحذيرًا لا يردّه الخادم — أو رُدَّ بلا
     تحذيرٍ يشرح، وهو أسوأ الاثنين. */
  const filled = choices.filter((value): value is string => Boolean(value));
  const hasCommittee = filled.some(isCommitteeValue);
  const hasProject = filled.some((value) => !isCommitteeValue(value));
  const kindWarning = !complete
    ? undefined
    : !hasCommittee
      ? "رغباتك الثلاث مشاريع. بدّل واحدة منها بلجنة أو وحدة داخلها لتتمكّن من المتابعة — اللجنة هي بابك إلى المشروع."
      : !hasProject
        ? "رغباتك الثلاث لجان. بدّل واحدة منها بمشروع من لجنة المشاريع لتتمكّن من المتابعة."
        : undefined;

  /**
   * الرسالة المنطوقة عن الرغبات — تُشتقّ من أخطاء الخانات الثلاث كلِّها.
   *
   * ⚠️ **العدُّ من `choices` لا من عدد الأخطاء.** المخطّط يضيف خطأً للخانة
   * الفارغة **وللمكرَّرة** أيضًا، فعدُّ الأخطاء يقول «ينقصك واحدة» لمن
   * اختار ثلاثًا فيها تكرار — وهو غلط. فالنقصُ يُحسب من القيم نفسِها،
   * وما ليس نقصًا (تكرارٌ أو شرطُ اللجنة) تُنقل رسالتُه كما كتبها المخطّط.
   */
  const slotErrors = [e.choice1, e.choice2, e.choice3];
  const missing = choices.filter((value) => !value).length;
  /* ⚠️ الرقم يُعزل `dir="ltr"` — قاعدةُ المستودع لكل رقمٍ لاتينيّ في نصٍّ
     عربيّ. مفردًا قد يمرّ، لكن الاستثناء يُنسى فيُكسَر يوم يصير عددًا. */
  const choiceError: React.ReactNode = !slotErrors.some(Boolean)
    ? undefined
    : missing > 0
      ? [
          "ينقصك ",
          <span key="n" dir="ltr" className="tabular-nums">
            {missing}
          </span>,
          " من ثلاث رغبات — الخانات الناقصة معلَّمة بالأحمر.",
        ]
      : slotErrors.find(Boolean);

  /* نقرةٌ واحدة تكفي: تُسنِد الشاغر التالي، أو تسحب وتُصعِّد ما بعده. */
  function toggle(value: string) {
    const at = rankOf(value);
    if (at !== -1) {
      const rest = choices.filter((c, i) => i !== at && c);
      [0, 1, 2].forEach((slot) => onChange(slot, rest[slot] ?? ""));
      return;
    }
    const free = choices.findIndex((c) => !c);
    if (free !== -1) onChange(free, value);
  }

  /* القسمُ المفتوح واحدٌ لا أكثر: فتحُ الجميع يعيد القائمة المسطّحة التي
     خرجنا منها. و`null` أوّلًا — يبدأ المتقدّم على خمس بطاقاتٍ يقرؤها كلَّها
     في شاشةٍ واحدة قبل أن يفتح شيئًا. */
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <StepPanel
      index={index}
      current={current}
      title="اللجان والمشاريع"
      lede="اقرأ عمل كل جهة، ثم اختر ثلاثًا بالترتيب الذي تفضّله. أول نقرة رغبةٌ أولى، والتي بعدها ثانية."
    >
      {/* ⚠️ **رُفع صندوق «اللجان تخدم المشاريع» — بقرار الإدارة (١٢ أغسطس).**
          نصُّه: «نشيلها… يوم يدخلون نعلمهم ونشرح لهم في المقابلات بعد».
          وكان أُدخل بطلب الإدارة («حط تحتها ألف خط، لازم الأعضاء يعرفون»)،
          فالقرارُ الأحدث ينسخه — انظر سلسلة القرار في ذاكرة المشروع.

          ⚠️ **وشرطُ النوع لم يُرفع معه، بل شُدّد** (١٤ أغسطس ٢٠٢٦):
          `refinePreferences` في `registration.ts` يردّ من اختار ثلاثةَ
          مشاريع **ومن اختار ثلاثَ لجانٍ** كذلك. والسطرُ الذي يقولها
          للمتقدّم اليوم هو «ولا بدّ أن تكون في رغباتك الثلاث لجنةٌ ومشروع»
          تحت عنوان «اللجان والمشاريع» أدناه — فلا يُنزع ظنًّا أنه تكرارٌ
          لهذا الصندوق المرفوع. */}

      {/* ══ شريط ما اخترته ══════════════════════════════════════════════ */}
      <div
        className="flex flex-col gap-s3"
        aria-invalid={choiceError ? true : undefined}
      >
        <h3 className="font-display text-[0.95rem] font-semibold text-fg">
          رغباتك الثلاث
        </h3>

        {/* ⚠️ **الخانة تحمل خطأها — وهذا كان عطلًا صامتًا يوقف الطالب.**
            كان المعروض هنا `e.choice1` وحدها، والبطاقاتُ تحلّ محلّ القوائم
            المنسدلة بعد الترطيب — والقوائمُ هي التي كانت تعرض خطأَي
            `choice2` و`choice3`. فتذهب معها، ولا يبقى لهما موضعٌ يظهران فيه.
            والنتيجة مقيسةٌ ثلاث مرّات: مَن اختار **رغبةً أو رغبتين** يضغط
            «التالي» فلا ينتقل، و**صفرُ رسالة وصفرُ `aria-invalid` والتركيز
            لا يتحرّك** — طريقٌ مسدودٌ بلا تفسير. ومَن اختار صفرًا كان يرى
            رسالةً، فيبدو النموذج سليمًا عند الفحص بنموذجٍ فارغ.
            والآن كلُّ خانةٍ تحمل رسالتَها في مكانها — حيث ينظر الطالب. */}
        <ol className="grid gap-s2 sm:grid-cols-3">
          {RANKS.map((rank, slot) => {
            const value = choices[slot] ?? "";
            const picked = value
              ? PREFERENCES.find((p) => p.value === value)
              : undefined;
            const slotError = e[`choice${slot + 1}`];
            return (
              <li
                key={rank}
                className="flex min-h-[4.25rem] flex-col justify-center border px-s3 py-s2"
                style={{
                  borderColor: slotError
                    ? "var(--danger)"
                    : picked
                      ? RANK_TINT[slot]
                      : "var(--line)",
                  background: picked
                    ? `color-mix(in oklab, ${RANK_TINT[slot]} 10%, transparent)`
                    : undefined,
                }}
              >
                <span className="text-[0.875rem] text-fg-muted">{rank}</span>
                <span
                  className={`text-[0.95rem] font-semibold ${slotError ? "text-danger" : "text-fg"}`}
                >
                  {picked
                    ? isolateLatin(picked.fullLabel)
                    : (slotError ?? "— لم تُختَر بعد")}
                </span>
              </li>
            );
          })}
        </ol>

        {/* ⚠️ **إعلانٌ واحد لا ثلاثة.** `role="alert"` على كل خانةٍ يجعل
            قارئ الشاشة ينطق ثلاث رسائل متزاحمة. فواحدةٌ تلخّص، والتفصيلُ
            في الخانات أعلاه. و`aria-invalid` و`tabIndex` عليها هما ما
            يجدهما نقلُ التركيز إلى أوّل خطأ في `registration-form.tsx` —
            بدونهما يبقى البحث عن `[aria-invalid="true"]` بلا نتيجة. */}
        {/* ⚠️ `aria-invalid` على الغلاف لا على الرسالة: دورُ `alert` لا يدعمها
            (مواصفة ARIA، ويرفضها المدقّق). والغلافُ عنصرٌ عامٌّ يقبلها،
            فيجدها نقلُ التركيز. و`data-error-focus` هي المرساة التي يركّز
            عليها — لا يوجد هنا حقلٌ يُركَّز عليه، الخانات عرضٌ لا إدخال. */}
        {choiceError && (
          <p
            role="alert"
            tabIndex={-1}
            data-error-focus
            className="text-[0.875rem] text-danger outline-none"
          >
            {choiceError}
          </p>
        )}

        {kindWarning && (
          <p
            role="alert"
            className="border-s-2 border-warning bg-warning/8 px-s4 py-s3 text-[0.875rem] leading-relaxed text-warning"
          >
            {kindWarning}
          </p>
        )}
      </div>

      {/* ══ البطاقات ═══════════════════════════════════════════════════ */}
      {live && (
        <div className="flex flex-col gap-s3">
          <div>
            <h3 className="font-display text-[1rem] font-bold text-fg">
              اللجان والمشاريع
            </h3>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-fg-muted">
              اختر اللجنة أوّلًا لتظهر خياراتها. ولا بدّ أن تكون في رغباتك
              الثلاث لجنةٌ ومشروع.
            </p>
          </div>

          {PREFERENCE_SECTIONS.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              open={openSection === section.key}
              onOpen={() =>
                setOpenSection((current) =>
                  current === section.key ? null : section.key,
                )
              }
              rankOf={rankOf}
              onToggle={toggle}
            />
          ))}
        </div>
      )}

      {/* ══ بديلُ انقطاع السكربت ═══════════════════════════════════════ */}
      {!live && (
        <div className="flex flex-col gap-s5">
          <p className="text-[0.875rem] text-fg-muted">
            اختر رغباتك الثلاث من القوائم:
          </p>
          {SLOTS.map((slotLabel, slot) => (
            <SelectField
              key={`choice${slot + 1}-${v[`choice${slot + 1}`] ?? ""}`}
              id={`choice${slot + 1}-fallback`}
              name={`choice${slot + 1}`}
              label={slotLabel}
              required
              placeholder="اختر من القائمة"
              groups={PREFERENCE_GROUPS}
              defaultValue={choices[slot] ?? ""}
              error={e[`choice${slot + 1}`]}
            />
          ))}
        </div>
      )}

      {/* القيم تُرسل من حقولٍ خفيّة: البطاقة زرٌّ لا حقل، والزرُّ لا يحمل
          قيمةً في `FormData`. ولا تُرسم إلّا مع البطاقات — فلا يتكرّر الاسم. */}
      {live && (
        <div>
          {[0, 1, 2].map((slot) => (
            <input
              key={slot}
              type="hidden"
              name={`choice${slot + 1}`}
              value={choices[slot] ?? ""}
            />
          ))}
        </div>
      )}
    </StepPanel>
  );
}

/* ── القسم وبطاقاتُه ─────────────────────────────────────────────────── */

/**
 * قسمُ لجنةٍ في المُنتقي — عنوانٌ يُفتح على خياراته.
 *
 * ⚠️ **واللجنة التي تعمل ككتلة واحدة لا تُفتح**: خيارُها هي نفسُها، ففتحُها
 * يعرض خيارًا يتيمًا يكرّر عنوانَه. فتُرسم بطاقةَ اختيارٍ مباشرة.
 */
function SectionCard({
  section,
  open,
  onOpen,
  rankOf,
  onToggle,
}: {
  section: PreferenceSection;
  open: boolean;
  onOpen: () => void;
  rankOf: (value: string) => number;
  onToggle: (value: string) => void;
}) {
  if (section.standalone) {
    const only = section.items[0];
    return (
      <OptionCard item={only} rank={rankOf(only.value)} onToggle={onToggle} />
    );
  }

  const picked = section.items
    .map((item) => rankOf(item.value))
    .filter((rank) => rank !== -1)
    .sort((a, b) => a - b);

  const panelId = `prefs-${section.key}`;

  return (
    <section className="border border-line">
      <h4>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-start justify-between gap-x-s3 p-s4 text-start transition-colors hover:bg-bg-sunken"
        >
          <span className="min-w-0">
            <span className="block text-[0.95rem] font-semibold text-fg [overflow-wrap:anywhere]">
              {isolateLatin(section.label)}
            </span>
            <span className="mt-1 block text-[0.875rem] leading-relaxed text-fg-muted">
              {isolateLatin(section.description)}
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-s1">
            {/* ⚠️ **ما اخترته يظهر على القسم المطويّ.** بدونها يختفي
                الاختيار حين يُطوى القسم، فيظنّ المتقدّم أنه ضاع فيعيده —
                وشريطُ «رغباتك الثلاث» أعلى الخطوة بعيدٌ عن عينه هنا.
                وتُسرد الرتب نصًّا («الأولى · الثالثة») لا عددًا: العدد
                يجرّ مطابقةَ المفرد والمثنّى والجمع، ورقمًا لاتينيًّا يلزمه
                عزلٌ في نصٍّ عربيّ. */}
            {picked.length > 0 && (
              <span
                className="px-s2 py-s1 text-[0.8125rem] font-semibold"
                style={{
                  background: RANK_TINT[picked[0]],
                  color: "var(--snow)",
                }}
              >
                {picked.map((rank) => RANKS_SHORT[rank]).join(" · ")}
              </span>
            )}
            <span className="text-[0.875rem] text-fg-muted">
              {open ? "إخفاء الخيارات" : "عرض الخيارات"}
            </span>
          </span>
        </button>
      </h4>

      {open && (
        <div
          id={panelId}
          className="grid gap-s3 border-t border-line p-s4 sm:grid-cols-2"
        >
          {section.items.map((item) => (
            <OptionCard
              key={item.value}
              item={item}
              rank={rankOf(item.value)}
              onToggle={onToggle}
            />
          ))}
          {/* ⚠️ **في قسم المشاريع وحده، وبعد ما يُختار.** موضعُها هنا لا في
              قسمٍ مستقلّ لأن الطالب يبحث عن المشروع بين المشاريع؛ وقسمٌ
              خاصٌّ بها يجعلها تُقرأ صنفًا آخر فيتخطّاه من لا يعرف اسمها.
              وبعد المختار لا قبله: البطاقةُ الساكنة في أوّل الشبكة تكسر
              توقّعَ «كلُّ ما هنا يُضغط». */}
          {section.key === "projects" &&
            INITIATIVES.map((initiative) => (
              <InitiativeCard key={initiative.slug} project={initiative} />
            ))}
        </div>
      )}
    </section>
  );
}

/**
 * بطاقةٌ تعريفية لا خيار — لجهةٍ بابُ تسجيلها ليس عندنا.
 *
 * ⚠️ **`div` لا `button`، وبلا `aria-pressed`.** الشكلُ وحده لا يكفي: قارئُ
 * الشاشة يُعلن «زرّ» فيحاول المستخدم اختيارها ولا شيء يحدث. وهي هنا نصٌّ
 * ورابطٌ فحسب، فتُعلَن كذلك.
 *
 * ⚠️ **ولا تُشبه بطاقةَ الخيار في حدودها.** حدٌّ متقطّعٌ وخلفيةٌ غائرة —
 * يُقرآن «هذي ليست مثل جاراتها» قبل أن يُقرأ النصّ. والفرقُ ليس ذوقًا: في
 * شبكةٍ كلُّ ما فيها يُضغط، بطاقةٌ لا تُضغط بلا إشارةٍ بصريّة تُقرأ عطلًا.
 */
function InitiativeCard({ project }: { project: (typeof PROJECTS)[number] }) {
  const applyAt = project.applyAt;
  if (!applyAt) return null;
  return (
    <div className="flex flex-col gap-s2 border border-dashed border-line-strong bg-bg-sunken p-s4">
      <span className="flex min-w-0 items-start justify-between gap-x-s3">
        <span className="min-w-0">
          <span className="block text-[0.95rem] font-semibold text-fg [overflow-wrap:anywhere]">
            {isolateLatin(project.name)}
          </span>
          {project.tagline && (
            <span
              dir="ltr"
              className="mt-0.5 block text-start text-[0.78rem] tracking-wide text-fg-muted"
            >
              {project.tagline}
            </span>
          )}
        </span>
        {/* بدل زرّ «اختيار» — يشغل موضعَه فيُقرأ الفرقُ في لمحة */}
        <span className="shrink-0 border border-line px-s3 py-s1 text-[0.875rem] text-fg-muted">
          تعريف
        </span>
      </span>

      <span className="text-[0.875rem] leading-relaxed text-fg-muted [overflow-wrap:anywhere]">
        {isolateLatin(project.summary)}
      </span>

      {/* ⚠️ النفيُ قبل الرابط: الرابطُ وحده يُقرأ «اطّلع» فيمضي الطالب
          ظانًّا أن بطاقةَ اختيارها في مكانٍ ما تحت. */}
      <span className="border-s-2 border-accent ps-s3 text-[0.82rem] leading-relaxed">
        <span className="text-fg">{applyAt.note}</span>{" "}
        <a
          href={applyAt.href}
          target="_blank"
          /* `noopener` تقطع وصولَ الصفحة المفتوحة إلى صفحتنا عبر
             `window.opener`، و`noreferrer` تمنع تسريبَ عنوان النموذج في
             ترويسة الإحالة. */
          rel="noopener noreferrer"
          dir="ltr"
          className="font-semibold text-accent underline underline-offset-4 hover:text-accent-hover"
        >
          {applyAt.label}
        </a>
      </span>
    </div>
  );
}

/** بطاقةُ خيارٍ واحد — وحدةٌ أو مشروعٌ أو لجنةٌ تعمل ككتلة واحدة */
function OptionCard({
  item,
  rank,
  onToggle,
}: {
  item: Preference;
  rank: number;
  onToggle: (value: string) => void;
}) {
  const on = rank !== -1;
  return (
    <button
      type="button"
      onClick={() => onToggle(item.value)}
      aria-pressed={on}
      className={`flex flex-col gap-s2 border p-s4 text-start transition-colors ${
        on ? "" : "border-line hover:bg-bg-sunken"
      }`}
      style={
        on
          ? {
              borderColor: RANK_TINT[rank],
              background: `color-mix(in oklab, ${RANK_TINT[rank]} 9%, transparent)`,
            }
          : undefined
      }
    >
      {/* ⚠️ **`anywhere` لا `break-word` — والفرق هو كلُّ الحكاية.**
          قِيس عند تكبير النصّ 200%: بطاقاتُ المشاريع تُخرج الصفحة إلى
          **404px** في 375 (مخالفة WCAG 1.4.4)، والسببُ اسمٌ لاتينيٌّ لا
          ينكسر — «InterMission» — وبطاقتُه عنصرُ شبكةٍ `min-width: auto`
          فلا ينزل تحت عرض محتواه الأدنى. و`overflow-wrap: break-word`
          **لا تُغيّر ذلك العرض الأدنى** بالمواصفة — تكسر السطر بصريًّا
          والحسابُ يبقى على الكلمة كاملة، فيبقى الفيض. و`anywhere` وحدها
          تدخل في حساب `min-content`، وهي المطلوبة هنا.
          وتُكتب خاصّيةً صريحة لا صنفًا مختصرًا: أسماءُ أدوات `overflow-wrap`
          تبدّلت بين إصداري Tailwind، وقِيس أن `break-words` أعطت
          `overflow-wrap: normal` — أي صنفٌ سقط صامتًا. */}
      <span className="flex min-w-0 items-start justify-between gap-x-s3">
        <span className="min-w-0">
          <span className="block text-[0.95rem] font-semibold text-fg [overflow-wrap:anywhere]">
            {isolateLatin(item.label)}
          </span>
          {/* ⚠️ **لا سطرَ للجنة الأمّ هنا بعد اليوم.** كان يُعرض تحت اسم
              الوحدة لأن البطاقات كانت قائمةً مسطّحة لا يُعرف فيها موضعُ
              الوحدة. وقد صارت داخل قسم لجنتها وعنوانُه فوقها مباشرةً،
              فتكرارُه سطرٌ يقول ما قالته الترويسة. */}
        </span>

        {/* ⚠️ الرتبة **نصٌّ لا لونٌ وحده** — من لا يميّز الأزرق الداكن من
            الفاتح يقرأ «الرغبة الثانية». */}
        <span
          className="shrink-0 px-s3 py-s1 text-[0.875rem] font-semibold"
          style={
            on
              ? { background: RANK_TINT[rank], color: "var(--snow)" }
              : {
                  border: "1px solid var(--line)",
                  color: "var(--fg-muted)",
                }
          }
        >
          {on ? RANKS[rank] : "اختيار"}
        </span>
      </span>

      <span className="text-[0.875rem] leading-relaxed text-fg-muted">
        {item.description}
      </span>
    </button>
  );
}
