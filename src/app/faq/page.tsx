import type { Metadata } from "next";
import Link from "next/link";

import { FaqCard, FaqHeading } from "@/components/site/faq-ui";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { FAQ, FAQ_CATEGORIES, faqByCategory } from "@/content/faq";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "أجوبة عن أكثر ما يُسأل عن عضوية نادي نظم المعلومات الإدارية بجامعة الملك سعود: من يقدر ينضم، متى يفتح التقديم، وكيف تُختار الرغبات.",
  alternates: { canonical: "/faq" },
};

/** ثلاث بطاقاتٍ في الأعلى — أكثر ما يُسأل عنه قبل التقديم. */
const QUICK_COUNT = 3;

/**
 * الأسئلة الشائعة.
 *
 * ── الترتيب ────────────────────────────────────────────────────────────
 *
 * واجهةٌ فاتحة ← «إجابات سريعة» ← الأسئلة مجموعةً بفئتين ← «لا تزال لديك
 * أسئلة؟». ترتيبٌ منقولٌ عن مرجعٍ اختارته الإدارة (نادي رؤية 2030)، واللغة
 * البصرية كلّها موصوفةٌ في رأس `components/site/faq-ui.tsx`.
 *
 * ⚠️ **لا `PageHeader` هنا.** بقيّة الصفحات الداخلية تفتح بالحقل المائل
 * الداكن، وهذي تفتح بعنوانٍ موسّطٍ ملوّن على أرضيةٍ فاتحة — **قطيعةٌ
 * مقصودة** بطلبٍ صريح: «لا تمشي على الهوية أبدًا» (الإدارة، ٧ أغسطس ٢٠٢٦).
 * فلا تُعاد `PageHeader` إليها ظنًّا أنها سقطت سهوًا.
 *
 * ⚠️ **الأجوبة ظاهرةٌ كلّها، لا `<details>` مطويّة.** `faq-list.tsx` القديم
 * يطويها؛ والمطويّ لا يلتقطه `Ctrl+F` ولا تقرؤه مسحةُ عينٍ واحدة. وكل
 * سؤالٍ مرساةٌ قائمة بذاتها (`#q1`…) فيصلح مشاركة رابط الجواب وحده —
 * وأرقام المراسي محفوظةٌ بترتيب `FAQ` الأصلي لا بترتيب العرض، فلا ينكسر
 * رابطٌ شورك سابقًا حين تتغيّر الفئات.
 */
export default function FaqPage() {
  const quick = FAQ.slice(0, QUICK_COUNT);

  /** رقم المرساة من موضع السؤال في `FAQ` الأصلية — لا من موضعه في فئته. */
  const anchorOf = (question: string) =>
    `q${FAQ.findIndex((item) => item.question === question) + 1}`;

  return (
    <>
      <SiteHeader />

      <main>
        {/* الواجهة — موسّطةٌ فاتحة، لا حقلًا مائلًا داكنًا */}
        <section className="w-full px-s4 py-s9 sm:px-s7">
          <FaqHeading as="h1" id="faq-title">
            الأسئلة الشائعة
          </FaqHeading>
          <p className="mx-auto mt-s5 max-w-measure text-center text-base leading-relaxed text-fg-muted sm:text-lg">
            ما يُسأل عنه أكثر من غيره — بجواب مباشر، لا بإحالة إلى جهة أخرى.
          </p>
        </section>

        {/* إجابات سريعة — على لوحٍ فاتح يفصلها عمّا بعدها */}
        <section
          aria-labelledby="faq-quick-heading"
          className="w-full bg-bg-sunken py-s9"
        >
          <div className="mx-auto w-full max-w-6xl px-s4 sm:px-s7">
            <FaqHeading id="faq-quick-heading">إجابات سريعة</FaqHeading>
            <ul className="mt-s7 grid gap-s5 md:grid-cols-3 md:grid-rows-[auto_1fr]">
              {quick.map((item) => (
                <FaqCard
                  key={item.question}
                  item={item}
                  className="md:row-span-2 md:grid-rows-subgrid"
                />
              ))}
            </ul>
          </div>
        </section>

        {/* الأسئلة كلّها مجموعةً بفئاتها */}
        <div className="mx-auto w-full max-w-6xl px-s4 py-s9 sm:px-s7">
          {FAQ_CATEGORIES.map((category, index) => {
            const items = faqByCategory(category);
            if (items.length === 0) return null;

            return (
              <section
                key={category}
                aria-labelledby={`cat-${index}`}
                className={index > 0 ? "mt-s9" : undefined}
              >
                <FaqHeading id={`cat-${index}`}>{category}</FaqHeading>
                {/* العدّاد تحت العنوان كما في المرجع — يُقرأ حجم الفئة قبل
                    قراءتها. `أسئلة` جمع قلّة يصحّ من ٣ إلى ١٠. */}
                <p className="mt-s3 text-center text-sm font-medium text-fg-muted">
                  {items.length} أسئلة
                </p>

                {/* عمودان على الشاشة العريضة — والصفّان يرثان الشبكة نفسها
                    فتتحاذى الأجوبة زوجًا بزوج. */}
                <ul className="mt-s6 grid gap-s5 md:grid-cols-2 md:grid-rows-[auto_1fr]">
                  {items.map((item) => (
                    <FaqCard
                      key={item.question}
                      item={item}
                      id={anchorOf(item.question)}
                      full
                      className="md:row-span-2 md:grid-rows-subgrid"
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* الذيل — «لا تزال لديك أسئلة؟» على لوحٍ فاتح كذيل المرجع */}
        <section className="w-full bg-bg-sunken px-s4 py-s9 text-center sm:px-s7">
          <p className="font-display text-2xl font-bold text-fg sm:text-3xl">
            لا تزال لديك أسئلة؟
          </p>
          <p className="mx-auto mt-s4 max-w-measure text-base leading-relaxed text-fg-muted">
            سؤالك ليس هنا؟ اكتب لنا — ونضيف الجواب إلى هذي الصفحة إن تكرّر
            السؤال. ولا يُكتب جوابٌ مُقدَّر: ما لا نعرفه نسأل عنه أولًا.
          </p>
          <Link
            href="/contact"
            className="mt-s6 inline-flex min-h-11 items-center rounded-full bg-accent px-s6 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
          >
            تواصل معنا
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
