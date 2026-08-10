import Image from "next/image";

import { Alumni } from "@/components/site/alumni";
import { FaqQuick } from "@/components/site/faq-quick";
import { Hero } from "@/components/site/hero";
import { MarkMorph } from "@/components/site/mark-morph";
import {
  PillarMark,
  type PillarMarkShape,
} from "@/components/site/pillar-mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  ABOUT_INTRO,
  ALL_PARTNERS,
  FOUNDED_YEAR,
  PILLARS,
} from "@/content/about";
import { FAQ } from "@/content/faq";
import { isolateLatin } from "@/lib/bidi";
import { OPEN_PROJECTS } from "@/content/projects";
import { Drift, InkWords, PillarDeck } from "@/components/site/mobile-motion";

/* شطرُ الشركاء صفّين: نصفٌ لكلٍّ فلا يتكرّر شعارٌ بين الصفّين. الشطر عند
   المنتصف بالأعلى (`ceil`) فيأخذ الصفّ الأوّل الزائدَ حين يكون العدد فرديًّا. */
const PARTNER_HALF = Math.ceil(ALL_PARTNERS.length / 2);
const PARTNER_ROWS = [
  ALL_PARTNERS.slice(0, PARTNER_HALF),
  ALL_PARTNERS.slice(PARTNER_HALF),
] as const;

/**
 * الصفحة الرئيسية — تُبنى قسمًا قسمًا.
 *
 * أُفرغت الأقسام التسعة القديمة بطلبٍ مباشر ليُعاد بناء كلٍّ منها وحده
 * بتصميمه. المحتوى محفوظٌ في `src/content/*.ts` ويخدم صفحاته الخاصة،
 * وكودُ الأقسام القديمة في `094d2b5:src/app/page.tsx` للرجوع.
 *
 * القسم الأول المبنيّ: **من نحن**. مصدر نصّه `ABOUT_INTRO`.
 */

export default function HomePage() {
  const isOpen = OPEN_PROJECTS.length > 0;

  return (
    <>
      <MarkMorph />
      <SiteHeader />

      <main id="main">
        <Hero isOpen={isOpen} />

        {/* ⚠️ قسم «ما نعمل عليه» (`ProjectIndex`) حُذف بطلب حسام.
            وهذا يُلغي **المحطّة الوسطى** في تشكّل العلامة: كانت
            الواجهة ← ستّ خانات ← التذييل، فصارت الواجهة ← التذييل.
            لا يلزم تعديل `MarkMorph`: `rowsUsable = slots.length === 6`
            تُعطّل المرحلة كلّها عند أي عددٍ آخر — والصفر منها — فتنتقل
            العلامة مباشرةً. والطبقة لا تختفي إلا بغياب مرساتَي الواجهة
            والتذييل، وهما باقيتان. `project-index.tsx` صار بلا مستورد. */}

        {/* ══════════════════════════════════════════════════════════════
            من نحن

            البادج مائلٌ بزاوية الشعار (`.rake`) لا حلقةٌ دائرية: نظام v2
            كلّه مبنيّ على القطع المائل، فحلقةٌ دائرية تُقرأ عنصرًا دخيلًا.
            والتوقيع البصري (الحقل المائل) غائبٌ هنا عمدًا — محجوزٌ للواجهة
            والترويسات والتذييل، فلا يتحوّل جدارًا. الجوّ يأتي من الضوء
            الراكِع خلف `main`، والإيقاع من تباين المقاس: بيانٌ افتتاحيّ
            كبير بخط العرض، ثم فقرةٌ أهدأ بخط المتن.
            ═══════════════════════════════════════════════════════════════ */}
        <section
          id="about"
          aria-labelledby="about-heading"
          /* ⚠️ `above-mark` تلزم: بدونها تُرسم الأضلاع الطائرة **فوق** نصّ
             القسم، وهي علّةُ بوّابة الإطفاء التي كانت تُخفي العلامة في أكثر
             من ثلث الصفحة. الأقسام كلها فوق الطبقة الآن، فبقيت مرئيّةً
             طوال الرحلة والنصّ فوقها. */
          className="above-mark mx-auto w-full max-w-4xl px-s4 py-s8 sm:px-s7"
        >
          <h2
            id="about-heading"
            className="rake rake-sm inline-flex items-center bg-accent px-s6 py-s3 font-display text-2xl font-bold text-accent-fg sm:text-3xl"
          >
            من نحن؟
          </h2>

          {/* البيان الافتتاحي — الجملة الأبرز، بخط العرض ومقاسٍ كبير */}
          {/* ⚠️ B1: كان `sm:text-[2rem]` (32px) وهو خارج سلّم Tailwind —
              أُسقط إلى أقرب درجةٍ **دونه** `text-3xl` (30px) كما تنصّ القاعدة.
              و`leading-relaxed` باقيةٌ عمدًا: ارتفاعات الأسطر في السلّم
              معايَرةٌ للحرف اللاتيني، والعربيّة بنقاطها وتشكيلها تحتاج فسحةً
              أوسع — وقاعدة المهارة نفسها تقدّم قرار المستخدم على القاعدة.
              و`text-pretty` تمنع كلمةً يتيمةً في آخر الفقرة (B1). */}
          {/* ⚠️ على الجوّال تتحبّر الجملة كلمةً كلمة مع التمرير — القاعدة
              مرسومةٌ دائمًا بلون النصّ الهادئ (6.76:1) فلا محتوى ينتظر
              حركة، والحبر طبقةُ تظليلٍ فوقها. على الحاسب ومع تقليل
              الحركة: حبرٌ كاملٌ ثابت — المظهر السابق بالضبط. */}
          <InkWords
            text={ABOUT_INTRO.lede}
            className="mt-s7 max-w-3xl text-pretty font-display text-2xl font-medium leading-relaxed text-fg sm:text-3xl"
          />

          {/* الفقرة التعريفية — بخط المتن، بعرضٍ مقروء لا يتجاوز المقاس.
              ⚠️ `isolateLatin` لازمة: النصّ يحوي رقم التأسيس "2013" وسط
              جملة عربية — بلا عزل ينعكس ترتيب المقطع ويتحوّل الرقم لاتحاد
              هندي الشكل، نفس علّة "(MIS)" في فقرة ركيزة «الهدف» أدناه. */}
          <p className="mt-s6 max-w-measure text-lg leading-loose text-fg-muted">
            {isolateLatin(ABOUT_INTRO.body[0])}
          </p>

          {/* علامة سنة التأسيس — تفصيلٌ واقعيّ هادئ، بضربة ميلانٍ واحدة.
              الرقم لاتينيّ بطلبٍ مباشر، ويُقرأ من `FOUNDED_YEAR` مباشرةً بلا
              تحويل — ونصّ الفقرة أعلاه وُحِّد معه فلا تختلف السنة بين
              موضعين في القسم نفسه. ⚠️ مُمرَّرٌ عبر `isolateLatin` بعد
              دمجه في جملة واحدة — نفس سبب الفقرة أعلاه. */}
          <p className="mt-s6 inline-flex items-center gap-s3 text-sm font-semibold tracking-wide text-accent">
            {/* مرسى الضلع 3 — أنحف الأضلاع (نسبة 0.7994). الغلاف مستقيمٌ
                يحمل صندوق الهبوط، والميلان ينتقل للعنصر الداخليّ فلا يُحسب
                على القياس. العرض 12.8px = 16 × 0.7994. */}
            <span
              aria-hidden
              data-mark-dock="3"
              data-mark-static=""
              className="inline-block h-4 w-[12.8px] shrink-0"
            >
              <span className="mis-slant block h-full w-full bg-accent" />
            </span>
            {isolateLatin(`منذ عام ${FOUNDED_YEAR}`)}
          </p>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            الركائز — الهدف · الرسالة · الرؤية

            أُعيد بناء العرض: النسخة الأولى قلّدت المرجع فجاءت باهتة، لأن
            تركيب المرجع نفسه ثلاثُ علاماتِ سلوبٍ مكتوبة في قانون التصميم —
            «ثلاث بطاقات متساوية كلٌّ فيها أيقونة داخل مربّع ملوّن» نمطٌ
            جاهز، و«أيقونة داخل صندوق» ممنوعة نصًّا («جرّد العلامة: ضعها على
            السطح عاريةً»)، والزوايا المدوّرة تخالف هوية الميلان.

            الإبهار هنا من **المقاس والهوية** لا من الحركة — الحركة الواسعة
            رُفضت من قبل («مره اوفر»). أربع روافع:


            ١) الحافّة **مائلة ٢٤°** (`.rake`) لا مدوّرة: صيغة الحافّة
               الوحيدة في نظام v2، فالبطاقة تُقرأ من عائلة الشعار.
            ٢) **رقمٌ ضخم** (72px) يمينًا و**علامةٌ صغيرة** (40px) يسارًا.
               جُرّبت نسخةٌ تعكس الوزن — علامةٌ بـ80px ورقيمةٌ صغيرة — على
               حجّة أن البطولة تُعطى للمميِّز لا للعامّ، فرُفضت بطلبٍ مباشر
               وأُعيد هذا التوزيع. لا يُقلب بلا طلب.
            ٣) العلامة **عاريةٌ بلا صندوق** — «جرّد العلامة: ضعها على السطح
               عاريةً» — بلونٍ نبريّ لا مشبع.
            ٤) التفاعل **من الشكل نفسه**: يتعمّق القطع عند المرور
               (`rake-interactive`) — لا ارتفاع ولا ظلّ ولا توهّج.

            وللقسم رأسٌ **مرئيّ** الآن: كان `sr-only` فتطفو البطاقات بلا
            مرساة بعد «من نحن». وهو هادئ عمدًا (رقيمة + ضربة ميلان) لا
            بادجٌ ثانٍ يزاحم بادج «من نحن» الكبير.

            محاذاة: `items-stretch` + `h-full`، والفقرة `flex-1` فترتفع
            البطاقات لأطولها ويجلس كلُّ جزءٍ على سطرٍ مشترك.
            ═══════════════════════════════════════════════════════════════ */}
        <section
          id="pillars"
          aria-labelledby="pillars-heading"
          className="above-mark mx-auto w-full max-w-6xl px-s4 pb-s8 sm:px-s7"
        >
          {/* ⚠️ **في وسط الشاشة والعلامة ملازمة.** كان الرأس على الحافّة
              فيُقرأ حاشيةً؛ وطلب حسام توسيطه وإبرازه. والعلامة داخل نفس
              صفّ `flex` فتتوسّط معه — وهي **مرسى الضلع الرابع** في رحلة
              الشعار، فموضعها يُقرأ وقت التشغيل لا يُثبَّت. */}
          <div className="mb-s7 flex items-center justify-center gap-s3">
            {/* مرسى الضلع 4 — نسبة 1.1469، توأم الضلع 5 في رأس «شركاء النجاح»
                فيقرأ الرأسان عائلةً واحدة. الغلاف مستقيمٌ، والميلان في
                الداخل. العرض 22.9px = 20 × 1.1469 — كبرت مع النصّ لتبقى
                النسبة نفسها. */}
            <span
              aria-hidden
              data-mark-dock="4"
              data-mark-static=""
              className="inline-block h-5 w-[22.9px] shrink-0"
            >
              <span className="mis-slant block h-full w-full bg-accent" />
            </span>
            <h2
              id="pillars-heading"
              className="font-display text-fg text-lg font-bold tracking-[0.14em] sm:text-xl"
            >
              ما نقوم عليه
            </h2>
          </div>

          {/* ⚠️ **رزمةٌ على الجوّال، شبكةٌ على الحاسب.** تحت 1024px تلتصق
              كلُّ بطاقةٍ قرب أعلى الشاشة وتنزلق التالية فوقها، والمغادرةُ
              تتقلّص وتميل للخلف (`rotateX` بمنظور 1200px) فتُقرأ الثلاث
              رزمةً لها عمق. المحتوى نفسه مُصيَّرٌ على الخادم ويُمرَّر
              للغلاف كما هو — بلا جافاسكربت: بطاقاتٌ ملتصقةٌ بلا تقلّص،
              وكلُّ شيءٍ مقروء. ومراسي `MarkMorph` آمنة: `place()` تعيد
              قياسها كلَّ تمريرة فتتبع بطاقاتِها أينما التصقت. */}
          <PillarDeck
            className="grid items-stretch gap-s5 max-lg:gap-s7 md:grid-cols-3"
            itemClassName="rake rake-interactive flex h-full flex-col bg-bg-raised p-s6 shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-bg-sunken"
            items={PILLARS.map((pillar, index) => (
              <div key={pillar.key} className="flex h-full flex-col">
                {/* رأس البطاقة: الرقم الضخم يمينًا والعلامة صغيرةً يسارًا.
                    الأرقام لاتينية بطلبٍ مباشر. سلسلة الأرقام وحدها تنساب
                    صحيحةً في سياق RTL بلا عزل: الأرقام محايدة الاتجاه
                    ضعيفًا، فتُرسم يسارًا-يمينًا داخل السطر العربي. والعزل
                    هنا يترك فجوةً قبلها بلا فائدة. */}
                <div className="flex items-start justify-between gap-s4">
                  <span
                    aria-hidden
                    /* ⚠️ `/50` لا `/25`: كان الرقم عند **1.54:1** نهارًا
                       و**1.62:1** ليلًا — لطخةٌ لا رقم، وزخرفةٌ لا تُرى ليست
                       زخرفة. و`/50` يرفعه إلى 2.52 و2.73، فيُقرأ ويبقى دون
                       عتبة الرسوم الدالّة (3:1) — أي تابعًا للعنوان
                       (16.87:1) لا منافسًا له. وهو `aria-hidden` فلا تُطبَّق
                       عليه عتبةُ النصّ أصلًا. */
                    className="font-display text-6xl font-bold leading-none text-accent/50 sm:text-7xl"
                  >
                    {`0${index + 1}`}
                  </span>
                  <PillarMark
                    shape={pillar.mark as PillarMarkShape}
                    className="mt-s2 h-10 w-10 shrink-0 text-accent"
                  />
                </div>

                <h3 className="mt-s5 font-display text-2xl font-bold text-fg sm:text-3xl">
                  {pillar.label}
                </h3>

                {/* مرسى الأضلاع 0 · 1 · 2 — نِسَبها متطابقة عمليًّا فتبقى
                    البطاقات الثلاث متطابقة. الغلاف مستقيمٌ يحمل صندوق
                    الهبوط، والميلان في العنصر الداخليّ. الارتفاع 26.8px =
                    40 ÷ 1.4932؛ العرض 40px محفوظ فلا يتزحزح شيءٌ أفقيًّا.

                    ⚠️ `data-mark-handoff` تخصّ هذي المراسي الثلاثة وحدها،
                    وهي التي تُكمل حركةَ الضلع داخل البطاقة (هبوطٌ وضمور
                    يقودهما `tDock` في `mark-morph.tsx`):
                    هي الوحيدة التي تقع داخل بطاقةٍ **معتمة** (`li`) مرفوعةٍ
                    فوق طبقة العلامة — القسم يحمل `.above-mark` (`z-index: 2`)
                    والطبقة عند `z-[1]`. فالضلع يصل مرساه بإحداثيّاته الصحيحة
                    ثم يُرسم خلف البطاقة، وتبقى فجوةٌ 40×26.8 فاضية.
                    المراسي 3 · 4 · 5 لا تحتاجها: أقرب معتمٍ فوقها هو `main`
                    وهو **تحت** الطبقة، فالضلع يُرى فيها كما صُمّم — ووضعُ
                    السمة عليها يُظهر العلامتين معًا. */}
                <span
                  aria-hidden
                  data-mark-dock={String(index)}
                  data-mark-static=""
                  data-mark-handoff=""
                  className="mt-s4 inline-block h-[26.8px] w-10 shrink-0"
                >
                  <span className="mis-slant block h-full w-full bg-accent" />
                </span>

                {/* ⚠️ `isolateLatin` لازمة: ركيزة «الهدف» تحوي "(MIS)" وسط
                    جملة عربية — كانت تُرسَم خامًا فتنعكس بصريًّا. الركيزتان
                    الأخريان («الرسالة»/«الرؤية») لا تحويان أي مقطع لاتيني
                    أو رقمي، فالعزل هنا بلا أثر ظاهر عليهما — لا ضرر منه. */}
                <p className="mt-s4 flex-1 leading-loose text-fg-muted">
                  {isolateLatin(pillar.body)}
                </p>
              </div>
            ))}
          />
        </section>

        {/* ══════════════════════════════════════════════════════════════
            الشراكات — شريطٌ منساب

            ٢٣ جهة، أُزيل تكرارها عبر المواسم (علم أربع مرّات · عزم وEY
            ووادي الرياض مرّتين). و«مزن» في `PARTNERS` هي «Mozn» هنا:
            الجهة نفسها بهجاءين.

            ⚠️ **لا شعارات بعد.** لا يوجد في المستودع ملفُّ شعارٍ واحد،
            ولا يُرسم شعارٌ بالتقدير: علامةٌ تجارية مُعاد رسمها بالعين
            تُشحن ثم يصعب سحبها — قاعدةُ `Partner` و`project-mark.tsx`
            نفسها. فيُعرض الاسم مكتوبًا، وهو أصدق من شعارٍ مزوّر.
            حين تصل الملفات: ضعها في `public/partners/` واملأ `logo`،
            وتبدّل هذي الواجهة من النصّ إلى الصورة وحدها.

            الطقم مكرّرٌ مرّتين: الأول يُقرأ، والثاني `aria-hidden` لأنه
            نسخةٌ بصرية تُكمل الالتفاف — فلا ينطق القارئُ الأسماء مرّتين.

            الاتجاه `ltr` على الشريط عمدًا: حساب الإزاحة يصير قاطعًا،
            والأسماء العربية تُحلّ اتجاهها وحدها لأنها حروفٌ قويّة الاتجاه.
            واللاتينية تُعزل بـ `isolateLatin` فلا ينقلب ترتيبها.
            ═══════════════════════════════════════════════════════════════ */}
        <section
          id="partners"
          aria-labelledby="partners-heading"
          className="above-mark w-full py-s8"
        >
          <div className="mx-auto mb-s7 w-full max-w-6xl px-s4 sm:px-s7">
            {/* توسيطٌ كتوأمه «ما نقوم عليه» — الرأسان عائلةٌ واحدة */}
            <div className="flex items-center justify-center gap-s3">
              {/* مرسى الضلع 5 — نسبة 1.1469، توأم الضلع 4 في رأس «ما نقوم
                  عليه». الغلاف مستقيمٌ، والميلان في الداخل. العرض 18.4px =
                  16 × 1.1469. */}
              <span
                aria-hidden
                data-mark-dock="5"
                data-mark-static=""
                className="inline-block h-5 w-[22.9px] shrink-0"
              >
                <span className="mis-slant block h-full w-full bg-accent" />
              </span>
              <h2
                id="partners-heading"
                className="font-display text-fg text-lg font-bold tracking-[0.14em] sm:text-xl"
              >
                شركاء النجاح
              </h2>
            </div>
          </div>

          {/* صفّان متعاكسان على لوحٍ أفتح من الأرضية. القائمة تُشطر نصفين
              فلا يتكرّر شعارٌ بين الصفّين، وكلُّ صفٍّ يُستنسخ مرّةً ليدور بلا
              فجوة. الصفّ الثاني يحمل `data-reverse` فيجري عكسه. */}
          <div className="partners-panel flex w-full flex-col gap-s5 py-s6">
            {[0, 1].map((row) => (
              <div key={row} className="partners-viewport w-full" dir="ltr">
                {/* ⚠️ غلاف الانجراف بين النافذة والسكّة — لا على السكّة:
                    السكّة يحرّكها `keyframes` بـ`transform`، وتحويل Motion
                    على العنصر ذاته يمحوه فيتجمّد الدوران. الغلاف يركّب
                    التحويلين، والصفّان يتعاكسان فيستجيب القسم للتمرير. */}
                <Drift x={row === 0 ? [-24, 24] : [24, -24]}>
                  <div
                    className="partners-rail"
                    data-reverse={row === 1 ? "" : undefined}
                  >
                    {[false, true].map((isClone) => (
                      <ul
                        key={String(isClone)}
                        data-clone={isClone ? "" : undefined}
                        aria-hidden={isClone || undefined}
                        className="flex w-max shrink-0 items-center gap-s6 px-s3 sm:gap-s7"
                      >
                        {PARTNER_ROWS[row].map((partner) => (
                          <li key={partner.name} className="shrink-0">
                            {partner.logo ? (
                              /* لكل شريكٍ الآن نسختان: `logo` للوضع الفاتح
                           و`logoDark` للداكن، والتبديل بـ `dark:` لا بفلتر.
                           ⚠️ وأحدَ عشرَ من النسخ الداكنة **مُعاد تلوينها** لا
                           رسميّة — القرار وحدوده موثَّقان في `about.ts` عند
                           تعريف `logoDark`. */
                              /* ⚠️ **السقف 260px لا 200.** الارتفاع مثبَّت والعرض
                           تابعٌ له (`w-auto`)، فسقفٌ يقصّ العرضَ يُبقي الارتفاع
                           فيهبط الشعار المرسوم داخل صندوقه بـ`object-contain`:
                           **هيئة الزكاة** نسبتها 4.48 فتحتاج 251px عند 56px،
                           وكانت تُقصّ إلى 200 فتُرسم بارتفاع **44.7px** بين
                           ثلاثةٍ وعشرين شعارًا بـ56px — شاذٌّ واحدٌ يُرى.
                           و`Next` كان يحذّر في كل تحميل: «width or height
                           modified, but not the other».

                           و260 مشتقٌّ لا مُقدَّر: أعرضُ شعارٍ بعدها «مداريم»
                           عند 196px، فالسقف لا يمسّ أحدًا سواها ويبقى حائلًا
                           لو وصل شعارٌ أعرض. */
                              <>
                                <Image
                                  src={partner.logo}
                                  alt={`شعار ${partner.name}`}
                                  width={200}
                                  height={64}
                                  className={`h-12 w-auto max-w-[260px] object-contain sm:h-14${
                                    partner.logoDark ? " dark:hidden" : ""
                                  }`}
                                />
                                {partner.logoDark ? (
                                  <Image
                                    src={partner.logoDark}
                                    alt={`شعار ${partner.name}`}
                                    width={200}
                                    height={64}
                                    className="hidden h-12 w-auto max-w-[260px] object-contain dark:block sm:h-14"
                                  />
                                ) : null}
                              </>
                            ) : (
                              /* ⚠️ B4: كان `border-s-2 border-accent` — حدٌّ من جهةٍ
                           واحدة، وهو ممنوع: «الحدود تدور حول الشكل كلّه أو لا
                           تكون». صار حدًّا محيطًا بلون العلامة، وسقط ظلّ
                           `inset` لأنه كان يؤدّي دور الحدّ الثاني فيزدوجان. */
                              <span
                                dir="rtl"
                                className="flex h-12 items-center whitespace-nowrap border-2 border-accent bg-bg-raised px-s5 font-display text-base font-bold text-fg sm:h-14 sm:text-lg"
                              >
                                {isolateLatin(partner.name)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </Drift>
              </div>
            ))}
          </div>
        </section>

        {/* «مبدعون مرّوا من هنا» — بين الشركاء والأسئلة الشائعة بطلب حسام.
            لا يُرسم ما دامت قائمة `ALUMNI` فارغة، فلا عنوانَ بلا محتوى. */}
        <Alumni />

        {/* «إجابات سريعة». لغته البصرية من مرجعٍ اختاره حسام (نادي رؤية
            2030)، وهي **قطيعةٌ مقصودة** مع ميلان الهوية: حوافّ مدوّرة
            وعنوانٌ موسّطٌ ملوّن. انظر رأس المكوّن. */}
        <FaqQuick items={FAQ} />
      </main>

      {/* ⚠️ كانت هنا `<div className="relative z-10">` — بقيّةٌ «من أيام
          الحقل الثابت خلف الصفحة» (تعليقها الأصلي) التي لم تعد موجودة.
          أثرها الآن: `z-10` مع عزل `.raked-field` (`isolation: isolate`)
          يرفعان التذييل **كتلةً واحدة** فوق طبقة `MarkMorph` (`z-[1]`),
          فأرضية التذييل المصمتة تُرسم فوق الأضلاع الطائرة دائمًا — حتى
          حين تهبط بدقّة على مرساتها. النتيجة: علامةٌ «تجتمع» هندسيًّا
          (`vsFoot: 0`) لكنها **غير مرئية أبدًا** خلف أرضية التذييل — يفشل
          الغرض الوحيد من هذي المهمّة. رُفع الغلاف فعاد التذييل يشارك في
          الترتيب الطبيعي (كـ`main` تمامًا)، فتُرسم الأضلاعُ فوقه كما تُرسم
          فوق أي قسم آخر، ويحميها نصَّه بصنف `above-mark` كما في البقيّة. */}
      <SiteFooter />
    </>
  );
}
