"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAVIGATION } from "@/content/navigation";

/**
 * روابط الأقسام — مع تعليم الصفحة الحالية.
 *
 * **لماذا عميل:** الموضع الحالي لا يُعرف على الخادم في مكوّن مشترك بين كل
 * الصفحات. المكوّن صغير ولا يحمل إلا قائمة ثابتة، فكلفته سطران في الحزمة.
 *
 * **التعليم بالخطّ لا بنقطة.** النقطة تحت العنصر النشط زخرفةٌ تنوب عن حالة،
 * ولا تصل قارئَ الشاشة. هنا شيئان: `aria-current="page"` ليُنطق «الصفحة
 * الحالية»، ووزنٌ ولونٌ يُريانه للعين. والمعنى لا يُنقل باللون وحده — الوزن
 * يتغيّر معه، فمن لا يميّز الألوان يقرأ الفرق.
 *
 * **المطابقة:** الجذر `/` يطابق نفسه فقط؛ وما عداه يطابق الصفحة وما تحتها
 * (`/committees/media` تُبقي «اللجان» نشطًا) — وإلا خسر الزائر موضعه بمجرّد
 * دخوله صفحة داخلية.
 */

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const BASE =
  /* لون النصّ الكامل لا المخفَّف: اللوح يمرّ فوق الواجهة الداكنة وأرضيته
     نصف شفّافة، فتنزل درجة `text-fg-muted` هناك إلى 3.88:1 وهو تحت الحدّ.
     ⚠️ **`px-s2` إلزامي لا زخرفة.** بلا حشوٍ أفقي كان عرض هدف اللمس يساوي
     عرض النصّ الخام حرفيًّا — قِيست «الرئيسية» و«من نحن» دون 44px (43.95
     و43.67) رغم `min-h-11` الرأسي. الحشو مُضاف على الجهتين فيرفع كل رابطٍ
     قصير فوق الحدّ بهامش أمان لا بالحدّ بالضبط (أضيق رابطٍ في الشريط
     يقيس بعده ٤٩.٥٦px). */
  "inline-flex min-h-11 items-center px-s2 text-sm transition-colors";

type NavLinksProps = {
  /** التخطيط يختلف بين الشريط الأفقي والقائمة المطويّة */
  className?: string;
  /** عنصر الالتفاف لكل رابط في القائمة المطويّة */
  as?: "row" | "list";
};

export function NavLinks({ className, as = "row" }: NavLinksProps) {
  const pathname = usePathname();

  const items = NAVIGATION.map((section) => {
    const active = isActive(pathname, section.href);
    return (
      <Link
        key={section.href}
        href={section.href}
        aria-current={active ? "page" : undefined}
        className={
          `${BASE} ` +
          (active
            ? "font-semibold text-accent"
            : "font-medium text-fg hover:text-accent")
        }
      >
        {section.label}
      </Link>
    );
  });

  if (as === "list") {
    return (
      <ul className={className}>
        {NAVIGATION.map((section, i) => (
          <li key={section.href}>{items[i]}</li>
        ))}
      </ul>
    );
  }

  return <div className={className}>{items}</div>;
}
