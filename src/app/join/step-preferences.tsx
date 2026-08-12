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
 * ⚠️ كانت ثلاث قوائم منسدلة، فرفضها حسام: «ما بي طريقة عرض اختيار كذا…
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
      {/* ══ العلاقة أوّلًا ══════════════════════════════════════════════
          ⚠️ **هذي أهمّ فقرة في الصفحة** بنصّ حسام: «اللجان تعمل للمشاريع…
          حط تحتها ألف خط، لازم الأعضاء يعرفون». فهي في الأعلى قبل أي
          بطاقة، لا حاشيةً تحت القوائم — من يقرأ بعد أن يختار لا ينتفع. */}
      <div
        className="border-s-2 px-s5 py-s4"
        style={{
          borderColor: "var(--deep)",
          background: "color-mix(in oklab, var(--sky) 14%, transparent)",
        }}
      >
        <h3 className="font-display text-[1.05rem] font-bold text-fg">
          اللجان تخدم المشاريع
        </h3>
        <p className="mt-s2 text-[0.9rem] leading-relaxed text-fg">
          ما فيه لجنةٌ تشتغل وحدها. كل لجنةٍ ووحدةٍ في النادي تشتغل{" "}
          <strong className="font-semibold">على مشاريع النادي نفسها</strong> —
          الإعلامية تغطّيها، والعلاقات العامة تجلب رعاتها، والموارد البشرية
          تبني فرقها، والمالية تدير ميزانياتها. فأيًّا كانت لجنتك، شغلك يصبّ في
          المشروع، والكل يشتغل مع بعض.
        </p>
        <p className="mt-s2 text-[0.86rem] leading-relaxed text-fg-muted">
          ولذلك <strong className="font-semibold text-fg">لا بد أن تكون
          إحدى رغباتك الثلاث لجنةً أو وحدةً داخلها</strong> — العضوية تبدأ من
          لجنة، والمشاريع تُبنى فوقها. وتقدر تختار مشروعًا معها إن أردت
          المشاركة فيه بعينه.
        </p>
      </div>

      {/* ══ شريط ما اخترته ══════════════════════════════════════════════ */}
      <div className="flex flex-col gap-s3 border-t border-line pt-s5">
        <h3 className="font-display text-[0.95rem] font-semibold text-fg">
          رغباتك الثلاث
        </h3>

        <ol className="grid gap-s2 sm:grid-cols-3">
          {RANKS.map((rank, slot) => {
            const value = choices[slot] ?? "";
            const picked = value
              ? PREFERENCES.find((p) => p.value === value)
              : undefined;
            return (
              <li
                key={rank}
                className="flex min-h-[4.25rem] flex-col justify-center border px-s3 py-s2"
                style={{
                  borderColor: picked ? RANK_TINT[slot] : "var(--line)",
                  background: picked
                    ? `color-mix(in oklab, ${RANK_TINT[slot]} 10%, transparent)`
                    : undefined,
                }}
              >
                <span className="text-[0.72rem] text-fg-muted">{rank}</span>
                <span className="text-[0.86rem] font-semibold text-fg">
                  {picked ? isolateLatin(picked.fullLabel) : "— لم تُختَر بعد"}
                </span>
              </li>
            );
          })}
        </ol>

        {e.choice1 && (
          <p role="alert" className="text-[0.84rem] text-danger">
            {e.choice1}
          </p>
        )}

        {complete && !hasCommittee && (
          <p
            role="alert"
            className="border-s-2 border-warning bg-warning/8 px-s4 py-s3 text-[0.84rem] leading-relaxed text-warning"
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
        <p className="text-[0.84rem] text-fg-muted">
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
      <p className="mt-1 mb-s4 text-[0.84rem] text-fg-muted">{note}</p>

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
              <span className="flex items-start justify-between gap-x-s3">
                <span className="min-w-0">
                  <span className="block text-[0.94rem] font-semibold text-fg">
                    {isolateLatin(item.label)}
                  </span>
                  {/* ⚠️ **اللجنة الأمّ وحدها، لا عنوانُ المجموعة.**
                      `group` للوحدة اسمُ لجنتها (نافع)، وللجنةٍ بلا وحدات
                      عنوانٌ تصنيفيّ داخليّ («لجان تُقدَّم ككتلة واحدة»)
                      لا يعني المتقدّم شيئًا. والفارق أن الوحدة وحدها
                      `fullLabel` فيها غير `label`. */}
                  {item.fullLabel !== item.label && (
                    <span className="block text-[0.76rem] text-fg-muted">
                      {isolateLatin(item.group)}
                    </span>
                  )}
                </span>

                {/* ⚠️ الرتبة **نصٌّ لا لونٌ وحده** — من لا يميّز الأزرق
                    الداكن من الفاتح يقرأ «الرغبة الثانية». */}
                <span
                  className="shrink-0 px-s3 py-s1 text-[0.72rem] font-semibold"
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

              <span className="text-[0.84rem] leading-relaxed text-fg-muted">
                {item.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
