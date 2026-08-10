import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { MobileMenu } from "@/components/site/mobile-menu";
import { NavLinks } from "@/components/site/nav-links";
import { ScrollLift } from "@/components/site/scroll-lift";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { NAVIGATION, PRIMARY_ACTION } from "@/content/navigation";

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

const LINK_CLASS =
  /* لون النصّ الكامل لا المخفَّف: اللوح يمرّ فوق الواجهة الداكنة وأرضيته
     نصف شفّافة، فتنزل درجة `text-fg-muted` هناك إلى 3.88:1 وهو تحت الحدّ.
     التباين يُقاس على أسوأ خلفية يمرّ عليها اللوح لا على أرضية الصفحة. */
  "inline-flex min-h-11 items-center text-sm font-medium text-fg " +
  "transition-colors hover:text-accent";

export function SiteHeader() {
  return (
    <>
      {/* أول ما يبلغه `Tab` في كل صفحة: قفزةٌ فوق ستّة روابط إلى المحتوى.
          مخفيٌّ حتى يُركَّز عليه، فيراه من يتنقّل بلوحة المفاتيح وحده.
          `z-[60]` فوق الشريط (`z-50`) وإلّا ظهر تحته فلا يُقرأ. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-s4 focus-visible:top-s4 focus-visible:z-[60] focus-visible:inline-flex focus-visible:min-h-11 focus-visible:items-center focus-visible:bg-accent focus-visible:px-s5 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-accent-fg"
      >
        تخطَّ إلى المحتوى
      </a>

      {/* الحشو العلوي هو ما يفصل اللوح عن حافّة الشاشة — الشريط ملتصق
          بالصفر، والفراغ فوقه يمرّ منه المحتوى فيُقرأ التعويم. */}
      <header className="sticky top-0 z-50 px-s4 pt-s4">
        <ScrollLift className="mis-bar mx-auto flex max-w-6xl items-center gap-x-s4 px-s4 py-s2 backdrop-blur-lg backdrop-saturate-150 sm:px-s5">
          {/* ⚠️ **الطرفان `flex-1 basis-0` — وهو ما يضع الأقسام في منتصف
              الشريط حقًّا.** الشعار 64px والطرف المقابل (مبدّل + زرّ) 219px،
              فحاويةٌ واحدة نامية بينهما تُوسّط الأقسامَ في **الفراغ** لا في
              الشريط: مقيسًا كان الانحراف 201px نحو الشعار، و`justify-center`
              وحدها تُبقي 59px. وبمسارين متساويين يصير المنتصف منتصفًا مهما
              اختلف عرض الطرفين — ولو طال نصّ الزرّ يومًا بقي الضبط.

              وهي مساراتُ `flex` لا مواضع مطلقة: عند الضيق تتقارب ولا تتراكب،
              فلا يمرّ رابطٌ فوق زرّ. */}
          <div className="flex flex-1 basis-0 items-center">
            <Link
              href="/"
              className="inline-flex min-h-11 shrink-0 items-center"
              aria-label="نادي نظم المعلومات الإدارية — الصفحة الرئيسية"
            >
              <Mark className="h-6 w-auto text-deep dark:text-snow" />
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

          {/* الطرف المقابل: المبدّل قبل الزرّ، وموضعهما محجوز في حساب عرض
              الشريط أعلاه. و`justify-end` هي ما يدفعهما إلى الحافّة — كانت
              `ms-auto` على القائمة المطويّة تفعل ذلك، ولم تعد تلزم بعد أن صار
              المسار نفسه ينتهي عند الطرف. */}
          <div className="flex flex-1 basis-0 items-center justify-end gap-x-s4">
            {/* الجوال: قائمة مطويّة — عنصر أصيل، بلا جافاسكربت وبلا حالة مخفيّة */}
            <MobileMenu
              label="القائمة"
              className="relative lg:hidden"
              summaryClassName="inline-flex min-h-11 cursor-pointer list-none items-center gap-s2 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden"
            >
              {/* ⚠️ **`start-0` لا `end-0`** — والفرق أن `end` في الاتجاه
                  العربيّ هي **اليسار**. فكانت الحافّة اليسرى تُثبَّت عند حافّة
                  الزرّ اليسرى (214px) وتنمو القائمة **يمينًا** إلى 390px على
                  شاشةٍ عرضها 375: تتجاوز بـ15px، والصفحة لا تُمرَّر أفقيًّا
                  فتُقصّ صامتًا — تُبتلع الحشوة اليمنى كاملةً ويبعد النصّ
                  **2px** عن حافّة الشاشة بدل ١٦.
                  و`start-0` تثبّت الحافّة اليمنى عند يمين الزرّ فتنمو القائمة
                  يسارًا نحو داخل الشاشة، وهو سلوك القوائم المنسدلة الصحيح. */}
              <nav
                className="absolute start-0 top-full z-10 mt-s2 min-w-44 border border-line bg-bg-raised px-s4 py-s2"
                aria-label="أقسام الموقع"
              >
                <NavLinks as="list" className="flex flex-col" />
                {/* المبدّل هنا على الجوّال — انظر سبب نقله عند غلافه أدناه */}
                <div className="mt-s2 flex border-t border-line pt-s2">
                  <ThemeToggle />
                </div>
              </nav>
            </MobileMenu>

            {/* ⚠️ **المبدّل خلف القائمة على الجوّال، ظاهرٌ على الواسعة.**
                قال حسام «الهيدر أحسّه زحمة مرّة»: أربع كتلٍ في شريط 375px.
                والمبدّل أداةٌ تُلمس مرّةً ثم تُنسى — لا تستحق مقعدًا دائمًا
                يزاحم العلامة والتنقّل والإجراء الأساسيّ. فبقي الثلاثة الذين
                لكلٍّ منهم وظيفةُ كلِّ زيارة، وسكن المبدّل أسفل القائمة.
                والوضع محفوظٌ في `localStorage` فلا يُعاد ضبطه إلا نادرًا. */}
            <div className="max-lg:hidden">
              <ThemeToggle />
            </div>

            <Link
              href={PRIMARY_ACTION.href}
              className="rake rake-sm rake-interactive inline-flex min-h-11 shrink-0 items-center bg-accent px-s4 text-sm font-semibold text-accent-fg transition-[background-color,transform,clip-path] hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100 sm:px-s5"
            >
              {PRIMARY_ACTION.label}
            </Link>
          </div>
        </ScrollLift>
      </header>
    </>
  );
}
