import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { POSTS, formatPostDate } from "@/content/posts";
import { isolateLatin } from "@/lib/bidi";

export const metadata: Metadata = {
  title: "المقالات",
  description:
    "مقالات نادي نظم المعلومات الإدارية: مسارات مهنية وشهادات وتجارب من سوق العمل.",
  alternates: { canonical: "/posts" },
};

export default function PostsPage() {
  const [lead, ...rest] = POSTS;

  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="posts"
          title="المقالات"
          lede="كتابات عن التخصص وسوق العمل — ما يفيد الطالب قبل أن يتخرّج."
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          {/* أحدث مقال يأخذ عرضًا أكبر — الترتيب يحمل المعنى، لا شبكة متساوية صمّاء */}
          {lead ? (
            <Link
              href={`/posts/${encodeURIComponent(lead.slug)}`}
              className="rake group grid gap-s5 bg-bg-raised p-s5 text-fg shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-bg-sunken sm:grid-cols-2 sm:items-center sm:p-s6"
            >
              <Image
                src={lead.image}
                alt=""
                width={lead.imageWidth}
                height={lead.imageHeight}
                priority
                sizes="(min-width: 640px) 50vw, 100vw"
                className="h-auto w-full"
              />
              <div>
                <p className="text-xs font-semibold text-fg-muted">
                  <span dir="ltr">{formatPostDate(lead.date)}</span>
                </p>
                <h2 className="mt-s2 font-display text-2xl font-semibold leading-snug">
                  {isolateLatin(lead.title)}
                </h2>
                <p className="mt-s3 max-w-measure leading-relaxed text-fg-muted">
                  {isolateLatin(lead.excerpt)}
                </p>
              </div>
            </Link>
          ) : null}

          {rest.length > 0 ? (
            <ul className="mt-s6 grid gap-s4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.slug} className="grid">
                  <Link
                    href={`/posts/${encodeURIComponent(post.slug)}`}
                    className="rake grid h-full grid-rows-[auto_auto_auto_1fr] gap-s3 bg-bg-raised p-s5 text-fg shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-bg-sunken"
                  >
                    <Image
                      src={post.image}
                      alt=""
                      width={post.imageWidth}
                      height={post.imageHeight}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-auto w-full"
                    />
                    <p className="text-xs font-semibold text-fg-muted">
                      <span dir="ltr">{formatPostDate(post.date)}</span>
                    </p>
                    <h2 className="font-display text-lg font-semibold leading-snug">
                      {isolateLatin(post.title)}
                    </h2>
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {isolateLatin(post.excerpt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
