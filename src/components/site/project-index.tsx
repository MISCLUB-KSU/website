import Link from "next/link";

import { PROJECTS, projectHref } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";
import { MARK_BOXES } from "@/lib/mark-boxes";

/**
 * فهرس المشاريع — وخاناته هي مهبط أضلاع الشعار.
 *
 * الخانة `[data-mark-slot]` تحمل علامةً ثابتة (`[data-mark-static]`). حين
 * تعمل الطبقة المتشكّلة تُخفى الثابتة ويهبط الضلع الطائر في مكانها
 * بالضبط؛ وحين لا تعمل تبقى الثابتة وحدها.
 *
 * ⚠️ **الخانة طبقتان: غلافٌ ثابت العرض، ومهبطٌ بنسبة الضلع داخله.**
 *
 * ١) **المهبط الداخلي** (`[data-mark-slot]`) مقاسه من نسبة ضلعه هو. أضلاع
 *    الشعار الستّة (`MARK_BOXES`) لها ثلاث نسب عرضٍ إلى ارتفاع (≈1.49
 *    و0.80 و1.15). صندوقٌ واحد ثابت المقاس للجميع (كما كان: 30×38 لكل
 *    خانة) يجبر `mark-morph.tsx` على `scale(w/b.w, h/b.h)` بمعاملين
 *    مختلفين على المحورين، فيَسحق الضلعَ ويُحرِّف زاويته الحادة عن ٢٤° —
 *    قِيس فعليًّا: خمسٌ من الستّ هبطن بزوايا
 *    13.4°/13.4°/13.4°/24.1°/17.3°/17.3° (الرابعة وحدها نجت صدفةً، لأن
 *    نسبتها الحقيقية 0.799 قريبةٌ من نسبة الصندوق الثابت 30/38=0.789).
 *    فالمهبط يبقى بنسبة ضلعه، و`scale` واحدًا على المحورين، والزاوية سليمة.
 *
 * ٢) **الغلاف الخارجي** ثابت العرض (`SLOT_WIDTH`) لأن نِسَب الأضلاع الثلاث
 *    تعني ثلاثة عروضٍ للمهابط (56.73 و56.86 و30.38 و43.58). حين كان المهبط
 *    نفسه هو أول عناصر الصفّ، انزاح كل ما بعده بمقدار فرق العرض: أرقام
 *    ٠١–٠٦ هبطت على ثلاثة مواضع تتباعد 26.49px، وأسماء المشاريع 26.48px —
 *    رقيمةٌ مرقّمة بستّة صفوف تُقرأ مكسورة. الغلاف يوحّد ما يراه التخطيط،
 *    والمهبط يحتفظ بنسبته داخله، فيتصالح الأمران.
 *
 * ⚠️ **`data-mark-slot` تبقى على الصندوق الداخلي لا على الغلاف.** الطبقة
 * المتشكّلة تقيس ما تحمله هذي السمة وتُقيس الضلعَ عليه؛ لو انتقلت إلى
 * الغلاف الثابت لعاد السحق والانحراف عن ٢٤° من الباب الآخر.
 *
 * ⚠️ العلامة ليست حاملة معنى — ترتيب المشروع في الرقيمة، واسمه في النصّ.
 * فهي `aria-hidden` ولا يُنقل بها معنى.
 */

/** ارتفاعٌ ثابت لكل خانة؛ عرض المهبط يُشتقّ من نسبة ضلعه فيبقى القصّ ٢٤°
    بالضبط مهما اختلفت الأبعاد — انظر تعليق `runPct` أسفل. */
const SLOT_HEIGHT = 38;

/** عرض الغلاف = أعرضُ مهبطٍ عند هذا الارتفاع (اليوم 56.86 ← 57)، مشتقٌّ من
    الهندسة نفسها لا رقمًا مكتوبًا بيد: لو تغيّرت أضلاع الشعار يومًا تبع
    العرضُ أوسعَها تلقائيًا ولم تعُد الرقيمة مهلهلة بصمت. */
const SLOT_WIDTH = Math.ceil(
  Math.max(...MARK_BOXES.map((box) => (SLOT_HEIGHT * box.w) / box.h)),
);

/** tan(24°) — نظير `--rake-tan` في `globals.css`، مكرَّرٌ هنا لأنه ثابت JS
    محسوبٌ وقت البناء لا خاصية CSS حيّة (نفس مبرِّر `VIEWBOX_W` في
    `mark-morph.tsx`). */
const RAKE_TAN = 0.4452;

export function ProjectIndex() {
  return (
    /* `above-mark` تلزم هنا: بدونها تُرسم القطعُ الطائرة فوق أسماء المشاريع
       وأوصافها فتحجبها — رُصد فعليًّا في النموذج قبل ضبط الطبقات. */
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="above-mark w-full py-s8"
    >
      <h2
        id="projects-heading"
        className="px-s4 font-display text-sm font-semibold tracking-[0.12em] text-fg-muted sm:px-s7"
      >
        ما نعمل عليه
      </h2>

      <ul className="mt-s6 px-s4 sm:px-s7">
        {PROJECTS.map((project, index) => {
          /* تراجعٌ آمن لو زاد عدد المشاريع عن ستّة يومًا: آخر صندوقٍ معروف
             بدل الانهيار على `undefined`. مرحلة الهبوط نفسها تُعطَّل عندئذٍ
             من `mark-morph.tsx` (قاعدة العدد، §٨ في المواصفة) — هذا فقط
             يمنع كسر الشكل الساكن قبل ذلك. */
          const box = MARK_BOXES[index] ?? MARK_BOXES[MARK_BOXES.length - 1];

          /* إزاحة القصّ الأفقية كنسبةٍ من عرض الخانة = (الارتفاع ÷ العرض) ×
             tan(24°) — من **الارتفاع** لا العرض. الصيغة القديمة ضربت
             العرض مباشرةً في 0.4452 (صحيحةٌ فقط لو كانت الخانة مربّعة)،
             فأنتجت 19.36° لا 24° على صندوقٍ 30×38. الصيغة هنا صحيحةٌ لأي
             نسبة عرضٍ إلى ارتفاع تلقائيًا — بلا رقمٍ سحريٍّ جديد. */
          const runPct = Number(
            (((box.h / box.w) * RAKE_TAN * 100).toFixed(3)),
          );

          return (
            <li key={project.slug}>
              <Link
                href={projectHref(project)}
                className="-mx-s3 flex min-h-14 items-center gap-s4 px-s3 py-s3 hover:bg-bg-sunken"
              >
                {/* `flex` بلا `justify-*`: البداية في RTL هي اليمين، فيلتصق
                    المهبط بحافّة الصفّ القائدة كما كان قبل الغلاف تمامًا. */}
                <span
                  aria-hidden
                  className="flex shrink-0"
                  style={{ width: SLOT_WIDTH, height: SLOT_HEIGHT }}
                >
                  <span
                    data-mark-slot={index}
                    className="relative block"
                    style={{
                      height: SLOT_HEIGHT,
                      aspectRatio: `${box.w} / ${box.h}`,
                    }}
                  >
                    <span
                      data-mark-static=""
                      className="absolute inset-0 bg-surface-floor"
                      style={{
                        clipPath: `polygon(${runPct}% 0, 100% 0, ${100 - runPct}% 100%, 0 100%)`,
                      }}
                    />
                  </span>
                </span>
                <span className="w-[2ch] shrink-0 font-display text-sm font-medium text-fg-muted">
                  {`0${index + 1}`}
                </span>
                <span className="shrink-0 font-display text-xl font-bold text-surface-floor sm:text-2xl">
                  {isolateLatin(project.name)}
                </span>
                {project.tagline ? (
                  <span className="text-sm text-fg-muted">{project.tagline}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
