import Script from "next/script";

import "./admin.css";
import "./dash.css";

/**
 * لوحة الإدارة — **داكنةٌ افتراضًا وقابلةٌ للتبديل**، وبنظامٍ زجاجيّ مستقلّ.
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

/**
 * ⚠️ **يعمل قبل أول رسم، ولا يمسّ تفضيل الزائر.**
 *
 * الوضع يُقرأ من مفتاحٍ خاصّ باللوحة (`mis-admin-theme`) لا من مفتاح
 * الموقع العامّ — فتبديلُك هنا لا يقلب الموقع الذي تقرؤه في المتصفّح نفسه.
 * والافتراض داكن. والتأجيلُ إلى `useEffect` يرسم اللوحة فاتحةً لحظةً ثم
 * تقفز، فالنصّ `beforeInteractive`.
 */
const SET_THEME = `try{var t=localStorage.getItem('mis-admin-theme');document.documentElement.dataset.theme=(t==='light'?'light':'dark')}catch(e){document.documentElement.dataset.theme='dark'}`;

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script id="mis-admin-light" strategy="beforeInteractive">
        {SET_THEME}
      </Script>
      <div className="admin-shell">
        {children}
      </div>
    </>
  );
}
