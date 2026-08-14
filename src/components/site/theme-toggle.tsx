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
 * وما فُقد منها استُبقي: **أول زيارة تتبع جهاز الزائر** — لا يُكتب
 * `data-theme` إطلاقًا قبل أول ضغطة، فتحكم كتلة `prefers-color-scheme` في
 * `tokens.generated.css`. الضغطة الأولى تحوّله إلى اختيارٍ صريح ومحفوظ.
 * فالخسارة الوحيدة: من اختار مرّةً لا يملك زرًّا للرجوع إلى إعداد جهازه.
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

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

/** ما يراه الزائر الآن: اختيارُه المحفوظ إن وُجد، وإلا فتفضيل جهازه. */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  /* يبدأ «فاتح» ليطابق ما رسمه الخادم، ثم يُصحَّح بعد أول إطار — الخادم لا
     يعرف `localStorage` ولا تفضيل الجهاز، فقراءتهما أثناء العرض تكسر الترطيب.
     التصحيح يمسّ وسمَ الزرّ وأيقونته فقط؛ ألوان الصفحة سبقته بنصّ `<head>`. */
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(currentTheme()));
    /* من لم يختر بعد يتبع جهازه — فإن بدّله وهو على الصفحة تبعته الأيقونة.
       يتوقّف الإنصات عند أول اختيار صريح، فلا يُنقض اختيار الزائر. */
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!document.documentElement.dataset.theme) setTheme(currentTheme());
    };
    mq.addEventListener("change", onSystemChange);
    return () => {
      cancelAnimationFrame(frame);
      mq.removeEventListener("change", onSystemChange);
    };
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
