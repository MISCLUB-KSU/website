import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * عميل Supabase **بجلسة المستخدم**.
 *
 * يقرأ الجلسة من الكوكيز فيحمل هويّة الداخل، فتُطبَّق عليه سياسات `RLS`
 * كاملةً: قائدُ اللجنة لا يرى إلا نطاقه، ومن ليس في `staff` لا يرى شيئًا.
 * هذا هو العميل المستعمل في كل قراءةٍ تخصّ صفحة الإدارة.
 *
 * ⚠️ **لا يُستعمل للكتابة في `applications`.** لا سياسة `insert` أصلًا،
 * فالكتابة تمرّ بـ`admin.ts` وحده — انظر تعليقه.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          /* ⚠️ الكتابة في الكوكيز ترمي داخل `Server Component` — وهذا
             متوقَّع لا خطأ: تحديث الجلسة يجري في `middleware.ts`، والمحاولة
             هنا تُبتلع عمدًا. بلا هذا الالتقاط تسقط كل صفحةٍ تقرأ الجلسة. */
          try {
            for (const { name, value, options } of list) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* مقصود — انظر أعلاه */
          }
        },
      },
    },
  );
}

/**
 * ⚠️ **الانفجار المبكر مقصود.** متغيّرٌ ناقص يجعل العميل يتّصل بـ
 * `undefined` فيفشل بأخطاءٍ غامضة وقت الطلب. هنا يسقط عند أول استعمال
 * برسالةٍ تقول أيّ متغيّرٍ ينقص.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `متغيّر البيئة ${name} غير مضبوط — راجع \`.env.example\`.`,
    );
  }
  return value;
}
