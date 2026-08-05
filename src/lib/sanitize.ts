/**
 * منقّي HTML بقائمة سماح صارمة.
 *
 * محتوى المقالات مستورد من نسخة الموقع السابق، ويُعرض عبر
 * `dangerouslySetInnerHTML` — وهذا مسار حقن معروف. لذلك لا يُعرض حرف منه
 * قبل المرور من هنا.
 *
 * لماذا منقٍّ مكتوب بدل مكتبة: المحتوى مفحوص ويستعمل سبعة وسوم لا غير،
 * والقائمة هنا **قائمة سماح** لا منع — أي وسم أو خاصية جديدة تسقط تلقائيًا
 * بدل أن تمرّ. إضافة اعتماد كامل لخمس مقالات مبالغة.
 *
 * التنقية تجري وقت البناء (الصفحات كلها ثابتة)، فلا كلفة على الزائر.
 */

/** الوسوم المسموحة — ولا خاصية واحدة تمرّ معها. */
const ALLOWED = new Set(["p", "br", "hr", "em", "strong", "h2", "h3"]);

/**
 * الوسوم التي تُرفع رتبتها: العنوان الرئيسي للصفحة هو `h1`، فأي `h1`
 * داخل المتن يكسر ترتيب العناوين على قارئ الشاشة.
 */
const DEMOTE: Record<string, string> = { h1: "h2" };

export function sanitizeHtml(html: string): string {
  return (
    html
      // 1) يسقط أي عنصر ذاتي الإغلاق أو مزدوج ليس في قائمة السماح، بمحتواه
      //    إن كان خطرًا (script/style)، أو بوسمه فقط إن كان حاويًا.
      .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      // 2) تعليقات HTML — قد تخفي محتوى شرطيًا
      .replace(/<!--[\s\S]*?-->/g, "")
      // 3) كل وسم متبقٍّ: يُعاد بناؤه بلا خصائص، أو يُحذف إن لم يكن مسموحًا
      .replace(/<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (_all, slash, rawTag) => {
        const tag = String(rawTag).toLowerCase();
        const mapped = DEMOTE[tag] ?? tag;
        return ALLOWED.has(mapped) ? `<${slash}${mapped}>` : "";
      })
      .trim()
  );
}

/** نص خام من HTML — للمقتطفات ووصف الصفحة. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
