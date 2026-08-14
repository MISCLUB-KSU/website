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

/**
 * أسئلةٌ يشترك فيها أكثرُ من رغبة — **تُسأل مرّةً واحدة**.
 *
 * ⚠️ **وُلدت من اللجنة الإعلامية.** أسئلة قائدها عن مجالات الإعلام عمومًا،
 * فمن يختار وحدتين منها كان يُسأل الخمسةَ مرّتين — والإجاباتُ تُخزَّن لكلِّ
 * رغبةٍ على حدة. فصارت أسئلةُ اللجنة تُخزَّن بمفتاح اللجنة (`key`) لا
 * بمفتاح الوحدة، والنموذجُ والخادمُ يتخطّيان المفتاحَ المرئيَّ مرّتين.
 *
 * أسئلةُ الوحدة نفسِها تبقى في `questions` وتُسأل لكل رغبةٍ على حدة —
 * فوحدتان مختلفتان قد يريد قائدُ كلٍّ منهما جوابًا يخصّه.
 */
export type SharedQuestions = {
  /** المفتاح الذي تُخزَّن به الإجابات بدل قيمة الرغبة — `committee:media` */
  key: string;
  /** عنوان الكتلة في النموذج — اسم اللجنة */
  title: string;
  questions: readonly CustomQuestion[];
};

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
  /** أسئلة هذي الرغبة وحدها — تُسأل لكل رغبةٍ على حدة */
  questions?: readonly CustomQuestion[];
  /** أسئلة اللجنة التي تتبعها — تُسأل مرّةً واحدة مهما تعدّدت وحداتُها */
  shared?: SharedQuestions;
  /** تقبل رابطَ تقديمٍ مباشر — انظر `directLink` في `projects.ts` */
  directLink?: boolean;
};

/** عناوين المجموعات — تُستعمل في القائمة وفي ترتيب العرض */
const GROUP_STANDALONE = "لجان تُقدَّم ككتلة واحدة";
const GROUP_PROJECTS = "المشاريع";

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
          /* أسئلة اللجنة تنزل على كل وحدةٍ فيها بمفتاح اللجنة — فمن اختار
             وحدتين منها يُسأل مرّةً. انظر `SharedQuestions` أعلاه. */
          shared: committee.questions?.length
            ? {
                key: committeeValue(committee),
                title: committee.name,
                questions: committee.questions,
              }
            : undefined,
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

/**
 * ⚠️ **المبادرة الخارجية لا تدخل التسجيل — `isExternal` تُستبعَد هنا.**
 *
 * كانت تُعرض بطاقةً في مجموعةٍ مستقلّة اسمها «المبادرات»، فيختارها الطالب
 * رغبةً كأيّ مشروع. والواقع أن **تسجيلها ليس عندنا**: النادي يشارك فيها
 * ولا يستقبل طلباتها، فبطاقةُ «اختيار» تعِد بما لا نملكه — ومن يختارها
 * يُنفق رغبةً من ثلاث على بابٍ لا يفتحه هذا النموذج.
 *
 * والاستبعاد من هنا يكفي وحده، فكلُّ ما يليه مشتقٌّ من هذي القائمة:
 * البطاقات، والقوائم المنسدلة بلا جافاسكربت، ومجموعةُ «المبادرات» (تُبنى
 * من `PREFERENCES` فلا تظهر فارغة)، والتحقّق على الخادم عبر
 * `PREFERENCE_VALUES`، والرابطُ المباشر `/join/project/learnx` عبر
 * `findDirectTarget` — يتوقّف كلُّه معًا ولا يبقى بابٌ خلفيّ.
 *
 * ⚠️ **ولم تُمسّ بيانات المبادرة في `projects.ts`** — تبقى في صفحة المشاريع
 * وفي الإنجازات والرعاة. وصفحتُها تقرأ `PROJECTS` لا هذي القائمة، وهي اليوم
 * تُحوَّل إلى `/projects` كسائر المشاريع لأن القسم مغلقٌ بانتظار الشعارات،
 * لا بسبب هذا التغيير (مقيس: الثلاثة تُحوَّل ٣٠٧).
 *
 * والرابطُ المباشر `/join/project/learnx` لم يعد يقفل النموذج على المبادرة،
 * بل **يسقط إلى النموذج المفتوح بثلاث رغبات** — لا 404. وهو الصواب: من وصل
 * برابطٍ قديم يجد بابًا يعمل لا صفحةَ خطأ.
 */
export const PROJECT_PREFERENCES: readonly Preference[] = PROJECTS.filter(
  (project) => !project.isExternal,
).map((project) => ({
  value: projectValue(project),
  kind: "project" as const,
  label: project.name,
  fullLabel: project.name,
  group: GROUP_PROJECTS,
  description: project.summary,
  questions: project.questions,
  directLink: project.directLink,
}));

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

/* ── كتل الأسئلة ────────────────────────────────────────────────────────── */

/**
 * كتلةُ أسئلةٍ واحدة في نموذج التقديم.
 *
 * ⚠️ **مصدرٌ واحد للنموذج وللخادم وللوحة.** الثلاثة كانت تمرّ على الرغبات
 * الثلاث كلٌّ بحلقته، فلو تخطّى أحدُها مفتاحًا مكرّرًا دون الآخرين لعرض
 * النموذجُ سؤالًا لا يتحقّق منه الخادم، أو تحقّق من سؤالٍ لم يُعرض. فالبناء
 * هنا مرّةً، والثلاثة تقرأ منه.
 */
export type QuestionBlock = {
  /** المفتاح الذي تُبنى منه أسماء الحقول — `answerName(key, questionId)` */
  key: string;
  /** اسم الجهة — «اللجنة الإعلامية — وحدة التصميم» أو «اللجنة الإعلامية» */
  title: string;
  /** ترتيبُ الرغبات التي جلبت هذي الكتلة — أكثرُ من واحدةٍ للمشتركة */
  slots: readonly number[];
  /** كتلةُ لجنةٍ تشترك فيها وحداتُها — تُسأل مرّةً */
  shared: boolean;
  questions: readonly CustomQuestion[];
};

/**
 * كتلُ الأسئلة لرغباتٍ مختارة، بترتيب العرض وبلا تكرار.
 *
 * كتلةُ اللجنة تظهر عند **أوّل** وحدةٍ منها تُختار، وتحمل ترتيبَ كل وحدةٍ
 * تبعتها — فالطالب يقرأ أن هذي أسئلةُ رغبتيه الأولى والثالثة معًا.
 */
export function questionBlocks(
  choices: readonly string[],
): readonly QuestionBlock[] {
  const picked = choices.map((choice) =>
    choice ? findPreference(choice) : undefined,
  );

  /* مرورٌ أوّل يجمع ترتيبَ كل رغبةٍ تحت مفتاح لجنتها، فتكتمل `slots` قبل
     أن تُبنى الكتلة — لا تُدفع إلى مصفوفةٍ مُخرَجة أصلًا (تعديلٌ بعد البناء) */
  const slotsByKey = new Map<string, number[]>();
  picked.forEach((preference, slot) => {
    const key = preference?.shared?.questions.length
      ? preference.shared.key
      : undefined;
    if (key) slotsByKey.set(key, [...(slotsByKey.get(key) ?? []), slot]);
  });

  const blocks: QuestionBlock[] = [];
  const emitted = new Set<string>();

  picked.forEach((preference, slot) => {
    if (!preference) return;

    const shared = preference.shared;
    if (shared?.questions.length && !emitted.has(shared.key)) {
      emitted.add(shared.key);
      blocks.push({
        key: shared.key,
        title: shared.title,
        slots: slotsByKey.get(shared.key) ?? [slot],
        shared: true,
        questions: shared.questions,
      });
    }

    if (preference.questions?.length) {
      blocks.push({
        key: preference.value,
        title: preference.fullLabel,
        slots: [slot],
        shared: false,
        questions: preference.questions,
      });
    }
  });

  return blocks;
}

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
