"use client";

import { SelectField } from "@/components/ui/field";
import { useHydrated } from "@/lib/use-hydrated";
import {
  PREFERENCES,
  PREFERENCE_GROUPS,
  isCommitteeValue,
  type Preference,
} from "@/content/preferences";
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

/* ألوان الرتب — تدرّجٌ رتيب الإضاءة، الأولى أدكن فهي الأثقل وزنًا */
const RANK_TINT = ["var(--deep)", "var(--primary)", "var(--sky)"] as const;

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
  const hasCommittee = choices.some((value) => value && isCommitteeValue(value));
  const rankOf = (value: string) => choices.indexOf(value);

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

  const committees = PREFERENCES.filter((p) => p.kind === "committee");
  const projects = PREFERENCES.filter((p) => p.kind === "project");

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

          ⚠️ **وشرطُ اللجنة لم يُرفع معه**: `refinePreferences` في
          `registration.ts` ما زال يردّ من اختار ثلاثةَ مشاريع، وسطرُ
          «بابُ العضوية — واحدةٌ منها على الأقل مطلوبة» تحت عنوان اللجان
          أدناه هو ما يقولها للطالب الآن. فلا تُنزع تلك الحاشية ظنًّا أنها
          تكرارٌ لهذا الصندوق. */}

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

        {complete && !hasCommittee && (
          <p
            role="alert"
            className="border-s-2 border-warning bg-warning/8 px-s4 py-s3 text-[0.875rem] leading-relaxed text-warning"
          >
            رغباتك الثلاث مشاريع ومبادرات. بدّل واحدة منها بلجنة أو وحدة داخلها
            لتتمكّن من المتابعة — اللجنة هي بابك إلى المشروع.
          </p>
        )}
      </div>

      {/* ══ البطاقات ═══════════════════════════════════════════════════ */}
      {live && (
      <div className="flex flex-col gap-s6">
        <CardGroup
          title="اللجان ووحداتها"
          note="بابُ العضوية — واحدةٌ منها على الأقل مطلوبة."
          items={committees}
          rankOf={rankOf}
          onToggle={toggle}
        />
        <CardGroup
          title="المشاريع والمبادرات"
          note="تُبنى فوق اللجان، ويشتغل عليها أعضاؤها جميعًا."
          items={projects}
          rankOf={rankOf}
          onToggle={toggle}
        />
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

/* ── مجموعةُ بطاقات ─────────────────────────────────────────────────── */

function CardGroup({
  title,
  note,
  items,
  rankOf,
  onToggle,
}: {
  title: string;
  note: string;
  items: readonly Preference[];
  rankOf: (value: string) => number;
  onToggle: (value: string) => void;
}) {
  return (
    <section>
      <h3 className="font-display text-[1rem] font-bold text-fg">{title}</h3>
      <p className="mt-1 mb-s4 text-[0.875rem] text-fg-muted">{note}</p>

      <div className="grid gap-s3 sm:grid-cols-2">
        {items.map((item) => {
          const rank = rankOf(item.value);
          const on = rank !== -1;
          return (
            <button
              key={item.value}
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
                  قِيس عند تكبير النصّ 200%: بطاقاتُ المشاريع تُخرج الصفحة
                  إلى **404px** في 375 (مخالفة WCAG 1.4.4)، والسببُ اسمٌ
                  لاتينيٌّ لا ينكسر — «InterMission» — وبطاقتُه عنصرُ شبكةٍ
                  `min-width: auto` فلا ينزل تحت عرض محتواه الأدنى.
                  و`overflow-wrap: break-word` **لا تُغيّر ذلك العرض الأدنى**
                  بالمواصفة — تكسر السطر بصريًّا والحسابُ يبقى على الكلمة
                  كاملة، فيبقى الفيض. و`anywhere` وحدها تدخل في حساب
                  `min-content`، وهي المطلوبة هنا.
                  وتُكتب خاصّيةً صريحة لا صنفًا مختصرًا: أسماءُ أدوات
                  `overflow-wrap` تبدّلت بين إصداري Tailwind، وقِيس أن
                  `break-words` أعطت `overflow-wrap: normal` — أي صنفٌ سقط
                  صامتًا. ولا تكسر إلا حين لا يتّسع، فالمقاسُ الطبيعيّ كما هو. */}
              <span className="flex min-w-0 items-start justify-between gap-x-s3">
                <span className="min-w-0">
                  <span className="block text-[0.95rem] font-semibold text-fg [overflow-wrap:anywhere]">
                    {isolateLatin(item.label)}
                  </span>
                  {/* ⚠️ **اللجنة الأمّ وحدها، لا عنوانُ المجموعة.**
                      `group` للوحدة اسمُ لجنتها (نافع)، وللجنةٍ بلا وحدات
                      عنوانٌ تصنيفيّ داخليّ («لجان تُقدَّم ككتلة واحدة»)
                      لا يعني المتقدّم شيئًا. والفارق أن الوحدة وحدها
                      `fullLabel` فيها غير `label`. */}
                  {item.fullLabel !== item.label && (
                    <span className="block text-[0.875rem] text-fg-muted">
                      {isolateLatin(item.group)}
                    </span>
                  )}
                </span>

                {/* ⚠️ الرتبة **نصٌّ لا لونٌ وحده** — من لا يميّز الأزرق
                    الداكن من الفاتح يقرأ «الرغبة الثانية». */}
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
        })}
      </div>
    </section>
  );
}
