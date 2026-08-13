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

/* لون النصّ الكامل لا المخفَّف: اللوح يمرّ فوق الواجهة الداكنة وأرضيته
   نصف شفّافة، فتنزل درجة `text-fg-muted` هناك إلى 3.88:1 وهو تحت الحدّ. */
const SHARED = "items-center transition-colors";

/* الشريط الأفقي على الشاشة الواسعة.
   ⚠️ **`px-s2` إلزامي لا زخرفة.** بلا حشوٍ أفقي كان عرض هدف اللمس يساوي
   عرض النصّ الخام حرفيًّا — قِيست «الرئيسية» و«من نحن» دون 44px (43.95
   و43.67) رغم `min-h-11` الرأسي. */
const ROW = `inline-flex min-h-11 px-s2 text-sm ${SHARED}`;

/**
 * صفُّ القائمة على الجوّال.
 *
 * ⚠️ **`flex w-full` لا `inline-flex` — وهذا كان العطل.** الرابط المسطَّر
 * داخليًّا يقيس عرضَ نصِّه وحدَه: قِيست «الرئيسية» **60px** في لوحةٍ عرضها
 * 176 — أي أنّ **٦٦٪ من الصفّ لا يستجيب للمس**. يضغط الطالب على الصفّ في
 * موضعٍ خالٍ من الحرف فلا يحدث شيء، فيظنّ القائمةَ معطّلة.
 * والآن الصفُّ كلُّه هو الهدف: عرضُ اللوحة كاملًا × 48px.
 *
 * و**48px لا 44**: هو حدّ Material للمس (44 حدُّ أبل للمؤشّر)، ويسع صفَّ
 * قائمةٍ بحشوٍ مريح. والنصّ `text-base` لا `text-sm` — كان 14px وهو صغيرٌ
 * على هدفٍ يُلمس بالإبهام.
 */
const LIST = `flex min-h-12 w-full px-s4 text-base ${SHARED}`;

type NavLinksProps = {
  /** التخطيط يختلف بين الشريط الأفقي والقائمة المطويّة */
  className?: string;
  /** عنصر الالتفاف لكل رابط في القائمة المطويّة */
  as?: "row" | "list";
};

export function NavLinks({ className, as = "row" }: NavLinksProps) {
  const pathname = usePathname();
  const base = as === "list" ? LIST : ROW;

  const items = NAVIGATION.map((section) => {
    const active = isActive(pathname, section.href);
    return (
      <Link
        key={section.href}
        href={section.href}
        aria-current={active ? "page" : undefined}
        className={
          `${base} ` +
          (active
            ? "font-semibold text-accent"
            : "font-medium text-fg hover:text-accent") +
          /* الصفّ يستجيب للّمس نفسِه: أرضيةٌ خفيفة تحت الإصبع. على الشريط
             الأفقي لا لزوم لها — هناك مؤشّرٌ وحالةُ مرور. */
          (as === "list" ? " active:bg-bg-sunken" : "")
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
