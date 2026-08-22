import { NextResponse, type NextRequest } from "next/server";

import { rosterCsv, type RosterRow } from "@/app/admin/roster-csv";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * **مسارٌ حيٌّ يسحب منه Excel — بدل أن يكتب الموقعُ في ملفّه.**
 *
 * طلب فريقُ مشروعٍ أن تصل الطلباتُ الجديدة إلى ملفِّهم على `OneDrive` بلا
 * نسخٍ يدويّ. والكتابةُ في `OneDrive` شخصيٍّ من خادمٍ لا تدعمها مايكروسوفت
 * أصلًا (تحتاج مستخدمًا يوقّع كلَّ مرّة)، فانقلب الاتّجاه: الملفُّ يسحب
 * منّا. وفي Excel: `Data ← From Web`، وفي Google Sheets: `IMPORTDATA`.
 *
 * ⚠️ **والمفتاحُ يحدّد الجهةَ ولا يُمرَّر معها.** لو كان المفتاحُ واحدًا
 * والنطاقُ في العنوان، لبدّل أيُّ حاملٍ للرابط كلمةً واحدةً فقرأ جهةً
 * أخرى. فالخريطةُ من مفتاحٍ إلى نطاق: مفتاحُ Impact لا يفتح إلّا Impact.
 *
 * ⚠️ **وهو سرٌّ في عنوان — يُقال لمن يأخذه.** لا سبيلَ غيره: Excel لا يعرف
 * كيف يسجّل دخول اللوحة. فمن وصله الرابطُ وصلته القائمة، ولذلك: بلا رقم
 * أحوال، وجهةٌ واحدةٌ لا أكثر، ومفتاحٌ يُبدَّل من `Vercel` فيموت القديمُ
 * في اللحظة.
 *
 * ⚠️ **ولا يُفهرَس ولا يُخزَّن.** `noindex` كي لا يلتقطه زاحفٌ إن سُرّب في
 * صفحة، و`no-store` كي لا يبقى في ذاكرةٍ وسيطةٍ بعد تبديل المفتاح.
 */
export const dynamic = "force-dynamic";

/** `مفتاح=نطاق` مفصولةً بفواصل — `abc123=project:impact,def=committee:media` */
function scopeFor(key: string): string | null {
  const raw = process.env.FEED_TOKENS ?? "";
  for (const pair of raw.split(",")) {
    const at = pair.indexOf("=");
    if (at < 1) continue;
    const token = pair.slice(0, at).trim();
    const scope = pair.slice(at + 1).trim();
    /* ⚠️ الطولُ يُقارَن أوّلًا: مقارنةُ نصّين مختلفَي الطول تخرج من أوّل
       حرفٍ فتكشف الطولَ وحدَه — وهو ما لا يفيد مهاجمًا هنا، لكنّ العادةَ
       تُبنى صحيحةً. */
    if (token.length === key.length && token === key && scope) return scope;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("k") ?? "";
  const scope = key.length >= 16 ? scopeFor(key) : null;

  /* ردٌّ واحدٌ للمفتاح الخطأ وللمفتاح الناقص — فلا يُستدلّ بالفرق */
  if (!scope) {
    return new NextResponse("غير مصرّح", {
      status: 401,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  /* ⚠️ **مفتاحُ الخدمة هنا لأن الطالبَ لا جلسةَ له ولا للملفّ.** والحارسُ
     هو المفتاحُ أعلاه والقصُّ أدناه — لا `RLS`، إذ لا هويّةَ تُقاس بها. */
  const { data, error } = await createAdminClient()
    .from("applications")
    .select(
      "created_at, full_name, student_id, major, major_other, level, phone, email, linkedin, portfolio, cv_path, choice1, choice2, choice3, stage, status, interview_at, why, answers",
    )
    /* ⚠️ **مطابقةٌ بالقيمة أو ببادئةٍ بشرطة** — نظيرُ `choice_in_scopes` في
       القاعدة. وبدون الشرطة يسحب نطاقُ `committee:pr` جهةَ `committee:press`. */
    .or(
      [1, 2, 3]
        .map((n) => `choice${n}.eq.${scope},choice${n}.like.${scope}/%`)
        .join(","),
    )
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("[feed] تعذّرت القراءة", {
      code: error.code,
      message: error.message,
    });
    return new NextResponse("تعذّرت القراءة", { status: 500 });
  }

  /* ⚠️ **يُقصّ على من هو عند هذي الجهة الآن.** الاستعلامُ يجلب من ذكرها في
     أيّ رغبة — وهو ما تسمح به القاعدة — والملفُّ يريد طابورَ الجهة: من
     نزل عنها إلى غيرها ليس شغلَها. */
  const rows = (data ?? []).filter((r) => {
    const at =
      r.stage === 1 ? r.choice1 : r.stage === 2 ? r.choice2 : r.choice3;
    return at === scope || String(at ?? "").startsWith(`${scope}/`);
  }) as RosterRow[];

  return new NextResponse(rosterCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Disposition": 'inline; filename="mis-roster.csv"',
    },
  });
}
