import Script from "next/script";

import "./admin.css";

/**
 * لوحة الإدارة — **مثبَّتةٌ على الوضع الفاتح**، وبنظامٍ زجاجيّ مستقلّ.
 *
 * ⚠️ التثبيت ليس تفضيلًا جماليًّا: `/admin` بلا شريطٍ علويّ ولا مبدّل وضع،
 * فمن يفتحها عالقٌ على ما حُفظ في متصفّحه من الموقع العامّ بلا طريقٍ
 * للتبديل. وهي جدول بياناتٍ كثيف يُمسح بالعين صفًّا صفًّا.
 *
 * والتثبيت **لا يمسّ تفضيل الزائر**: يُكتب `data-theme` على الوثيقة ولا
 * يُحفظ في `localStorage`، فيرجع الموقع العامّ إلى اختياره كما تركه.
 * والنصّ يعمل **قبل أول رسم** لا في `useEffect` — التأجيل يرسم اللوحة
 * داكنةً لحظةً ثم تقفز.
 *
 * و`admin.css` يحمل أرضية اللوحة وألواحها — بهوية النادي: حوافُّ حادّة
 * وخمسةُ ألوان وميلانٌ توقيعًا. ونطاقه هذي الشجرة وحدها.
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
      <div className="admin-shell">
        {children}
      </div>
    </>
  );
}
