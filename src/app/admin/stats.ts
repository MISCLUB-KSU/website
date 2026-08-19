import { findPreference } from "@/content/preferences";
import { APPLICATION_STATUSES } from "@/content/statuses";

/**
 * حساب أرقام اللوحة.
 *
 * دوالٌّ صرفة تأخذ الصفوف وتُخرج ما يُرسم — لا استعلامَ فيها ولا حالة. سببان:
 * الصفوف تصل مقصوصةً بـ`RLS` (قائدٌ يرى نطاقه)، فالحساب على ما وصل هو
 * الصحيح؛ ولأنها صرفة تُقرأ ويُتحقّق منها بلا تشغيل قاعدة.
 */

export type Row = {
  id: string;
  created_at: string;
  full_name: string;
  student_id: string;
  phone: string;
  email: string;
  university: string;
  level: string;
  major: string;
  choice1: string;
  choice2: string;
  choice3: string;
  status: string;
  cv_path: string | null;
  /**
   * وقتُ خروج بريد «وصل طلبك» — و`null` يعني **لم يخرج**.
   *
   * ⚠️ `null` في الصفوف السابقة للعمود أيضًا (١٥ أغسطس ٢٠٢٦)، لكنّ الجدول
   * كان قد أُفرغ يومَها فلا صفَّ قديمٌ يشوّش العدّ.
   */
  receipt_mailed_at: string | null;
  /**
   * وقتُ خروج بريد **القرار** — و`null` يعني لم يخرج.
   *
   * ⚠️ **عمودٌ ثانٍ، ولا يكفي `receipt_mailed_at`.** ذاك يختم بريدَ الاستلام
   * الذي يخرج للجميع لحظةَ التقديم؛ وهذا يختم بريدَ النتيجة. ولو جُمعا
   * لصار ختمُ الإيصال يقول «القرارُ أُرسل» — فيُحرم كلُّ متقدّمٍ من نتيجته
   * لأنه استلم إيصالًا. وهو حارسُ التكرار في الإرسال بالجملة.
   */
  decision_mailed_at: string | null;
  /* ما يُعرض في تفصيل الصفّ — محفوظٌ منذ البداية ولم يكن يُعرض */
  national_id: string;
  university_other: string | null;
  major_other: string | null;
  why: string;
  heard_from: string;
  /** خبرةٌ سابقة في عملٍ طلابيّ أو تطوّعيّ — والتفاصيل `null` لمن لا خبرة له */
  has_club_experience: boolean;
  club_experience: string | null;
  /** درجتُها: `multiple` · `single` · `none`. `null` في الصفوف السابقة للعمود */
  club_experience_level: string | null;
  /** وجوابا من لا خبرة له — `null` لمن له خبرة، بالتقابل نفسِه */
  club_perception: string | null;
  club_expectation: string | null;
  /** ملفّ المشاريع السابقة — والرابط البديل في `portfolio` */
  projects_path: string | null;
  /** التزامات الفصل — `'{}'` في الصفوف السابقة للعمود */
  commitments: string[];
  answers: Record<string, string>;
  portfolio: string | null;
  linkedin: string | null;
  /** `open` نموذجٌ بثلاث رغبات · `direct` رابطٌ مباشر لجهةٍ واحدة */
  source: string;
  /**
   * موعدُ المقابلة عند الجهة التي هو عندها الآن — و`null` يعني لم يُحدَّد.
   *
   * ⚠️ يُمسح عند التمرير: هو موعدُ الجهة السابقة لا موعدُ الشخص.
   */
  interview_at: string | null;
  /**
   * **رتبةُ الرغبة التي يُنظر فيه عندها الآن** — ١ أولى · ٢ ثانية · ٣ ثالثة.
   *
   * ⚠️ لا تُستنتج من `status`: قائدُ الرتبة الثانية يضبط «قيد المراجعة»
   * فتصير الحالةُ كحالة الرتبة الأولى — فيضيع الشخصُ بين الشاشتين.
   * والتعليلُ كاملًا في هجرة `stage_ladder`.
   */
  stage: number;
};

/**
 * ⚠️ **الطلبُ يُحسب من الطلبات المفتوحة وحدها.**
 *
 * «الرغبة الأولى» في النموذج المفتوح **تفضيلٌ بين بدائل**؛ وفي الرابط
 * المباشر **هي الخيار الوحيد المعروض** — فالمتقدّم لم يفاضل أصلًا. وخلطُهما
 * يجعل جهةً استقطبت عشرين شخصًا برابطها تبدو أكثرَ جهةٍ مطلوبة في النادي،
 * ويُري قائدَها «يزاحمك عشرون» فيرفض مرشّحًا جيّدًا لسببٍ لا وجود له.
 *
 * والمباشرون لا يُخفَون: يظهرون في الجدول وفي عدّاد الإجمالي وفي كل رقمٍ
 * لا يقيس **المفاضلة**. وهذا الفصلُ هو ما تُشترى به الميزة كلّها.
 */
export function openOnly(rows: readonly Row[]): readonly Row[] {
  return rows.filter((r) => r.source !== "direct");
}

/* ── الحالات ────────────────────────────────────────────────────────────
   ⚠️ **مصدرُها `content/statuses.ts` لا هذا الملفّ.** كانت مكتوبةً هنا
   ونسخةٌ ثانيةٌ في لوحة Angular، فافترقتا في ثلاثة مواضعَ خلال شهر — وأحدُ
   الفروق قيمةٌ ترفضها القاعدة. والتعليلُ كاملًا هناك.

   وتُعاد التسميةُ إلى `key` هنا وحدَها لأن مكوّنات هذي اللوحة تقرؤها بهذا
   الاسم منذ أوّل يوم؛ والمصدرُ يقول `value` كما تقوله `preferences.ts`. */
export const STATUSES = APPLICATION_STATUSES.map((s) => ({
  key: s.value,
  label: s.label,
  color: s.color,
}));

/* ⚠️ الرتب تدرّجٌ كمّيّ من الخمسة الرسمية: عائلةٌ واحدة **رتيبةُ الإضاءة** من الأدكن للأفتح،
   فالرغبة الأولى أثقل وزنًا بصريًّا. ليست ألوانًا مصنّفة تُبدَّل كيفما اتّفق —
   قلبُ الترتيب يقلب المعنى. */
export const RANK_COLORS = [
  "var(--deep)", // الرغبة الأولى — الأدكن، فهي الأثقل وزنًا
  "var(--primary)",
  "var(--sky)",
] as const;

export const RANK_LABELS = ["رغبة أولى", "رغبة ثانية", "رغبة ثالثة"] as const;

export function countBy<T extends string>(
  rows: readonly Row[],
  pick: (r: Row) => T,
): Map<T, number> {
  const out = new Map<T, number>();
  for (const r of rows) {
    const k = pick(r);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export type DemandRow = {
  value: string;
  label: string;
  first: number;
  second: number;
  third: number;
  total: number;
};

/**
 * الطلب على كل لجنة ومشروع، **مفصولًا بالرتبة**.
 *
 * المجموع وحده يضلّل: جهةٌ اختارها عشرون ثالثةً ليست كجهةٍ اختارها عشرة
 * أولى. والقائد يقرّر بـ«كم واحدًا وضعني أوّلًا» لا بعدد من مرّ عليه.
 * فالعمود مكدَّسٌ بالرتب، والترتيب بالأولى ثم بالمجموع.
 */
export function demand(rows: readonly Row[]): DemandRow[] {
  const map = new Map<string, DemandRow>();
  rows = openOnly(rows);
  const bump = (value: string, rank: 0 | 1 | 2) => {
    if (!value) return;
    const existing = map.get(value) ?? {
      value,
      label: findPreference(value)?.fullLabel ?? value,
      first: 0,
      second: 0,
      third: 0,
      total: 0,
    };
    if (rank === 0) existing.first += 1;
    else if (rank === 1) existing.second += 1;
    else existing.third += 1;
    existing.total += 1;
    map.set(value, existing);
  };
  for (const r of rows) {
    bump(r.choice1, 0);
    bump(r.choice2, 1);
    bump(r.choice3, 2);
  }
  return [...map.values()].sort(
    (a, b) => b.first - a.first || b.total - a.total,
  );
}

export type DayPoint = { day: string; label: string; count: number };

/* ── التواريخ ───────────────────────────────────────────────────────────
   ⚠️ **ثلاثةُ أشياءَ تُثبَّت، وكلُّها كانت متروكةً للبيئة — فانكسر الترطيب.**

   رُصد في المتصفّح: الخادمُ يرسم «٢٩ صفر» والعميلُ «١٢ أغسطس»، فتصرخ React
   بعدم تطابق الترطيب وتعيد بناء الشجرة كلِّها. والسبب أن `ar-SA` **يحلّ
   إلى تقويمٍ مختلفٍ باختلاف بناء ICU** — هجريٌّ في Node وميلاديٌّ في هذي
   النسخة من Chromium — فالمخرَجُ يتبع الخادمَ الذي صادف تشغيلَه لا قرارًا.

     ١. `calendar` — وإلّا اختلف التقويم كما وقع
     ٢. `numberingSystem` — وإلّا اختلفت الأرقام بين بناءٍ وآخر
     ٣. `timeZone` — **وهذا أخطرُها ولا يظهر في الترطيب.** الخادمُ على
        Vercel بتوقيتٍ عالميّ، والقائدُ في الرياض (+٣). فطلبٌ وصل ١:٣٠
        فجرًا بتوقيت الرياض يُحسب على **اليوم السابق** في الرسم — وذروةُ
        التسجيل مساءً، أي أن الخطأ يقع حيث تكثر الطلبات لا حيث تندر.

   والتقويمُ ميلاديٌّ عمدًا: مفتاحُ اليوم `2026-08-18` ميلاديّ، ووسمٌ هجريٌّ
   فوق مفتاحٍ ميلاديّ يجعل الرسمَ يقول شيئًا وبنيتُه شيئًا آخر. */
const RIYADH = {
  timeZone: "Asia/Riyadh",
  calendar: "gregory",
  numberingSystem: "latn",
} as const;

/** «١٨ أغسطس» — وسمُ محور الرسم */
const DAY_LABEL = new Intl.DateTimeFormat("ar", {
  day: "numeric",
  month: "short",
  ...RIYADH,
});

/** `2026-08-18` بتوقيت الرياض — مفتاحُ التجميع، و`en-CA` تعطيه بهذا الشكل */
const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  ...RIYADH,
});

function dayKey(d: Date): string {
  return DAY_KEY.format(d);
}

/** وقتُ الوصول كاملًا — يُعرض في ملفّ المتقدّم */
export function arrivalStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return ARRIVAL.format(d);
}

const ARRIVAL = new Intl.DateTimeFormat("ar", {
  dateStyle: "medium",
  timeStyle: "short",
  ...RIYADH,
});

/**
 * الوصول يومًا بيوم — **بأيّامٍ فارغة لا بقفزٍ فوقها**.
 *
 * لو رُسمت الأيام التي وصل فيها طلبٌ فقط، لظهر يومان بينهما أسبوعٌ صامت
 * متجاورين، فيُقرأ الخطّ صعودًا متّصلًا وهو انقطاع. المحور زمنيٌّ متّصل.
 */
export function perDay(rows: readonly Row[]): DayPoint[] {
  if (rows.length === 0) return [];
  const counts = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    const d = new Date(r.created_at);
    const k = dayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    /* ⚠️ **`+03:00` لا `Z`.** المفتاحُ يومٌ بتوقيت الرياض، فتثبيتُه على
       منتصف ليلٍ عالميّ يزحزح كلَّ نقطةٍ ثلاثَ ساعات. */
    const t = Date.parse(`${k}T00:00:00+03:00`);
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const out: DayPoint[] = [];
  /* ⚠️ الخطوةُ ٢٤ ساعةً ثابتة، وهي صحيحةٌ هنا وحدَها لأن السعودية بلا
     توقيتٍ صيفيّ — لا يومَ فيها ٢٣ ساعةً ولا ٢٥. */
  for (let t = min; t <= max; t += 86_400_000) {
    const d = new Date(t);
    out.push({
      day: dayKey(d),
      label: DAY_LABEL.format(d),
      count: counts.get(dayKey(d)) ?? 0,
    });
  }
  return out;
}

/** ترتيب المستويات كما تُقرأ لا أبجديًّا */
export const LEVEL_ORDER = [
  "السنة الأولى",
  "السنة الثانية",
  "السنة الثالثة",
  "السنة الرابعة",
  "السنة الخامسة فأكثر",
] as const;

/* ══════════════════════════════════════════════════════════════════════
   المرحلة الأولى — مقابلاتٌ تبدأ اليوم، والسلّمُ يُبنى وهي شغّالة
   ══════════════════════════════════════════════════════════════════════ */

/**
 * الحدُّ الموصى به للمدعوّين إلى المقابلة **في كل جهة**.
 *
 * ⚠️ **عدّادٌ لا قفل.** الإدارة قالت حرفًا: «عشرة كحدّ أقصى، يمديك أقلّ،
 * وفي حالات استثناء يمديك أعلى». فمنعٌ صارمٌ يخالف القرار نفسَه — والرقمُ
 * يُعرض ويُلوَّن ويُمرَّر.
 *
 * ⚠️ **وعلى الجهة لا على القائد.** رئيسُ لجنةٍ نطاقُه ثلاثُ وحدات، وحدٌّ
 * واحدٌ له يعني أن تأخذ وحدةٌ اثنتي عشرة ولا يبقى للثالثة إلّا ثلاث.
 * ولكلِّ وحدةٍ مدخلُها. (العلاقات العامة وحدها ٤٦ رغبةً أولى موزّعةً على
 * ثلاث وحدات — مقيسٌ من القاعدة في ١٩ أغسطس ٢٠٢٦.)
 */
export const INTERVIEW_CAP = 15;

/* ما يضبطه القائدُ مباشرةً — والتعليلُ كاملًا في `content/statuses.ts` */
export { DIRECT_STATUSES } from "@/content/statuses";

/* الحالاتُ التي تقع فعلًا — بلا `referred` الميّتة. التعليل في المصدر. */
export const LIVE_STATUSES = APPLICATION_STATUSES.filter(
  (s) => s.value !== "referred",
).map((s) => ({ key: s.value, label: s.label, color: s.color }));

/**
 * هل تقع هذي الجهةُ في نطاق القائد؟
 *
 * ⚠️ **المطابقةُ ببادئةٍ بشرطةٍ مائلة — نسخةٌ حرفيّة من `choice_in_scopes`
 * في القاعدة.** بدون الشرطة يطابق نطاقُ `committee:pr` جهةَ
 * `committee:press`، فيرى قائدٌ طلباتِ لجنةٍ أخرى. والنسختان تتطابقان
 * عمدًا: هذي ترتّب العرض، وتلك تحرس البيانات — واختلافُهما يعني شاشةً
 * تعد بما لا تسمح به القاعدة.
 */
export function inScopes(
  choice: string,
  scopes: readonly string[],
): boolean {
  return scopes.some((s) => choice === s || choice.startsWith(`${s}/`));
}

/**
 * الجهةُ التي يُنظر فيه عندها الآن — **نسخةُ `case stage …` في السياسة**.
 *
 * وقيمةٌ خارج ١..٣ تُرجع فراغًا لا تنهار: القيدُ في القاعدة يمنعها، لكنّ
 * صفًّا قديمًا أو استيرادًا قد يحملها، وشاشةٌ تنهار على صفٍّ واحدٍ تحجب
 * المئتين الباقية.
 */
export function choiceAtStage(row: {
  stage: number;
  choice1: string;
  choice2: string;
  choice3: string;
}): string {
  if (row.stage === 1) return row.choice1;
  if (row.stage === 2) return row.choice2;
  if (row.stage === 3) return row.choice3;
  return "";
}

/** «رغبةٌ أولى» — لتسمية الرتبة في الشاشة */
export const STAGE_LABELS = ["", "رغبةٌ أولى", "رغبةٌ ثانية", "رغبةٌ ثالثة"];

/**
 * ملاحظةُ طاقمٍ على طلب — سجلٌّ يُضاف إليه لا حقلٌ يُكتب فوقه.
 *
 * ⚠️ **الكاتبُ يُختم في القاعدة** (`stamp_note_author`)، فما هنا يُقرأ ولا
 * يُرسَل: العميلُ يرسل `application_id` و`body` وحدهما.
 */
export type Note = {
  id: string;
  application_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

/* ══════════════════════════════════════════════════════════════════════
   قراءةُ السلّم — تشترك فيها اللوحةُ والمساراتُ والطلبات
   ══════════════════════════════════════════════════════════════════════ */

/** رغبةُ الصفّ عند رتبةٍ بعينها (١..٣) — وفراغٌ لما لا رتبةَ له */
export function choiceAtRank(row: Row, rank: number): string {
  if (rank === 1) return row.choice1;
  if (rank === 2) return row.choice2;
  if (rank === 3) return row.choice3;
  return "";
}

/**
 * **هل مرّ هذا المتقدّم بجهةٍ من نطاقي ثم نزل عنها؟**
 *
 * ⚠️ **وهو الرقمُ الذي يغيب عن القائد تمامًا بلا هذا الحساب.** بعد التمرير
 * يخرج الصفُّ من رتبته عنده، فلا يظهر في طابوره ولا في عدّاداته — فيبدو
 * كأنّ شغلَه لم يتقدّم. والحقيقةُ أنه حسم أمرَه: مرّره.
 *
 * والفحصُ على الرتب **السابقة** لرتبته الحالية: من هو الآن عند الثانية
 * وأولاه لجنتي ⇒ مررتُه أنا.
 */
export function passedThrough(
  row: Row,
  scopes: readonly string[],
): boolean {
  for (let rank = 1; rank < row.stage; rank++) {
    if (inScopes(choiceAtRank(row, rank), scopes)) return true;
  }
  return false;
}

/** حصيلةُ جهةٍ واحدة في الموسم — تُقرأ سطرًا واحدًا */
export type EntityProgress = {
  value: string;
  label: string;
  /** وصل ولم يُفتح */
  fresh: number;
  /** مدعوٌّ لمقابلة */
  invited: number;
  /** قُبل عندها */
  accepted: number;
  /** مرّ بها ونزل */
  movedOn: number;
  /** نزل إليها ولم تُفتح رتبتُه بعد */
  waiting: number;
  /** ما لم يُحسم بعد عند الرتبة المفتوحة = fresh + invited */
  pending: number;
  /** كلُّ من مرّ بها في الموسم */
  total: number;
};

/**
 * **أين وصل الموسم في كلّ جهة.**
 *
 * ⚠️ **سؤالُ الرئاسة الحقيقيّ ليس «كم طلبًا» بل «من واقف».** وقفلُ المرحلة
 * قرارٌ يُتّخذ على `pending`: صفرٌ في الكلّ يعني أن الفتحَ لا يسبق شغلًا
 * قائمًا. والعددُ الإجماليُّ لا يقوله — يقوله التوزيعُ على الجهات.
 *
 * ونطاقٌ فارغٌ مع `all` يعني الرئاسة: كلُّ جهةٍ في النادي.
 */
export function seasonProgress(
  rows: readonly Row[],
  scopes: readonly string[],
  all: boolean,
  phase: number,
  name: (value: string) => string,
): EntityProgress[] {
  const map = new Map<string, EntityProgress>();
  const at = (value: string): EntityProgress => {
    const found = map.get(value);
    if (found) return found;
    const made: EntityProgress = {
      value,
      label: name(value),
      fresh: 0,
      invited: 0,
      accepted: 0,
      movedOn: 0,
      waiting: 0,
      pending: 0,
      total: 0,
    };
    map.set(value, made);
    return made;
  };
  const mine = (value: string) =>
    Boolean(value) && (all || inScopes(value, scopes));

  for (const row of rows) {
    /* الجهةُ التي هو عندها الآن */
    const here = choiceAtStage(row);
    if (mine(here)) {
      const e = at(here);
      e.total += 1;
      if (row.stage > phase) e.waiting += 1;
      else if (row.status === "accepted") e.accepted += 1;
      else if (row.status === "reviewing") {
        e.invited += 1;
        e.pending += 1;
      } else if (row.status === "new") {
        e.fresh += 1;
        e.pending += 1;
      }
      /* `rejected` عند رتبته الأخيرة: حُسم ولا ينتظر — فلا يدخل `pending` */
    }

    /* والجهاتُ التي مرّ بها ونزل عنها */
    for (let rank = 1; rank < row.stage; rank++) {
      const past = choiceAtRank(row, rank);
      if (!mine(past) || past === here) continue;
      const e = at(past);
      e.movedOn += 1;
      e.total += 1;
    }
  }

  /* الأكثرُ انتظارًا أوّلًا — فما يُقرأ أوّلًا هو ما يعطّل المرحلة */
  return [...map.values()].sort(
    (a, b) => b.pending - a.pending || b.total - a.total,
  );
}

/* ══════════════════════════════════════════════════════════════════════
   موعد المقابلة — بتوقيت الرياض دائمًا
   ══════════════════════════════════════════════════════════════════════ */

/**
 * صيغةُ حقل `datetime-local` من طابعٍ مخزَّن — `2026-08-22T13:00`.
 *
 * ⚠️ **بتوقيت الرياض لا بتوقيت الجهاز.** لو قُرئ بالتوقيت المحلّيّ لرأى
 * قائدٌ مسافرٌ موعدًا يخالف ما ضبطه، ولاختلف ما يراه عمّا يراه زميلُه على
 * الطلب نفسِه. والنادي في الرياض، فالموعدُ رياضيٌّ لكلّ من قرأه.
 */
export function toRiyadhInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const at = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Riyadh",
  }).formatToParts(d);
  const get = (t: string) => at.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * العكس: ما كتبه القائدُ في الحقل ⇒ لحظةٌ مطلقة.
 *
 * ⚠️ **`+03:00` صراحةً لا اعتمادًا على الجهاز.** `new Date("...T13:00")`
 * تُفسَّر بتوقيت المتصفّح — فقائدٌ خارج المملكة يضبط الواحدة فتُخزَّن
 * لحظةً أخرى، ويقرؤها زميلُه في الرياض ساعةً غيرَها. والسعوديةُ بلا توقيتٍ
 * صيفيّ، فالإزاحةُ ثابتةٌ ولا تحتاج جدولًا.
 */
export function fromRiyadhInput(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(`${v}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * رابطُ واتساب للمتقدّم — **وفارغٌ لمن رقمُه لا يطابق الشكل السعوديّ**.
 *
 * ⚠️ لا يُبنى رابطٌ من رقمٍ مشكوكٍ فيه: زرٌّ يفتح محادثةً مع رقمٍ خطأ
 * أسوأُ من زرٍّ لا يظهر — الأوّل يُرسل رسالةَ نادٍ إلى غريب.
 */
export function whatsappHref(row: {
  phone: string;
  full_name: string;
}): string | null {
  const digits = (row.phone ?? "").replace(/\D/g, "");
  if (!/^05\d{8}$/.test(digits)) return null;
  const intl = `966${digits.slice(1)}`;
  const first = (row.full_name ?? "").trim().split(/\s+/)[0] || "";
  const text = `مرحبًا ${first}، معك نادي نظم المعلومات الإدارية بجامعة الملك سعود بخصوص طلب عضويتك.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/**
 * طولُ المقابلة المفترَض — **حارسُ تعارضٍ لا قاعدةُ جدولة**.
 *
 * ⚠️ **رقمٌ افتراضيٌّ يُقال سببُه.** لا عمودَ لمدّة المقابلة في القاعدة،
 * ولن يُضاف لأجل تنبيه. والثلاثون دقيقةً ما يستغرقه لقاءُ متقدّمٍ واحد
 * عمليًّا — فما تداخل داخلها **يُنبَّه عليه ولا يُمنع**: قد يقابله اثنان
 * من اللجنة معًا، وقد يقصد القائدُ التتابعَ الضيّق. والمنعُ هنا يفرض على
 * القائد جدولًا لا يعرفه من كتب الشيفرة.
 */
export const INTERVIEW_MINUTES = 30;

/**
 * مواعيدُ تتداخل مع موعد صفٍّ بعينه — **من الصفوف الواصلة وحدَها**.
 *
 * ⚠️ **ولا تُقاس على النادي كلِّه.** `RLS` تُوصل القائدَ صفوفَ نطاقه، فما
 * لا يراه لا يُقاس عليه — وهو الصواب: مقابلةٌ في لجنةٍ أخرى ليست تعارضًا
 * في وقت هذا القائد. والرئاسةُ ترى الكلَّ فتقيس على الكلّ، وذاك يكشف
 * تعارضًا من نوعٍ آخر: **متقدّمٌ واحدٌ مدعوٌّ في جهتين في الوقت نفسِه**.
 */
export function interviewClashes(
  rows: readonly Row[],
  row: Row,
): readonly Row[] {
  if (!row.interview_at) return [];
  const at = Date.parse(row.interview_at);
  if (Number.isNaN(at)) return [];
  const window = INTERVIEW_MINUTES * 60_000;
  return rows.filter((other) => {
    if (other.id === row.id || !other.interview_at) return false;
    /* من حُسم أمرُه لا يشغل وقتًا — موعدُه أثرٌ لم يُمسح */
    if (other.status === "accepted" || other.status === "rejected") return false;
    const t = Date.parse(other.interview_at);
    return !Number.isNaN(t) && Math.abs(t - at) < window;
  });
}

/** يومُ الموعد بتوقيت الرياض — مفتاحُ التجميع في لوح المقابلات */
export function interviewDayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dayKey(d);
}

/** «الأحد ٢٢ أغسطس» — عنوانُ اليوم بلا ساعة */
export function interviewDayLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DAY_FULL.format(d);
}

const DAY_FULL = new Intl.DateTimeFormat("ar", {
  weekday: "long",
  day: "numeric",
  month: "long",
  ...RIYADH,
});

/** «١:٠٠ م» — الساعةُ وحدَها، فاليومُ عنوانٌ فوقها */
export function interviewTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : TIME_FMT.format(d);
}

const TIME_FMT = new Intl.DateTimeFormat("ar", {
  hour: "numeric",
  minute: "2-digit",
  ...RIYADH,
});

/** «الأحد ٢٢ أغسطس، ١:٠٠ م» — للعرض */
export function interviewLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return INTERVIEW_FMT.format(d);
}

const INTERVIEW_FMT = new Intl.DateTimeFormat("ar", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  ...RIYADH,
});
