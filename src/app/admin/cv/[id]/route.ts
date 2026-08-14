import { NextResponse, type NextRequest } from "next/server";

import { CV_BUCKET, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * تنزيل مرفقات الطلب برابطٍ موقَّت — السيرة الذاتية وملفّ المشاريع.
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
 *
 * ⚠️ **ومسارٌ واحدٌ للمرفقين لا مساران.** الملفّان من صنفٍ واحد ويشتركان في
 * الترتيب الأمنيّ أعلاه حرفًا بحرف، ونسخُه في ملفٍّ ثانٍ يعني أن تصحيحًا
 * يومًا يُطبَّق على أحدهما ويُنسى الآخر. والنوعُ يُقرأ من `?kind` **بقائمةٍ
 * مغلقة**: أي قيمةٍ أخرى تسقط إلى السيرة، فلا يُبنى اسمُ عمودٍ ممّا يكتبه
 * الزائر في العنوان.
 */
const COLUMNS = {
  cv: "cv_path",
  projects: "projects_path",
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const kind = request.nextUrl.searchParams.get("kind");
  const column = kind === "projects" ? COLUMNS.projects : COLUMNS.cv;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("applications")
    .select(column)
    .eq("id", id)
    .maybeSingle<Record<string, string | null>>();

  const path = row?.[column];
  if (!path) {
    return new NextResponse("غير موجود", { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data) {
    console.error("[admin] تعذّر توقيع رابط المرفق", {
      column,
      error: error?.message,
    });
    return new NextResponse("تعذّر فتح الملفّ", { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
