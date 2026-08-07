import type { Metadata } from "next";
import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { NAVIGATION } from "@/content/navigation";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  /* لا تُفهرَس: صفحةٌ لا محتوى فيها، وفهرستُها تُدخل عنوانًا فارغًا في نتائج
     البحث. و`robots` هنا تغلب الافتراض العامّ في `layout.tsx`. */
  robots: { index: false, follow: true },
};

/**
 * صفحة ٤٠٤ — **طريقُ عودةٍ لا اعتذار**.
 *
 * القاعدة (B10 في مهارة التصميم): «طريق عودة من كل صفحة». فالصفحة تعرض
 * وجهاتٍ حقيقيّة من `NAVIGATION` — لا زرَّ «رجوع» وحده يفترض أن الزائر جاء
 * من مكانٍ في الموقع، وهو غالبًا جاء من بحثٍ أو رابطٍ قديم.
 *
 * ⚠️ **بلا «عذرًا!» ولا علامة تعجّب** — القاعدة B8: لا «Oops» في الأخطاء
 * ولا علامات تعجّبٍ في الرسائل. الخبر يُقال مباشرةً: الرابط لم يعد قائمًا.
 *
 * والعلامة هنا **زخرفيّة** (`decorative`) لأن اسم النادي مكتوبٌ في الشريط
 * فوقها — فنطقُها مرّتين تكرار.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main
        id="main"
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-s4 py-s9 sm:px-s7"
      >
        <Mark decorative className="h-10 w-auto text-accent" />

        <h1 className="mt-s6 text-balance font-display text-3xl font-bold text-fg sm:text-4xl">
          هذي الصفحة غير موجودة
        </h1>
        <p className="mt-s4 max-w-measure text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">
          الرابط الذي فتحته لم يعد قائمًا، أو كُتب خطأً. وهذي أقسام الموقع
          كاملةً — اختر منها وجهتك.
        </p>

        {/* وجهاتٌ حقيقيّة من مصدر التنقّل نفسه، فلا تفترق عن الشريط ولا
            تتقادم حين يتغيّر الهيكل. */}
        <nav aria-label="أقسام الموقع" className="mt-s7">
          <ul className="grid gap-s3 sm:grid-cols-2">
            {NAVIGATION.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-14 items-center rounded-3xl border border-border-quiet bg-bg-raised px-s5 font-display text-base font-semibold text-fg transition-[background-color,transform] hover:bg-bg-sunken active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <SiteFooter />
    </>
  );
}
