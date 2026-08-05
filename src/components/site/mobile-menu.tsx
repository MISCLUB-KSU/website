"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * قائمة الجوال — `<details>` أصيل يعمل بلا جافاسكربت.
 *
 * الجافاسكربت يضيف شيئًا واحدًا: إغلاقها بعد الانتقال. التنقّل في App Router
 * لا يعيد بناء الشريط، و`open` سمة في الشجرة لا حالة في React — فتبقى
 * القائمة مفتوحة فوق الصفحة الجديدة تحجب أوّلها.
 *
 * الإغلاق يجري على العنصر مباشرة لا عبر حالة: القائمة **غير متحكَّم بها**
 * عمدًا حتى تظل تُفتح وتُغلق بلا جافاسكربت أصلًا.
 */

type MobileMenuProps = {
  label: string;
  className: string;
  summaryClassName: string;
  children: ReactNode;
};

export function MobileMenu({
  label,
  className,
  summaryClassName,
  children,
}: MobileMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className={className}>
      <summary className={summaryClassName}>
        <span aria-hidden className="mis-slant inline-block h-3 w-1 bg-accent" />
        {label}
      </summary>
      {children}
    </details>
  );
}
