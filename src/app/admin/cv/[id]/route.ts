import { NextResponse, type NextRequest } from "next/server";

import { CV_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * تنزيل السيرة الذاتية برابطٍ موقَّت.
 *
 * ⚠️ **التحقّق من النطاق يجري بجلسة المستخدم، والتوقيع بمفتاح الخدمة —
 * وترتيبُهما هو كلّ الأمان هنا.**
 *
 * المستودع خاصّ بلا سياسات، فلا أحد يقرأ منه بجلسته. ولو وقّعنا أوّلًا ثم
 * تحقّقنا، لصار المسار يوقّع لكل من يعرف معرّف طلبٍ. فالخطوة الأولى قراءةُ
 * الصفّ **بعميل الجلسة**: إن لم يكن الطلب في نطاق الداخل رجع `RLS` بلا
 * صفٍّ، فنردّ 404 — لا 403، حتى لا يُستدلّ بوجود الطلب من نوع الردّ.
 *
 * ولا يُخدَم الملفّ من خادمنا: يُعاد توجيه المتصفّح إلى رابطٍ موقَّت يسقط
 * بعد دقيقة، فلا يبقى رابطٌ يُنسخ ويُتداول.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("applications")
    .select("cv_path")
    .eq("id", id)
    .maybeSingle();

  if (!row?.cv_path) {
    return new NextResponse("غير موجود", { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CV_BUCKET)
    .createSignedUrl(row.cv_path, 60);

  if (error || !data) {
    console.error("[admin] تعذّر توقيع رابط السيرة", error?.message);
    return new NextResponse("تعذّر فتح الملفّ", { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
