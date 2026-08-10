/**
 * الرغبات — قائمة ما يقدَّم عليه في نموذج العضوية.
 *
 * تُبنى من اللجان والمشاريع لا تُكتب يدويًا، ويستهلكها الطرفان: الواجهة
 * ترسم منها القوائم، والخادم يتحقّق منها. مصدر واحد، وإلا قَبِل أحدهما
 * ما يرفضه الآخر.
 *
 * قاعدة الرغبات — بقرار رئاسة النادي: يختار الطالب **ثلاث رغبات** مرتّبة،
 * حرًّا فيها، بشرط أن تكون **واحدة منها على الأقل لجنة** (أو وحدة داخلها).
 * فمن أراد المشاريع الثلاثة كلّها لا يمرّ: العضوية في النادي تبدأ من لجنة.
 */

import { COMMITTEES, type Committee, type Unit } from "./committees";
import { PROJECTS, type Project } from "./projects";
import type { CustomQuestion } from "./questions";

/** لجنة (أو وحدة داخلها) في مقابل مشروع أو مبادرة */
export type PreferenceKind = "committee" | "project";

export type Preference = {
  /** القيمة المرسلة في النموذج — انظر صيغتها في `committeeValue` أدناه */
  value: string;
  kind: PreferenceKind;
  /** الاسم داخل مجموعته في القائمة — «وحدة التصميم» */
  label: string;
  /** الاسم كاملًا خارج سياق المجموعة — «اللجنة الإعلامية — وحدة التصميم» */
  fullLabel: string;
  /** عنوان المجموعة في القائمة المنسدلة */
  group: string;
  description: string;
  questions?: readonly CustomQuestion[];
  /** تقبل رابطَ تقديمٍ مباشر — انظر `directLink` في `projects.ts` */
  directLink?: boolean;
};

/** عناوين المجموعات — تُستعمل في القائمة وفي ترتيب العرض */
const GROUP_STANDALONE = "لجان تُقدَّم ككتلة واحدة";
const GROUP_PROJECTS = "المشاريع";
const GROUP_INITIATIVES = "المبادرات";

/**
 * صيغة القيمة: `committee:<لجنة>` أو `committee:<لجنة>/<وحدة>` أو `project:<مشروع>`.
 *
 * السابقة ليست زينة: بها وحدها يُعرف نوع الرغبة من قيمتها، وشرط «لجنة
 * واحدة على الأقل» يُفحص على الخادم بلا بحث في القوائم.
 */
export function committeeValue(committee: Committee, unit?: Unit): string {
  return unit
    ? `committee:${committee.slug}/${unit.slug}`
    : `committee:${committee.slug}`;
}

export function projectValue(project: Project): string {
  return `project:${project.slug}`;
}

export function isCommitteeValue(value: string): boolean {
  return value.startsWith("committee:");
}

/** اللجان ووحداتها — بترتيب العرض نفسه في صفحة اللجان */
export const COMMITTEE_PREFERENCES: readonly Preference[] = COMMITTEES.flatMap(
  (committee): Preference[] =>
    committee.units.length
      ? committee.units.map((unit) => ({
          value: committeeValue(committee, unit),
          kind: "committee" as const,
          label: unit.name,
          fullLabel: `${committee.name} — ${unit.name}`,
          group: committee.name,
          description: unit.description,
          questions: unit.questions,
        }))
      : [
          {
            value: committeeValue(committee),
            kind: "committee" as const,
            label: committee.name,
            fullLabel: committee.name,
            group: GROUP_STANDALONE,
            description: committee.description,
            questions: committee.questions,
          },
        ],
);

export const PROJECT_PREFERENCES: readonly Preference[] = PROJECTS.map(
  (project) => ({
    value: projectValue(project),
    kind: "project" as const,
    label: project.name,
    fullLabel: project.name,
    /* المبادرة تُعرض في مجموعة مستقلة — هي ليست مشروعًا من مشاريع النادي */
    group: project.isExternal ? GROUP_INITIATIVES : GROUP_PROJECTS,
    description: project.summary,
    questions: project.questions,
    directLink: project.directLink,
  }),
);

/* ── الروابط المباشرة ───────────────────────────────────────────────────
   ⚠️ **الأجزاء تُطابَق بجهةٍ معرَّفة، لا تُركَّب منها قيمة.** لو بُنيت القيمة
   من المسار (`` `${kind}:${rest}` ``) لصار كلُّ ما يكتبه الزائر في العنوان
   قيمةَ رغبةٍ تدخل القاعدة. وهنا العكس: نبحث عن جهةٍ قيمتُها تطابق، ونشترط
   أن تكون رايتُها مرفوعة — فما لا يُطابق لا يمرّ. */
export function findDirectTarget(
  segments: readonly string[],
): Preference | undefined {
  if (segments.length < 2) return undefined;
  const [kind, ...rest] = segments;
  if (kind !== "project" && kind !== "committee") return undefined;
  const value = `${kind}:${rest.join("/")}`;
  const found = PREFERENCES.find((p) => p.value === value);
  return found?.directLink ? found : undefined;
}

/** مسارُ الرابط المباشر لجهة — عكسُ `findDirectTarget` */
export function directPath(preference: Preference): string {
  return `/join/${preference.value.replace(":", "/")}`;
}

export const PREFERENCES: readonly Preference[] = [
  ...COMMITTEE_PREFERENCES,
  ...PROJECT_PREFERENCES,
];

export const PREFERENCE_VALUES: readonly string[] = PREFERENCES.map(
  (preference) => preference.value,
);

const BY_VALUE = new Map(PREFERENCES.map((p) => [p.value, p]));

export function findPreference(value: string): Preference | undefined {
  return BY_VALUE.get(value);
}

/**
 * المجموعات بترتيب العرض — تغذّي `optgroup` في القوائم المنسدلة.
 * تُبنى بالمرور على الرغبات بالترتيب لا بفرزها، فترتيب اللجان في
 * `committees.ts` هو الترتيب المعروض.
 */
export type PreferenceGroup = {
  label: string;
  options: readonly { value: string; label: string }[];
};

export const PREFERENCE_GROUPS: readonly PreferenceGroup[] = (() => {
  const groups: { label: string; options: { value: string; label: string }[] }[] =
    [];
  for (const preference of PREFERENCES) {
    let group = groups.find((g) => g.label === preference.group);
    if (!group) {
      group = { label: preference.group, options: [] };
      groups.push(group);
    }
    group.options.push({ value: preference.value, label: preference.label });
  }
  return groups;
})();
