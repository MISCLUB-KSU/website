import type { MetadataRoute } from "next";

import { COMMITTEES } from "@/content/committees";
import { POSTS } from "@/content/posts";
import { SITE_URL } from "@/lib/site";

/**
 * `sitemap.xml` — خريطةُ ما نريد أن يُعثر عليه.
 *
 * ⚠️ **مشتقّةٌ من المحتوى لا مكتوبةٌ بيدٍ.** لو كُتبت قائمةً ثابتة لصارت
 * تكذب عند أول مشروعٍ يُضاف أو لجنةٍ تُحذف — وقد حذفنا «لجنة المشاريع»
 * اليوم فعلًا. وهنا تُبنى من `COMMITTEES` و`POSTS` أنفسها،
 * فتصحّ ما دامت هي تصحّ.
 *
 * ⚠️⚠️ **ولا تُدرج ما منعه `robots.ts`**: اللوحة، والروابط المباشرة،
 * ومسار التأكيد. خريطةٌ تعلن عنوانًا ثم يمنع `robots` الزحفَ إليه تناقضٌ
 * يشتكي منه `Search Console`، ولا يُصلحه أحدٌ لأنه لا يُرى في المتصفّح.
 *
 * ── الأولويّات ──────────────────────────────────────────────────────────
 * `priority` **ترتيبٌ نسبيّ داخل موقعنا** لا درجةٌ عالمية، ولا تُقارَن
 * بمواقع أخرى. فالرئيسية والتقديم أعلاها لأنهما وجهةُ الزائر، ثم صفحات
 * الجهات، ثم ما يُقرأ مرّة.
 *
 * و`lastModified` صادقٌ حيث يُعرف: المنشورات لها تاريخ. وما لا تاريخَ له
 * يُترك بلا ادّعاء — تاريخُ اليوم على صفحةٍ لم تتغيّر منذ شهرين إشارةٌ
 * كاذبة تُفقد الخريطة قيمتها عند المحرّك.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (
    path: string,
    priority: number,
    lastModified?: string,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    priority,
    changeFrequency: "monthly",
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
  });

  return [
    page("/", 1),
    page("/join", 1),

    page("/committees", 0.9),
    ...COMMITTEES.map((c) => page(`/committees/${c.slug}`, 0.8)),

    /* ⚠️ المشاريع خارج الخريطة ما دامت مغلقة: الفهرس `noindex` والصفحات
       المنفردة تُوجَّه إليه، وإدراجُ ما لا يُفهرس يناقض الخريطة نفسها.
       تُعاد هذي السطور عند الفتح. */

    page("/about", 0.7),
    page("/about/partnerships", 0.6),

    page("/achievements", 0.7),
    page("/faq", 0.6),
    page("/contact", 0.6),

    /* المنشورات وحدها لها تاريخٌ حقيقيّ، وهي الأكثر تغيّرًا */
    page("/posts", 0.6),
    ...POSTS.map((post) => ({
      url: `${SITE_URL}/posts/${post.slug}`,
      priority: 0.5,
      changeFrequency: "yearly" as const,
      lastModified: new Date(`${post.date}T00:00:00Z`),
    })),
  ];
}
