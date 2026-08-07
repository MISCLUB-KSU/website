import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic } from "next/font/google";
import Script from "next/script";

import { MotionProvider } from "@/components/motion";
import { THEME_INIT_SCRIPT } from "@/components/site/theme-toggle";
import "./globals.css";

/**
 * الخطان يُستضافان ذاتيًا عبر next/font — بدون أي طلب لخوادم جوجل،
 * وبدون قفزة في التخطيط عند التحميل.
 *
 * وجهان لا ثالث: الكوفي يحمل العناوين لأن بناءه من ضربات مستقيمة —
 * نفس منطق الشعار — والسانس يحمل المتن ولا يزاحمه.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const kufi = Noto_Kufi_Arabic({
  variable: "--font-kufi",
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://misclubksu.com";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f9" },
    { media: "(prefers-color-scheme: dark)", color: "#011c40" },
  ],
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ar"
      dir="rtl"
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
        {/* طبقة الحركة — تُوقف نفسها لمن طلب تقليل الحركة. لا تُخفي محتوى:
            انظر القاعدة في رأس `components/motion.tsx`. */}
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
