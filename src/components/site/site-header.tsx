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
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center"
            aria-label="نادي نظم المعلومات الإدارية — الصفحة الرئيسية"
          >
            <Mark className="h-6 w-auto text-deep dark:text-snow" />
          </Link>

          {/* الشاشة العريضة: الأقسام الستة على سطر واحد.
              العتبة `lg` لا `sm`: الشريط يحتاج 800px ليضع الستة على سطر —
              مقيسًا (443 للروابط + 229 للعلامة والمبدّل والزر + الحشو). عند
              `sm` كان يلتفّ إلى سطرين فيصير 120px بدل 76px، فيقبح ويكسر حساب
              الواجهة الأولى التي تطرح `--header-h` من ارتفاع الشاشة.
              وبين 640 و1023 تظهر القائمة المطويّة — وهي عنصر أصيل كامل. */}
          <nav className="hidden flex-1 lg:block" aria-label="أقسام الموقع">
            <NavLinks className="flex flex-wrap items-center gap-x-s5" />
          </nav>

          {/* الجوال: قائمة مطويّة — عنصر أصيل، بلا جافاسكربت وبلا حالة مخفيّة */}
          <MobileMenu
            label="القائمة"
            className="relative ms-auto lg:hidden"
            summaryClassName="inline-flex min-h-11 cursor-pointer list-none items-center gap-s2 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden"
          >
            <nav
              className="absolute end-0 top-full z-10 mt-s2 min-w-44 border border-line bg-bg-raised px-s4 py-s2"
              aria-label="أقسام الموقع"
            >
              <NavLinks as="list" className="flex flex-col" />
            </nav>
          </MobileMenu>

          {/* المبدّل قبل الزرّ — موضعه محجوز في حساب عرض الشريط أعلاه (٢٢٩px
              للعلامة والمبدّل والزرّ). على الجوال يدفعه `ms-auto` القائمةِ
              فيبقى الثلاثة متجاورين في الطرف. */}
          <ThemeToggle />

          <Link
            href={PRIMARY_ACTION.href}
            className="rake rake-sm rake-interactive inline-flex min-h-11 shrink-0 items-center bg-accent px-s4 text-sm font-semibold text-accent-fg transition-[background-color,transform,clip-path] hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100 sm:px-s5"
          >
            {PRIMARY_ACTION.label}
          </Link>
        </ScrollLift>
      </header>
    </>
  );
}
