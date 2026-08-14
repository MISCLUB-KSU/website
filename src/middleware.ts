import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * تحديث جلسة الإدارة، وحراسة `/admin`.
 *
 * **لماذا وسيطٌ أصلًا؟** رمز الجلسة ينتهي، و`Server Component` لا يستطيع
 * الكتابة في الكوكيز — فبلا هذا الوسيط تنتهي جلسة المُراجِع وهو يتصفّح ولا
 * تُجدَّد، فيُطرد كل ساعة. الوسيط يُجدّدها في كل طلبٍ ويكتبها في الردّ.
 *
 * ⚠️ **والحراسة هنا راحةٌ لا حاجزُ أمان.** الحاجز الحقيقي سياسات `RLS`:
 * لو تسرّب أحدٌ إلى `/admin` بلا جلسة، لا يجد بيانات — الاستعلام يرجع
 * صفرًا. هذا يوفّر عليه صفحةً فارغة لا أكثر.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /* ⚠️ `getUser()` لا `getSession()`: الأولى تتحقّق من الرمز عند الخادم،
     والثانية تقرأ الكوكي كما هو — وكوكي مزوَّرٌ يمرّ منها. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";

  if (!user && path.startsWith("/admin") && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /* الوسيط على `/admin` وحدها ومسار التأكيد. تشغيلُه على الموقع كلّه
     يضيف نداءً شبكيًّا إلى Supabase في كل طلبِ صفحةٍ عامّة بلا فائدة. */
  matcher: ["/admin/:path*", "/auth/:path*"],
};
