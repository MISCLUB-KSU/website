import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NavLinks } from "@/components/site/nav-links";
import { ScrollLift } from "@/components/site/scroll-lift";
import { StaffGreeting } from "@/components/site/staff-greeting";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { PRIMARY_ACTION } from "@/content/navigation";

/**
 * الشريط العلوي — لوح عائم يلتصق بالأعلى.
 *
 * **الزجاج:** في أعلى الصفحة اللوح شفّاف يجلس على أرضية الموقع كأنه جزء
 * منها، وحين يمرّ المحتوى تحته تظهر أرضيته وحدّه (`.mis-bar` في
 * `globals.css`). الضبابية مشتغّلة دائمًا لا تُشعَل، فلا قفزة في التمويه.
 *
 * **الشكل:** حوافّ حادّة لا دائرية، وبلا ظلّ خارجيّ — العمق من الفارق
 * اللوني والضبابية. والعنصر المائل الوحيد فيه زرّ التقديم:
 * «الميلان توقيع لا نمط».
 *
 * **الجوال:** ستة أقسام لا تُصفّ في عرض جوال، فتُطوى خلف `<details>` أصلي
 * يعمل بلا جافاسكربت. يُركَّب مرّتين بشرط عرض متعاكس لا مرّة تُطوى بالـ CSS:
 * المتصفح يوقف عرض محتوى `<details>` المغلق على مستوى الـ slot، فلا ينفع
 * فرض `display` عليه من الخارج.
 */

/* ⚠️ الروابط وقائمتُها انتقلت إلى `nav-links.tsx` — ومعها ملاحظةُ التباين
   المقيسة (`text-fg-muted` ينزل إلى 3.88:1 على اللوح الشفّاف). ما بقي هنا
   نسخةٌ ميتة، وحذفُها هنا لا يُضيعها. */

export function SiteHeader() {
  return (
    <>
      {/* أول ما يبلغه `Tab` في كل صفحة: قفزةٌ فوق ستّة روابط إلى المحتوى.
          مخفيٌّ حتى يُركَّز عليه، فيراه من يتنقّل بلوحة المفاتيح وحده.
          `z-[60]` فوق الشريط (`z-50`) وإلّا ظهر تحته فلا يُقرأ.

          ⚠️ **وعقدُه شرطان في الصفحة المقابلة، لا هنا** — وكلاهما كان
          ناقصًا حتى ١٥ أغسطس ٢٠٢٦، فكان الرابط يظهر ولا يفعل شيئًا:

          ١. `id="main"` على وسم `<main>`. كان في **خمس صفحاتٍ من أربع
             عشرة** تعرض هذا الشريط — فتسعُ صفحاتٍ فيها رابطٌ يشير إلى
             مرساةٍ لا وجود لها.

          ٢. `tabIndex={-1}` عليه كذلك. وبدونه **لا ينتقل التركيز** ولو
             وُجدت المرساة: يمرّر المتصفّح الصفحة (وهو تمريرٌ لا يُرى
             أصلًا لأن المحتوى تحت الشريط مباشرة) ويبقى التركيز على
             الرابط — فأولُ `Tab` بعده يعود إلى الشريط الذي أراد تخطّيه.
             وسمُ `<main>` غيرُ قابلٍ للتركيز افتراضًا، و`-1` يجعله هدفًا
             برمجيًّا دون أن يدخل ترتيب `Tab`.

          مقيسٌ قبل: على `/faq` كان `Enter` يُبقي التركيز على الرابط ثم
          يعود `Tab` إلى روابط الشريط. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-s4 focus-visible:top-s4 focus-visible:z-[60] focus-visible:inline-flex focus-visible:min-h-11 focus-visible:items-center focus-visible:bg-accent focus-visible:px-s5 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-accent-fg"
      >
        تخطَّ إلى المحتوى
      </a>

      {/* الحشو العلوي هو ما يفصل اللوح عن حافّة الشاشة — الشريط ملتصق
          بالصفر، والفراغ فوقه يمرّ منه المحتوى فيُقرأ التعويم. */}
      {/* `mis-safe-*` تُبدّل `px-s4 pt-s4` بقيمٍ تساويها حين لا نتوء
          وترتفع فوقه حين يوجد — انظر التعليل في `globals.css`. */}
      <header className="mis-safe-x mis-safe-top sticky top-0 z-50">
        {/* ⚠️ `relative` هنا لا على `<details>` — وهو ما يجعل لوحة القائمة
            تقيس عرضها بعرض **الشريط** فتحاذيه حافّةً بحافّة. كانت مربوطةً
            بزرّ «القائمة» وحده فبلغت 176px في شاشة 375. */}
        {/* ⚠️ **`flex-wrap` لأجل تكبير النصّ — لا لأجل مقاس الشاشة.**
            قِيس عند `font-size: 200%` على 375px: عرضُ المستند يقفز إلى
            **509px** ويظهر تمريرٌ أفقيّ (مخالفة WCAG 1.4.4)، و**الشريط
            وحده يصنع 100px منها** — أُخفي فنزل العرض إلى 409. السببُ أن
            أطرافه `shrink-0` فلا تتقلّص، والصفُّ لا يلتفّ فيفيض.
            وبالحجم الطبيعيّ لا شيء يلتفّ ولا يتغيّر شيء — مقيسٌ على 1280. */}
        <ScrollLift className="mis-bar relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-s4 gap-y-s2 px-s4 py-s2 backdrop-blur-lg backdrop-saturate-150 sm:px-s5">
          {/* ⚠️ **الطرفان `flex-1 basis-0` — وهو ما يضع الأقسام في منتصف
              الشريط حقًّا.** الشعار 64px والطرف المقابل (مبدّل + زرّ) 219px،
              فحاويةٌ واحدة نامية بينهما تُوسّط الأقسامَ في **الفراغ** لا في
              الشريط: مقيسًا كان الانحراف 201px نحو الشعار، و`justify-center`
              وحدها تُبقي 59px. وبمسارين متساويين يصير المنتصف منتصفًا مهما
              اختلف عرض الطرفين — ولو طال نصّ الزرّ يومًا بقي الضبط.

              وهي مساراتُ `flex` لا مواضع مطلقة: عند الضيق تتقارب ولا تتراكب،
              فلا يمرّ رابطٌ فوق زرّ. */}
          {/* ⚠️ **`flex-1 basis-0` صارت `lg:` — والسبب أنها لا تخدم إلا الحاسب.**
              المساران المتساويان يوسّطان الأقسام بينهما، والأقسام `hidden`
              على الجوّال أصلًا. وبقاؤهما هناك يقسم العرض نصفين بالقوّة:
              الطرفُ المقابل يحتاج 169px ويُعطى 163، فيلتفّ الزرّ سطرًا
              ويصير الشريط **114px بدل 62** — قِيس. وبلا `basis-0` يأخذ كلُّ
              طرفٍ قدرَ محتواه، ويبقى الحاسب كما ضُبط بالحرف. */}
          {/* العلامةُ رابطٌ إلى الرئيسية في كلّ المقاسات — وهي أوّلُ ما
              تبلغه العينُ في القراءة العربية، فموضعُها البادئ لا المنتهي.
              وأكبرُ قليلًا على الجوّال: الشريطُ هناك ليس فيه إلا هي وزرُّ
              القائمة، فتحمل الجهةَ وحدَها. */}
          <div className="flex items-center lg:flex-1 lg:basis-0">
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center"
              aria-label="نادي نظم المعلومات الإدارية — الصفحة الرئيسية"
            >
              <Mark className="h-6 w-auto text-deep max-lg:h-7 dark:text-snow" />
            </Link>
          </div>

          {/* الشاشة العريضة: الأقسام الستة على سطر واحد.
              العتبة `lg` لا `sm`: الشريط يحتاج 800px ليضع الستة على سطر —
              مقيسًا (443 للروابط + 229 للعلامة والمبدّل والزر + الحشو). عند
              `sm` كان يلتفّ إلى سطرين فيصير 120px بدل 76px، فيقبح ويكسر حساب
              الواجهة الأولى التي تطرح `--header-h` من ارتفاع الشاشة.
              وبين 640 و1023 تظهر القائمة المطويّة — وهي عنصر أصيل كامل. */}
          {/* الإزاحة `s7` (48px) نحو الشعار: المنتصف الحسابيّ ليس المنتصف
              المرئيّ هنا — الطرف المقابل يحمل زرًّا مصمتًا بلونٍ صريح، وكتلته
              اللونية تجذب العين إليه فتبدو الأقسام مائلةً نحوه وهي في المنتصف
              تمامًا. فتُزاح بمقدار رمزٍ قائم لا برقمٍ مخترع. */}
          <nav
            className="hidden shrink-0 lg:block lg:translate-x-s7"
            aria-label="أقسام الموقع"
          >
            <NavLinks className="flex flex-wrap items-center gap-x-s5" />
          </nav>

          {/* ⚠️ **الطرف المقابل صار للحاسب وحدَه (`max-lg:hidden`).**
              على الجوّال لم يبقَ في الشريط إلا العلامة، وكلُّ ما كان هنا —
              المبدّل وزرُّ التقديم — سكن داخل اللوحة أعلاه.
              و`flex-wrap` باقٍ لتكبير النصّ 200% على الحاسب. */}
          <div className="ms-auto flex flex-wrap items-center justify-end gap-x-s4 gap-y-s2 lg:ms-0 lg:flex-1 lg:basis-0">
            {/* ⚠️ **زرُّ القائمة في الطرف المقابل للعلامة — بلا نصّ.**
                ثلاثُ ضرباتٍ بميل الشعار وحدَها: العلامةُ تحمل الجهةَ
                البادئة وتقود إلى الرئيسية، وهذا يحمل المنتهية ويفتح
                القائمة. لا نصَّ «القائمة» ولا زرَّ تقديمٍ يزاحمهما —
                وكلاهما سكن داخل اللوحة. */}
            <MobileMenu
              label="القائمة"
              className="lg:hidden"
              summaryClassName="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
              trigger={null}
            >
              {/* اللوحة تمتدّ بعرض الشريط لا بعرض الزرّ: `inset-x-0` على
                  صندوق حشو الشريط، و`.mis-bar` هي الحاوية الموضَّعة.
                  و`max-h` مع التمرير للوضع الأفقي، و`overscroll-contain`
                  تمنع تسرّب التمرير إلى الصفحة تحتها. */}
              <nav
                className="mis-menu-panel bg-bg-raised absolute inset-x-0 top-full z-10 mt-s2 max-h-[70dvh] overflow-y-auto overscroll-contain border py-s2"
                aria-label="أقسام الموقع"
              >
                <NavLinks as="list" className="flex flex-col" />

                {/* ⚠️ **التقديم داخل اللوحة لأنه خرج من الشريط.**
                    `NAVIGATION` لا تحوي `/join` — كان في زرّ الشريط وفي
                    التذييل فقط. فحذفُه من الشريط بلا بديلٍ هنا كان يترك
                    صفحاتٍ كاملة (`/committees` مثلًا) بلا طريقٍ إلى
                    التقديم من أعلاها. */}
                {/* ⚠️ **الترحيب هنا أيضًا — وشريطُ الجوّال يبقى كما هو.**
                    الشريط فيه العلامةُ وزرُّ القائمة وحدهما بقرارٍ سابق،
                    فموضعُ ما يخصّ الداخل هو اللوحة كما سكن فيها المبدّلُ
                    وزرُّ التقديم. وهو **لا يُرسم أصلًا لمن لا جلسة له**،
                    فلا يزيد على الزائر صفًّا ولا حدًّا.

                    وموضعُه فوق زرّ التقديم لا تحته: من دخل قائدًا لا يقدّم
                    على العضوية، فطريقُه إلى اللوحة أسبقُ إلى عينه. */}
                <StaffGreeting className="border-line mt-s2 flex w-full border-t px-s4 pt-s3" />

                <div className="border-line mt-s2 border-t px-s4 pt-s3">
                  <Link
                    href={PRIMARY_ACTION.href}
                    className="rake rake-sm rake-interactive flex min-h-12 items-center justify-center bg-accent px-s5 text-base font-semibold text-accent-fg transition-[background-color,clip-path] hover:bg-accent-hover"
                  >
                    {PRIMARY_ACTION.label}
                  </Link>
                </div>

                {/* المبدّل أسفل القائمة — أداةٌ تُلمس مرّةً ثم تُنسى */}
                <div className="mt-s3 flex px-s4">
                  <ThemeToggle />
                </div>
              </nav>
            </MobileMenu>

            {/* ⚠️ **الترحيب قبل المبدّل لا بعده.** الطرفُ المقابل يُقرأ من
                اليمين إلى اليسار كبقيّة الصفحة، والاسمُ أحقُّ بالسبق من
                أداةٍ تُلمس مرّةً وتُنسى. وهو `max-lg:hidden` كجاره: شريطُ
                الجوّال فيه العلامةُ وزرُّ القائمة وحدهما — بقرارٍ سابق. */}
            <StaffGreeting className="inline-flex max-lg:hidden" />

            {/* المبدّل على الحاسب يجد مقعدًا، وعلى الجوّال سكن في اللوحة */}
            <div className="max-lg:hidden">
              <ThemeToggle />
            </div>

            <Link
              href={PRIMARY_ACTION.href}
              /* `whitespace-nowrap` لا `shrink-0`: الثانية كانت تمنع الشريط
                 من التقلّص فيفيض عند تكبير النصّ، ورفعُها وحدَها كان يكسر
                 نصَّ الزرّ سطرين. فعرضٌ لا يقلّ عن نصّه، وصفٌّ يلتفّ. */
              className="rake rake-sm rake-interactive inline-flex min-h-11 items-center whitespace-nowrap bg-accent px-s4 text-sm font-semibold text-accent-fg transition-[background-color,transform,clip-path] hover:bg-accent-hover active:scale-[0.98] max-lg:hidden motion-reduce:active:scale-100 sm:px-s5"
            >
              {PRIMARY_ACTION.label}
            </Link>
          </div>
        </ScrollLift>
      </header>
    </>
  );
}
