import raw from "./posts.json";
import { htmlToText, sanitizeHtml } from "@/lib/sanitize";

/**
 * مقالات النادي — مستوردة من نسخة الموقع السابق.
 *
 * `author` هنا جهة لا شخص («إدارة النادي») — ولا يُدخَل اسم شخص،
 * فالقاعدة تشمل المقالات كما تشمل بقية المواد.
 *
 * الصور نُقلت إلى `public/posts/` بصيغة WebP: كانت على شبكة توزيع خارجية
 * لمولّد صور — روابطها تنتهي صلاحيتها، وتسرّب زيارات القرّاء لطرف ثالث.
 */

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  /** HTML مُنقّى — لا يُعرض خام أبدًا */
  content: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  date: string;
  author: string;
};

export const POSTS: readonly Post[] = (raw as Post[])
  .map((post) => ({
    ...post,
    content: sanitizeHtml(post.content),
    excerpt: post.excerpt?.trim() || htmlToText(post.content).slice(0, 155),
  }))
  // الأحدث أولًا
  .sort((a, b) => b.date.localeCompare(a.date));

export function findPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

/**
 * تاريخ ميلادي بأرقام لاتينية.
 * `ar-SA` وحدها تُخرج تاريخًا هجريًا وأرقامًا هندية — والمقالات مؤرَّخة ميلاديًا،
 * فالتحويل يغيّر المعنى. اللاحقة `-u-ca-gregory-nu-latn` تثبّت التقويم والأرقام.
 */
export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}
