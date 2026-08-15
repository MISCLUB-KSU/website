/**
 * الرغبات — قائمة ما يقدَّم عليه في نموذج العضوية.
 *
 * تُبنى من اللجان والمشاريع لا تُكتب يدويًا، ويستهلكها الطرفان: الواجهة
 * ترسم منها القوائم، والخادم يتحقّق منها. مصدر واحد، وإلا قَبِل أحدهما
 * ما يرفضه الآخر.
 *
 * قاعدة الرغبات: يختار الطالب **ثلاث رغبات** مرتّبة، بشرط أن تكون فيها
 * **لجنةٌ واحدة على الأقل ومشروعٌ واحد على الأقل** — أي لا تكون الثلاث من
 * نوعٍ واحد. فمن أراد ثلاثة مشاريع لا يمرّ (العضوية تبدأ من لجنة)، ومن
 * أراد ثلاث لجانٍ لا يمرّ كذلك.
 *
 * ⚠️ **وهذا يشدّد قاعدةً سابقة، بطلبٍ في ١٤ أغسطس ٢٠٢٦.** كانت: «واحدةٌ
 * منها على الأقل لجنة» — فيمرّ من اختار ثلاث لجانٍ بلا مشروع. والقاعدةُ
 * السابقة كانت موصوفةً هنا بأنها **بقرار رئاسة النادي**، فتشديدُها يُراجَع
 * معها. وأثرُه على المتقدّم مقصود: من لا يريد مشروعًا يُلزَم باختيار واحد.
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
  /**
   * **هل تستقبل هذي الجهةُ طلبات الآن؟**
   *
   * مصدرُها `unit.isOpen` للوحدات و`project.applicationState` للمشاريع.
   * واللجنةُ التي تُقدَّم ككتلةٍ واحدة (بلا وحدات) مفتوحةٌ دائمًا — لا راية
   * لها في `committees.ts`، فلا تُفترض واحدةٌ من عدم.
   *
   * ⚠️ **ولا تُقرأ من `findPreference`.** تلك تبقى على القائمة الكاملة لأن
   * صفوفًا محفوظةً تحمل قيمَ جهاتٍ أُغلقت بعدها، ولوحةُ الإدارة تسمّيها
   * بها. حذفُ المغلقة من البحث يجعل الطلبَ القديم يعرض `project:misthon`
   * خامًا لقائدٍ يقرؤه اليوم.
   */
  open: boolean;
};

/**
 * عنوانُ مجموعة المشاريع.
 *
 * ⚠️ **«لجنة المشاريع» لا «المشاريع» — بقرارٍ في ١٤ أغسطس ٢٠٢٦.** الهيكل
 * المعتمد (انظر رأس `committees.ts`) فيه لجنةٌ للمشاريع تحتها مشاريع
 * النادي، والنموذج كان يعرضها مجموعةً بلا لجنة. فصارت تُعرض باسم لجنتها.
 *
 * ⚠️ **وهي مجموعةٌ في النموذج لا لجنةٌ في `committees.ts`** — عمدًا: قيمُ
 * هذي الرغبات تبقى `project:` فيبقى **نوعُها مشروعًا**، وعليه تقوم قاعدةُ
 * «لجنةٌ ومشروعٌ معًا» في `refinePreferences`. ولو صارت وحداتِ لجنةٍ
 * حقيقية لانقلبت قيمُها إلى `committee:` — فيصير من اختار ثلاثة مشاريع
 * مستوفيًا شرطَ اللجنة، وتسقط القاعدة صامتةً.
 */
const GROUP_PROJECTS = "لجنة المشاريع";

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
  (committee): Preference[] => {
    /* ⚠️ وحداتُ **النموذج** لا وحداتُ صفحة اللجنة — انظر `applicationUnits`
       في `committees.ts`. اللجنة الإعلامية وحدها تفترق اليوم. */
    const units = committee.applicationUnits ?? committee.units;
    return units.length
      ? units.map((unit) => ({
          value: committeeValue(committee, unit),
          kind: "committee" as const,
          label: unit.name,
          fullLabel: `${committee.name} — ${unit.name}`,
          group: committee.name,
          description: unit.description,
          questions: unit.questions,
          open: unit.isOpen,
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
            /* ⚠️ **اسمُ اللجنة لا عنوانٌ تصنيفيّ.** كان هنا «لجان تُقدَّم
               ككتلة واحدة» — وهو تصنيفٌ داخليّ لا يعني المتقدّم شيئًا. ومع
               المُنتقي ذي المستويين صار كلُّ قسمٍ لجنةً باسمها، فاللجنةُ
               بلا وحدات قسمٌ بخيارٍ واحدٍ هو نفسُها. */
            group: committee.name,
            description: committee.description,
            questions: committee.questions,
            /* لا راية على مستوى اللجنة في `committees.ts` — انظر `open` */
            open: true,
          },
        ];
  },
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
  open: project.applicationState === "open",
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
  /* ⚠️ **والمغلقةُ لا يفتحها رابطُها المباشر.** بدون `open` هنا يبقى
     `/join/project/misthon` بابًا خلفيًّا يقفل النموذجَ على جهةٍ لا
     تستقبل — وهو أخطر من ظهورها في القائمة، لأن الرابط يُنشر ويبقى. */
  return found?.directLink && found.open ? found : undefined;
}

/** مسارُ الرابط المباشر لجهة — عكسُ `findDirectTarget` */
export function directPath(preference: Preference): string {
  return `/join/${preference.value.replace(":", "/")}`;
}

/**
 * **كلُّ الجهات — المفتوحُ منها والمغلق.**
 *
 * ⚠️ **لا يُبنى عليها عرضٌ ولا تحقّق.** هي مرجعُ **التسمية** وحده: صفوفٌ
 * محفوظةٌ تحمل قيمَ جهاتٍ أُغلقت بعد أن قُدّم عليها، ولوحةُ الإدارة تسمّيها
 * منها (`findPreference`). فلو قُصّت المغلقةُ هنا لعرض الطلبُ القديم
 * `project:misthon` خامًا لقائدٍ يقرؤه اليوم.
 */
export const PREFERENCES: readonly Preference[] = [
  ...COMMITTEE_PREFERENCES,
  ...PROJECT_PREFERENCES,
];

/**
 * **الجهاتُ المستقبِلة للطلبات — وهي مصدرُ كلِّ عرضٍ وكلِّ تحقّق.**
 *
 * ⚠️ **وُلدت لأن الرايات كانت زينة (١٥ أغسطس ٢٠٢٦).** `unit.isOpen` و
 * `project.applicationState` كانتا تُقرآن في سطرِ الواجهة «التقديم مفتوح /
 * مغلق» **ولا شيء غيره**: المغلقُ يُعرض بطاقةً في المُنتقي، ويمرّ من
 * `PREFERENCE_VALUES` على الخادم، ويعمل رابطُه المباشر. فخمسةُ مشاريعَ من
 * ستّة كانت موسومةً «مغلق» وهي تستقبل.
 *
 * وهو الوجهُ المقلوب للعطل الذي وُلدت له `OPEN_UNITS`: هناك واجهةٌ تردّ
 * والبابُ مفتوح، وهنا وسمٌ يقول مغلقٌ والبابُ مفتوح. والعلاجُ أن تصير
 * الرايةُ قفلًا: **تُقصّ من هنا فتنقطع الأبواب الثلاثة معًا** — البطاقة
 * والقائمة المنسدلة والرابط المباشر — ويردّها الخادمُ كذلك.
 */
export const OPEN_PREFERENCES: readonly Preference[] = PREFERENCES.filter(
  (preference) => preference.open,
);

/**
 * ⚠️ **حارسُ الخادم — ومن المفتوحة وحدها.**
 *
 * يفحصها `choiceField` في `registration.ts`، فقيمةٌ لجهةٍ مغلقة تُردّ ولو
 * أُرسلت يدويًّا بتجاوز الواجهة. والواجهةُ راحةٌ لا حاجز.
 */
export const PREFERENCE_VALUES: readonly string[] = OPEN_PREFERENCES.map(
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
  /* من `OPEN_PREFERENCES` لا `PREFERENCES`: هذي بديلُ المُنتقي حين ينقطع
     السكربت، فلو حملت المغلقةَ لصار البديلُ بابًا خلفيًّا يردّه الخادم. */
  for (const preference of OPEN_PREFERENCES) {
    let group = groups.find((g) => g.label === preference.group);
    if (!group) {
      group = { label: preference.group, options: [] };
      groups.push(group);
    }
    group.options.push({ value: preference.value, label: preference.label });
  }
  return groups;
})();

/* ── أقسامُ المُنتقي ────────────────────────────────────────────────────── */

/**
 * قسمٌ في مُنتقي الرغبات: **لجنةٌ وتحتها خياراتُها**.
 *
 * ⚠️ **مستويان لا قائمةٌ مسطّحة — بقرارٍ في ١٤ أغسطس ٢٠٢٦.** كان المُنتقي
 * يعرض ستَّ عشرةَ بطاقةً متتابعة، فيمرّ المتقدّم على وحدات لجانٍ لا تعنيه
 * ليبلغ ما يريد. فصار يختار اللجنة أوّلًا ثم ما تحتها.
 *
 * ولا يغيّر هذا **القيم** ولا الشرط ولا القوائم المنسدلة: هذي طبقةُ عرضٍ
 * فوق `PREFERENCES` نفسِها، وبديلُ انقطاع السكربت يبقى قوائمَ مسطّحة
 * مجموعةً بـ`optgroup` — والاثنان يقرآن المصدر نفسَه.
 */
export type PreferenceSection = {
  /** مفتاحُ الفتح والطيّ — سلَجُ اللجنة، ثابتٌ لا يتبدّل بتبدّل اسمها */
  key: string;
  label: string;
  description: string;
  /**
   * لجنةٌ تعمل ككتلة واحدة: خيارُها **هي نفسُها**، فتُختار من بطاقة القسم
   * مباشرةً بلا مستوًى ثانٍ يُفتح على خيارٍ يتيم.
   */
  standalone: boolean;
  items: readonly Preference[];
};

const SECTIONS: PreferenceSection[] = [
  ...COMMITTEES.map((committee): PreferenceSection => {
    const self = committeeValue(committee);
    /* المطابقة على القيمة كاملةً أو على بادئةٍ منتهيةٍ بـ`/` — لا
       `startsWith(self)` وحدها: سلَجٌ يبدأ بسلَجٍ آخر («media» و«media-lab»)
       يسحب وحدات جارته إلى قسمه. */
    const items = COMMITTEE_PREFERENCES.filter(
      (preference) =>
        preference.open &&
        (preference.value === self || preference.value.startsWith(`${self}/`)),
    );
    return {
      key: committee.slug,
      label: committee.name,
      description: committee.description,
      standalone: items.length === 1 && items[0].value === self,
      items,
    };
  }),
  {
    key: "projects",
    label: GROUP_PROJECTS,
    description:
      "تُبنى فوق اللجان، ويشتغل عليها أعضاؤها جميعًا. اختر منها واحدًا على الأقل.",
    standalone: false,
    items: PROJECT_PREFERENCES.filter((preference) => preference.open),
  },
];

/** لا يُعرض قسمٌ بلا خيارات — يفتحه المتقدّم على فراغ */
export const PREFERENCE_SECTIONS: readonly PreferenceSection[] = SECTIONS.filter(
  (section) => section.items.length > 0,
);
