import type { Metadata } from "next";

import { LeadershipChart } from "@/components/leadership/chart";
import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { newestTerm } from "@/content/leadership";
import { ABOUT_SECTION } from "@/content/navigation";

import "./structure.css";

export const metadata: Metadata = {
  title: "الهيكل القيادي",
  description:
    "من يقود نادي نظم المعلومات الإدارية هذا الفصل: الرئاسة، ثم اللجان ووحداتها، ثم المشاريع.",
  alternates: { canonical: "/about/structure" },
};

/**
 * الهيكل القيادي — «النزول القيادي».
 *
 * ⚠️ **هذه الصفحة عكست قرارين كانا مكتوبين هنا**، فلا يُعاد أحدهما ظنًّا
 * أنه سقط سهوًا:
 *
 * 1. **كانت لا تُنشر أسماء.** صارت تُنشر — لأن الهيكل القيادي ينشره النادي
 *    رسميًّا كلَّ فصل في بطاقةٍ مصمَّمة. حدُّ الاستثناء `content/leadership.ts`
 *    وهذه الصفحة وحدها؛ وقاعدةُ `content/people.ts` قائمةٌ لم تُلغَ.
 * 2. **كان لا مخطّط شجريّ.** صار — لكنّ اعتراضَ التعليق القديم بقي محلولًا
 *    لا متجاهَلًا: الشجرة **قائمةٌ متداخلةٌ دلاليًّا** (`section` ← `h2` ←
 *    `ol` ← `li`) بترتيبٍ تنازليٍّ صارم، والخطوطُ الواصلةُ زخرفةٌ موسومةٌ
 *    `aria-hidden`. فقارئُ الشاشة يقرأ الهرم، والعينُ ترى الفروع، ولا
 *    ينهار شيءٌ على الجوّال لأن المروحة تصير سلسلةً رأسيّةً دون 1024px.
 *
 * والمرجعُ شكلًا صفحةُ `/board` في الموقع القديم — طلبها حسام «أنضج وأحسن
 * وبهوية النادي». الفروقُ مجدولةٌ في رأس `structure.css`.
 */
export default function StructurePage() {
  const term = newestTerm();

  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="structure"
          title="الهيكل القيادي"
          lede="من الرئاسة إلى آخر وحدة: كل من يقود النادي هذا الفصل، ومكانه من الهيكل."
          siblings={ABOUT_SECTION.children}
          currentHref="/about/structure"
        />

        <LeadershipChart term={term} />
      </main>

      <SiteFooter />
    </>
  );
}
