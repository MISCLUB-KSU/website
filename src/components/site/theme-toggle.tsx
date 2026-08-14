"use client";

import { useEffect, useState } from "react";

/**
 * مبدّل الوضع الفاتح/الداكن.
 *
 * **العلامة مربّع مشطور بزاوية ٢٤°** — لا شمسٌ وقمر. مبدّل الشمس/القمر
 * عنصرٌ جاهز يُعرف من نظرة أنه من قالب، والشطر المائل هنا مشتقّ من هندسة
 * الشعار: نصف حبر ونصف بياض، فيُقرأ معناه بلا شرح ولا يصلح لعلامة أخرى.
 *
 * **حالتان لا ثلاث** (قرار الإدارة، ٦ أغسطس ٢٠٢٦): فاتح ⇄ داكن. كان هنا حالة
 * ثالثة «تتبع النظام»، وحُذفت لأن مبدّلًا ثلاثيّ الحالات يربك زائرًا يتوقّع
 * مفتاحًا يقلب لا دورةً تمرّ بثلاث.
 *
 * ⚠️ **وأوّل زيارةٍ فاتحةٌ دائمًا — لا تتبع جهاز الزائر** (١٤ أغسطس ٢٠٢٦):
 * «اللون الأساسي بالموقع هو اللايت مود، إذا دخل يوزر جديد إجباري يدخل على
 * اللايت». وكان قبلها لا يُكتب `data-theme` إطلاقًا حتى أوّل ضغطة، فتحكم
 * كتلةُ `prefers-color-scheme`. والآن يكتب **الخادم** `data-theme="light"`
 * على `<html>` (انظر `layout.tsx`)، فالافتراض فاتحٌ ولو تعطّل السكربت.
 *
 * والاختيار المحفوظ يعلوه: النصّ أدناه يقرؤه قبل أوّل رسم ويكتب فوقه.
 * فالخسارة الوحيدة كما كانت: من اختار مرّةً لا يملك زرًّا للرجوع إلى إعداد
 * جهازه — ولا معنى له اليوم أصلًا، فالجهاز لم يعد مرجعًا.
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

type Theme = "light" | "dark";

const LABEL: Record<Theme, string> = {
  light: "المظهر فاتح — اضغط للداكن",
  dark: "المظهر داكن — اضغط للفاتح",
};

/** لونا شريط المتصفّح — يطابقان أرضية الصفحة في الوضعين */
const BAR_COLOR: Record<Theme, string> = {
  light: "#f9f9f9",
  dark: "#011c40",
};

/**
 * يصحّح `<meta name="theme-color">`.
 *
 * الوسم في `layout.tsx` ساكنٌ على الفاتح — وهو الصواب للزائر الجديد — ولا
 * يقرأ `data-theme`. فمن اختار الداكن يصحَّح له هنا: عند التركيب وعند كل
 * تبديل. و`?.` لا شرط: غيابُ الوسم لا يستحقّ استثناءً يقطع التبديل.
 */
function paintBar(theme: Theme) {
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", BAR_COLOR[theme]);
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  paintBar(theme);
}

/**
 * ما يراه الزائر الآن: `data-theme` على `<html>`.
 *
 * ⚠️ ولا يُسأل الجهاز بعد اليوم. السمة مكتوبةٌ من الخادم دائمًا، فالسقوط
 * إلى الفاتح احتياطٌ لحالةٍ لا تقع — لا اتّباعٌ لتفضيل الجهاز كما كان.
 */
function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  /* يبدأ «فاتح» ليطابق ما رسمه الخادم، ثم يُصحَّح بعد أول إطار — الخادم لا
     يعرف `localStorage` ولا تفضيل الجهاز، فقراءتهما أثناء العرض تكسر الترطيب.
     التصحيح يمسّ وسمَ الزرّ وأيقونته فقط؛ ألوان الصفحة سبقته بنصّ `<head>`. */
  const [theme, setTheme] = useState<Theme>("light");

  /* ⚠️ **ورُفع الإنصات لتبديل الجهاز.** كان يتابع `prefers-color-scheme`
     لمن لم يختر بعد، فيقلب الأيقونة إن بدّل الزائر جهازه وهو على الصفحة.
     ولمّا صار الفاتح أصلًا مكتوبًا من الخادم، لم يعد `data-theme` يخلو
     أبدًا — فشرطُه لا يصدق، والإنصاتُ يستهلك ولا يفعل. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const now = currentTheme();
      setTheme(now);
      paintBar(now);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        apply(next);
        setTheme(next);
      }}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
      /* `text-fg-muted` لا `text-fg`: الفحميّ الصافي كان أدكنَ عنصرٍ في الشريط
         بجوار علامةٍ كحليّة وزرٍّ أزرق، فيسحب العين إلى ضابطٍ ثانويّ. والخافت
         يبقى فوق عتبة الرسوم الدالّة في الوضعين — 7.13:1 نهارًا و5.25:1 ليلًا. */
      className="inline-flex size-11 shrink-0 items-center justify-center text-fg-muted transition-colors hover:text-accent"
    >
      <svg viewBox="0 0 20 20" aria-hidden className="size-[18px]">
        <rect
          x="0.9"
          y="0.9"
          width="18.2"
          height="18.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        {/* النصف الممتلئ — الشطر بزاوية الشعار نفسها. وينعكس مع الوضع:
            المربّع يقلب نصفَه المحبَّر كما تقلب الصفحةُ أرضيتها، فتُقرأ الحالة
            من الشكل لا من الوسم وحده. المرآة حول x=10، والإطار متماثل فلا يتأثّر. */}
        <polygon
          points="0.9,0.9 14.4,0.9 5.6,19.1 0.9,19.1"
          fill="currentColor"
          transform={theme === "dark" ? "translate(20,0) scale(-1,1)" : undefined}
        />
      </svg>
    </button>
  );
}
