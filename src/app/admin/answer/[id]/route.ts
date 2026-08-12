import { NextResponse, type NextRequest } from "next/server";

import {
  ANSWER_FILES_PREFIX,
  CV_BUCKET,
  createAdminClient,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * تنزيل مرفقِ سؤالِ قائد برابطٍ موقَّت.
 *
 * توأمُ `admin/cv/[id]/route.ts` وبنفس ترتيبه الذي هو كلُّ الأمان: التحقّق
 * من النطاق **بجلسة المستخدم** أوّلًا فتحكمه `RLS`، ثم التوقيع بمفتاح
 * الخدمة. ومن ليس الطلبُ في نطاقه يرجع بلا صفٍّ فيُردّ 404 — لا 403، حتى
 * لا يُستدلّ بوجود الطلب من نوع الردّ.
 *
 * ⚠️ **والفرقُ عن السيرة أن المسار هنا يأتي من `answers` لا من عمودٍ
 * مخصَّص.** و`answers` عمود `jsonb` تكتبه الخادمُ وحدَه، لكنه يحمل مفاتيحَ
 * حرّة — فالمسار المقروء منه يُشترط أن يبدأ بـ`answers/<معرّف الصفّ>/`
 * قبل أن يُوقَّع. بهذا لا يستطيع أحدٌ — ولو تسلّل إلى العمود — أن يجعل
 * المسارَ يشير إلى ملفّ طلبٍ آخر في المستودع نفسه.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return new NextResponse("غير موجود", { status: 404 });
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("applications")
    .select("answers")
    .eq("id", id)
    .maybeSingle();

  const answers = (row?.answers ?? {}) as Record<string, unknown>;
  const path = answers[key];

  if (typeof path !== "string" || !path.startsWith(`${ANSWER_FILES_PREFIX}/${id}/`)) {
    return new NextResponse("غير موجود", { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, 60);

  if (error || !data) {
    console.error("[admin] تعذّر توقيع رابط المرفق", error?.message);
    return new NextResponse("تعذّر فتح الملفّ", { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
