import type { Metadata } from "next";

import { Mark } from "@/components/site/mark";
import { PREFERENCE_VALUES } from "@/content/preferences";
import { SHARE_DESC, SHARE_TITLE } from "@/lib/site";
import { RegistrationForm } from "./registration-form";

/**
 * ⚠️ **الكتلةُ هنا لأجل `og:url` وحده — لا لأجل نصٍّ يخصّ الصفحة.**
 *
 * كان لهذي الصفحة عنوانٌ ووصفٌ يخصّانها («التقديم على عضوية…» و«قدّم على
 * عضوية النادي… النتيجة على بريدك خلال أسبوع»)، فرُفعا بقرار الإدارة (١٦
 * أغسطس ٢٠٢٦): «خلّ العنوان نفسه» و«لا تخلّي شي مخصّص للعضوية». فالبطاقةُ
 * تعرّف بالنادي أينما أُرسل رابطُه، ولا تتبدّل نبرتُها بحسب الصفحة —
 * والنصّان يأتيان من `lib/site.ts`، مصدرًا واحدًا مع الجذر.
 *
 * ⚠️ **ولا تُحذف الكتلةُ رغم ذلك.** `openGraph` لا تُورَّث بالدمج بل تُنسخ
 * كاملةً، فحذفُها يُعيد `og:url` إلى `https://misclubksu.com` — أي أن
 * البطاقةَ تشير إلى الرئيسية لا إلى النموذج، وبعضُ المنصّات تُنزل الزائرَ
 * حيث يشير `og:url` لا حيث ضغط. وهي غلطةٌ صامتة: الرابطُ يبدو سليمًا
 * والزائرُ يصل مكانًا آخر.
 *
 * ⚠️ **والصورةُ تُذكر هنا صراحةً — ولا تُورَث.** أوّلُ محاولةٍ عرّفت
 * `openGraph` بلا `images` ظنًّا أن صورةَ الجذر تنضمّ إليها؛ فاختفى
 * `og:image` من الصفحة رأسًا — **بطاقةٌ بلا صورة، وهي أسوأ ممّا كانت**.
 * مقيسٌ في الحالتين قبل الدفع.
 *
 * ⚠️ **وهي `‎.jpg` لا `‎.png` — والسببُ حجمٌ لا ذوق** (١٦ أغسطس ٢٠٢٦).
 * كانت PNG بزنة **823 كيلوبايت**، وواتساب يتخطّى صورةَ البطاقة فوق
 * ~300KB فيعرض الرابطَ عاريًا. والصورةُ تدرّجاتٌ زرقاء ملساء —
 * أسوأُ ما يُعطى PNG: أقصى ضغطٍ بلا لوحةِ ألوان وفّر **13KB من 823**.
 * فصارت JPEG q95 بلا اختزالِ لونٍ (`4:4:4` تحمي حوافّ الحروف):
 * **103KB — 12.9٪ من الأصل**، وفرقُها مقيسٌ لا مُقدَّر: PSNR 46.88dB
 * وأقصى فرقٍ في قناة 23/255، ومقارنةُ قصاصةِ النصّ مكبَّرةً ٣× لا تُظهر
 * فرقًا. والتفصيل في رسالة الدفع.
 *
 * والمسارُ بلا بصمةٍ مُجزّئة: تلك تتبدّل مع كل بناء، وهذا ثابتٌ يخدمه
 * المسارُ الملفّيّ نفسُه. و`metadataBase` في الجذر تجعله مطلقًا.
 */
const OG_IMAGE = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
};

export const metadata: Metadata = {
  /* ⚠️ **هذان يخصّان الصفحة ولا يُوحَّدان مع البطاقة.** `title` يظهر في تبويب
     المتصفّح ونتائج البحث، ومَن فتح عشرَ صفحاتٍ من الموقع يحتاج أن يميّز
     تبويبَ النموذج من غيره. والقرارُ رفعُ التخصيص عن **بطاقة المشاركة** —
     ما يُقرأ في واتساب — لا عن عنوان الصفحة. */
  title: "انضم إلينا",
  description:
    "قدّم على عضوية نادي نظم المعلومات الإدارية بجامعة الملك سعود، واختر اللجنة أو الوحدة التي تناسب مهاراتك.",
  alternates: { canonical: "/join" },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "/join",
    siteName: "نادي نظم المعلومات الإدارية",
    title: SHARE_TITLE,
    description: SHARE_DESC,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESC,
    images: [OG_IMAGE],
  },
};

/**
 * ⚠️ **`?choice=` كان يُقرأ من لا أحد.** `joinHref` في صفحات اللجان يبني
 * `‎/join?choice=committee:media/design`، و`RegistrationForm` يقبل
 * `initialChoice` ويوثّقها «مُهيَّأة من صفحة اللجنة» — لكن الصفحة بينهما
 * لم تكن تقرأ الوسيط ولا تمرّره. فكلُّ زرّ «قدِّم على هذي الوحدة» (تسعُ
 * وحداتٍ وثلاثُ لجانٍ بلا وحدات) يُنزل الطالبَ على نموذجٍ **فارغ** —
 * وصفحةُ اللجنة تعده سطرًا فوق الزرّ: «يفتح النموذج وخيارها مُهيَّأ».
 *
 * ⚠️ **وتُفحص القيمة هنا لا يُوثَق بها.** ما يكتبه الزائر في العنوان يصل
 * حقلَ `choice1`؛ ولولا المطابقة على `PREFERENCE_VALUES` لظهر للطالب خطأٌ
 * على رغبةٍ لم يخترها. والخادمُ يفحصها ثانيةً على كل حال.
 *
 * ⚠️ **وقراءةُ الوسيط تجعل الصفحة ديناميّة** بعد أن كانت مُهيّأةً سلفًا.
 * مقبولٌ هنا: صفحةُ نموذجٍ لا تُخدَم من ذاكرةٍ وسيطة أصلًا، وثمنُها أهونُ
 * من وعدٍ مكتوبٍ لا يُنفَّذ.
 */
type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const raw = (await searchParams).choice;
  const wanted = typeof raw === "string" ? raw : undefined;
  const initialChoice =
    wanted && PREFERENCE_VALUES.includes(wanted) ? wanted : undefined;

  return <JoinPageBody initialChoice={initialChoice} />;
}

function JoinPageBody({ initialChoice }: { initialChoice?: string }) {
  return (
    <>
      {/* ⚠️ **صفحةُ تسجيلٍ مغلقة — بقرار الإدارة (١٦ أغسطس ٢٠٢٦).**
          «أبي ذا الرابط بس للتسجيل، محد يقدر يطلع يتصفّح الموقع لأنه لسّه
          ما جهز». فرُفع `SiteHeader` بقائمته وقائمةِ جوّاله، ورُفع
          `SiteFooter` بروابطه الخمسة — ولا يخرج من هذي الصفحة رابطٌ واحد.

          ⚠️ **والشعارُ باقٍ، وهو غيرُ قابلٍ للنقر عمدًا.** أُضيف الشريطُ
          هنا في ١٥ أغسطس لأن الصفحة كانت «بلا شعارٍ ولا طريقِ رجوع»
          فتُقرأ نموذجًا مجهولَ المصدر — ومن يُطلب منه رقمُ هويّته يحتاج أن
          يعرف لمن يكتبه. فبقي ما يعرّف، وذهب ما يُخرج.

          ويُعاد الشريطُ يوم يجهز الموقع: يُستبدل هذا العنصرُ بـ`<SiteHeader />`
          ويُحذف التذييل المصغَّر أسفله. */}
      {/* ⚠️ **الشعارُ الكامل — علامةٌ وكلمةٌ وفاصل** (١٦ أغسطس ٢٠٢٦، بطلب
          الإدارة بصورة الشعار الرسميّة). كان هنا العلامةُ وحدها يليها سطرٌ
          عربيّ، فصار التركيبَ المعتمد: العلامة · خطٌّ رأسيّ · «MANAGEMENT
          INFORMATION SYSTEM CLUB» ثلاثةَ أسطر.

          ⚠️ **وهو مبنيٌّ بالنصّ والـSVG لا صورةً نقطية.** الصورةُ المرسلة
          خلفيّتُها سوداءُ مصمتة وفيها تدرّجٌ معدنيّ — تُقحم مستطيلًا أسودَ
          في شريطٍ فاتح، ولا تنقلب مع الوضع الداكن، وتتشقّق على شاشات
          الكثافة العالية. والمبنيُّ هنا يأخذ لونه من `currentColor` فينقلب
          وحده، ويبقى حادًّا عند أي مقاس، ولا يزن بايتًا واحدًا فوق ما
          حُمِّل أصلًا.

          ⚠️ **والسطرُ العربيّ لم يُحذف بل انتقل إلى الطرف الآخر.** من
          يُطلب منه رقمُ هويّته يحتاج أن يعرف لمن يكتبه — وصفحةٌ عربيّةٌ
          كاملةً لا يُعرّفها سطرٌ إنجليزيّ وحده. ويختفي تحت `sm` لضيق
          الشريط لا لقلّة أهمّيته، والعلامةُ نفسُها تحمل الاسمَ العربيَّ في
          `aria-label` فلا يفقده قارئُ الشاشة في أي مقاس. */}
      <div className="border-b border-line-quiet">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-x-s4 px-5 py-s4">
          {/* ⚠️ **`dir="ltr"` — والشعارُ لا ينعكس مع الصفحة.** الصفحةُ
              `rtl`، فبلا هذا يقفز المربّعُ إلى اليمين والكلمةُ إلى يساره:
              ترتيبٌ يقلب الشعارَ الرسميَّ رأسًا على عقب. والشعارُ رسمٌ
              ثابت لا نصٌّ يتبع اتّجاه القراءة — يُقرأ كما اعتُمد في كل
              لغة. والكلمةُ نفسُها لاتينيّةٌ فاتجاهُها `ltr` أصلًا. */}
          <div
            dir="ltr"
            className="text-deep dark:text-snow flex items-center gap-x-s3"
          >
            <Mark className="h-9 w-auto" />
            <span aria-hidden className="bg-line h-8 w-px shrink-0" />
            {/* الكلمةُ ثلاثةَ أسطرٍ كما في الشعار الرسميّ — و`leading` ضيّقٌ
                يجمعها كتلةً واحدة بارتفاع العلامة نفسِها */}
            <span className="text-[0.6rem] leading-[1.25] font-bold tracking-[0.04em] uppercase">
              Management
              <br />
              Information
              <br />
              System Club
            </span>
          </div>
          <span className="text-fg-muted shrink-0 text-[0.78rem] max-sm:hidden">
            جامعة الملك سعود
          </span>
        </div>
      </div>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-5 py-14 max-lg:py-s6 sm:py-20"
      >
        {/* ⚠️ **الجوّال يقصّ المكرَّر لا المقاس.**
            قِيس أن ٧١٪ من الشاشة الأولى زخرفةٌ قبل أوّل حقل، وثلاثةَ حقولٍ
            من أربعةَ عشرَ تظهر. والسببُ أن الرأس يقول الشيء ثلاث مرّات:
            الشارة تقول ما يقوله العنوان تحتها بحروفٍ أكبر، وجملةُ «ثلاث
            خطوات…» تقول ما يعرضه **شريط الخطوات** تحتها مرقَّمًا ومرتَّبًا.
            فيُحذف المكرَّر ويبقى ما لا يقوله غيرُه — الوعدُ بموعد الردّ.
            والمقاساتُ لم تُمَسّ: تصغيرُ الخطّ كان يُبقي التكرار ويصعّب
            قراءته. والحاسبُ فوق `lg` يرى النصّ كاملًا كما كان. */}
        <header className="mb-10 max-w-2xl max-lg:mb-s6">
          {/* الميلان مأخوذ من الشعار — عنصر واحد بارز في الشاشة لا أكثر */}
          <span className="mis-slant bg-deep mb-4 inline-block px-7 py-1.5 max-lg:hidden">
            <span className="text-snow text-[0.7rem] font-semibold tracking-widest">
              عضوية النادي
            </span>
          </span>
          <h1 className="text-ink-label mb-3 text-3xl leading-tight font-bold sm:text-4xl">
            انضم إلى النادي
          </h1>
          <p className="text-fg-muted max-w-[56ch] leading-relaxed">
            <span className="max-lg:hidden">
              ثلاث خطوات: بياناتك، ثم ثلاث رغبات ترتّبها بعد قراءة عمل كل لجنة
              ومشروع، ثم أسئلة قادتها.{" "}
            </span>
            نراجع الطلبات ونرسل النتيجة على بريدك خلال أسبوع.
          </p>
        </header>

        <RegistrationForm initialChoice={initialChoice} />
      </main>
      {/* تذييلٌ يعرّف ولا يُخرج — سطرُ تواصلٍ واحد بلا روابطِ تصفّح */}
      <footer className="border-t border-line-quiet">
        <div className="text-fg-muted mx-auto w-full max-w-5xl px-5 py-s5 text-[0.78rem] leading-relaxed">
          نادي نظم المعلومات الإدارية — كلية إدارة الأعمال، جامعة الملك سعود.
          <br />
          للاستفسار:{" "}
          <a
            href="mailto:misclub@ksu.edu.sa"
            dir="ltr"
            className="hover:text-fg underline underline-offset-4"
          >
            misclub@ksu.edu.sa
          </a>
        </div>
      </footer>
    </>
  );
}
