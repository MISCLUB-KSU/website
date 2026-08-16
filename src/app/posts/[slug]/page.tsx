import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { POSTS, findPost, formatPostDate } from "@/content/posts";
import { isolateLatin } from "@/lib/bidi";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(decodeURIComponent(slug));
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/posts/${encodeURIComponent(post.slug)}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      images: [{ url: post.image }],
    },
  };
}

/**
 * صفحة المقال.
 *
 * المقال نصّ قبل كل شيء: عمود واحد بعرض قراءة مريح، بلا شريط جانبي ولا
 * بطاقات مقترحة تزاحمه. الصورة فوقه بنسبتها الأصلية فلا تقفز الصفحة.
 */
export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = findPost(decodeURIComponent(slug));
  if (!post) notFound();

  return (
    <>
      <SiteHeader />

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
        <article>
          <header className="mx-auto max-w-[68ch]">
            <p className="text-sm font-semibold text-fg-muted">
              <span dir="ltr">{formatPostDate(post.date)}</span>
              {" · "}
              {post.author}
            </p>
            <h1 className="mt-s3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              {isolateLatin(post.title)}
            </h1>
          </header>

          <Image
            src={post.image}
            alt=""
            width={post.imageWidth}
            height={post.imageHeight}
            priority
            sizes="(min-width: 1024px) 72rem, 100vw"
            className="rake mt-s6 h-auto w-full"
          />

          {/* المحتوى مُنقّى بقائمة سماح في `sanitizeHtml` وقت البناء —
              انظر `src/lib/sanitize.ts` لسبب استعمال هذا المسار وحدوده. */}
          <div
            className="post-body mx-auto mt-s7 max-w-[68ch]"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        <nav
          className="mx-auto mt-s8 max-w-[68ch] border-t border-line pt-s5"
          aria-label="تنقّل المقالات"
        >
          <Link
            href="/posts"
            className="inline-flex min-h-11 items-center gap-s2 font-medium text-accent transition-colors hover:text-accent-hover"
          >
            <span
              aria-hidden
              className="mis-slant inline-block h-3.5 w-1 bg-current"
            />
            كل المقالات
          </Link>
        </nav>
      </main>

      <SiteFooter />
    </>
  );
}
