import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic } from "next/font/google";
import Script from "next/script";
import { SITE_URL } from "@/lib/site";

import { MotionProvider } from "@/components/motion";
import {
  CURTAIN_INIT_SCRIPT,
  LoadCurtain,
} from "@/components/site/load-curtain";
import { THEME_INIT_SCRIPT } from "@/components/site/theme-toggle";
import "./globals.css";

/**
 * الخطان يُستضافان ذاتيًا عبر next/font — بدون أي طلب لخوادم جوجل،
 * وبدون قفزة في التخطيط عند التحميل.
 *
 * وجهان لا ثالث: الكوفي يحمل العناوين لأن بناءه من ضربات مستقيمة —
 * نفس منطق الشعار — والسانس يحمل المتن ولا يزاحمه.
 */
/**
 * ⚠️ **الخطوط كانت ٦٢٪ من زنة الصفحة — 392KB من 629.** مقيسٌ ببناء إنتاج:
 * اثنا عشر ملفًّا، **أحدَ عشرَ منها `rel=preload`** تتزاحم في اللحظة الحرجة.
 * وثلاثةُ تخفيضاتٍ كلُّها مقيسة لا مقدَّرة:
 *
 * ١) **الوزن 300 محذوف** — `font-light` له **صفرُ استخدامٍ** في المستودع
 *    كلِّه (مفحوصٌ بالبحث)، وكان يُحمَّل ويُسبَق تحميلُه بلا أن يُرسم حرف.
 *
 * ٢) **`latin` محذوفة، و`arabic` تكفي.** الدليل قاطعٌ من الخطّ الآخر:
 *    `Noto Kufi Arabic` معرَّفٌ بـ`arabic` وحدها منذ البداية، ومع ذلك
 *    `document.fonts.check` يردّ `true` لأرقام «0123» ولحروف «MIS» —
 *    وأرقامُ الركائز الستّونيّة تُرسم به فعلًا. أي أن مجموعة Google
 *    العربية **تحمل اللاتيني معها**، فكانت `latin` تكرارًا يكلّف أربعة
 *    ملفّات. واللاتينيّ ٢٫٥٪ من حروف الصفحة أصلًا (55 من 2198).
 *
 * ٣) **`preload` مُطفأ على المتن لا على العناوين.** عنصرُ LCP هو `<h1>`
 *    وخطُّه الكوفي — فيبقى مسبوقَ التحميل. والمتنُ يُحمَّل بعد اكتشافه في
 *    الأنماط، و`display: swap` مع بديلٍ مضبوطِ المقاييس (`next/font`
 *    يولّده) تعني نصًّا مقروءًا فورًا **بلا إزاحة تخطيط** — وCLS المقيس
 *    صفر، ويُعاد قياسُه بعد هذا التغيير لا يُفترض.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const kufi = Noto_Kufi_Arabic({
  variable: "--font-kufi",
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
});



export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "نادي نظم المعلومات الإدارية | جامعة الملك سعود",
    template: "%s | نادي نظم المعلومات الإدارية",
  },
  description:
    "نادي طلابي في جامعة الملك سعود يبني كفاءات تقنية وإدارية عبر مشاريع نوعية: MISthon، MISology، InterMission، Impact، وJob Shadowing.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: SITE_URL,
    siteName: "نادي نظم المعلومات الإدارية",
    title: "نادي نظم المعلومات الإدارية | جامعة الملك سعود",
    description:
      "نبني كفاءات تقنية وإدارية عبر مشاريع نوعية تربط الطالب بسوق العمل.",
  },
  twitter: {
    card: "summary_large_image",
    title: "نادي نظم المعلومات الإدارية | جامعة الملك سعود",
    description:
      "نبني كفاءات تقنية وإدارية عبر مشاريع نوعية تربط الطالب بسوق العمل.",
  },
  robots: { index: true, follow: true },
};

/**
 * ملاحظة: لا نضع maximum-scale — الموقع القديم كان يمنع التكبير بالأصابع،
 * وهي مخالفة لمعيار WCAG 1.4.4 وتضر ضعاف البصر.
 */
export const viewport: Viewport = {
  /**
   * ⚠️ **`cover` مع أصنافِ المناطق الآمنة في `globals.css` — لا وحدها.**
   * بدونها يحجز المتصفّح شريطًا حول النتوء فلا تمتدّ أرضيةُ الصفحة إلى
   * الحافّة، وتظهر حوافُّ بلونٍ غريبٍ في الوضع الأفقي. ومعها تمتدّ الأرضية
   * وتتكفّل `.mis-safe-*` بإبعاد المحتوى — وهما يُعدَّلان معًا: `cover`
   * وحدها تُدخل المحتوى **تحت** النتوء.
   */
  viewportFit: "cover",
  /**
   * لونُ شريط المتصفّح — **قيمةٌ واحدة فاتحة، لا قيمتان بحسب الجهاز.**
   *
   * ⚠️ كانتا مربوطتين بـ`prefers-color-scheme`، وصار ذلك يكذب بعد أن صار
   * الفاتح أصلَ الموقع (١٤ أغسطس ٢٠٢٦): زائرٌ جديد على جهازٍ داكن يرى صفحةً
   * فاتحة وشريطَ متصفّحٍ داكنًا فوقها — وهو أظهرُ ما يكون على الجوّال.
   *
   * والوسم ساكنٌ لا يقرأ `data-theme`، فمن اختار الداكن يصحّحه `ThemeToggle`
   * بعد التركيب وعند كل تبديل. والتصحيح متأخّرٌ إطارًا عن الرسم — مقبولٌ
   * للونِ شريطٍ، بخلاف ألوان الصفحة التي يسبقها نصّ `<head>`.
   */
  themeColor: "#f9f9f9",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
      /* ⚠️ **الفاتح أصلُ الموقع — بقرارٍ في ١٤ أغسطس ٢٠٢٦:** «اللون الأساسي
         بالموقع هو اللايت مود، إذا دخل يوزر جديد إجباري يدخل على اللايت».

         وكتابتُها على الخادم لا في نصّ `<head>` وحده مقصودة: من عطّل
         الجافاسكربت أو تعثّر تحميلُه يبقى على الفاتح ولا يسقط إلى تفضيل
         جهازه. والرموز مُعدّةٌ لهذا أصلًا — كتلة الوضع الداكن في
         `tokens.generated.css` مكتوبةٌ `:root:not([data-theme="light"])`،
         فوجودُ السمة هنا يقهر `prefers-color-scheme` بلا حيلةٍ إضافية.

         ⚠️ ولا يُلغي هذا اختيار الزائر: نصُّ `mis-theme-init` أدناه يقرأ
         `localStorage` **قبل** أوّل رسم ويكتب فوقها، فمن اختار الداكن مرّةً
         يراه داكنًا بلا وميض. */
      data-theme="light"
      className={`${plexArabic.variable} ${kufi.variable} h-full antialiased`}
      /* النصّ أدناه يكتب `data-theme` قبل أول رسم، فيختلف الوسم عن الخادم عمدًا */
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* يقرأ الاختيار المحفوظ ويطبّقه **قبل** أول رسم. بدونه تُرسم الصفحة
            بوضع النظام ثم تقفز إلى المحفوظ — وميضٌ يراه الزائر كل مرّة.
            نصّ ثابت مكتوب في `theme-toggle.tsx`، لا مدخل فيه من أحد.
            `beforeInteractive` هي وسيلة Next لحقنه في HTML الأوّلي؛ و`<script>`
            عاريًا داخل مكوّن يُخرج تحذير React 19 «سكربت داخل مكوّن». */}
        <Script id="mis-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {/* يضع `data-loaded` قبل أوّل رسم، فيعبر ستارُ التحميل مرّةً في
            الجلسة لا في كلِّ صفحة. وفشلُه آمنٌ في الاتجاهين — التعليل
            كاملًا في رأس `load-curtain.tsx`. */}
        <Script id="mis-curtain-init" strategy="beforeInteractive">
          {CURTAIN_INIT_SCRIPT}
        </Script>
        {/* الستارُ **قبل** المحتوى في الشجرة: هو زخرفةٌ `aria-hidden` لا
            تبتلع ضغطة، وتنسحب بـCSS وحدها. */}
        <LoadCurtain />
        {/* طبقة الحركة — تُوقف نفسها لمن طلب تقليل الحركة. لا تُخفي محتوى:
            انظر القاعدة في رأس `components/motion.tsx`. */}
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
