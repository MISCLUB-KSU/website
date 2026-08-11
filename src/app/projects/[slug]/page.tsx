import { notFound, redirect } from "next/navigation";

import { PROJECTS, findProject } from "@/content/projects";

/**
 * صفحة المشروع المنفرد — **مغلقةٌ مع فهرس المشاريع** (١٠ أغسطس ٢٠٢٦).
 *
 * ⚠️ **إغلاق الفهرس وحده يترك الشبابيك مفتوحة.** الصفحات المنفردة
 * `‎/projects/misthon` وأخواتها كانت تُولَّد ثابتةً وتبقى مخدومةً ومفهرسة،
 * فتُرى تفاصيلُ مشروعٍ بلا شعارٍ من بابٍ جانبيّ بينما البابُ الرئيس مغلق.
 * فتُوجَّه كلُّها إلى الفهرس حيث «ترقّبونا».
 *
 * ⚠️ **والتوجيه مؤقّتٌ لا دائم.** `redirect` تُصدر **307** و
 * `permanentRedirect` تُصدر **308**. والدائم يقول لمحرّكات البحث إن هذي
 * العناوين ماتت فتُسقِط ترتيبها ويصعب رجوعه — والصفحات ستعود حين تجهز
 * الشعارات. فالمؤقّت هو الصحيح هنا، وليس تهاونًا.
 *
 * وللفتح: أعِد الملفّ من `27407d3:src/app/projects/[slug]/page.tsx`،
 * وبيانات `projects.ts` لم تُمسّ — هي مصدر رغبات نموذج التسجيل.
 */

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;

  /* ⚠️ **المجهولُ يبقى 404، والمعروفُ وحده يُوجَّه.** أوّل بناءٍ وجّه كلَّ
     سلاگٍ بلا فحص، فصار `‎/projects/أيّ-خطأ` يردّ **307** بدل 404 — مصيدةٌ
     تبتلع كلَّ عنوانٍ خاطئ وتقول للمتصفّح ومحرّك البحث إن الصفحة موجودةٌ
     في مكانٍ آخر. قِيس فوُجد، ولولا القياس لمرّ: التوجيه يعمل، والعطل في
     ما **لا** يُوجَّه. */
  if (!findProject(slug)) notFound();

  redirect("/projects");
}
