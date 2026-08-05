"use client";

import { SelectField } from "@/components/ui/field";
import {
  PREFERENCE_GROUPS,
  findPreference,
  isCommitteeValue,
} from "@/content/preferences";
import { isolateLatin } from "@/lib/bidi";
import { PreferenceGuide } from "./preference-guide";
import { StepPanel } from "./step-panel";

/**
 * الخطوة الثانية — التعريف ثم الاختيار.
 *
 * الترتيب مقصود: التعريفات أولًا ثم القوائم. من يختار قبل أن يقرأ يختار
 * بالاسم وحده، وأسماء الوحدات متشابهة.
 *
 * الرغبات ثلاث مرتّبة، وواحدة منها على الأقل لجنة. الشرط يُعلَن قبل
 * الاختيار، ويُحكم عليه فور اكتمال الثلاث — لا بعد الضغط على «التالي».
 */

const SLOTS = ["رغبتك الأولى", "رغبتك الثانية", "رغبتك الثالثة"] as const;

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
  const complete = choices.every(Boolean);
  const hasCommittee = choices.some((value) => value && isCommitteeValue(value));

  return (
    <StepPanel
      index={index}
      current={current}
      title="اللجان والمشاريع"
      lede="اقرأ عمل كل لجنة ومشروع، ثم رتّب ثلاث رغبات. نبدأ بالأولى وننتقل لما بعدها عند الحاجة."
    >
      <PreferenceGuide />

      <div className="flex flex-col gap-s5 border-t border-line pt-s5">
        <div>
          <h3 className="font-display text-[0.95rem] font-semibold text-fg">
            رغباتك الثلاث
          </h3>
          <p className="mt-1 text-[0.84rem] leading-relaxed text-fg-muted">
            اختر ثلاثة خيارات مختلفة بالترتيب الذي تفضّله —{" "}
            <strong className="font-semibold text-fg">
              على أن تكون إحداها لجنة أو وحدة داخلها
            </strong>
            . العضوية في النادي تبدأ من لجنة، والمشاريع تُبنى فوقها.
          </p>
        </div>

        {SLOTS.map((slotLabel, slot) => {
          const value = choices[slot] ?? "";
          const chosen = value ? findPreference(value) : undefined;
          const name = `choice${slot + 1}`;

          return (
            <SelectField
              /* غير متحكَّم به عمدًا: React يستدعي `form.reset()` بعد كل
                 `Server Action`، وقائمةٌ متحكَّم بها تُفرَّغ في الصفحة ولا
                 تُستعاد — فيُرسل الطالب رغبةً فارغة وهو يراها مختارة.
                 المفتاح يتغيّر مع ما يُعيده الخادم فيُعاد تركيب الحقل. */
              key={`${name}-${v[name] ?? ""}`}
              id={name}
              label={slotLabel}
              required
              placeholder="اختر من القائمة"
              groups={PREFERENCE_GROUPS.map((group) => ({
                label: group.label,
                options: group.options.map((option) => ({
                  ...option,
                  /* المختار في خانة أخرى يبقى ظاهرًا معطّلًا — اختفاؤه
                     يجعل الطالب يظنّ القائمة تغيّرت لا أن خياره تكرّر */
                  disabled: choices.some(
                    (other, index) => index !== slot && other === option.value,
                  ),
                })),
              }))}
              defaultValue={value}
              onChange={(event) => onChange(slot, event.target.value)}
              error={e[name]}
              hint={chosen ? isolateLatin(chosen.fullLabel) : undefined}
            />
          );
        })}

        {/* الحكم على الشرط فور اكتمال الثلاث — قبل الضغط على «التالي» */}
        {complete && !hasCommittee && (
          <p
            role="alert"
            className="border-s-2 border-warning bg-warning/8 px-s4 py-s3 text-[0.84rem] leading-relaxed text-warning"
          >
            رغباتك الثلاث مشاريع ومبادرات. بدّل واحدة منها بلجنة أو وحدة داخلها
            لتتمكّن من المتابعة.
          </p>
        )}
      </div>
    </StepPanel>
  );
}
