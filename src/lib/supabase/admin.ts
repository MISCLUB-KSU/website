import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "./server";

/**
 * عميل Supabase **بمفتاح الخدمة** — يتجاوز `RLS` كاملةً.
 *
 * ⚠️ **لا يُستورَد إلا في كودٍ يعمل على الخادم وحده.** `import "server-only"`
 * أعلاه يجعل استيراده من مكوّنٍ عميل خطأَ بناءٍ لا خطأ تشغيل — فلا يتسرّب
 * المفتاح إلى حزمة المتصفّح بسهوٍ في سطر استيراد.
 *
 * **لماذا يلزم أصلًا؟** جدول `applications` بلا سياسة `insert` بتاتًا: لا
 * زائر ولا مسجَّل يستطيع إدراج طلب. الطالب لا يملك حسابًا، فلا هويّة تُمنح
 * له سياسة. فالإدراج يمرّ من `Server Action` بمفتاح الخدمة بعد أن يجتاز
 * التحقّق في `registration.ts` — والتحقّق هو الحارس، لا `RLS`.
 *
 * وكذلك رفع السيرة: المستودع خاصّ بلا سياسات، والرفع والتوقيع من هنا.
 */
export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        /* لا جلسة ولا تحديث رمزٍ تلقائيّ: هذا عميلٌ بلا مستخدم، وإبقاء
           إدارة الجلسة يجعله يكتب في تخزينٍ لا وجود له على الخادم. */
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/** المستودع الخاصّ بالسير الذاتية — نفس المعرّف في هجرة `cv_private_bucket` */
export const CV_BUCKET = "cv";
