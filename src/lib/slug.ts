/**
 * توليد روابط (slugs) عربية صحيحة.
 *
 * المشكلة في الموقع القديم: الدالة كانت تحذف الحروف العربية وتترك الفواصل،
 * فصارت كل روابط المقالات شرطات فقط (/blog/---).
 *
 * الحل: نحتفظ بالحروف العربية كما هي. جوجل يدعم الروابط العربية بالكامل،
 * وهي أفضل لأرشفة المحتوى العربي من النقحرة (transliteration).
 */

/** التشكيل والتطويل — تُحذف لأنها لا تُكتب في الروابط عادة */
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** ما نسمح به: عربي + لاتيني + أرقام (عربية وهندية) */
const ALLOWED = /[^ء-يٮ-ەa-zA-Z0-9٠-٩\s-]/g;

/** توحيد أشكال الألف والهمزة والتاء المربوطة والألف المقصورة */
const NORMALIZE: ReadonlyArray<readonly [RegExp, string]> = [
  [/[إأآٱ]/g, "ا"],
  [/ى/g, "ي"],
  [/ة/g, "ه"],
  [/[ؤئ]/g, "ء"],
];

/** كلمات وصل عربية تُحذف لتقصير الرابط دون فقد المعنى */
const STOP_WORDS = new Set([
  "في", "من", "على", "الى", "عن", "مع", "هذا", "هذه", "ذلك",
  "التي", "الذي", "او", "ثم", "قد", "لكن", "كل", "بين",
]);

export function slugify(input: string, { maxWords = 8 } = {}): string {
  if (!input) return "";

  let text = input.normalize("NFKC").replace(ARABIC_DIACRITICS, "");
  for (const [pattern, replacement] of NORMALIZE) {
    text = text.replace(pattern, replacement);
  }

  const words = text
    .replace(ALLOWED, " ")
    .split(/[\s-]+/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word));

  return words.slice(0, maxWords).join("-");
}

/**
 * يضمن ألا يتصادم رابطان. الموقع القديم كان يولّد الرابط من عدد الكلمات فقط،
 * فأي مقالين بنفس عدد الكلمات يأخذان نفس الرابط ويطيح الثاني على الأول.
 */
export function uniqueSlug(title: string, taken: Iterable<string>): string {
  const base = slugify(title) || "مقال";
  const used = new Set(taken);

  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
