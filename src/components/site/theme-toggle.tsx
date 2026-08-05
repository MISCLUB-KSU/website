"use client";

import { useEffect, useState } from "react";

/**
 * مبدّل الوضع الفاتح/الداكن.
 *
 * **العلامة مربّع مشطور بزاوية ٢٤°** — لا شمسٌ وقمر. مبدّل الشمس/القمر
 * عنصرٌ جاهز يُعرف من نظرة أنه من قالب، والشطر المائل هنا مشتقّ من هندسة
 * الشعار: نصف حبر ونصف بياض، فيُقرأ معناه بلا شرح ولا يصلح لعلامة أخرى.
 *
 * **ثلاث حالات لا اثنتان:** «تلقائي» يتبع تفضيل النظام، ثم فاتح، ثم داكن.
 * بدون «تلقائي» يُحبَس الزائر في اختيارٍ اتّخذه مرّة ولا يستطيع الرجوع إلى
 * إعداد جهازه.
 *
 * الاختيار يُطبَّق على `documentElement` مباشرةً لا عبر حالة React: النصّ في
 * `layout` يقرأه قبل أول رسم، فلا ترتدّ الصفحة من فاتح إلى داكن أمام العين.
 */

export const THEME_KEY = "mis-theme";

/**
 * يُحقن في `<head>` قبل أي رسم — نصّ ثابت مكتوب هنا، لا مدخل من أحد.
 * بدونه تُرسم الصفحة بالوضع الافتراضي ثم تقفز إلى المحفوظ (وميض مزعج).
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

type Choice = "auto" | "light" | "dark";

const NEXT: Record<Choice, Choice> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

const LABEL: Record<Choice, string> = {
  auto: "المظهر: يتبع النظام",
  light: "المظهر: فاتح",
  dark: "المظهر: داكن",
};

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === "auto") {
    delete root.dataset.theme;
    localStorage.removeItem(THEME_KEY);
  } else {
    root.dataset.theme = choice;
    localStorage.setItem(THEME_KEY, choice);
  }
}

export function ThemeToggle() {
  /* يبدأ «تلقائي» ليطابق ما رسمه الخادم، ثم يُصحَّح بعد أول إطار —
     القراءة من `localStorage` أثناء العرض تختلف عن الخادم فتكسر الترطيب. */
  const [choice, setChoice] = useState<Choice>("auto");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = document.documentElement.dataset.theme;
      if (saved === "light" || saved === "dark") setChoice(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT[choice];
        apply(next);
        setChoice(next);
      }}
      aria-label={`${LABEL[choice]} — اضغط للتبديل`}
      title={LABEL[choice]}
      className="inline-flex size-11 shrink-0 items-center justify-center text-fg transition-colors hover:text-accent"
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="size-[18px]"
        /* «تلقائي» يُميَّز بحلقة خارجية لا بلون ثالث — اللون يحمل معنى
           في هذا النظام، وإضافة لون رابع لحالة واجهة يُفسده. */
        style={{ opacity: choice === "auto" ? 0.55 : 1 }}
      >
        <rect
          x="0.9"
          y="0.9"
          width="18.2"
          height="18.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        {/* النصف الممتلئ — الشطر بزاوية الشعار نفسها */}
        <polygon points="0.9,0.9 14.4,0.9 5.6,19.1 0.9,19.1" fill="currentColor" />
      </svg>
    </button>
  );
}
