import Script from "next/script";

/**
 * لوحة الإدارة — **مثبَّتةٌ على الوضع الفاتح**.
 *
 * ⚠️ ليست تفضيلًا جماليًّا: `/admin` بلا شريطٍ علويّ ولا مبدّل وضع، فمن
 * يفتحها عالقٌ على ما حُفظ في متصفّحه من تصفّح الموقع العامّ — بلا طريقٍ
 * للتبديل. وهي جدول بياناتٍ كثيف يُمسح بالعين صفًّا صفًّا، والأرضية الفاتحة
 * أوضح له.
 *
 * والتثبيت **لا يمسّ تفضيل الزائر**: يُكتب `data-theme` على الوثيقة ولا
 * يُحفظ في `localStorage`، فيرجع الموقع العامّ إلى اختياره كما تركه.
 *
 * والنصّ يعمل **قبل أول رسم** (`beforeInteractive`) لا في `useEffect`:
 * التأجيل يرسم اللوحة داكنةً لحظةً ثم تقفز — وميضٌ يُرى في كل فتحة.
 */

const FORCE_LIGHT = `document.documentElement.dataset.theme='light'`;

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script id="mis-admin-light" strategy="beforeInteractive">
        {FORCE_LIGHT}
      </Script>
      {children}
    </>
  );
}
